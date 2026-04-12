from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List, Optional

from database import get_db
from models.sql_models import PostgresMovie
from utils.recommendation_engine import get_neural_recommendations

router = APIRouter(prefix="/movies", tags=["Movies"])

@router.get("/{movie_id}")
async def get_movie(movie_id: int, db: Session = Depends(get_db)):
    """Fetch total details for a single movie by TMDB ID."""
    stmt = select(PostgresMovie).where(PostgresMovie.tmdb_id == movie_id)
    movie = db.execute(stmt).scalar_one_or_none()
    
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found in global database")
    
    return movie

@router.get("/{movie_id}/similar")
async def get_similar_movies(movie_id: int, limit: int = 10, db: Session = Depends(get_db)):
    """Use the hybrid pgvector ML engine to find cross-cultural cinematic matches."""
    try:
        # Calls the hybrid engine constructed earlier!
        results = get_neural_recommendations(movie_id=movie_id, db=db, top_k=limit)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation Model Offline: {str(e)}")
