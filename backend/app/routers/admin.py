"""
NeuralFlix — Admin Dashboard & Operations Router
Protected operational endpoints for system health, live database aggregates, and worker triggers.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.dependencies import require_admin
from app.models.user import User
from app.models.movie import Movie
from app.models.watch_event import WatchEvent
from app.models.recommendation_feedback import RecommendationFeedback, RecommendationImpression, Rating, WatchlistItem
from app.models.graph import IngestionCheckpoint, SearchQuery

router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])


@router.get("/stats")
async def get_admin_stats(
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Return live system aggregates and pipeline telemetry (admin only)."""
    user_count = await db.scalar(select(func.count(User.id))) or 0
    movie_count = await db.scalar(select(func.count(Movie.id))) or 0
    watch_count = await db.scalar(select(func.count(WatchEvent.id))) or 0
    rating_count = await db.scalar(select(func.count(Rating.id))) or 0
    watchlist_count = await db.scalar(select(func.count(WatchlistItem.id))) or 0
    feedback_count = await db.scalar(select(func.count(RecommendationFeedback.id))) or 0
    impression_count = await db.scalar(select(func.count(RecommendationImpression.id))) or 0
    query_count = await db.scalar(select(func.count(SearchQuery.id))) or 0

    # Ingestion checkpoints
    chk_res = await db.execute(select(IngestionCheckpoint))
    checkpoints = [
        {
            "job_name": c.job_name,
            "last_page": c.last_page,
            "status": c.status,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None
        }
        for c in chk_res.scalars().all()
    ]

    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": {
            "users": user_count,
            "movies": movie_count,
            "watch_events": watch_count,
            "ratings": rating_count,
            "watchlist_items": watchlist_count,
            "feedback_rows": feedback_count,
            "impressions": impression_count,
            "search_queries": query_count,
        },
        "checkpoints": checkpoints,
        "active_models": [
            {"id": "Taste Constellation v1", "tier": "Active Default", "status": "Online"}
        ]
    }


@router.post("/sync/trigger")
async def trigger_sync(
    background_tasks: BackgroundTasks,
    stage: str = "popular",
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Trigger background catalog sync task (admin only)."""
    from pipeline.datasets.tmdb_sync import sync_stage
    
    background_tasks.add_task(sync_stage, stage=stage, max_pages=1)
    return {"status": "accepted", "message": f"Sync job for stage '{stage}' dispatched in background."}
