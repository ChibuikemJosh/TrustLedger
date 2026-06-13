from fastapi import APIRouter, HTTPException, Depends
from schemas.schemas import TransactionRequest, DashboardResponse
from database.database import GraphService
from utils.dependencies import get_current_user  # Aligned import dependency targets

router = APIRouter(tags=["Ledger Transactions"])
db = GraphService()

@router.post("/log")
async def log_manual_transaction(tx_data: TransactionRequest, current_user: dict = Depends(get_current_user)):
    """Logs non-digital sales or offline operations ledger entries directly to the node network."""
    user_id = current_user.get("id") or current_user.get("uid") or current_user.get("user_id")
    try:
        new_score = db.log_transaction(user_id, tx_data.model_dump())
        return {
            "status": "success",
            "message": "Manual ledger entry processed successfully",
            "recalculated_trust_score": new_score
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to commit manual transaction payload: {str(e)}")

@router.put("/update/{tx_id}")
async def update_transaction(tx_id: str, new_data: TransactionRequest, current_user: dict = Depends(get_current_user)):
    """Modifies an unverified transaction. Rejects any mutations if locked via background OPay webhooks."""
    user_id = current_user.get("id") or current_user.get("uid") or current_user.get("user_id")

    if db.check_if_verified(tx_id):
        raise HTTPException(
            status_code=403, 
            detail="Security Violation: Historically finalized digital ledger states cannot be altered!"
        )

    try:
        success = db.update_transaction_node(tx_id, new_data.model_dump())
        if not success:
            raise HTTPException(status_code=404, detail="Target transaction identifier lookup returned empty.")

        new_score = db.recalculate_user_score(user_id)
        return {
            "status": "success",
            "message": "Transaction attributes modified successfully.",
            "new_score": new_score
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Downstream transaction patch routing crashed: {str(e)}")

@router.get("/dashboard", response_model=DashboardResponse)
async def fetch_user_dashboard_payload(current_user: dict = Depends(get_current_user)):
    """Fetches the full synchronized historical transaction list and core analytics score state."""
    user_id = current_user.get("id") or current_user.get("uid") or current_user.get("user_id")
    try:
        data = db.get_user_dashboard(user_id)
        if not data:
            raise HTTPException(status_code=404, detail="Dashboard operational profile node state missing.")
        return data
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to query current user dataset space: {str(e)}")
