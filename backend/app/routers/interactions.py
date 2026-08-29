"""
NeuralFlix — Interactions Router
Batch logging of user interaction events for honest telemetry and offline evaluation.
"""

from datetime import datetime, timezone
from typing import List, Literal, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.watch_event import WatchEvent
from app.models.recommendation_feedback import RecommendationImpression

router = APIRouter(prefix="/api/v1/interactions", tags=["Interactions"])


class Interaction(BaseModel):
    movie_id: int
    event: Literal["watch", "impression", "click", "save", "dismiss"]
    position: Optional[int] = Field(default=None, ge=0)
    context: str = Field(default="home_feed", max_length=50)
    completed: bool = False


@router.post("")
async def record_interactions(
    events: List[Interaction],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Record batch interaction events into recommendation_impressions and watch_events."""
    now = datetime.now(timezone.utc)
    for event in events:
        if event.event == "watch":
            db.add(WatchEvent(user_id=current_user.id, movie_id=event.movie_id, completed=event.completed))
            continue
        impression = RecommendationImpression(
            user_id=current_user.id,
            movie_id=event.movie_id,
            position=event.position or 0,
            context=event.context,
            shown_at=now,
            ranking_version="4.0-DeterministicTaste-v1"
        )
        if event.event == "click":
            impression.clicked_at = now
        elif event.event == "save":
            impression.saved_at = now
        elif event.event == "dismiss":
            impression.dismissed_at = now
        db.add(impression)

    await db.commit()
    return {"status": "accepted", "count": len(events)}
