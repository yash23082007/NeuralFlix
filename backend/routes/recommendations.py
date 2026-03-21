from fastapi import APIRouter, Query
from utils.recommendation_engine import hybrid_recommendation, get_popularity_baseline
from typing import Optional
from utils.watchmode_api import fetch_streaming_sources
from database import movies_collection

router = APIRouter()

@router.get("/trending")
def get_trending_recommendations():
    """Return top trending movies for cold-start users."""
    movies = get_popularity_baseline(limit=20)
    return {"recommendations": movies}

@router.get("/{movie_id}")
async def get_recommendations(
    movie_id: str, 
    media_type: str = Query("movie", description="Type of media: movie or tv"),
    user_id: Optional[str] = Query(None),
    include_sources: bool = Query(False)
):
    """
    Get hybrid ML recommendations for a given movie/series. 
    Uses TF-IDF content similarity + SVD collaborative filtering + TMDB fallback. 
    """
    recs = hybrid_recommendation(movie_id=movie_id, user_id=user_id, limit=12, media_type=media_type)
        for rec in recs[:5]:
            imdb_id = rec.get("imdb_id")
            if imdb_id:
                rec["sources"] = fetch_streaming_sources(imdb_id)

    return {"movie_id": movie_id, "recommendations": recs}
