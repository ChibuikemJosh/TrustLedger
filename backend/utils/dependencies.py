from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth, exceptions
from database.database import GraphService  # Your updated Neo4j class

# Use HTTPBearer to handle standard Authorization: Bearer <token> headers
security = HTTPBearer()
db = GraphService()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
    """
    FastAPI security dependency. Validates the incoming Firebase ID token
    and verifies the corresponding participant node exists in Neo4j.
    """
    token = credentials.credentials
    try:
        # 1. Verify token signature and expiration against Google's public keys
        decoded_token = auth.verify_id_token(token)
        firebase_uid = decoded_token["uid"]
        
        # 2. Fetch the corresponding profile information from your Neo4j Graph
        # Note: Ensure your GraphService has a clean read method for fetching profile data
        user_profile = db.get_user_dashboard(firebase_uid)
        
        if not user_profile:
            raise HTTPException(
                status_code=404, 
                detail="Authentication token verified, but no matching User profile exists in TrustLedger."
            )
            
        # Append the explicit firebase_uid into the profile payload for routing utility
        user_profile["id"] = firebase_uid
        return user_profile

    except exceptions.FirebaseError as e:
        raise HTTPException(
            status_code=401, 
            detail=f"Invalid or expired security token: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Internal authentication system exception: {str(e)}"
        )