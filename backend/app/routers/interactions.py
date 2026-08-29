"""
Movie Intelligence Platform — Interactions Router
Batch logging of user interaction events for honest telemetry and offline evaluation.
"""

from datetime import datetime, timezone, timedelta
from typing import List, Literal, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.movie import Movie
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
    from app.config import get_settings
    settings = get_settings()

    if not events:
        return {"accepted": 0, "rejected_invalid_movie": 0}

    now = datetime.now(timezone.utc)
    unique_movie_ids = list({e.movie_id for e in events})
    
    valid_movie_ids_res = await db.execute(select(Movie.id).where(Movie.id.in_(unique_movie_ids)))
    valid_movie_ids = set(valid_movie_ids_res.scalars().all())
    
    accepted = 0
    rejected = 0

    for event in events:
        if event.movie_id not in valid_movie_ids:
            rejected += 1
            continue
            
        accepted += 1
        if event.event == "watch":
            db.add(WatchEvent(user_id=current_user.id, movie_id=event.movie_id, completed=event.completed))
            continue
            
        if event.event == "impression":
            impression = RecommendationImpression(
                user_id=current_user.id,
                movie_id=event.movie_id,
                position=event.position or 0,
                context=event.context,
                shown_at=now,
                ranking_version=settings.ranker_id
            )
            db.add(impression)
            continue
            
        cutoff = now - timedelta(hours=24)
        stmt = (
            select(RecommendationImpression)
            .where(
                RecommendationImpression.user_id == current_user.id,
                RecommendationImpression.movie_id == event.movie_id,
                RecommendationImpression.context == event.context,
                RecommendationImpression.shown_at >= cutoff
            )
            .order_by(RecommendationImpression.shown_at.desc())
            .limit(1)
        )
        recent_res = await db.execute(stmt)
        recent_impression = recent_res.scalar_one_or_none()

        if recent_impression:
            if event.event == "click":
                recent_impression.clicked_at = now
            elif event.event == "save":
                recent_impression.saved_at = now
            elif event.event == "dismiss":
                recent_impression.dismissed_at = now
        else:
            impression = RecommendationImpression(
                user_id=current_user.id,
                movie_id=event.movie_id,
                position=event.position or 0,
                context=event.context,
                shown_at=now,
                ranking_version=settings.ranker_id
            )
            if event.event == "click":
                impression.clicked_at = now
            elif event.event == "save":
                impression.saved_at = now
            elif event.event == "dismiss":
                impression.dismissed_at = now
            db.add(impression)

    await db.commit()
    return {"accepted": accepted, "rejected_invalid_movie": rejected}
