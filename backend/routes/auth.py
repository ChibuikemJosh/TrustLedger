"""
Authentication & Profile Onboarding Routes
Handles Firebase token registration and profile mapping within Neo4j
"""
import logging
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse

from schemas.schemas import UserCreate, UserProfile, TierInfo, LocationSchema
from database.database import GraphService
from utils.dependencies import get_current_user  # Your updated Firebase dependency

logger = logging.getLogger(__name__)

# Configured with global prefix for structural routing clarity
router = APIRouter(prefix="/api/auth", tags=["Authentication"])
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
    
    # Extract the verified UID directly from the decoded Firebase Token dependency
    firebase_uid = current_user_token["id"]
    
    try:
        # Check if the node already exists in our Neo4j graph
        existing_profile = db.get_user_dashboard(firebase_uid)
        if existing_profile:
            return JSONResponse(
                status_code=400, 
                content={"detail": "This profile identity is already synchronized in the graph system."}
            )
        
        # Build transaction payload map without passing passwords!
        user_node_data = {
            "id": firebase_uid,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "city": user.location.city if user.location else "Unknown",
            "state": user.location.state if user.location else "Unknown",
            "country": user.location.country if user.location else "Nigeria",
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
            tier=TierInfo(name="New Entry", color="#2196F3", next_milestone=45)
        )
        
    except Exception as e:
        logger.error(f"Critical error registering Firebase user node: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to initialize user space inside ledger graph.")


@router.get("/me", response_model=UserProfile)
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Fetches the user's real-time dashboard data directly from the Neo4j 
    database using their active Firebase authorization token.
    """
    # At this stage, your get_current_user dependency has already successfully loaded 
    # the profile map from Neo4j! We simply structure it to fit the schema response contract.
    return UserProfile(
        id=current_user["id"],
        name=current_user.get("name", "Market Trader"),
        email=current_user.get("email", ""),
        role=current_user.get("role", "Trader"),
        location=LocationSchema(
            city=current_user.get("city", "Unknown"),
            state=current_user.get("state", "Unknown"),
            country=current_user.get("country", "Nigeria"),
        ),
        trust_score=current_user.get("trust_score", 43),
        tier=TierInfo(name="Active", color="#2196F3", next_milestone=50),
    )