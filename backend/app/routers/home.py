from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.movie import Movie

router = APIRouter(prefix="/api/v1/home", tags=["Home"])

@router.get("")
async def get_home(db: AsyncSession = Depends(get_db)):
    """Return simplified home data to avoid triggering too many API requests."""
    
    # Get Top 10 Popular
    pop_res = await db.execute(select(Movie).order_by(Movie.popularity_score.desc()).limit(10))
    trending = pop_res.scalars().all()
    
    # Get Top 10 Rated (with minimum votes)
    rated_res = await db.execute(
        select(Movie)
        .where(Movie.tmdb_votes > 100)
        .order_by(Movie.tmdb_rating.desc())
        .limit(10)
    )
    top_rated = rated_res.scalars().all()
    
    # Format a featured movie
    featured = trending[0] if trending else None
    
    # Cold start collections (group by editorial_collections)
    collections_res = await db.execute(
        select(Movie).where(Movie.editorial_collections != None)
    )
    collection_movies = collections_res.scalars().all()
    
    cold_start = []
    # Simplified mock structure for now
    if collection_movies:
        cold_start.append({
            "id": "starter-pack",
            "title": "World Cinema Starter Pack",
            "movies": collection_movies[:5]
        })
    
    return {
        "featured": featured,
        "trending": trending,
        "topRated": top_rated,
        "regions": {},  # Not strictly required for initial render
        "coldStartCollections": cold_start
    }
