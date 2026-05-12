from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import List, Optional

from db.connection import get_db
from models.sql_models import PostgresMovie
from models.schemas import MovieListResponse, MovieDetail, MovieBase

router = APIRouter()

def serialize_movie(movie: PostgresMovie) -> dict:
    return {
        "tmdb_id": movie.tmdb_id,
        "title": movie.title,
        "overview": movie.overview,
        "year": int(movie.release_date[:4]) if movie.release_date and len(movie.release_date) >= 4 else None,
        "release_date": movie.release_date,
        "language": movie.language or "en",
        "genres": movie.genres or [],
        "rating": movie.tmdb_rating or 0.0,
        "votes": movie.tmdb_votes or 0,
        "popularity_score": movie.popularity_score or 0.0,
        "poster_url": movie.poster_url,
        "backdrop_url": movie.backdrop_url,
        "platforms": movie.platforms or [],
        "media_type": "movie"
    }

def serialize_movie_detail(movie: PostgresMovie) -> dict:
    base = serialize_movie(movie)
    base.update({
        "runtime": movie.runtime,
        "cast": movie.cast_members or [],
        "director": movie.director,
        "trailer_key": movie.trailer_key,
        "similar": [], # We will fetch similarities via ML/PgVector later
        "tagline": movie.tagline,
        "imdb_id": movie.imdb_id,
        "rt_rating": movie.rt_rating,
        "box_office": movie.box_office,
        "awards": movie.awards,
        "metacritic": None
    })
    return base


@router.get("/trending", response_model=MovieListResponse)
async def get_trending_movies(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    offset = (page - 1) * limit
    # Sort by popularity
    stmt_total = select(func.count(PostgresMovie.id))
    total = await db.scalar(stmt_total)
    
    # Check if total is None (empty table)
    if total is None:
        total = 0
    
    stmt = select(PostgresMovie).order_by(PostgresMovie.popularity_score.desc()).limit(limit).offset(offset)
    result = await db.execute(stmt)
    movies = result.scalars().all()
    
    return {
        "page": page,
        "total": total,
        "results": [serialize_movie(m) for m in movies]
    }


@router.get("/search", response_model=MovieListResponse)
async def search_movies(
    q: str = Query(..., min_length=2),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    offset = (page - 1) * limit
    
    search_term = f"%{q}%"
    filters = or_(
        PostgresMovie.title.ilike(search_term),
        PostgresMovie.overview.ilike(search_term)
    )
    
    stmt_total = select(func.count(PostgresMovie.id)).where(filters)
    total = await db.scalar(stmt_total)
    
    if total is None:
        total = 0
    
    stmt = select(PostgresMovie).where(filters).limit(limit).offset(offset)
    result = await db.execute(stmt)
    movies = result.scalars().all()
    
    return {
        "page": page,
        "total": total,
        "results": [serialize_movie(m) for m in movies]
    }


@router.get("/{movie_id}", response_model=MovieDetail)
async def get_movie(movie_id: int, db: AsyncSession = Depends(get_db)):
    """Fetch movie by TMDB ID"""
    stmt = select(PostgresMovie).where(PostgresMovie.tmdb_id == movie_id)
    result = await db.execute(stmt)
    movie = result.scalar_one_or_none()
    
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
        
    return serialize_movie_detail(movie)
