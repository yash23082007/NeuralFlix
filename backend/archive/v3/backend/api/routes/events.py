import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

logger = logging.getLogger("EVENTS")

router = APIRouter(prefix="/events", tags=["Events"])


class WatchEvent(BaseModel):
    user_id: str
    movie_id: Optional[str] = None
    item_id: Optional[str] = None
    media_type: str = "movie"
    watch_duration: int = 0
    completed: bool = False

    def model_post_init(self, __context):
        if not self.movie_id and self.item_id:
            self.movie_id = self.item_id
        elif not self.item_id and self.movie_id:
            self.item_id = self.movie_id


class RateEvent(BaseModel):
    user_id: str
    movie_id: Optional[str] = None
    item_id: Optional[str] = None
    rating: float
    media_type: str = "movie"

    def model_post_init(self, __context):
        if not self.movie_id and self.item_id:
            self.movie_id = self.item_id
        elif not self.item_id and self.movie_id:
            self.item_id = self.movie_id


class SearchEvent(BaseModel):
    user_id: str
    query: str
    results_count: int = 0


class ClickEvent(BaseModel):
    user_id: str
    movie_id: Optional[str] = None
    item_id: Optional[str] = None
    source: str = "recommendation"

    def model_post_init(self, __context):
        if not self.movie_id and self.item_id:
            self.movie_id = self.item_id
        elif not self.item_id and self.movie_id:
            self.item_id = self.movie_id


def _log_event(event_type: str, data: dict):
    logger.info(f"[EVENT] {event_type}: {data}")
    try:
        from database import watch_history_collection
        doc = {
            "event_type": event_type,
            "timestamp": datetime.utcnow().isoformat(),
            **data,
        }
        watch_history_collection.insert_one(doc)
    except Exception as e:
        logger.warning(f"Failed to persist event: {e}")


@router.post("/watch")
async def log_watch(event: WatchEvent, background: BackgroundTasks):
    background.add_task(_log_event, "watch", event.model_dump())
    try:
        from api.websocket import manager
        if int(event.user_id) in manager.connections:
            from utils.recommendation_engine import hybrid_recommendation
            recs = await hybrid_recommendation(
                movie_id=event.movie_id,
                user_id=event.user_id,
                limit=12,
            )
            await manager.push_recommendations(int(event.user_id), recs)
    except Exception:
        pass
    return {"status": "logged"}


@router.post("/rate")
async def log_rate(event: RateEvent, background: BackgroundTasks):
    background.add_task(_log_event, "rate", event.model_dump())
    return {"status": "logged"}


@router.post("/search")
async def log_search(event: SearchEvent, background: BackgroundTasks):
    background.add_task(_log_event, "search", event.model_dump())
    return {"status": "logged"}


@router.post("/click")
async def log_click(event: ClickEvent, background: BackgroundTasks):
    background.add_task(_log_event, "click", event.model_dump())
    return {"status": "logged"}
