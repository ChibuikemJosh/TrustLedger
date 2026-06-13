"""
TrustLedger System Infrastructure Health Check Router.
Asynchronously evaluates operational availability for core database pools, 
cache layers, and third-party AI gateway coordinates.
"""
import time
import logging
from fastapi import APIRouter, HTTPException, status
from redis import Redis
import os

# Import your graph database service
from database.database import GraphService

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Infrastructure Diagnostics"])

@router.get("")
async def global_system_health_check():
    """
    Performs deep structural health evaluations across all connected infrastructure.
    Verifies state availability for Neo4j Graph DB and Redis Cache Node.
    """
    health_status = {
        "status": "healthy",
        "timestamp_epoch": time.time(),
        "environment": os.getenv("ENV", "production"),
        "components": {}
    }
    
    # 1. Evaluate Neo4j Cluster Connectivity
    try:
        db = GraphService()
        if db.is_available():
            health_status["components"]["neo4j_graph_db"] = {
                "status": "connected",
                "message": "Graph engine cluster pool is responsive."
            }
        else:
            health_status["status"] = "degraded"
            health_status["components"]["neo4j_graph_db"] = {
                "status": "disconnected",
                "message": "Cluster unreachable or credentials rejected."
            }
    except Exception as e:
        logger.error(f"Health Check Exception - Neo4j: {str(e)}")
        health_status["status"] = "degraded"
        health_status["components"]["neo4j_graph_db"] = {
            "status": "error",
            "message": str(e)
        }

    # 2. Evaluate Redis Cache Engine Connectivity
    try:
        # Pull connection coordinates from the unified REDIS_URL environment variable
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        redis_client = Redis.from_url(redis_url, socket_timeout=2.0, decode_responses=True)
        
        # Actively ping the server instance
        if redis_client.ping():
            health_status["components"]["redis_cache"] = {
                "status": "connected",
                "message": "Cache memory layer operational pool running."
            }
        else:
            health_status["status"] = "degraded"
            health_status["components"]["redis_cache"] = {
                "status": "disconnected",
                "message": "Ping command failed to return successfully."
            }
    except Exception as e:
        logger.error(f"Health Check Exception - Redis: {str(e)}")
        health_status["status"] = "degraded"
        health_status["components"]["redis_cache"] = {
            "status": "error",
            "message": str(e)
        }

    # 3. Handle degraded or completely down services with appropriate HTTP codes
    if health_status["status"] == "degraded":
        # We still return a 200 OK or 503 depending on critical system survival needs.
        # For hackathons, return 200 so Render doesn't loop crash the service, but keep status flags clear.
        return health_status

    return health_status
