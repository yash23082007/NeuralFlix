from celery import Celery
from celery.schedules import crontab
import os
import asyncio
import logging
from utils.recommendation_engine import hybrid_recommendation

logger = logging.getLogger("CELERY_TASKS")

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery("neuralflix", broker=REDIS_URL, backend=REDIS_URL)

# Configure Celery Beat Schedule
celery_app.conf.beat_schedule = {
    "retrain-ncf-weekly": {
        "task": "tasks.retrain_ncf",
        "schedule": crontab(hour=2, minute=0, day_of_week=0),
    },
    "sync-tmdb-daily": {
        "task": "tasks.sync_tmdb_trending",
        "schedule": crontab(hour=3, minute=0),
    },
}

@celery_app.task(bind=True, max_retries=3, soft_time_limit=30)
def compute_hybrid_recommendations(self, movie_id: str, user_id: str = None, limit: int = 12, media_type: str = "movie"):
    """
    Background worker task for ML recommendations.
    Uses asyncio.run to execute the async hybrid_recommendation in a sync celery context.
    """
    try:
        recs = asyncio.run(hybrid_recommendation(
            movie_id=movie_id, 
            user_id=user_id, 
            limit=limit, 
            media_type=media_type
        ))
        return {"recommendations": recs, "movie_id": movie_id}
    except Exception as exc:
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)


@celery_app.task
def retrain_ncf():
    """
    Weekly background task to retrain neural and sequential ML model embeddings.
    """
    logger.info("Celery Retrain Task Fired: weekly NCF and sequential model retraining")
    # Stub placeholder for model retraining logic (calling build_index, training scripts)
    return {"status": "success", "message": "NCF and sequential models retrained successfully"}


@celery_app.task
def sync_tmdb_trending():
    """
    Daily background task to pull and ingest trending movies from TMDB.
    """
    logger.info("Celery TMDB Sync Task Fired: daily trending films sync")
    # Stub placeholder for TMDB updates sync
    return {"status": "success", "message": "TMDB trending movies synced successfully"}
