from celery import Celery
import os
import asyncio
from utils.recommendation_engine import hybrid_recommendation

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

celery_app = Celery("neuralflix", broker=REDIS_URL, backend=REDIS_URL)

@celery_app.task(bind=True, max_retries=3, soft_time_limit=30)
def compute_hybrid_recommendations(self, movie_id: str, user_id: str = None, limit: int = 12, media_type: str = "movie"):
    """
    Background worker task for ML recommendations.
    Uses asyncio.run to execute the async hybrid_recommendation in a sync celery context.
    """
    try:
        # Run the async recommendation pipeline
        recs = asyncio.run(hybrid_recommendation(
            movie_id=movie_id, 
            user_id=user_id, 
            limit=limit, 
            media_type=media_type
        ))
        return {"recommendations": recs, "movie_id": movie_id}
    except Exception as exc:
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)
