from fastapi import APIRouter, Query
from utils.recommendation_engine import hybrid_recommendation
from typing import Optional

router = APIRouter()

@router.get("/{movie_id}")
def get_recommendations(movie_id: str, user_id: Optional[str] = Query(None)):
    recommendations = hybrid_recommendation(movie_id=movie_id, user_id=user_id, limit=10)
    return {"movie_id": movie_id, "recommendations": recommendations}
