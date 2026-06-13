"""
Authentication & Profile Onboarding 
Handles Firebase token registration and profile mapping within Neo4j
"""
import logging
from fastapi import APIRouter, HTTPException, Depends

from schemas.schemas import UserCreate, UserProfile, TierInfo, LocationSchema
from database.database import GraphService  # Fixed import location to match services folder
from utils.dependencies import get_current_user

logger = logging.getLogger(__name__)

# NOTE: Since main.py already attaches this with prefix="/auth", 
# keeping a secondary prefix here would make the route "/auth/api/auth/sync-onboarding".
# We clean this up to just use the default router endpoints.
router = APIRouter(tags=["Authentication"])
db = GraphService()

def _ensure_db_available():
    if not db.is_available():
        raise HTTPException(
            status_code=503, 
            detail="TrustLedger graph core engine is currently offline."
        )


@router.post("/sync-onboarding", response_model=UserProfile)
async def sync_onboarding(user: UserCreate, current_user_token: dict = Depends(get_current_user)):
    """
    Triggers right after frontend Firebase sign-up. Takes the verified Firebase 
    UID context and saves the metadata profile as a node inside Neo4j.
    """
    _ensure_db_available()
    
    # Extract the verified UID safely supporting multiple token key shapes
    firebase_uid = current_user_token.get("id") or current_user_token.get("uid") or current_user_token.get("user_id")
    if not firebase_uid:
        raise HTTPException(status_code=401, detail="Invalid token structure: UID missing.")
    
    try:
        # Check if the node already exists in our Neo4j graph
        existing_profile = db.get_user_dashboard(firebase_uid)
        if existing_profile:
            # Fixed: Raised an HTTPException instead of returning JSONResponse to prevent response validation crashes
            raise HTTPException(
                status_code=400, 
                detail="This profile identity is already synchronized in the graph system."
            )
        
        # Build transaction payload map with location defaults
        user_node_data = {
            "id": firebase_uid,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "location": {
                "city": user.location.city if user.location else "Unknown",
                "state": user.location.state if user.location else "Unknown",
                "country": user.location.country if user.location else "Nigeria",
            },
            "trust_score": 43  # Standard base onboarding score
        }
        
        # Save the structured user details into Neo4j
        db.create_user_node(user_node_data)
        
        return UserProfile(
            id=firebase_uid,
            name=user.name,
            email=user.email,
            role=user.role,
            location=user.location,
            trust_score=43,
            tier=TierInfo(name="Growing Node", color="#9C1908", next_milestone=60)
        )
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Critical error registering Firebase user node: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to initialize user space inside ledger graph.")


@router.get("/me", response_model=UserProfile)
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Fetches the user's real-time dashboard data directly from the Neo4j 
    database using their active Firebase authorization token.
    """
    user_id = current_user.get("id") or current_user.get("uid") or current_user.get("user_id")
    
    return UserProfile(
        id=str(user_id),
        name=current_user.get("name", "Market Trader"),
        email=current_user.get("email", ""),
        role=current_user.get("role", "Merchant"),
        location=LocationSchema(
            city=current_user.get("city", "Unknown"),
            state=current_user.get("state", "Unknown"),
            country=current_user.get("country", "Nigeria"),
        ),
        trust_score=current_user.get("trust_score", 43),
        tier=TierInfo(name="Growing Node", color="#9C1908", next_milestone=60),
    )
