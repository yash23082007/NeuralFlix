from fastapi import APIRouter, Query
from utils.recommendation_engine import hybrid_recommendation, get_popularity_baseline
from typing import Optional

router = APIRouter()

@router.get("/trending")
def get_trending_recommendations():
    """Return top trending movies for cold-start users."""
    movies = get_popularity_baseline(limit=20)
    return {"recommendations": movies}

@router.get("/{movie_id}")
def get_recommendations(movie_id: str, user_id: Optional[str] = Query(None)):
    """Get hybrid recommendations for a given movie (and optionally user)."""
    recs = hybrid_recommendation(movie_id=movie_id, user_id=user_id, limit=12)
    return {"movie_id": movie_id, "recommendations": recs}
