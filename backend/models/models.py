"""
Domain models and ID generation utilities for the TrustLedger Ecosystem.
Ensures globally unique, prefix-enforced identifiers to prevent tracking collisions.
"""
import uuid
import time
import secrets
from typing import Dict, Any

class IDGenerator:
    @staticmethod
    def generate_merchant_id(phone: str) -> str:
        """Generates a clean tracking ID for merchants using their standardized mobile format"""
        # Strip all whitespaces, hyphens, and leading plus characters
        clean = "".join(c for c in phone if c.isdigit())
        
        if clean.startswith("234") and len(clean) > 10:
            clean = "0" + clean[3:]
        elif not clean.startswith("0") and len(clean) == 10:
            clean = "0" + clean
            
        return f"TL-MID-{clean}"

    @staticmethod
    def generate_product_id() -> str:
        """Generates an immutable, indexed product tracking slug using cryptographically secure random suffixes"""
        # Cryptographically secure 8-character uppercase alpha-numeric string
        secure_suffix = "".join(secrets.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789") for _ in range(8))
        return f"TL-PRD-{int(time.time())}-{secure_suffix}"

    @staticmethod
    def generate_payment_reference() -> str:
        """
        Generates a secure, chronological transaction signature.
        This reference is sent to OPay and must be matched precisely inside the webhook listener.
        """
        unique_hash = uuid.uuid4().hex[:12].upper()
        return f"TL-REF-{int(time.time())}-{unique_hash}"


class MarketUser:
    """Domain representation of a network node within the informal marketplace"""
    def __init__(self, user_id: str, name: str, email: str, role: str, location: dict, trust_score: int = 50):
        self.id = user_id
        self.name = name
        self.email = email
        self.role = role  # Merchant, Agent, Supplier
        self.location = {
            "city": location.get("city"),
            "state": location.get("state"),
            "country": location.get("country", "Nigeria")
        }
        self.trust_score = trust_score

    def to_dict(self) -> Dict[str, Any]:
        """Converts domain properties into a structured dict matching GraphService input expectations"""
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "location": self.location,
            "trust_score": self.trust_score
        }
