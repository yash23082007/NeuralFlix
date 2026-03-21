from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from utils.trakt_api import get_trakt_auth_url, exchange_trakt_code, fetch_trakt_watch_history
from database import watch_history_collection
# For postgres future integration, one would use:
# from models.sql_models import SessionLocal, PostgresUserInteraction

router = APIRouter()

class SyncResponse(BaseModel):
    message: str
    movies_synced: int

@router.get("/auth-url")
def get_auth_url():
    """Returns the Trakt login OAuth URL."""
    return {"url": get_trakt_auth_url()}

@router.post("/callback")
async def handle_callback(code: str, user_id: str):
    """
    Exchanges the authorized Trakt code for a permanent access token.
    Then immediately starts a background task or syncs watch history for the ML engine.
    """
    token_response = await exchange_trakt_code(code)
    
    if "error" in token_response:
        raise HTTPException(status_code=400, detail=token_response["error"])
        
    access_token = token_response.get("access_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="Invalid token exchange")
        
    # We could store this token securely in the database for future background syncs
    # but for now, we immediately fetch history to populate the hybrid recommender
    
    history_data = await fetch_trakt_watch_history(access_token)
    
    # Process history and map it to our internal database structure
    synced_count = 0
    history_docs = []
    
    for item in history_data:
        tmdb_id = item.get("movie", {}).get("ids", {}).get("tmdb")
        if not tmdb_id:
            continue
            
        history_docs.append({
            "user_id": user_id,
            "movie_id": str(tmdb_id),
            "source": "trakt_import",
            "watched_at": item.get("watched_at")
        })
        synced_count += 1
        
    if history_docs:
        # Example MongoDB insert (would transition to Postgres tracking_events later)
        try:
            for doc in history_docs:
                watch_history_collection.update_one(
                    {"user_id": doc["user_id"], "movie_id": doc["movie_id"]},
                    {"$set": doc},
                    upsert=True
                )
        except Exception:
            pass

    return {
        "message": "Trakt Account Linked Successfully", 
        "movies_synced": synced_count,
        "access_token": access_token  # In a real app, do not return this to client, store HTTP-only
    }
