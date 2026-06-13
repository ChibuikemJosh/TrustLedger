from fastapi import APIRouter, HTTPException, Depends
from schemas.schemas import CasualLaborPayoutRequest
from database.database import GraphService
from utils.dependencies import get_current_user  # Aligned import dependency targets
from datetime import datetime, timezone

router = APIRouter(tags=["Workforce Contracts"])
db = GraphService()

@router.post("/payout")
async def issue_workforce_settlement(payload: CasualLaborPayoutRequest, current_user: dict = Depends(get_current_user)):
    """Executes outbound payouts for field logistics providers or casual laborers."""
    user_id = current_user.get("id") or current_user.get("uid") or current_user.get("user_id")

    tx_structured_data = {
        "item": payload.narration,
        "amount": payload.amount,
        "quantity": 1,
        "unit": "contract_execution",
        "type": "CASUAL_LABOR_PAYOUT",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "notes": f"Disbursed straight to local node registration mobile link: {payload.worker_phone}",
        "associated_phone": payload.worker_phone,
        "verified": True, 
        "is_anomaly": False
    }

    try:
        updated_trust_score = db.log_transaction(user_id, tx_structured_data)
        return {
            "status": "success",
            "message": f"Escrow payout recorded. {payload.amount} NGN routed to mobile endpoint {payload.worker_phone}.",
            "merchant_updated_score": updated_trust_score
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Platform workforce payroll routing encountered ledger database faults: {str(e)}"
        )
