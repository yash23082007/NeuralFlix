from fastapi import APIRouter, Query, HTTPException
from typing import Optional

from services.recommendation_service import RecommendationService
from models.schemas import RecommendationResponse, AsyncTaskResponse

router = APIRouter()

@router.get("/trending", response_model=RecommendationResponse)
async def get_trending_recommendations():
    """Return top trending movies for cold-start users."""
    try:
        return await RecommendationService.get_trending_recommendations()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/async/{movie_id}", response_model=AsyncTaskResponse)
async def dispatch_recommendations(
    movie_id: str, 
    media_type: str = Query("movie", enum=["movie", "tv"]),
    user_id: Optional[str] = Query(None)
):
    """Dispatch ML inference via Celery tasks."""
    try:
        return await RecommendationService.dispatch_async_job(
            movie_id, media_type=media_type, user_id=user_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/result/{task_id}", response_model=AsyncTaskResponse)
async def get_recommendation_result(task_id: str):
    """Poll for the completion of a background recommendation job."""
    try:
        return await RecommendationService.get_task_status(task_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{movie_id}", response_model=RecommendationResponse)
async def get_recommendations(
    movie_id: str, 
    media_type: str = Query("movie", enum=["movie", "tv"]),
    user_id: Optional[str] = Query(None),
    include_sources: bool = Query(False)
):
    """Get hybrid ML recommendations for a given movie/series."""
    try:
        return await RecommendationService.get_recommendations(
            movie_id, media_type=media_type, user_id=user_id, include_sources=include_sources
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation engine failed: {str(e)}")

