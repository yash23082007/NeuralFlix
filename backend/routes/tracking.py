from fastapi import APIRouter, Request, BackgroundTasks
from models.schemas import TrackingEventSchema, GenericResponse

router = APIRouter()

# Optional PostgreSQL dependencies
_has_pg = False
try:
    import os
    if os.getenv("NEURALFLIX_DEMO_MODE", "true").lower() != "true":
        from sqlalchemy.ext.asyncio import AsyncSession
        from db.connection import get_db
        from db.models import WatchEvent
        _has_pg = True
except Exception:
    pass

async def trigger_realtime_update(request: Request, user_id: str, movie_id: str):
    """Clears user rec cache and queues a realtime WebSocket push."""
    cache = getattr(request.app.state, "redis", None)
    if cache:
        try:
            keys = await cache.keys(f"recs:{user_id}:*")
            if keys:
                await cache.delete(*keys)
        except Exception:
            pass

@router.post("/watch")
async def log_watch_event(
    event: TrackingEventSchema,
    request: Request,
    background_tasks: BackgroundTasks,
):
    """
    Log a watch event. Uses PostgreSQL if available, otherwise in-memory DB.
    """
    try:
        if _has_pg:
            async for session in get_db():
                watch_event = WatchEvent(
                    user_id=int(event.user_id),
                    movie_id=int(event.item_id),
                    watch_time=event.metadata.get("watch_time", 0) if event.metadata else 0,
                    completed=event.metadata.get("completed", False) if event.metadata else False,
                )
                session.add(watch_event)
                await session.commit()
        else:
            from database import watch_history_collection
            watch_history_collection.insert_one({
                "user_id": str(event.user_id),
                "movie_id": str(event.item_id),
                "watch_time": event.metadata.get("watch_time", 0) if event.metadata else 0,
                "completed": event.metadata.get("completed", False) if event.metadata else False,
            })

        background_tasks.add_task(trigger_realtime_update, request, event.user_id, event.item_id)
        return GenericResponse(message="Watch event successfully tracked.")
    except Exception as e:
        return GenericResponse(message="Failed to log watch event", error_id=str(e))
