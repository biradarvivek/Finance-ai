from fastapi import FastAPI, Request, HTTPException, Security, Depends
from typing import List
import pdfplumber
import io
import requests
import json
import re
import os
from dotenv import load_dotenv
from vector_store import vector_db
from fastapi.middleware.cors import CORSMiddleware #
import re
from datetime import datetime
import requests
import jwt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from rapidfuzz import process, fuzz



load_dotenv()

# 3. Securely grab the key
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# 4. 🔥 SAFETY CHECK (Look at your Python terminal when the server starts!)
if not OPENROUTER_API_KEY:
    print("🚨 FATAL ERROR: Could not find OPENROUTER_API_KEY in the .env file!")
else:
    print("✅ SUCCESS: API Key loaded from .env!")


# 1. Load the shared JWT Secret
ACCESS_TOKEN_SECRET = os.getenv("ACCESS_TOKEN_SECRET")
security = HTTPBearer()

# 2. The JWT Verification Guard
async def verify_jwt(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    print("🔐 Verifying JWT token from request header..." , token)
    try:
        # Node.js uses the HS256 algorithm by default
        decoded_payload = jwt.decode(token, ACCESS_TOKEN_SECRET, algorithms=["HS256"])
        
        # You can even extract the user ID right out of the token!
        # decoded_payload will look like: {'_id': '69eb1...', 'iat': 177..., 'exp': 177...}
        return decoded_payload 
        
    except jwt.ExpiredSignatureError:
        print("🛑 SECURITY BLOCK: Token has expired.")
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        print("🛑 SECURITY BLOCK: Invalid or tampered token.")
        raise HTTPException(status_code=401, detail="Invalid token")


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
# def extract_text_chunks(content, chunk_size=4000):
#     print("📄 [STEP 1] Extracting text from PDF...")
#     doc = fitz.open(stream=content, filetype="pdf")
#     if doc.is_encrypted:
#         return {"error": "Please decrypt your PDF before uploading."}

#     full_text = ""
    
#     for page in doc:
#         # Keep original formatting so we don't accidentally merge words!
#         full_text += page.get_text("text") + "\n"
        
#     print(f"✅ [STEP 1] Extracted {len(full_text)} characters total.")
    
#     # Strictly slice the text into chunks of 4000 characters
#     chunks = [full_text[i:i + chunk_size] for i in range(0, len(full_text), chunk_size)]
#     print("chunks", chunks)
#     return chunks

# -----------------------------
# 2. LLM PARSER (Text to JSON)
# -----------------------------
# def parse_with_llm(text):
#     prompt = f"""
#     Extract bank transactions from the text. Return ONLY a valid JSON array of objects.
    
#     You MUST format every single transaction exactly like this blueprint:
#     {{
#         "date": "DD-MMM-YYYY",
#         "description": "transaction details",
#         "debit": 100.50,   // use null if it is a credit
#         "credit": null,    // use null if it is a debit
#         "balance": 5000.00
#     }}

#     STRICT RULES: 
#     - No explanation. 
#     - Only output the JSON array.
#     - Start with [ and end with ].
    
#     Text: {text}
#     """
    
#     try:
#         response = requests.post(
#             "https://openrouter.ai/api/v1/chat/completions",
#             headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"},
#             json={
#                 "model": "openai/gpt-oss-120b:free", 
#                 "messages": [
#                     {"role": "system", "content": "You extract structured financial data."},
#                     {"role": "user", "content": prompt}
#                 ],
#                 "temperature": 0
#             },
#         )
        
#         # 🛡️ SAFETY CHECK: Did the API return a success code (200)?
#         if response.status_code != 200:
#             print(f"   ❌ [API ERROR] Server returned status {response.status_code}")
#             return None
            
#         # 🛡️ SAFETY CHECK: Safely attempt to read the JSON response
#         result = response.json()
        
#     except Exception as e:
#         print(f"   ❌ [NETWORK ERROR] Failed to communicate with OpenRouter: {e}")
#         return None

#     if "choices" not in result:
#         print(f"   ❌ [STEP 2 ERROR] API Response missing 'choices': {result}") 
#         return None
    
#     content = result["choices"][0]["message"]["content"]
#     content_clean = content.replace("```json", "").replace("```", "").strip()
    
#     try:
#         parsed_json = json.loads(content_clean)
#         print(f"   ↳ 🟩 Parsed {len(parsed_json)} transactions.")
#         return parsed_json
#     except Exception as e:
#         print(f"   ↳ ⚠️ Failed to parse LLM string into JSON. Skipping chunk.")
#         return None


# -----------------------------
# 1. HYBRID LLM MAPPER (Reads only the headers!)
# -----------------------------
def ask_llm_to_map_headers(headers, first_row):
    print("🤖 Asking LLM to map the table columns...")
    prompt = f"""
    You are a financial data mapper. I am providing the table headers and the first data row from a bank statement.
    Headers: {headers}
    Data: {first_row}
    
    Return ONLY a JSON object mapping standard financial fields to their integer column indices (0-based).
    Required keys: "date", "description". 
    Optional keys: "debit", "credit", "amount", "balance".
    
    If a column doesn't exist, set its value to null.
    Example: {{"date": 0, "description": 2, "debit": 3, "credit": 4, "amount": null, "balance": 5}}
    
    Respond ONLY with valid JSON. Do not include markdown formatting like ```json.
    """
    
    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": "openai/gpt-oss-120b:free", # You can swap this to a faster model later!
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0
            },
        )
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        content_clean = content.replace("```json", "").replace("```", "").strip()
        
        column_map = json.loads(content_clean)
        print(f"✅ AI Successfully mapped columns: {column_map}")
        return column_map
    except Exception as e:
        print(f"❌ Failed to map columns: {e}")
        return None

# -----------------------------
# 2. FAST DETERMINISTIC EXTRACTOR (No AI Needed)
# -----------------------------
def extract_transactions_hybrid(pdf_bytes):
    all_transactions = []
    
    # Read the raw bytes sent by Node.js
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        column_map = None
        
        for page in pdf.pages:
            tables = page.extract_tables()
            print(f"📊 Found {len(tables)} tables on this page.")
            for table in tables:
                if not table or len(table) < 2: continue
                
                # If we haven't mapped the columns yet, ask the AI on the first table!
                if not column_map:
                    # Clean up None values in headers
                    headers = [str(h).replace("\n", " ").strip() if h else "" for h in table[0]]
                    row_1 = [str(c).replace("\n", " ").strip() if c else "" for c in table[1]]
                    
                    column_map = ask_llm_to_map_headers(headers, row_1)
                    if not column_map: return [] # Failsafe

                    start_idx = 1           #We know the first row of the very first table is a header
                else :
                    first_row_text = " ".join([str(cell).lower() for cell in table[0] if cell])
                    if any(word in first_row_text for word in ["date", "description", "particulars", "amount", "balance", "withdrawal"]):
                        start_idx = 1 # It's a header row, skip it!
                    else:
                        start_idx = 0 # It's a transaction row, don't skip it!
                
                # Now, use pure Python speed to loop the rest of the table!
                for row in table[start_idx:]: # Skip headers
                    # Clean the row data safely
                    clean_row = [str(cell).replace("\n", " ").strip() if cell else "" for cell in row]
                    
                    try:
                        date_idx = column_map.get("date")
                        desc_idx = column_map.get("description")
                        
                        # Only accept rows that actually have a date and description
                        if date_idx is not None and desc_idx is not None and clean_row[date_idx]:
                            txn = {
                                "date": clean_row[date_idx],
                                "description": clean_row[desc_idx],
                            }
                            
                            # Safely extract optional money fields
                            if column_map.get("debit") is not None and clean_row[column_map["debit"]]:
                                txn["debit"] = clean_row[column_map["debit"]]
                            if column_map.get("credit") is not None and clean_row[column_map["credit"]]:
                                txn["credit"] = clean_row[column_map["credit"]]
                            if column_map.get("amount") is not None and clean_row[column_map["amount"]]:
                                txn["amount"] = clean_row[column_map["amount"]]
                            if column_map.get("balance") is not None and clean_row[column_map["balance"]]:
                                txn["balance"] = clean_row[column_map["balance"]]
                                
                            all_transactions.append(txn)
                    except IndexError:
                        continue # Skip weird formatting rows

    return all_transactions

# -----------------------------
# 3. FAST RULE-BASED ENGINE
# -----------------------------
MERCHANT_DICT = {
    "Food": ["swiggy", "zomato", "restaurant", "mcdonalds", "kfc", "dominos", "starbucks", "food"],
    "Travel": ["uber", "ola", "rapido", "irctc", "metro", "makemytrip", "yatra", "indigo", "ticket"],
    "EMI": ["emi", "loan", "finance", "fin ", "epimoney", "fullerton", "bajaj", "cholamandalam", "aditya birla", "capital", "idfc"],
    "Shopping": ["amazon", "flipkart", "meesho", "myntra", "reliance", "croma", "d-mart", "apparel", "clothing"]
}

def categorize_fuzzy(desc: str, amount: float) -> str:
    if not desc: return "Others"
    
    # 💰 1. Absolute Rule: Positive money is Income!
    if amount > 0:
        return "Income"
        
    desc_lower = str(desc).lower()
    
    # 🧠 2. Fuzzy String Matching
    for category, keywords in MERCHANT_DICT.items():
        # Scans the messy bank string to see if any of our keywords are hiding inside it
        match = process.extractOne(desc_lower, keywords, scorer=fuzz.partial_ratio)
        if match:
            best_match, score, _ = match
            if score > 85:  # 85% confidence threshold allows for slight typos!
                return category
                
    return "Others"

# -----------------------------
# 4. BATCH LLM ENGINE
# -----------------------------
def categorize_llm_batch_context(transactions: list) -> list:
    print(f"🧠 [STEP 4] Sending {len(transactions)} unknown items to Context-Aware AI Batch...")
    
    prompt = f"""
    Categorize the following financial transactions into exactly one of these categories:
    Food, Travel, EMI, Shopping, Income, Others.
    
    CRITICAL RULES:
    1. If the 'amount' is positive, it MUST be 'Income'.
    2. If the 'amount' is negative, it is an expense. IGNORE the word "Deposit" or "Credit" in the description if the amount is negative.
    
    Transactions: {json.dumps(transactions)}
    
    Respond ONLY with a valid JSON array of strings, exactly matching the length of the input.
    """
    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"},
            json={
                # Note: Free models frequently get overloaded. If Gemini keeps failing, 
                # try swapping this to "meta-llama/llama-3-8b-instruct:free"
                "model": "openai/gpt-oss-120b:free", 
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0
            }
        )
        
        # 🛡️ SAFETY CHECK 1: Did the server actually succeed?
        if response.status_code != 200:
            print(f"   ❌ [API ERROR] OpenRouter returned status {response.status_code}")
            print(f"   ↳ DETAILS: {response.text}")
            return ["Others"] * len(transactions)
            
        result_data = response.json()
        
        # 🛡️ SAFETY CHECK 2: Did it return the expected data structure?
        if "choices" not in result_data:
            print(f"   ❌ [API ERROR] Missing 'choices' in response: {result_data}")
            return ["Others"] * len(transactions)
        
        result_text = result_data["choices"][0]["message"]["content"].strip()
        result_text = re.sub(r'^```json\s*|\s*```$', '', result_text, flags=re.IGNORECASE).strip()
        parsed = json.loads(result_text)
        
        if isinstance(parsed, list) and len(parsed) == len(transactions):
            print(f"✅ [STEP 4] Successfully AI-categorized {len(parsed)} complex items.")
            return parsed
        else:
            print(f"⚠️ [STEP 4 ERROR] Array length mismatch. Expected {len(transactions)}, got {len(parsed) if isinstance(parsed, list) else 'Invalid'}.")
            print(f"   ↳ RAW OUTPUT: {result_text}")
            
    except Exception as e:
        print(f"🚨 [STEP 4 FATAL ERROR] AI Batch Error: {e}")
        
    return ["Others"] * len(transactions)

# -----------------------------
# 5. MAIN API ROUTE
# -----------------------------
@app.post("/process", dependencies=[Depends(verify_jwt)])
async def process_pdf(request: Request, user_id: str):
    print("\n=================================================")
    print("🚀 NEW PDF PROCESSING REQUEST INITIATED")
    print("=================================================")
    
    content = await request.body()
    
    # ⚡ Step 1 & 2: Extract mapping and all rows dynamically!
    print("📄 Parsing PDF Tables...")
    all_transactions = extract_transactions_hybrid(content)
    
    if not all_transactions:
        print("\n❌ FATAL: Failed to parse any transactions from tables.")
        return {"error": "Failed to parse transactions"}

    print(f"\n✅ SUCCESS: Instantly extracted {len(all_transactions)} transactions via Hybrid parsing!")    

    # ⚙️ Step 3: Run Fast Rules
    # 🛡️ Use 'or ""' to convert None to an empty string safely
    descriptions = [str(txn.get("description") or "") for txn in all_transactions]
    final_categories = [""] * len(descriptions)
    llm_queue = []
    llm_indices = []

    print(f"⚙️ [STEP 3] Running Fuzzy Matcher on {len(descriptions)} items...")
    for i, desc in enumerate(descriptions):
        amount_val = float(all_transactions[i].get("amount") or all_transactions[i].get("credit") or 0)
        if all_transactions[i].get("debit"):
            amount_val = -abs(float(all_transactions[i].get("debit")))
            
        # Call the new fuzzy matcher
        cat = categorize_fuzzy(desc, amount_val)
        
        if cat == "Others":
            # 🚀 THE FIX: We now queue up an OBJECT containing both desc and amount for the AI
            llm_queue.append({"desc": desc, "amount": amount_val})
            llm_indices.append(i)
        else:
            final_categories[i] = cat

    print(f"📊 [STEP 3] Fuzzy Engine instantly matched {len(descriptions) - len(llm_queue)} items.")

    # 🤖 Step 4: Run Context-Aware AI on leftovers
    if llm_queue:
        print(f"   ↳ {len(llm_queue)} complex items require AI analysis.")
        batch_size = 50 
        llm_results = []
        
        for i in range(0, len(llm_queue), batch_size):
            sub_queue = llm_queue[i:i + batch_size]
            # Call the new Context-Aware AI
            sub_results = categorize_llm_batch_context(sub_queue) 
            llm_results.extend(sub_results)
            
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
    print(f"🗄️ [STEP 6] Saving to ChromaDB Vector Database for user {user_id}...")
    vector_db.add_transactions(all_transactions, user_id)

    print("🏁 PROCESSING COMPLETE. Returning massive payload to Node.js.")
    print("=================================================\n")
    
    return {"transactions": all_transactions}


# -----------------------------
# 6. CHATBOT API (Test the Vector DB!)
# -----------------------------
# -----------------------------
# 6. CHATBOT API (The True RAG Engine)
# -----------------------------
@app.get("/chat", dependencies=[Depends(verify_jwt)])
async def chat_with_transactions(query: str, user_id: str, history: str = "", token: str = ""):
    print(f"\n💬 [CHATBOT] User {user_id} asked: '{query}'")
    search_context = f"{history} {query}"
    
    # =========================================================
    # 🕵️‍♂️ AGENT ROUTER 1: THE MATH & TOTALS INTERCEPTOR
    # =========================================================
    is_math_query = re.search(r'(total|sum|how much|spend on|spent on|all of)', query, re.IGNORECASE)
    
    if is_math_query:
        print("🧮 MATH AGENT TRIGGERED: Offloading to MongoDB Aggregation Pipeline...")
        
        # 1. Extract Year (Prioritize current query, then fallback to history)
        year_match = re.search(r'\b(20\d{2})\b', query)
        if year_match:
            year = year_match.group(1)
        else:
            # If no year in query, find all years in history and grab the most recently mentioned one
            history_years = re.findall(r'\b(20\d{2})\b', history)
            year = history_years[-1] if history_years else ""
        
        # 2. Extract Category (Prioritize current query, then fallback to history)
        categories = ["Food", "Travel", "EMI", "Shopping", "Clothing", "Income", "Others"]
        extracted_cat = ""
        
        # Search the query first!
        for cat in categories:
            if cat.lower() in query.lower():
                extracted_cat = cat
                break
                
        # If no category in the query, check the history for context
        if not extracted_cat:
            for cat in categories:
                if cat.lower() in history.lower():
                    extracted_cat = cat
                    break
                
        # 3. Ping the Node.js Database Engine!
        try:
            db_response = requests.get(
                f"http://localhost:5000/api/analysis/agent/query?category={extracted_cat}&year={year}",
                headers={"Authorization": f"Bearer {token}"} 
            )
            db_data = db_response.json()
            
            amount = db_data.get('totalAmount', 0)
            txn_count = db_data.get('transactionCount', 0)
            
            context_data = f"DATABASE AGENT RESULT: The user spent a total of ₹{amount:,.2f} on '{extracted_cat or 'all categories'}' in {year or 'all time'} across {txn_count} transactions."
            print(f"📊 Node.js replied: {context_data}")
            
        except Exception as e:
            context_data = "Database Agent failed to retrieve the total."
            print(f"❌ DB Agent Error: {e}")

    # =========================================================
    # 🕵️‍♂️ AGENT ROUTER 2: THE EXACT DATE / SEMANTIC SEARCH
    # =========================================================
    else:
        date_match = re.search(r'\d{1,2}-[a-zA-Z]{3}-\d{4}', search_context, re.IGNORECASE)
        extracted_date = None
        
        if date_match:
            raw_date = date_match.group(0)
            try:
                parsed_date = datetime.strptime(raw_date, "%d-%b-%Y")
                extracted_date = parsed_date.strftime("%d-%b-%Y").upper()
                print(f"🎯 EXACT MATCH MODE: Standardized date to {extracted_date}")
            except ValueError:
                extracted_date = raw_date.upper()

        # Retrieve from ChromaDB
        matches = vector_db.search(query, user_id=user_id, exact_date=extracted_date, top_k=15)
        
        if not matches:
            return {"answer": "I could not find any transactions matching your request in the current statement."}
            
        context_data = json.dumps(matches, indent=2)
        
    # =========================================================
    # 🧠 THE LLM PROMPT (Handles both Math and Semantic Data)
    # =========================================================
    prompt = f"""
    You are an intelligent financial assistant. 
    
    RECENT CONVERSATION HISTORY:
    {history}
    
    CURRENT USER QUESTION: 
    "{query}"
    
    SYSTEM CONTEXT / DATABASE RESULTS:
    {context_data}
    
    STRICT RULES:
    1. Answer the user's question using ONLY the provided SYSTEM CONTEXT.
    2. If the SYSTEM CONTEXT gives you a "DATABASE AGENT RESULT" with a total sum, use those exact numbers. Do not try to recalculate them.
    3. Understand the context. If the user asks about "this" or "it", refer to the RECENT CONVERSATION HISTORY.
    4. IF the context does not contain the answer, explicitly tell them: "I could not find any transactions matching your request."
    5. Do not hallucinate or guess. Keep the answer conversational and short.
    """

    print("🧠 Thinking... Sending retrieved context to LLM...")
    
    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": "openai/gpt-oss-120b:free", 
                "messages": [
                    {"role": "system", "content": "You are a financial AI agent."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.2 
            },
        )
        
        if response.status_code != 200:
            return {"answer": "The AI server is temporarily overloaded. Please try again."}

        result = response.json()
        final_answer = result["choices"][0]["message"]["content"]
        
        print("✅ LLM successfully generated a response!")
        return {"answer": final_answer}
        
    except Exception as e:
        print(f"❌ [FATAL ERROR] {e}")
        return {"answer": "My AI brain is currently offline. Please check the backend."}