"""
Firebase Authentication Service Integration
Handles cryptographic validation of Google Firebase JSON Web Tokens (JWT).
"""
import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os

if not firebase_admin._apps:
    cred = credentials.Certificate(os.getenv("FIREBASE_CREDENTIALS_PATH", "serviceAccountKey.json"))
    firebase_admin.initialize_app(cred)

security = HTTPBearer()

def verify_firebase_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
    """
    Validates the incoming Firebase ID token sent from the frontend mobile/web client.
    Normalizes keys to 'id' to match downstream route expectations seamlessly.
    """
    token = credentials.credentials
    try:
        decoded_token = auth.verify_id_token(token)
        return {
            "id": decoded_token["uid"],  # Normalized explicitly to avoid key crashes
            "email": decoded_token.get("email", ""),
            "name": decoded_token.get("name", "Market Trader")
        }
    except Exception as e:
        raise HTTPException(
            status_code=401, 
            detail=f"Invalid or expired authentication token: {str(e)}"
        )
