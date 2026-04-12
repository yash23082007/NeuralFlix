from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, desc
from typing import Optional

from database import get_db
from models.sql_models import PostgresMovie

router = APIRouter(prefix="/regions", tags=["Global Cinema Hubs"])

REGION_MAP = {
    "korean": {"country": "KR", "lang": "ko"},
    "japanese": {"country": "JP", "lang": "ja"},
    "french": {"country": "FR", "lang": "fr"},
    "bollywood": {"country": "IN", "lang": "hi", "industry": "bollywood"},
    "tollywood": {"country": "IN", "lang": "te", "industry": "tollywood"},
    "nollywood": {"country": "NG", "lang": None},
    "iranian": {"country": "IR", "lang": "fa"}
}

@router.get("/{region_name}")
async def get_region_movies(
    region_name: str, 
    era: Optional[str] = None, 
    sort: str = "popularity", 
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db)
):
    """Fetch movies for a specific global or Indian cinema region."""
    cfg = REGION_MAP.get(region_name.lower())
    if not cfg:
        raise HTTPException(status_code=404, detail="Cinema region not mapped.")

    stmt = select(PostgresMovie)
    
    # We filter by language/country if mapped in our DB array 
    # (assuming `language` field is the ISO code in our DB)
    if cfg['lang']:
        stmt = stmt.where(PostgresMovie.language == cfg['lang'])
        
    if "industry" in cfg:
        stmt = stmt.where(PostgresMovie.indian_industry == cfg["industry"])
        
    if sort == "popularity":
        stmt = stmt.order_by(desc(PostgresMovie.popularity_score), desc(PostgresMovie.tmdb_votes))
    elif sort == "rating":
        stmt = stmt.order_by(desc(PostgresMovie.tmdb_rating))
        
    stmt = stmt.limit(limit)
    
    movies = db.execute(stmt).scalars().all()
    return movies
