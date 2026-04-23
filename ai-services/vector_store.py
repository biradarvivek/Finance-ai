import chromadb
from chromadb.utils import embedding_functions

print("⏳ Initializing ChromaDB and Embedding Model...")

# 🔥 THE FIX: Using Chroma's default ONNX engine. ZERO PyTorch required!
# This works perfectly now that you are on Python 3.11.
default_ef = embedding_functions.DefaultEmbeddingFunction()

class TransactionVectorDB:
    def __init__(self):
        self.client = chromadb.PersistentClient(path="./chroma_db")
        self.collection = self.client.get_or_create_collection(
            name="financial_transactions",
            embedding_function=default_ef
        )
        print(f"📂 ChromaDB ready! Currently holding {self.collection.count()} transactions.")

    def add_transactions(self, transactions: list):
        if not transactions:
            return

        documents, metadatas, ids = [], [], []
        start_id = self.collection.count()

        for i, txn in enumerate(transactions):
            # 🔥 THE FIX: Hunt for debit/credit if 'amount' doesn't exist yet
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
            
            action = "spent" if amount < 0 else "received"
            text = f"On {date}, {action} {abs(amount)} on {desc}. Category: {cat}."
            
            documents.append(text)
            metadatas.append({
                "date": str(date), "description": str(desc),
                "amount": float(amount), "category": str(cat)
            })
            ids.append(f"txn_{start_id + i}")

        print(f"🧠 Generating embeddings and saving {len(documents)} items to ChromaDB...")
        self.collection.add(documents=documents, metadatas=metadatas, ids=ids)
        print("💾 Saved successfully to ChromaDB!")

    def search(self, query: str, top_k=5):
        if self.collection.count() == 0: return []
        print(f"🔍 Searching ChromaDB for: '{query}'")
        results = self.collection.query(query_texts=[query], n_results=top_k)
        return results["metadatas"][0] if results["metadatas"] else []

vector_db = TransactionVectorDB()