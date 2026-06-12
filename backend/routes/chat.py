"""
AI Chat and Financial Insight Query Engine Route
Translates natural speech or text strings into database analytics execution vectors.
"""
import logging
from typing import LiteralString, cast
from fastapi import APIRouter, HTTPException, Depends
from schemas.schemas import ChatRequest, ErrorResponse
from services.ai_logic import transcribe_audio, _get_client
from database.database import GraphService
from utils.dependencies import get_current_user

router = APIRouter(prefix="/api/chat", tags=["AI Conversational Analytics"])
logger = logging.getLogger(__name__)
db = GraphService()


@router.post("/", responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}})
async def chat_with_records(data: ChatRequest, current_user: dict = Depends(get_current_user)):
    """
    Accepts text queries or processing files, executes dynamic graph schema conversions, 
    and outputs localized conversational insights.
    """
    user_id = current_user['id']  # Extracting verified Firebase UID string context
    
    # 1. Handle Voice Audio conversions first if path exists
    user_query = data.message
    if data.voice_path:
        # Utilizing Groq's high-speed Whisper instance engine
        user_query = transcribe_audio(data.voice_path)
    
    if not user_query or not user_query.strip():
        raise HTTPException(
            status_code=400, 
            detail="Could not detect or compile an active query string from text or speech."
        )

    # 2. Convert natural dialogue into a standard Neo4j query string
    cypher_query = generate_cypher(user_query, user_id)
    
    # Standardize string formatting outputs from LLM response layers
    cypher_query = (
        cypher_query
        .replace("```cypher", "")
        .replace("```json", "")
        .replace("```", "")
        .strip()
    )
    
    # 3. Securely query the graph space isolation block
    try:    
        # Ensure session tokens open and close predictably 
        with db.get_session() as session:
            result = session.run(cast(LiteralString, cypher_query)).data()
    except Exception as e:
        logger.error(f"Failed to execute compiled Cypher payload: {str(e)} | Rendered query: {cypher_query}")
        result = []  # Fallback vector so summarize_results can informatively exit

    # 4. Synthesize data rows back into localized text responses
    answer = summarize_results(user_query, result)
    
    return {
        "query": user_query, 
        "compiled_cypher": cypher_query, 
        "answer": answer
    }


def generate_cypher(user_query: str, user_id: str) -> str:
    client = _get_client()
    prompt = f"""
    You are a Neo4j Cypher expert for the TrustLedger platform. 
    Convert the user's question into a strict Cypher query.
    SCHEMA RULES:
    - Node labels: (:User {{id: str}}) and (:Transaction {{amount: float, type: str, item: str, timestamp: str, verified: boolean}})
    - Standard mapping: (:User)-[:PERFORMED]->(:Transaction)

    STRICT RUNTIME PROTOCOLS:
    1. ONLY return the plain Cypher query string. No preamble, markdown syntax wrappers, or explanations.
    2. The current calendar year is 2026.
    3. 'SALE' increases balance parameters; 'EXPENSE' decreases them.
    4. Handle Nigerian Pidgin: 
        - "How much I get" or "wetin be my balance" means sum of SALE minus sum of EXPENSE.
        - "Wetin I sell" means List items where type='SALE'.
        - "I don pay" means check verified=true.
    5. Filter ONLY transactions for user: MATCH (u:User {{id: '{user_id}'}})
    6. Only use safe operations: MATCH, WHERE, RETURN. Never write DELETE, DETACH, or REMOVE commands.
    7. You are only allowed to query the transactions of the user with id = {user_id}. Do not attempt to query other users.
    8. You can only match, update and return do not delete data.
    9. If the user asks for a time range, use the 'timestamp' field
        - "last month" means transactions from 2025-12
        - "this year" means transactions from 2026-01-01 to 2026-12-31
        - "last week" means transactions from the last 7 days

    PIDGIN TRANSLATION LEXICON MAP:
    - "How much I get" / "wetin be my balance" -> SUM of SALE minus SUM of EXPENSE
    - "Wetin I sell" -> FILTER where type = 'SALE'
    - "I don pay" -> Check where verified = true

    Return ONLY the Cypher string. Do not explain.
    Example: "How much did I make in Dec?" -> MATCH (u:User {{id: '{user_id}'}})-[:PERFORMED]->(t:Transaction) WHERE t.type = 'SALE' AND t.timestamp CONTAINS '2025-12' RETURN sum(t.amount) as total
    USER_ID TO QUERY: "{user_id}"
    USER_QUESTION: "{user_query}"
    """
    response = client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model="llama-3.3-70b-versatile",
        temperature=0.0  # Force strict code generation syntax without creative variance
    )
    return response.choices[0].message.content or ""


def summarize_results(user_query: str, result_data: list) -> str:
    client = _get_client()
    prompt = f"""
    User Voice/Text entry statement: "{user_query}"
    Graph execution tabular data outputs: {result_data}

    Act as a witty, helpful Nigerian market ledger bookkeeping advisor. 
    Summarize the database results clearly. Mix professional English with welcoming, conversational 
    Nigerian Pidgin naturally where it fits. 

    If the database array payload is empty, warmly tell the user that no records matched 
    their criteria. End on an encouraging note about their sales growth and business velocity!
    """
    response = client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model="llama-3.3-70b-versatile",
        temperature=0.4
    )
    return response.choices[0].message.content or "Ezza, I couldn't compute that record loop. Try again."