"""
Movie Intelligence Platform — Seed Service

Populates the database with curated world cinema masterpieces.
Supports offline standalone startup and optional live TMDB enrichment.
"""

import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.movie import Movie
from app.seed.catalog_data import CURATED_CATALOG

log = structlog.get_logger()


async def seed_database(db: AsyncSession) -> dict:
    """Populate database with curated master catalog."""
    
    # Check existing count
    count_res = await db.execute(select(func.count(Movie.id)))
    existing_count = count_res.scalar_one()
    
    if existing_count >= len(CURATED_CATALOG):
        log.info("catalog_already_populated", count=existing_count)
        return {"success": existing_count, "inserted": 0, "failed": 0}

    results = {"success": 0, "inserted": 0, "failed": 0}
    
    tmdb_ids = [item["tmdb_id"] for item in CURATED_CATALOG]
    existing_res = await db.execute(select(Movie.tmdb_id).where(Movie.tmdb_id.in_(tmdb_ids)))
    existing_ids = set(existing_res.scalars().all())
    
    for item in CURATED_CATALOG:
        try:
            if item["tmdb_id"] not in existing_ids:
                movie_obj = Movie(**item)
                db.add(movie_obj)
                results["inserted"] += 1
            results["success"] += 1
        except Exception as e:
            results["failed"] += 1
            log.warning("seed_item_failed", tmdb_id=item.get("tmdb_id"), error=str(e))
            
    try:
        await db.commit()
        log.info("catalog_seeding_completed", **results)
    except Exception as e:
        await db.rollback()
        log.error("seeding_commit_error", error=str(e))
        
    return results
