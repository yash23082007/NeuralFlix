from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, or_, text
from typing import Optional
import json

from database import get_db
from models.sql_models import PostgresMovie

router = APIRouter(prefix="/search", tags=["Global Search"])

MOOD_VECTORS = {
    "desi_vibes": {"lang": ["hi", "ta", "te", "ml"]},
    "feel_good": {"genres": ["Comedy", "Romance", "Family"]},
    "adrenaline": {"genres": ["Action", "Thriller", "Adventure"]}
}

@router.get("/")
async def global_search(
    q: Optional[str] = None,
    mood: Optional[str] = None,
    limit: int = Query(15, le=50),
    db: Session = Depends(get_db)
):
    """
    Search across titles, original titles, and overview.
    Supports mood-based querying based on the Blueprint.
    """
    stmt = select(PostgresMovie)
    
    if mood and mood in MOOD_VECTORS:
        cfg = MOOD_VECTORS[mood]
        if "lang" in cfg:
            stmt = stmt.where(PostgresMovie.language.in_(cfg["lang"]))
        if "genres" in cfg:
            # PostgreSQL array overlap operator `&&` using ORM
            # Since genres is ARRAY(String), we can do:
            stmt = stmt.where(PostgresMovie.genres.overlap(cfg["genres"]))

    if q:
        search_pattern = f"%{q}%"
        stmt = stmt.where(
            or_(
                PostgresMovie.title.ilike(search_pattern),
                PostgresMovie.overview.ilike(search_pattern)
            )
        )
        
    stmt = stmt.order_by(PostgresMovie.popularity_score.desc()).limit(limit)
    return db.execute(stmt).scalars().all()
