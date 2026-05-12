from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from db.connection import get_db
from models.sql_models import PostgresMovie
from db.models import WatchEvent
from ml.taste_profile import build_taste_profile

router = APIRouter()

@router.get("/{user_id}/profile")
async def get_user_taste_profile(user_id: int, db: AsyncSession = Depends(get_db)):
    """
    Generate User's Taste DNA based on watch history.
    """
    stmt = select(WatchEvent).where(WatchEvent.user_id == user_id)
    result = await db.execute(stmt)
    events = result.scalars().all()
    
    if not events:
        return build_taste_profile([])
        
    movie_ids = [e.movie_id for e in events]
    
    # Fetch movie details
    stmt_movies = select(PostgresMovie).where(PostgresMovie.id.in_(movie_ids))
    result_movies = await db.execute(stmt_movies)
    movies = result_movies.scalars().all()
    
    watch_history = []
    for m in movies:
        watch_history.append({
            "title": m.title,
            "genres": m.genres,
            "release_year": m.release_date[:4] if m.release_date else None,
            "runtime": m.runtime,
            "language": m.language,
            "rating": m.tmdb_rating,
            "director": m.director
        })
        
    taste_profile = build_taste_profile(watch_history)
    return {"user_id": user_id, "profile": taste_profile}
