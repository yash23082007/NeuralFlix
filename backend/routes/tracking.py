from fastapi import APIRouter, HTTPException, BackgroundTasks
from models.schemas import TrackingEventSchema, SearchTrackSchema
from database import SessionLocal
from datetime import datetime
from sqlalchemy import text
import json

router = APIRouter()

def log_event_to_postgres(event_data: dict):
    if not SessionLocal:
        print("⚠️ Database not configured. Skipping event log:")
        print(event_data)
        return
        
    try:
        with SessionLocal() as db:
            # Ensure table exists (in production use Alembic migrations)
            db.execute(text("""
                CREATE TABLE IF NOT EXISTS tracking_events (
                    id SERIAL PRIMARY KEY,
                    user_id TEXT,
                    event_type TEXT,
                    item_id TEXT,
                    event_metadata JSONB,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
            """))
            db.commit()
            
            # Insert the event
            query = text("""
                INSERT INTO tracking_events (user_id, event_type, item_id, event_metadata, created_at)
                VALUES (:user_id, :event_type, :item_id, :event_metadata, :created_at)
            """)
            db.execute(query, {
                "user_id": event_data["user_id"],
                "event_type": event_data["event_type"],
                "item_id": event_data["item_id"],
                "event_metadata": json.dumps(event_data["event_metadata"]) if event_data["event_metadata"] else None,
                "created_at": event_data["created_at"]
            })
            db.commit()
    except Exception as e:
        print(f"❌ Error logging to PostgreSQL: {e}")

@router.post("/event")
async def track_event(event: TrackingEventSchema, background_tasks: BackgroundTasks):
    """General endpoint to log a click, watch, or generic event."""
    event_data = {
        "user_id": event.user_id,
        "event_type": event.event_type,
        "item_id": event.item_id,
        "event_metadata": event.metadata,
        "created_at": datetime.utcnow()
    }
    # Log in the background so API remains fast
    background_tasks.add_task(log_event_to_postgres, event_data)
    
    return {"status": "success", "message": "Event tracked in PostgreSQL"}

@router.post("/search")
async def track_search(search_info: SearchTrackSchema, background_tasks: BackgroundTasks):
    """Track a specific search query to build user interest profiles"""
    event_data = {
        "user_id": search_info.user_id,
        "event_type": "search",
        "item_id": None,
        "event_metadata": {
            "query": search_info.query,
            "results_count": search_info.results_count
        },
        "created_at": datetime.utcnow()
    }
    background_tasks.add_task(log_event_to_postgres, event_data)
    
    return {"status": "success", "message": "Search tracked in PostgreSQL"}
