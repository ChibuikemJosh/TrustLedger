"""
Domain models and ID generation utilities for the TrustLedger Ecosystem.
Ensures globally unique, prefix-enforced identifiers to prevent tracking collisions.
"""
import uuid
import time
import random
from typing import Dict, Any


class IDGenerator:
    @staticmethod
    def generate_merchant_id(phone: str) -> str:
        """Generates a clean tracking ID for merchants using their clean mobile format"""
        clean_phone = phone.replace("+234", "0").strip()
        return f"TL-MID-{clean_phone}"

    @staticmethod
    def generate_product_id() -> str:
        """Generates an immutable, indexed product tracking slug"""
        random_suffix = "".join(random.choices("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", k=6))
        return f"TL-PRD-{int(time.time())}-{random_suffix}"

    @staticmethod
    def generate_payment_reference() -> str:
        """
        Generates a secure, chronological transaction signature.
        This reference is sent to OPay and must be matched precisely inside the webhook listener.
        """
        unique_hash = uuid.uuid4().hex[:8].upper()
        return f"TL-REF-{int(time.time())}-{unique_hash}"


class MarketUser:
    """Domain representation of a network node within the informal marketplace"""
    def __init__(self, user_id: str, name: str, email: str, role: str, location: dict, trust_score: int = 50):
        self.id = user_id
        self.name = name
        self.email = email
        self.role = role  # Merchant, Agent, Supplier
        self.city = location.get("city")
        self.state = location.get("state")
        self.country = location.get("country", "Nigeria")
        self.trust_score = trust_score

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "city": self.city,
            "state": self.state,
            "country": self.country,
            "trust_score": self.trust_score
        }