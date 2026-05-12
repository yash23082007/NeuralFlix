from fastapi import APIRouter, HTTPException
from typing import List

from ml.taste_profile import build_taste_profile

router = APIRouter()

# Optional PostgreSQL dependencies
_has_pg = False
try:
    import os
    if os.getenv("NEURALFLIX_DEMO_MODE", "true").lower() != "true":
        from sqlalchemy.ext.asyncio import AsyncSession
        from sqlalchemy import select
        from db.connection import get_db
        from models.sql_models import PostgresMovie
        from db.models import WatchEvent
        _has_pg = True
except Exception:
    pass


async def _fetch_watch_history_pg(user_id: int) -> List[dict]:
    async for session in get_db():
        stmt = select(WatchEvent).where(WatchEvent.user_id == user_id)
        result = await session.execute(stmt)
        events = result.scalars().all()
        if not events:
            return []
        movie_ids = [e.movie_id for e in events]
        stmt_movies = select(PostgresMovie).where(PostgresMovie.id.in_(movie_ids))
        result_movies = await session.execute(stmt_movies)
        movies = result_movies.scalars().all()
        return [{
            "title": m.title,
            "genres": m.genres,
            "release_year": m.release_date[:4] if m.release_date else None,
            "runtime": m.runtime,
            "language": m.language,
            "rating": getattr(m, "tmdb_rating", 0.0),
            "director": getattr(m, "director", None),
        } for m in movies]


async def _fetch_watch_history_inmem(user_id: int) -> List[dict]:
    from database import watch_history_collection, movies_collection
    events = list(watch_history_collection.find({"user_id": str(user_id)}))
    if not events:
        return []
    movie_ids = [e.get("movie_id") for e in events if e.get("movie_id")]
    watch_history = []
    for mid in movie_ids:
        m = movies_collection.find_one({"tmdb_id": int(mid) if str(mid).isdigit() else mid}, {"_id": 0})
        if m:
            watch_history.append({
                "title": m.get("title", ""),
                "genres": m.get("genres", []),
                "release_year": m.get("year"),
                "runtime": m.get("runtime"),
                "language": m.get("language"),
                "rating": m.get("rating", 0.0),
                "director": m.get("director"),
            })
    return watch_history


@router.get("/{user_id}/profile")
async def get_user_taste_profile(user_id: int):
    """Generate User's Taste DNA based on watch history."""
    if _has_pg:
        try:
            watch_history = await _fetch_watch_history_pg(user_id)
            if watch_history:
                taste_profile = build_taste_profile(watch_history)
                return {"user_id": user_id, "profile": taste_profile}
        except Exception:
            pass

    watch_history = await _fetch_watch_history_inmem(user_id)
    taste_profile = build_taste_profile(watch_history)
    return {"user_id": user_id, "profile": taste_profile}
