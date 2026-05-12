from fastapi import APIRouter, Depends, Request, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from models.schemas import TrackingEventSchema, GenericResponse
from db.connection import get_db
from db.models import WatchEvent, User

router = APIRouter()

async def trigger_realtime_update(request: Request, user_id: str, movie_id: str):
    """"
    Clears user rec cache and queues a realtime WebSocket push.
    """
    cache = request.app.state.cache
    if cache:
        # Purge existing cached recommendations for this user
        # We can use pattern matching or targeted deletion
        keys = await cache.keys(f"recs:{user_id}:*")
        if keys:
            await cache.delete(*keys)
            
    # For now, WebSockets will just listen. Real integration pending.
    pass

@router.post("/watch", response_model=GenericResponse)
async def log_watch_event(
    event: TrackingEventSchema,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Log a watch event. This updates the DB and triggers
    background task to re-calculate neural recommendations.
    """
    try:
        user_id = int(event.user_id)
        movie_id = int(event.item_id)
        
        # In a real app we would check if user exists or mock it
        # Assume user and movie existence, insert watch event
        # (Using minimal implementation here based on our SQL definitions)
        watch_event = WatchEvent(
            user_id=user_id,
            movie_id=movie_id,
            watch_time=event.metadata.get("watch_time", 0) if event.metadata else 0,
            completed=event.metadata.get("completed", False) if event.metadata else False
        )
        db.add(watch_event)
        await db.commit()
        
        # Trigger an async push/invalidation
        background_tasks.add_task(trigger_realtime_update, request, event.user_id, event.item_id)
        
        return GenericResponse(message="Watch event successfully tracked.")
    except Exception as e:
        return GenericResponse(message="Failed to log watch event", error_id=str(e))
