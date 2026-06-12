import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os

# Initialize Firebase Admin SDK (reads from your serviceAccountKey.json)
if not firebase_admin._apps:
    cred = credentials.Certificate(os.getenv("FIREBASE_CREDENTIALS_PATH", "serviceAccountKey.json"))
    firebase_admin.initialize_app(cred)

security = HTTPBearer()

def verify_firebase_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
    """
    Validates the incoming Firebase ID token sent from the frontend.
    Extracts the user's Firebase UID and profile data.
    """
    token = credentials.credentials
    try:
        # Decodes and verifies the token using Google's public certificates
        decoded_token = auth.verify_id_token(token)
        return {
            "uid": decoded_token["uid"],
            "email": decoded_token.get("email"),
            "name": decoded_token.get("name")
        }
    except Exception as e:
        raise HTTPException(
            status_code=401, 
            detail=f"Invalid or expired authentication token: {str(e)}"
        )