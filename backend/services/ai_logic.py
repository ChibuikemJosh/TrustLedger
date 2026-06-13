"""
AI Conversational Logic Engine
Wraps Groq Whisper and Llama inference vectors with normalized Nigerian market metrics.
"""
import json
import os
from typing import Optional, Any, cast, Dict
from dotenv import load_dotenv

from pydantic import ValidationError
from groq import Groq
import httpx
import redis

from schemas.schemas import TransactionRequest

http_client = httpx.Client()
load_dotenv()

# Connect to local Redis configuration instance pool
r = redis.Redis(host=os.getenv("REDIS_HOST", "localhost"), port=6379, decode_responses=True)


def update_job_status(job_id: str, status: str, data: Optional[Any] = None):
    """Updates active background task transformation progress data state inside Redis."""
    job_key = f"job:{job_id}"
    # Standardized to strictly lowercase values to perfectly align with frontend validation requirements
    r.hset(job_key, mapping={"status": status.lower(), "data": json.dumps(data) if data else ""})
    r.expire(job_key, 3600)


def get_job_status(job_id: str) -> Optional[Dict[str, Any]]:
    """Fetches real-time transaction assembly pipeline coordinates from Redis cache."""
    job_key = f"job:{job_id}"
    job = r.hgetall(job_key)

    if not job:
        return None

    job = cast(Dict[str, Any], job)
    data_str = job.get("data", "") or ""
    if data_str:
        try:
            parsed = json.loads(data_str)
        except json.JSONDecodeError:
            parsed = {}
    else:
        parsed = {}

    job["data"] = parsed
    return job


def _get_client() -> Groq:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY environment variables are missing.")
    return Groq(api_key=api_key, http_client=http_client)


def transcribe_audio(file_path: str) -> str:
    """Transforms raw audio streams into natural text strings using Groq Whisper-Large."""
    client = _get_client()

    try:
        file_path = file_path.strip('"') or ""
        if not file_path.endswith(('.mp3', '.wav', '.m4a', '.ogg', '.flac', '.mpeg', '.mpga', '.mp4', '.webm')):
            raise Exception("Unsupported mobile audio encoding wrapper type format.")
            
        with open(file_path, "rb") as file:
            transcription = client.audio.transcriptions.create(
                file=(file_path, file.read()),
                model="whisper-large-v3-turbo", 
                response_format="text",         
                language="en"                   
            )
            return str(transcription)
    except Exception as e:
        print(f"❌ Transcription Pipeline Fault: {e}")
        return ""


def parse_voice_to_json(transcription_text: str) -> Optional[dict]:
    """Processes unformatted market speech strings into strict system financial data parameters."""
    prompt = f"""
    You are an expert Nigerian Market Bookkeeper for the TrustLedger platform.
    Your goal is to turn informal market talk (Either English or Nigerian Pidgin) into structured financial data.

    STRICT UNIT CATEGORIZATION:
    Identify the unit of measurement. Common Nigerian units include:
    - "Bag" (e.g., 50kg bag, small bag)
    - "Derica" (Common for rice, beans, garri)
    - "Paint" (Paint bucket/rubber)
    - "Crate" (For eggs)
    - "Kilo/KG" (For meat/frozen foods)
    - "Piece/Unit" (For single items like bread, phone chargers)
    - "Carton" (For noodles, drinks)

    EXAMPLES:
    User: "I sell one paint of garri for 3500"
    Expected JSON: {{"item": "garri", "amount": 3500.00, "quantity": 1, "unit": "paint", "type": "SALE", "notes": ""}}

    User: "Buy two derica of rice 2400 naira"
    Expected JSON: {{"item": "rice", "amount": 2400.00, "quantity": 2, "unit": "derica", "type": "EXPENSE", "notes": ""}}

    PIDGIN CONTEXT EXAMPLES:
    - "I don sell market" -> SALE
    - "I buy market" -> EXPENSE
    - "Customer neva pay" -> SALE (but mark notes as 'Pending')
    - "Waybill money" -> EXPENSE (item: 'Delivery/Waybill')

    INPUT TO PROCESS:
    "{transcription_text}"

    INSTRUCTIONS:
    - Return ONLY valid JSON. Do not add any backticks or formatting.
    - If unit is unspecified, default to "item".
    - Convert 'k' strings into thousands (e.g., 12k -> 12000).
    - Default quantity parameters to 1.

    Return ONLY JSON in this layout:
    {{"item": str, "amount": float, "quantity": int, "unit": str, "type": "SALE" | "EXPENSE", "notes": str}}
    """

    client = _get_client()
    chat_completion = client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model="llama-3.3-70b-versatile",
        response_format={"type": "json_object"},
    )

    content = chat_completion.choices[0].message.content if chat_completion.choices else ""

    try:
        raw_data = json.loads(content)
        validated_data = TransactionRequest(**raw_data)
        return validated_data.model_dump() 
    except (json.JSONDecodeError, ValidationError) as e:
        print(f"Validation Error processing text extraction mapping: {e}")
        return None


def process_voice_entry(audio_file_path: str) -> Optional[dict]:
    """Orchestrates the continuous Voice Execution Pipeline: Audio -> Text -> Structured Dict."""
    raw_text = transcribe_audio(audio_file_path)
    if not raw_text:
        return None
    return parse_voice_to_json(raw_text)
