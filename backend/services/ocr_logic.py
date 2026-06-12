import base64
import os
from typing import Optional, Dict, Any, cast
from groq import Groq
from pydantic import ValidationError
from schemas.schemas import TransactionRequest  # Reusing your existing schema contract

def _get_groq_client() -> Groq:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY environment variable is missing")
    return Groq(api_key=api_key)

def process_ledger_image_v2(file_bytes: bytes) -> Optional[Dict[str, Any]]:
    """
    Leverages an external vision model to perform visual OCR and structured 
    financial data extraction without loading heavy local binary layers.
    """
    try:
        # 1. Convert native image bytes into data string format
        base64_image = base64.b64encode(file_bytes).decode('utf-8')
        data_url = f"data:image/jpeg;base64,{base64_image}"
        
        client = _get_groq_client()
        
        # 2. Single-pass instruction prompt for extracting and structuring data
        prompt = """
        You are an expert Nigerian Market Bookkeeper. Read the text inside this ledger image 
        (informal English or Nigerian Pidgin) and extract structured transaction data.
        
        STRICT UNIT CATEGORIZATION:
        Identify the unit of measurement. Common Nigerian units include:
        - "Bag" (e.g., 50kg bag, small bag)
        - "Derica" (Common for rice, beans, garri)
        - "Paint" (Paint bucket/rubber)
        - "Crate" (For eggs)
        - "Kilo/KG" (For meat/frozen foods)
        - "Piece/Unit" (For single items like bread, phone chargers)
        - "Carton" (For noodles, drinks)
        
        STRICT RULES:
        - Identify the unit ('Bag', 'Derica', 'Paint', 'Crate', 'Kilo/KG', 'Carton', or 'item').
        - Convert 'k' representations to thousands (e.g. 5k -> 5000).
        - Categorize exclusively as 'SALE' or 'EXPENSE'.
        - Default quantity to 1 if unspecified.
        
        Return ONLY valid JSON matched directly to this template schema:
        {"item": str, "amount": float, "quantity": int, "unit": str, "type": "SALE" | "EXPENSE", "notes": str}
        """

        # 3. Request multi-modal text extraction from Groq's Vision engine
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
            temperature=0.0  # Clear deterministic extraction accuracy
        )

        content = chat_completion.choices[0].message.content if chat_completion.choices else ""
        
        if not content:
            return None
            
        # 4. Parse payload through validation schemas
        import json
        raw_data = json.loads(content)
        validated_data = TransactionRequest(**raw_data)
        
        return validated_data.model_dump()

    except (ValidationError, Exception) as e:
        print(f"❌ Clean Cloud Vision API Processing Error: {e}")
        return None