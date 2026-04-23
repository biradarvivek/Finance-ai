from fastapi import FastAPI, Request
from typing import List
import fitz
import requests
import json
import re
import os
from dotenv import load_dotenv
from vector_store import vector_db
from fastapi.middleware.cors import CORSMiddleware #



load_dotenv()

# 3. Securely grab the key
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# 4. 🔥 SAFETY CHECK (Look at your Python terminal when the server starts!)
if not OPENROUTER_API_KEY:
    print("🚨 FATAL ERROR: Could not find OPENROUTER_API_KEY in the .env file!")
else:
    print("✅ SUCCESS: API Key loaded from .env!")



app = FastAPI()

# 👈 ADD THIS ENTIRE BLOCK
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows any frontend to connect
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# 1. PDF TEXT EXTRACTION & CHUNKING
# -----------------------------
def extract_text_chunks(content, chunk_size=4000):
    print("📄 [STEP 1] Extracting text from PDF...")
    doc = fitz.open(stream=content, filetype="pdf")
    full_text = ""
    
    for page in doc:
        # Keep original formatting so we don't accidentally merge words!
        full_text += page.get_text("text") + "\n"
        
    print(f"✅ [STEP 1] Extracted {len(full_text)} characters total.")
    
    # Strictly slice the text into chunks of 4000 characters
    chunks = [full_text[i:i + chunk_size] for i in range(0, len(full_text), chunk_size)]
    return chunks

# -----------------------------
# 2. LLM PARSER (Text to JSON)
# -----------------------------
def parse_with_llm(text):
    prompt = f"""
    Extract bank transactions from the text. Return ONLY a valid JSON array of objects.
    
    You MUST format every single transaction exactly like this blueprint:
    {{
        "date": "DD-MMM-YYYY",
        "description": "transaction details",
        "debit": 100.50,   // use null if it is a credit
        "credit": null,    // use null if it is a debit
        "balance": 5000.00
    }}

    STRICT RULES: 
    - No explanation. 
    - Only output the JSON array.
    - Start with [ and end with ].
    
    Text: {text}
    """
    
    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": "openai/gpt-oss-120b:free", 
                "messages": [
                    {"role": "system", "content": "You extract structured financial data."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0
            },
        )
        
        # 🛡️ SAFETY CHECK: Did the API return a success code (200)?
        if response.status_code != 200:
            print(f"   ❌ [API ERROR] Server returned status {response.status_code}")
            return None
            
        # 🛡️ SAFETY CHECK: Safely attempt to read the JSON response
        result = response.json()
        
    except Exception as e:
        print(f"   ❌ [NETWORK ERROR] Failed to communicate with OpenRouter: {e}")
        return None

    if "choices" not in result:
        print(f"   ❌ [STEP 2 ERROR] API Response missing 'choices': {result}") 
        return None
    
    content = result["choices"][0]["message"]["content"]
    content_clean = content.replace("```json", "").replace("```", "").strip()
    
    try:
        parsed_json = json.loads(content_clean)
        print(f"   ↳ 🟩 Parsed {len(parsed_json)} transactions.")
        return parsed_json
    except Exception as e:
        print(f"   ↳ ⚠️ Failed to parse LLM string into JSON. Skipping chunk.")
        return None

# -----------------------------
# 3. FAST RULE-BASED ENGINE
# -----------------------------
def categorize_rule_based(desc: str) -> str:
    # 🛡️ SAFETY CHECK: If desc is None or completely empty, return "Others"
    if not desc: 
        return "Others"
        
    # Force it to be a string just in case the LLM returned a number
    desc_lower = str(desc).lower() 
    
    if any(x in desc_lower for x in ["swiggy", "zomato", "restaurant", "food"]): return "Food"
    if any(x in desc_lower for x in ["uber", "ola", "rapido", "irctc", "metro"]): return "Travel"
    if any(x in desc_lower for x in ["emi", "loan", "finance", "epimoney", "fullerton", "bajaj"]): return "EMI"
    if any(x in desc_lower for x in ["amazon", "flipkart", "meesho"]): return "Shopping"
    if any(x in desc_lower for x in ["salary", "deposit", "credit"]): return "Income"
    
    return "Others"

# -----------------------------
# 4. BATCH LLM ENGINE
# -----------------------------
def categorize_llm_batch(descriptions: List[str]) -> List[str]:
    print(f"🧠 [STEP 4] Sending {len(descriptions)} unknown items to LLM Batch...")
    prompt = f"""
    Categorize the following transaction descriptions into exactly one of these categories:
    Food, Travel, EMI, Shopping, Income, Others.
    
    Transactions: {json.dumps(descriptions)}
    
    Respond ONLY with a valid JSON array of strings. The array must contain exactly {len(descriptions)} items.
    """
    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": "openai/gpt-oss-120b:free",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0
            }
        )
        
        result_text = response.json()["choices"][0]["message"]["content"].strip()
        result_text = re.sub(r'^```json\s*|\s*```$', '', result_text, flags=re.IGNORECASE).strip()
        parsed = json.loads(result_text)
        
        if isinstance(parsed, list) and len(parsed) == len(descriptions):
            print(f"✅ [STEP 4] Successfully batch categorized {len(parsed)} items.")
            return parsed
        else:
            print(f"⚠️ [STEP 4 ERROR] Array length mismatch.")
            
    except Exception as e:
        print(f"🚨 [STEP 4 FATAL ERROR] LLM Batch Error: {e}")
        
    return ["Others"] * len(descriptions)

# -----------------------------
# 5. MAIN API ROUTE
# -----------------------------
@app.post("/process")
async def process_pdf(request: Request):
    print("\n=================================================")
    print("🚀 NEW PDF PROCESSING REQUEST INITIATED")
    print("=================================================")
    
    content = await request.body()
    
    # ✂️ Step 1: Extract and Chunk
    chunks = extract_text_chunks(content, chunk_size=4000)
    print(f"📦 Created {len(chunks)} strict chunks to process safely.")
    
    all_transactions = []

    # 🧠 Step 2: Loop through chunks
    for idx, chunk in enumerate(chunks):
        print(f"\n🔄 Processing Chunk {idx + 1}/{len(chunks)}...")
        
        for attempt in range(1, 3):
            transactions = parse_with_llm(chunk)
            if transactions: 
                all_transactions.extend(transactions)
                break
            print(f"   ⚠️ Attempt {attempt} failed, retrying...")

    if not all_transactions:
        print("\n❌ FATAL: Failed to parse any transactions across all chunks.")
        return {"error": "Failed to parse transactions"}

    print(f"\n✅ SUCCESS: Total transactions extracted from all chunks: {len(all_transactions)}")

    # ⚙️ Step 3: Run Fast Rules
    # 🛡️ Use 'or ""' to convert None to an empty string safely
    descriptions = [str(txn.get("description") or "") for txn in all_transactions]
    final_categories = [""] * len(descriptions)
    llm_queue = []
    llm_indices = []

    print(f"⚙️ [STEP 3] Running Fast Rules on {len(descriptions)} items...")
    for i, desc in enumerate(descriptions):
        cat = categorize_rule_based(desc)
        if cat == "Others":
            llm_queue.append(desc)
            llm_indices.append(i)
        else:
            final_categories[i] = cat

    print(f"📊 [STEP 3] Rules engine matched {len(descriptions) - len(llm_queue)} items.")

    # 🤖 Step 4: Run LLM on leftovers
    if llm_queue:
        # If there are a ton of 'Others', we chunk the batch API call too so it doesn't crash!
        print(f"   ↳ {len(llm_queue)} items need AI categorization.")
        batch_size = 50 
        llm_results = []
        
        for i in range(0, len(llm_queue), batch_size):
            sub_queue = llm_queue[i:i + batch_size]
            sub_results = categorize_llm_batch(sub_queue)
            llm_results.extend(sub_results)
            
        # Ensure we don't crash if LLM returned wrong number of items
        if len(llm_results) == len(llm_queue):
            for index, cat in zip(llm_indices, llm_results):
                final_categories[index] = cat
        else:
            print("⚠️ Categorization mismatch! Defaulting unknowns to 'Others'")
            for index in llm_indices:
                final_categories[index] = "Others"

    # 🔗 Step 5: Attach categories back
    print("🔗 [STEP 5] Attaching final categories to transactions...")
    for i, txn in enumerate(all_transactions):
        txn["category"] = final_categories[i]

    # SAVE TO CHROMADB FOR THE CHATBOT
    print("🗄️ [STEP 6] Saving to ChromaDB Vector Database...")
    vector_db.add_transactions(all_transactions)

    print("🏁 PROCESSING COMPLETE. Returning massive payload to Node.js.")
    print("=================================================\n")
    
    return {"transactions": all_transactions}


# -----------------------------
# 6. CHATBOT API (Test the Vector DB!)
# -----------------------------
# -----------------------------
# 6. CHATBOT API (The True RAG Engine)
# -----------------------------
@app.get("/chat")
async def chat_with_transactions(query: str):
    print(f"\n💬 [CHATBOT] User asked: '{query}'")
    
    # 1. Retrieve the closest math matches from ChromaDB
    matches = vector_db.search(query, top_k=5)
    
    if not matches:
        return {"answer": "You haven't uploaded any bank statements yet!"}
        
    # 2. Format the matches so the LLM can read them easily
    context_data = json.dumps(matches, indent=2)
    
    # 3. Create the strict RAG Prompt
    prompt = f"""
    You are an intelligent financial assistant. 
    The user asked: "{query}"
    
    Here are the top 5 most relevant transactions retrieved from their database:
    {context_data}
    
    STRICT RULES:
    1. Answer the user's question using ONLY the provided transactions.
    2. Do the math if you need to calculate a total.
    3. IF the transactions provided do NOT contain the specific brands, names, or categories the user asked about, explicitly tell them: "I could not find any transactions matching your request in the current statement."
    4. Do not hallucinate or guess. Keep the answer conversational and short.
    """

    print("🧠 Thinking... Sending retrieved context to LLM...")
    
    # 4. Ask the LLM to write the final answer
    # 4. Ask the LLM to write the final answer
    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"},
            json={
                # You can also try "google/gemini-2.0-flash-lite-preview-02-05:free" if this one is down!
                "model": "openai/gpt-oss-120b:free", 
                "messages": [
                    {"role": "system", "content": "You are a financial AI agent."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.2 
            },
        )
        
        # 🔥 SAFETY CHECK 1: Did the server crash?
        if response.status_code != 200:
            print(f"❌ [API ERROR] Status: {response.status_code} - {response.text}")
            return {"answer": "The AI server is temporarily overloaded. Please try again."}

        result = response.json()
        
        # 🔥 SAFETY CHECK 2: Did it actually send us an answer?
        if "choices" not in result:
            print(f"❌ [OPENROUTER ERROR] The API sent back: {result}")
            return {"answer": "The AI returned an unexpected response. Check your Python terminal for details!"}
            
        final_answer = result["choices"][0]["message"]["content"]
        
        print("✅ LLM successfully generated a response!")
        print(f"   ↳ Final Answer: {final_answer}")
        return {"answer": final_answer}
        
    except Exception as e:
        print(f"❌ [FATAL ERROR] {e}")
        return {"answer": "My AI brain is currently offline. Please check the backend."}