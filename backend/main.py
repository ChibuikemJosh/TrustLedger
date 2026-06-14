"""
TrustLedger Core Execution Engine
Main entry point orchestrating structural routing modules, global CORS filters, and pool connections.
"""
import os
import json
import logging
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Resource Routing Closures
from routes.auth import router as auth_router
from routes.transactions import router as tx_router
from routes.gigs import router as gigs_router
from routes.ai import router as ai_router
from routes.chat import router as chat_router
from routes.health import router as health_router  # Imported the dedicated health checking router

from database.database import GraphService

load_dotenv()  # Load environment variables from .env file

# 2. CRITICAL FIX: Explicitly initialize the default Firebase App globally right here!
if not firebase_admin._apps:
    fb_json = os.getenv("FIREBASE_CONFIG_JSON_STRING")
    if fb_json:
        try:
            # Parse the direct key string from Render's dashboard environment variables
            cred_dict = json.loads(fb_json)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
            logging.info("Firebase Admin SDK initialized successfully via Config String.")
        except Exception as e:
            logging.error(f"Failed to parse FIREBASE_CONFIG_JSON_STRING: {str(e)}")
    else:
        # Fallback for your local file workspace configuration
        if os.path.exists("serviceAccountKey.json"):
            cred = credentials.Certificate("serviceAccountKey.json")
            firebase_admin.initialize_app(cred)
            logging.info("Firebase Admin SDK initialized successfully via local JSON file.")
        else:
            logging.critical("CRITICAL: No Firebase configuration credentials found!")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="TrustLedger Core API",
    description="Optimized Payments & Supply Chain Graph System",
    version="1.0.0"
)

# Cross-Origin Resource Sharing (CORS) Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this to your specific frontend URL for production deployments
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Validates Neo4j Graph Database operational availability on app initialization."""
    db = GraphService()
    if db.is_available():
        logger.info("Successfully connected to the Neo4j graph database pool.")
    else:
        logger.warning("Neo4j database cluster is currently unreachable.")

# Structural Routing Dispatches
app.include_router(health_router, prefix="/health")  # Mounted deep health checks to /health
app.include_router(auth_router, prefix="/auth")
app.include_router(tx_router, prefix="/transactions")
app.include_router(gigs_router, prefix="/gigs")
app.include_router(ai_router, prefix="/ai")
app.include_router(chat_router, prefix="/chat")
