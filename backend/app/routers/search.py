"""
NeuralFlix — Search Router
Dedicated search endpoints supporting frontend query patterns.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.movie import Movie
from app.routers.movies import _format_movie, search as movies_search

router = APIRouter(prefix="/api/v1/search", tags=["Search"])


@router.get("/movies")
async def search_movies_endpoint(
    query: str = Query(..., min_length=1),
    page: int = Query(1, ge=1),
    db: AsyncSession = Depends(get_db)
):
    """Search movies across local database catalog with TMDB fallback."""
    query_lower = query.lower()
    
    result = await db.execute(select(Movie))
    all_movies = result.scalars().all()
    
    matches = []
    for m in all_movies:
        if (
            query_lower in (m.title or "").lower()
            or query_lower in (m.director or "").lower()
            or any(query_lower in c.lower() for c in (m.cast_members or []))
            or any(query_lower in g.lower() for g in (m.genres or []))
            or query_lower in (m.cinema_region or "").lower()
        ):
            matches.append(_format_movie(m))
            
    if not matches and len(query) >= 2:
        return await movies_search(query=query, page=page, db=db)
        
    return {
        "results": matches,
        "total": len(matches),
        "page": page
    }
