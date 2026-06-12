"""
AI Processing Routes
Handles Voice-to-JSON and Cloud Vision OCR processing via Groq and Firebase
"""
import os
import uuid
import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks, Depends

# Core AI & Service utilities
from services.ai_logic import process_voice_entry, update_job_status, get_job_status
from services.ocr_logic import process_ledger_image_v2  # Our new lightweight vision logic
from database.database import GraphService

from utils.helpers import save_temp_file
from utils.dependencies import get_current_user
from schemas.schemas import TransactionRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["AI Processing"])
graph_service = GraphService()


async def run_ai_pipeline(job_id: str, user_id: str, tmp_path: str):
    """Background task processing speech-to-text via Groq Whisper + Llama"""
    try:
        final_data = process_voice_entry(tmp_path)

        if final_data:
            # Safely persist and recalculate trust scores immediately inside the graph 
            new_score = graph_service.log_transaction(user_id, final_data)
            
            update_job_status(job_id, "completed", {
                "result": final_data,
                "new_score": new_score,
                "message": "Voice transaction successfully processed and logged."
            })
        else:
            update_job_status(job_id, "failed", {"error": "AI voice parsing failed"})

    except Exception as e:
        logger.error(f"Voice Task Worker {job_id} crashed: {str(e)}")
        update_job_status(job_id, "failed", {"error": "Internal Processing Error"})
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


async def run_ocr_pipeline(job_id: str, user_id: str, tmp_path: str):
    """Background task running Cloud-based Llama Vision processing"""
    try:
        with open(tmp_path, "rb") as f:
            file_bytes = f.read()

        # Call our new API-driven vision parser
        final_data = process_ledger_image_v2(file_bytes)

        if final_data:
            new_score = graph_service.log_transaction(user_id, final_data)

            update_job_status(job_id, "completed", {
                "result": final_data, 
                "new_score": new_score,
                "message": "Ledger image parsed and added to graph data sync loop."
            })
        else:
            update_job_status(job_id, "failed", {"error": "Vision OCR parsing failed"})

    except Exception as e:
        logger.error(f"Vision OCR Worker {job_id} crashed: {str(e)}")
        update_job_status(job_id, "failed", {"error": "Internal OCR Processing Error"})
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@router.post("/process-voice")
async def process_voice(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Accepts multipart audio payloads and assigns them to async thread pools"""
    resolved_user_id = current_user['id']  # Extracting safe Firebase UID from dependency

    # Validate file format instantly using helper logic footprint rules
    tmp_path = await save_temp_file(file)

    job_id = f"JOB_VOICE_{uuid.uuid4().hex[:8].upper()}"
    update_job_status(job_id, "processing")

    background_tasks.add_task(run_ai_pipeline, job_id, resolved_user_id, tmp_path)
    return {"status": "accepted", "job_id": job_id}


@router.post("/process-ledger")
async def process_ledger(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Accepts paper ledger snapshots and delegates them to the Groq Vision matrix"""
    resolved_user_id = current_user['id']

    tmp_path = await save_temp_file(file)

    job_id = f"JOB_VISION_{uuid.uuid4().hex[:8].upper()}"
    update_job_status(job_id, "processing")

    background_tasks.add_task(run_ocr_pipeline, job_id, resolved_user_id, tmp_path)
    return {"status": "accepted", "job_id": job_id}


@router.get("/status/{job_id}")
async def check_status(job_id: str):
    """Polling target endpoint for React clients tracking long-running tasks"""
    status = get_job_status(job_id)
    if not status:
        raise HTTPException(status_code=404, detail="Requested processing job ID not found or expired.")
    return status


@router.post("/confirm-transaction")
async def confirm_tx(data: TransactionRequest, current_user: dict = Depends(get_current_user)):
    """Explicit endpoint for manual modifications or ledger record commits"""
    user_id = current_user['id']
    
    if not graph_service.is_available():
        raise HTTPException(status_code=503, detail="Ecosystem graph database driver is offline.")

    new_score = graph_service.log_transaction(user_id, data.model_dump())
    
    return {
        "status": "success", 
        "new_score": new_score, 
        "message": "Transaction safely committed to TrustLedger."
    }