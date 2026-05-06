import os
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

load_dotenv()

class PineconeVectorStore:
    def __init__(self):
        print("☁️ Connecting to Pinecone Cloud...")
        # 1. Initialize Pinecone
        api_key = os.getenv("PINECONE_API_KEY")
        if not api_key:
            raise ValueError("Missing PINECONE_API_KEY in environment variables.")
            
        self.pc = Pinecone(api_key=api_key)
        self.index = self.pc.Index("finance-ai") # Must match your Pinecone index name
        
        # 2. Initialize the Local Embedding Model (Dimensions: 384)
        print("🧠 Loading local embedding model...")
        self.model = SentenceTransformer('all-MiniLM-L6-v2')

    def add_transactions(self, transactions: list, user_id: str):
        if not transactions: return
        
        vectors_to_upsert = []
        
        for i, txn in enumerate(transactions):
            # 1. Create the text chunk the AI will read
            debit = txn.get("debit")
            credit = txn.get("credit")
            
            if debit:
                amount = -abs(float(debit))
            elif credit:
                amount = abs(float(credit))
            else:
                amount = float(txn.get("amount", 0))

            desc = txn.get("description", "Unknown")
            cat = txn.get("category", "Others")
            date = txn.get("date", "Unknown Date")
            
            text_to_embed = f"Date: {date} | Description: {desc} | Amount: {amount} | Category: {cat}"
            
            # 2. Convert text to a 384-dimensional vector
            embedding = self.model.encode(text_to_embed).tolist()
            
            # 3. Format exactly how Pinecone expects it
            # We must pass the user_id in the metadata for secure Multi-Tenancy!
            vectors_to_upsert.append({
                "id": f"txn_{user_id}_{i}_{hash(text_to_embed)}", 
                "values": embedding,
                "metadata": {
                    "user_id": str(user_id),
                    "text": text_to_embed,
                    "date": str(date)
                }
            })
        
        # 4. Upsert to Pinecone in batches of 100 to avoid payload limits
        batch_size = 100
        for i in range(0, len(vectors_to_upsert), batch_size):
            self.index.upsert(vectors=vectors_to_upsert[i:i + batch_size])
            
        print(f"💾 Successfully saved {len(transactions)} vectors to Pinecone Cloud!")

    def search(self, query: str, user_id: str, exact_date: str = None, top_k=15):
        # 1. Convert user's question into a vector
        query_vector = self.model.encode(query).tolist()
        
        # 2. Setup the security filter (This is how we separate thousands of users)
        search_filter = {"user_id": str(user_id)}
        
        if exact_date:
            print(f"🎯 EXACT MATCH MODE: Forcing Pinecone to fetch transactions from {exact_date}")
            search_filter["date"] = exact_date
            
        # 3. Search the cloud database
        print(f"🔍 Searching Pinecone for: '{query}' (User: {user_id}, Fetching up to {top_k} items)")
        results = self.index.query(
            vector=query_vector,
            filter=search_filter,
            top_k=top_k,
            include_metadata=True
        )
        
        # 4. Extract just the raw text chunks to feed to the LLM
        if not results.get('matches'): return []
        return [match['metadata']['text'] for match in results['matches']]