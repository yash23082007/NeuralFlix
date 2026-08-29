"""
NeuralFlix — Catalog Service

Coordinates fetching movies from TMDB and persisting them in the database.
Guards TMDB write-through behind settings.allow_tmdb_write_through and uses singleflight dedupe.
"""

import asyncio
from typing import Dict, Optional
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.movie import Movie
from app.services.tmdb_service import fetch_movie_details, parse_tmdb_movie
from app.seed.catalog_data import CURATED_CATALOG

log = structlog.get_logger()
settings = get_settings()

# In-flight lock deduplication for concurrent fetches
_inflight_locks: Dict[int, asyncio.Lock] = {}
_master_lock = asyncio.Lock()


async def _get_movie_lock(tmdb_id: int) -> asyncio.Lock:
    async with _master_lock:
        if tmdb_id not in _inflight_locks:
            _inflight_locks[tmdb_id] = asyncio.Lock()
        return _inflight_locks[tmdb_id]


async def get_or_fetch_movie(db: AsyncSession, tmdb_id: int) -> Optional[Movie]:
    """
    Get a movie from DB. If missing, check curated seed catalog or fetch from TMDB
    when write-through is enabled.
    """
    # 1. Check DB first
    result = await db.execute(select(Movie).where(Movie.tmdb_id == tmdb_id))
    movie = result.scalar_one_or_none()
    if movie:
        return movie

    # 2. Check local curated catalog fallback
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
                # Re-query in case another transaction committed it
                res = await db.execute(select(Movie).where(Movie.tmdb_id == tmdb_id))
                found = res.scalar_one_or_none()
                if found:
                    return found

    # 3. If TMDB write-through is disabled and not in seed catalog, return None
    if not settings.allow_tmdb_write_through:
        return None

    # 4. Singleflight deduplicated TMDB fetch and persist
    lock = await _get_movie_lock(tmdb_id)
    async with lock:
        # Re-check DB in case another task fetched it while waiting for lock
        result = await db.execute(select(Movie).where(Movie.tmdb_id == tmdb_id))
        movie = result.scalar_one_or_none()
        if movie:
            return movie

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
