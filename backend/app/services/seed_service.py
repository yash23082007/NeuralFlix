"""
NeuralFlix — Seed Service

Handles cold-start database population using curated TMDB IDs.
"""

import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.movie import Movie
from app.seed.curated_tmdb_ids import SEED_COLLECTIONS, get_all_seed_ids
from app.services.catalog_service import get_or_fetch_movie

log = structlog.get_logger()


async def seed_database(db: AsyncSession) -> dict:
    """Populate database with curated movies and apply editorial tags."""
    
    all_ids = get_all_seed_ids()
    log.info("seeding_started", total_ids=len(all_ids))
    
    results = {"success": 0, "failed": 0, "tagged": 0}
    
    # Fetch all movies
    for tmdb_id in all_ids:
        movie = await get_or_fetch_movie(db, tmdb_id)
        if movie:
            results["success"] += 1
        else:
            results["failed"] += 1
            
    # Apply editorial collections
    for collection_name, ids in SEED_COLLECTIONS.items():
        # Get movies that match the IDs
        stmt = select(Movie).where(Movie.tmdb_id.in_(ids))
        res = await db.execute(stmt)
        movies = res.scalars().all()
        
        for movie in movies:
            # Add tag if not present
            collections = list(movie.editorial_collections) if movie.editorial_collections else []
            if collection_name not in collections:
                collections.append(collection_name)
                movie.editorial_collections = collections
                results["tagged"] += 1
                
    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        log.error("seeding_tag_commit_failed", error=str(e))
        
    log.info("seeding_completed", **results)
    return results
