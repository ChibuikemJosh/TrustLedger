import os
import uuid
import logging
import threading
from typing import Optional, Dict, Any

from ai_logic import process_voice_entry, update_job_status, get_job_status
# Assuming GraphService handles database persistence as built previously
from database.database import GraphService 

logger = logging.getLogger(__name__)

class VoiceProcessorService:
    def __init__(self):
        # Initialize database engine instance for downstream logging
        self.graph_service = GraphService()

    def enqueue_voice_job(self, user_id: str, local_file_path: str) -> str:
        """
        Registers an audio processing task in Redis and triggers an 
        asynchronous background thread to complete the AI transcription pipeline.
        """
        job_id = f"job_vo_tx_{uuid.uuid4().hex[:12].upper()}"
        
        # 1. Initialize the job state inside Redis cache
        update_job_status(
            job_id=job_id, 
            status="PENDING", 
            data={"user_id": user_id, "file_path": local_file_path}
        )
        
        # 2. Fire-and-forget execution thread to keep the API controller unblocked
        worker_thread = threading.Thread(
            target=self._run_async_pipeline, 
            args=(job_id, user_id, local_file_path)
        )
        worker_thread.daemon = True
        worker_thread.start()
        
        return job_id

    def _run_async_pipeline(self, job_id: str, user_id: str, file_path: str):
        """
        Background worker pipeline that processes audio, maps it to JSON, 
        persists it to the graph DB, and updates Redis statuses safely.
        """
        logger.info(f"Starting background voice processing for Job: {job_id}")
        
        try:
            # Step 1: Transition job state to processing
            update_job_status(job_id, status="PROCESSING", data={"user_id": user_id})

            # Step 2: Execute Groq Whisper + Llama Parser Pipeline
            structured_data = process_voice_entry(file_path)
            
            if not structured_data:
                raise ValueError("AI engine failed to parse or validate audio speech stream.")

            # Step 3: Persist structured transaction to Neo4j graph database
            # Maps fields: item, amount, quantity, unit, type, notes
            new_trust_score = self.graph_service.log_transaction(
                user_id=user_id, 
                tx_data=structured_data
            )
            
            # Enrich final data payload with context updates
            structured_data["recalculated_trust_score"] = new_trust_score

            # Step 4: Mark job as successfully completed
            update_job_status(job_id, status="COMPLETED", data=structured_data)
            logger.info(f"Successfully processed and logged voice transaction for Job: {job_id}")

        except Exception as e:
            logger.error(f"Critical failure handling voice processing job {job_id}: {str(e)}")
            update_job_status(job_id, status="FAILED", data={"error": str(e)})
            
        finally:
            # Step 5: Clean up the local audio asset from disk to prevent storage bloat
            self._safely_remove_file(file_path)

    def check_job_progress(self, job_id: str) -> Optional[Dict[str, Any]]:
        """
        Polling gateway called by client or WebSockets wrapper to fetch 
        current transformation state from cache.
        """
        return get_job_status(job_id)

    @staticmethod
    def _safely_remove_file(file_path: str):
        """Removes temporary files safely without breaking pipeline execution"""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"Cleaned up local file system node: {file_path}")
        except Exception as e:
            logger.warning(f"Failed to clear temp file context at {file_path}: {e}")