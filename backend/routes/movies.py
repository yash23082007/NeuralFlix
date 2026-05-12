from fastapi import APIRouter, Depends, Query, HTTPException
from typing import List, Optional

from models.schemas import MovieListResponse, MovieDetail, MovieBase

router = APIRouter()

# Optional PostgreSQL dependencies
_has_pg = False
try:
    import os
    if os.getenv("NEURALFLIX_DEMO_MODE", "true").lower() != "true":
        from sqlalchemy.ext.asyncio import AsyncSession
        from sqlalchemy import select, func, or_
        from db.connection import get_db
        from models.sql_models import PostgresMovie
        _has_pg = True
except Exception:
    pass

def _serialize_movie_from_dict(m: dict) -> dict:
    return {
        "tmdb_id": m.get("tmdb_id"),
        "title": m.get("title", ""),
        "overview": m.get("overview", ""),
        "year": m.get("year"),
        "release_date": m.get("release_date"),
        "language": m.get("language", "en"),
        "genres": m.get("genres", []),
        "rating": m.get("rating", 0.0),
        "votes": m.get("votes", 0),
        "popularity_score": m.get("popularity_score", 0.0),
        "poster_url": m.get("poster_url"),
        "backdrop_url": m.get("backdrop_url"),
        "platforms": m.get("platforms", []),
        "media_type": "movie",
    }


def serialize_movie(movie) -> dict:
    if isinstance(movie, dict):
        return _serialize_movie_from_dict(movie)
    return {
        "tmdb_id": movie.tmdb_id,
        "title": movie.title,
        "overview": movie.overview,
        "year": int(movie.release_date[:4]) if movie.release_date and len(movie.release_date) >= 4 else None,
        "release_date": movie.release_date,
        "language": movie.language or "en",
        "genres": movie.genres or [],
        "rating": getattr(movie, "tmdb_rating", movie.get("rating", 0.0)) if isinstance(movie, dict) else movie.tmdb_rating or 0.0,
        "votes": getattr(movie, "tmdb_votes", movie.get("votes", 0)) if isinstance(movie, dict) else movie.tmdb_votes or 0,
        "popularity_score": getattr(movie, "popularity_score", movie.get("popularity_score", 0.0)) if isinstance(movie, dict) else movie.popularity_score or 0.0,
        "poster_url": getattr(movie, "poster_url", movie.get("poster_url")) if isinstance(movie, dict) else movie.poster_url,
        "backdrop_url": getattr(movie, "backdrop_url", movie.get("backdrop_url")) if isinstance(movie, dict) else movie.backdrop_url,
        "platforms": getattr(movie, "platforms", movie.get("platforms", [])) if isinstance(movie, dict) else movie.platforms or [],
        "media_type": "movie",
    }


@router.get("/trending")
async def get_trending_movies(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    if _has_pg:
        try:
            async for session in get_db():
                offset = (page - 1) * limit
                stmt_total = select(func.count(PostgresMovie.id))
                total = await session.scalar(stmt_total) or 0
                stmt = select(PostgresMovie).order_by(PostgresMovie.popularity_score.desc()).limit(limit).offset(offset)
                result = await session.execute(stmt)
                movies = result.scalars().all()
                return {"page": page, "total": total, "results": [serialize_movie(m) for m in movies]}
        except Exception:
            pass

    from database import movies_collection
    movies = list(movies_collection.find({}, {"_id": 0}).sort("popularity_score", -1).limit(limit))
    return {"page": page, "total": len(movies), "results": [serialize_movie(m) for m in movies]}


@router.get("/search")
async def search_movies(
    q: str = Query(..., min_length=2),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    if _has_pg:
        try:
            async for session in get_db():
                offset = (page - 1) * limit
                search_term = f"%{q}%"
                filters = or_(PostgresMovie.title.ilike(search_term), PostgresMovie.overview.ilike(search_term))
                stmt_total = select(func.count(PostgresMovie.id)).where(filters)
                total = await session.scalar(stmt_total) or 0
                stmt = select(PostgresMovie).where(filters).limit(limit).offset(offset)
                result = await session.execute(stmt)
                movies = result.scalars().all()
                return {"page": page, "total": total, "results": [serialize_movie(m) for m in movies]}
        except Exception:
            pass

    from database import movies_collection
    import re
    pattern = re.compile(re.escape(q), re.IGNORECASE)
    movies = list(movies_collection.find(
        {"$or": [{"title": pattern}, {"overview": pattern}]}, {"_id": 0}
    ).limit(limit))
    return {"page": page, "total": len(movies), "results": [serialize_movie(m) for m in movies]}


@router.get("/{movie_id}")
async def get_movie(movie_id: int):
    """Fetch movie by TMDB ID"""
    if _has_pg:
        try:
            async for session in get_db():
                stmt = select(PostgresMovie).where(PostgresMovie.tmdb_id == movie_id)
                result = await session.execute(stmt)
                movie = result.scalar_one_or_none()
                if movie:
                    return serialize_movie(movie)
        except Exception:
            pass

    from database import movies_collection
    movie = movies_collection.find_one({"tmdb_id": movie_id}, {"_id": 0})
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    return serialize_movie(movie)
