"""
Voice Job Lifecycle Orchestration Service
Coordinates tracking operations and status reporting within the local Redis cache.
"""
import os
import logging
from typing import Optional, Dict, Any

from services.ai_logic import update_job_status, get_job_status
from services.database import GraphService  # Corrected absolute folder import path

logger = logging.getLogger(__name__)

class VoiceProcessorService:
    def __init__(self):
        self.graph_service = GraphService()

    def track_pending_job(self, job_id: str, user_id: str, local_file_path: str):
        """Initializes processing checkpoints inside Redis safely utilizing lowercase statuses."""
        update_job_status(
            job_id=job_id, 
            status="processing", 
            data={"user_id": user_id, "file_path": local_file_path}
        )

    def check_job_progress(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Queries Redis cache to fetch active generation results for long-polling React clients."""
        return get_job_status(job_id)

    @staticmethod
    def safely_remove_file(file_path: str):
        """Clears out temporary assets on disk to keep the processing node cleanly optimized."""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"Cleaned up local file system node at: {file_path}")
        except Exception as e:
            logger.warning(f"Failed to clear temp file context at {file_path}: {e}")
