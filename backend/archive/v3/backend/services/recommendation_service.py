import asyncio
import logging
from typing import List, Optional, Dict, Any

from utils.recommendation_engine import hybrid_recommendation, get_popularity_baseline
from utils.watchmode_api import fetch_streaming_sources
from tasks import compute_hybrid_recommendations, celery_app
from services.base_service import BaseService

logger = logging.getLogger("RECOMMENDATION_SERVICE")

class RecommendationService(BaseService):
    """
    Handles ML-powered movie and TV recommendation logic.
    Maintains synchronization between sync Celery tasks and async FastAPI routes.
    """

    @classmethod
    async def get_trending_recommendations(cls) -> Dict[str, Any]:
        """Return the top-tier popularity baseline for cold start."""
        movies = await get_popularity_baseline(limit=20)
        return {"recommendations": movies}

    @classmethod
    async def get_recommendations(
        cls, 
        movie_id: str, 
        media_type: str = "movie", 
        user_id: Optional[str] = None,
        include_sources: bool = False
    ) -> Dict[str, Any]:
        """Hybrid ML recommendation engine call with enrichment."""
        recs = await hybrid_recommendation(
            movie_id=movie_id, 
            user_id=user_id, 
            limit=12, 
            media_type=media_type
        )
        
        # Hydrate with streaming sources if requested
        if include_sources:
            # Run metadata hydration in parallel to keep latency down
            tasks = []
            for rec in recs[:5]:
                imdb_id = rec.get("imdb_id")
                if imdb_id:
                    tasks.append(cls.hydrate_sources(rec, imdb_id))
            
            if tasks:
                await asyncio.gather(*tasks)

        return {"movie_id": movie_id, "recommendations": recs}

    @classmethod
    async def hydrate_sources(cls, movie_doc: Dict[str, Any], imdb_id: str):
        """Helper to fetch sources in a separate thread for a movie doc."""
        sources = await asyncio.to_thread(fetch_streaming_sources, imdb_id)
        movie_doc["sources"] = sources

    @classmethod
    async def dispatch_async_job(
        cls, 
        movie_id: str, 
        media_type: str = "movie", 
        user_id: Optional[str] = None
    ) -> Dict[str, str]:
        """Dispatch a background Celery task for heavy inference."""
        task = compute_hybrid_recommendations.delay(
            movie_id, user_id=user_id, limit=12, media_type=media_type
        )
        return {"task_id": task.id, "status": "processing"}

    @classmethod
    async def get_task_status(cls, task_id: str) -> Dict[str, Any]:
        """Poll the status and result of a background Celery job."""
        task_result = celery_app.AsyncResult(task_id)
        
        status = task_result.state
        result = None
        
        if status == "SUCCESS":
            result = task_result.result
        elif status == "FAILURE":
            logger.error(f"Celery Task {task_id} failed: {task_result.info}")
            raise Exception("Background recommendation task failed.")
            
        return {
            "task_id": task_id,
            "status": status,
            "result": result
        }
