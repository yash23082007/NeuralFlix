"""Truthful, database-aggregated model and data readiness telemetry."""

from fastapi import APIRouter, Depends
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.movie import Movie
from app.models.recommendation_feedback import RecommendationFeedback, RecommendationImpression
from app.models.user import User
from app.models.watch_event import WatchEvent

router = APIRouter(prefix="/api/v1/ml", tags=["Machine Learning"])
INTERACTION_TARGET = 1_000_000


@router.get("/overview")
async def get_ml_overview(db: AsyncSession = Depends(get_db)):
    """Return live counts without loading the catalog into application memory."""
    catalog_size = await db.scalar(select(func.count(Movie.id))) or 0
    # Zero is the catalog's "not rated" sentinel, so exclude it from the mean.
    average = await db.scalar(select(func.avg(func.nullif(Movie.tmdb_rating, 0))))
    impression_count = await db.scalar(select(func.count(RecommendationImpression.id))) or 0
    feedback_count = await db.scalar(select(func.count(RecommendationFeedback.id))) or 0
    opted_in_users = await db.scalar(
        select(func.count(User.id)).where(User.recommendation_training_consent.is_(True))
    ) or 0

    # Each timestamp is one recorded response; impressions and onboarding seeds do not count.
    engagement_events = await db.scalar(
        select(func.coalesce(func.sum(
            case((RecommendationImpression.clicked_at.is_not(None), 1), else_=0)
            + case((RecommendationImpression.saved_at.is_not(None), 1), else_=0)
            + case((RecommendationImpression.dismissed_at.is_not(None), 1), else_=0)
            + case((RecommendationImpression.watched_at.is_not(None), 1), else_=0)
        ), 0))
        .select_from(RecommendationImpression)
        .join(User, User.id == RecommendationImpression.user_id)
        .where(
            User.recommendation_training_consent.is_(True),
            RecommendationImpression.shown_at >= User.recommendation_training_consent_at,
        )
    ) or 0
    watch_events = await db.scalar(
        select(func.count(WatchEvent.id))
        .select_from(WatchEvent)
        .join(User, User.id == WatchEvent.user_id)
        .where(
            User.recommendation_training_consent.is_(True),
            WatchEvent.created_at >= User.recommendation_training_consent_at,
            WatchEvent.source == "app_event",
        )
    ) or 0
    interaction_count = int(engagement_events) + int(watch_events)

    return {
        "catalog_size": int(catalog_size),
        "average_rating": round(float(average), 2) if average is not None else None,
        "impressions_logged": int(impression_count),
        "feedback_logged": int(feedback_count),
        "training_consent_users": int(opted_in_users),
        "consented_interactions": interaction_count,
        "interaction_target": INTERACTION_TARGET,
        "interaction_target_progress": min(interaction_count / INTERACTION_TARGET, 1.0),
        "interaction_target_reached": interaction_count >= INTERACTION_TARGET,
        "top_genres": [],
        "top_regions": [],
        "pipeline": [
            {"stage": "Candidate Generation", "method": "Database catalog retrieval"},
            {"stage": "Ranking", "method": "Taste Profile deterministic scorer (active fallback)"},
            {"stage": "Explainability", "method": "Component attribution"},
            {"stage": "Interaction Logging", "method": "First-party events; training requires opt-in"},
        ],
        "model_cards": [{
            "name": "Taste Profile v1",
            "type": "Deterministic multi-axis ranker",
            "status": "Active fallback",
            "purpose": "User-steerable transparent recommendations",
            "train_data": "Explicit taste controls; opted-in app events are collected for future evaluation",
        }],
    }
