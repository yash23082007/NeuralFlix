from fastapi import APIRouter, Query, HTTPException
from utils.recommendation_engine import hybrid_recommendation, get_popularity_baseline
from typing import Optional
from utils.watchmode_api import fetch_streaming_sources
from database import movies_collection
import asyncio
from tasks import compute_hybrid_recommendations, celery_app

router = APIRouter()

@router.get("/trending")
async def get_trending_recommendations():
    """Return top trending movies for cold-start users."""
    movies = await get_popularity_baseline(limit=20)
    return {"recommendations": movies}

@router.get("/async/{movie_id}")
async def dispatch_recommendations(
    movie_id: str, 
    media_type: str = Query("movie", description="Type of media: movie or tv"),
    user_id: Optional[str] = Query(None)
):
    """
    Dispatch ML inference via Celery tasks. 
    Returns a task_id for frontend to poll, preventing event loop blocking.
    """
    task = compute_hybrid_recommendations.delay(
        movie_id, user_id=user_id, limit=12, media_type=media_type
    )
    return {"task_id": task.id, "status": "processing"}

@router.get("/result/{task_id}")
async def get_recommendation_result(task_id: str):
    """Poll for the completion of a background recommendation job."""
    task_result = celery_app.AsyncResult(task_id)
    if task_result.state == "PENDING":
        return {"task_id": task_id, "status": "PENDING", "result": None}
    elif task_result.state == "SUCCESS":
        return {"task_id": task_id, "status": "SUCCESS", "result": task_result.result}
    elif task_result.state == "FAILURE":
        raise HTTPException(status_code=500, detail="Background recommendation task failed")
    else:
        return {"task_id": task_id, "status": task_result.state, "result": None}

@router.get("/{movie_id}")
async def get_recommendations(
    movie_id: str, 
    media_type: str = Query("movie", description="Type of media: movie or tv"),
    user_id: Optional[str] = Query(None),
    include_sources: bool = Query(False)
):
    """
    Get hybrid ML recommendations for a given movie/series. 
    Uses TF-IDF content similarity + SVD collaborative filtering + Neural Embeddings + TMDB fallback. 
    """
    recs = await hybrid_recommendation(movie_id=movie_id, user_id=user_id, limit=12, media_type=media_type)
    
    # Enrich with Streaming Sources (if requested)
    if include_sources:
        for rec in recs[:5]:
            imdb_id = rec.get("imdb_id")
            if imdb_id:
                # Wrap synchronous outgoing API call in a thread to prevent blocking event loop
                rec["sources"] = await asyncio.to_thread(fetch_streaming_sources, imdb_id)

    return {"movie_id": movie_id, "recommendations": recs}
