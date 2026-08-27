"""
NeuralFlix — Home Feed Router
Provides pre-aggregated data for the landing page hero and dynamic cinema rows.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.models.movie import Movie
from app.routers.movies import _format_movie

router = APIRouter(prefix="/api/v1/home", tags=["Home"])


@router.get("")
async def get_home(db: AsyncSession = Depends(get_db)):
    """Return aggregated home page data with trending, top rated, and regional cinema clusters."""
    result = await db.execute(select(Movie))
    all_movies = result.scalars().all()
    
    if not all_movies:
        return {
            "featured": {},
            "trending": [],
            "topRated": [],
            "regions": {},
            "coldStartCollections": []
        }
        
    formatted = [_format_movie(m) for m in all_movies]
    
    # Trending sorted by popularity
    trending = sorted(formatted, key=lambda x: x.get("popularity_score", 0), reverse=True)[:15]
    
    # Top Rated sorted by rating
    top_rated = sorted(formatted, key=lambda x: x.get("rating", 0), reverse=True)[:15]
    
    # Featured backdrop film
    featured = trending[0] if trending else (formatted[0] if formatted else {})
    
    # Regional clusters
    regions = {}
    for r_key in ["korean", "indian", "japanese", "french", "spanish"]:
        r_movies = [m for m in formatted if (m.get("cinema_region") or "").lower() == r_key or (m.get("language") or "") == r_key[:2]]
        if r_movies:
            regions[r_key] = r_movies[:10]
            
    # Curated Hidden Gems
    hidden_gems = [m for m in formatted if m.get("popularity_score", 0) < 70 and m.get("rating", 0) >= 7.8][:10]
    
    return {
        "featured": featured,
        "trending": trending,
        "topRated": top_rated,
        "regions": regions,
        "coldStartCollections": hidden_gems
    }
