"""
Movie Intelligence Platform — Home Feed Router
Provides pre-aggregated data for the landing page hero and dynamic cinema rows.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.sql.expression import true as sa_true

from app.database import get_db
from app.models.movie import Movie
from app.routers.movies import _format_movie

router = APIRouter(prefix="/api/v1/home", tags=["Home"])


@router.get("")
async def get_home(db: AsyncSession = Depends(get_db)):
    """Return aggregated home page data with trending, top rated, and regional cinema clusters."""
    from sqlalchemy import select, desc, or_, cast, String
    from app.routers.movies import REGION_LANGUAGE_MAP
    
    # We can fetch top overall via SQL
    trend_res = await db.execute(select(Movie).order_by(desc(Movie.popularity_score)).limit(15))
    trending = [_format_movie(m) for m in trend_res.scalars().all()]
    
    top_res = await db.execute(select(Movie).order_by(desc(Movie.tmdb_rating)).limit(15))
    top_rated = [_format_movie(m) for m in top_res.scalars().all()]
    
    featured = trending[0] if trending else {}
    
    regions = {}
    for r_key in ["korean", "indian", "japanese", "french", "spanish"]:
        mapping = REGION_LANGUAGE_MAP.get(r_key)
        conditions = []
        if mapping:
            if mapping["regions"]:
                conditions.append(cast(Movie.cinema_region, String).in_(mapping["regions"]))
            if mapping["languages"]:
                conditions.append(cast(Movie.language, String).in_(mapping["languages"]))
        else:
            conditions.append(cast(Movie.cinema_region, String).ilike(f"%{r_key}%"))
            
        where_clause = or_(*conditions) if conditions else sa_true()
        r_res = await db.execute(select(Movie).where(where_clause).order_by(desc(Movie.popularity_score)).limit(10))  # type: ignore
        r_movies = [_format_movie(m) for m in r_res.scalars().all()]
        if r_movies:
            regions[r_key] = r_movies
            
    # Hidden Gems: pop < 70, rating >= 7.8
    gem_res = await db.execute(select(Movie).where(Movie.popularity_score < 70, Movie.tmdb_rating >= 7.8).limit(10))
    hidden_gems = [_format_movie(m) for m in gem_res.scalars().all()]
    
    return {
        "featured": featured,
        "trending": trending,
        "topRated": top_rated,
        "regions": regions,
        "coldStartCollections": hidden_gems
    }

