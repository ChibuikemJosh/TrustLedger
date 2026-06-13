"""
Cloud Vision Optical Character Recognition Engine
Converts physical ledger paper photos into structured transaction entries via Groq Vision.
"""
import base64
import os
import json
from typing import Optional, Dict, Any, cast
from groq import Groq
from pydantic import ValidationError
from schemas.schemas import TransactionRequest 

def _get_groq_client() -> Groq:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY environment variable is missing")
    return Groq(api_key=api_key)

def process_ledger_image_v2(file_bytes: bytes) -> Optional[Dict[str, Any]]:
    """Performs lightning-fast multi-modal ledger reading processing via the cloud interface."""
    try:
        base64_image = base64.b64encode(file_bytes).decode('utf-8')
        data_url = f"data:image/jpeg;base64,{base64_image}"

        client = _get_groq_client()

        prompt = """
        You are an expert Nigerian Market Bookkeeper. Read the text inside this ledger image 
        (informal English or Nigerian Pidgin) and extract structured transaction data.
        
        STRICT UNIT CATEGORIZATION RULES:
        Identify the unit of measurement ('Bag', 'Derica', 'Paint', 'Crate', 'Kilo/KG', 'Carton', or 'item').
        Convert 'k' values into thousands (e.g. 4.5k -> 4500).
        Categorize exclusively as 'SALE' or 'EXPENSE'.
        Default quantity metrics to 1 if unspecified.
        
        Return ONLY valid JSON matched directly to this template schema:
        {"item": str, "amount": float, "quantity": int, "unit": str, "type": "SALE" | "EXPENSE", "notes": str}
        """

        messages = cast(Any, [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": data_url}}
                ]
            }
        ])

        chat_completion = client.chat.completions.create(
            model="llama-3.2-11b-vision-preview",
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.0  
        )

        content = chat_completion.choices[0].message.content if chat_completion.choices else ""
        if not content:
            return None

        raw_data = json.loads(content)
        validated_data = TransactionRequest(**raw_data)
        return validated_data.model_dump()

    except (ValidationError, Exception) as e:
        print(f"❌ Clean Cloud Vision API Processing Error: {e}")
        return None
