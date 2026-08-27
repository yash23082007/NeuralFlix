"""
NeuralFlix — Catalog Service

Coordinates fetching movies from TMDB and persisting them in the database.
Handles the "fetch if missing" logic with curated catalog fallbacks.
"""

from typing import Optional
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.movie import Movie
from app.services.tmdb_service import fetch_movie_details, parse_tmdb_movie
from app.seed.catalog_data import CURATED_CATALOG

log = structlog.get_logger()


async def get_or_fetch_movie(db: AsyncSession, tmdb_id: int) -> Optional[Movie]:
    """
    Get a movie from DB. If it doesn't exist, fetch from TMDB,
    fallback to curated catalog, save to DB, and return it.
    """
    # Check DB first
    result = await db.execute(select(Movie).where(Movie.tmdb_id == tmdb_id))
    movie = result.scalar_one_or_none()
    
    if movie:
        return movie

    # Fallback to local curated catalog
    for item in CURATED_CATALOG:
        if item["tmdb_id"] == tmdb_id:
            new_movie = Movie(**item)
            db.add(new_movie)
            try:
                await db.commit()
                await db.refresh(new_movie)
                log.info("curated_movie_saved_to_db", tmdb_id=tmdb_id, title=new_movie.title)
                return new_movie
            except Exception as e:
                await db.rollback()
                log.warning("error_saving_curated_movie", error=str(e))

    # Not in DB, fetch from TMDB
    log.info("movie_not_in_db_fetching_tmdb", tmdb_id=tmdb_id)
    try:
        tmdb_data = await fetch_movie_details(tmdb_id)
        if tmdb_data:
            parsed_data = parse_tmdb_movie(tmdb_data)
            new_movie = Movie(**parsed_data)
            db.add(new_movie)
            await db.commit()
            await db.refresh(new_movie)
            log.info("movie_saved_to_db", tmdb_id=tmdb_id, title=new_movie.title)
            return new_movie
    except Exception as e:
        await db.rollback()
        log.warning("error_fetching_or_saving_tmdb_movie", tmdb_id=tmdb_id, error=str(e))

    return None
