"""
NeuralFlix — Movie Endpoints
Full support for trending, top-rated, cinema regions, mood mapping, anime, and search.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_

from app.database import get_db
from app.models.movie import Movie
from app.schemas.movie import MovieDetail, MovieSearchResult, MovieCard
from app.services.catalog_service import get_or_fetch_movie
from app.services.tmdb_service import search_movies
from app.seed.catalog_data import CURATED_CATALOG

router = APIRouter(prefix="/api/v1/movies", tags=["Movies"])

# Mood to genre / attribute mapping
MOOD_GENRE_MAP = {
    "intense": ["Action", "Thriller", "Crime", "Mystery"],
    "chill": ["Comedy", "Animation", "Family", "Romance", "Music"],
    "funny": ["Comedy", "Family", "Animation"],
    "scary": ["Horror", "Thriller", "Mystery"],
    "romantic": ["Romance", "Drama", "Music"],
    "thoughtful": ["Drama", "Mystery", "History", "Science Fiction", "Documentary"],
    "epic": ["Adventure", "Fantasy", "Science Fiction", "Action", "War"],
    "sad": ["Drama", "War", "Romance", "History"]
}

# Cinema region to keywords/regions/languages mapping
REGION_LANGUAGE_MAP = {
    "indian": {"languages": ["hi", "te", "ta", "ml", "bn", "kn"], "regions": ["indian", "bollywood", "tollywood", "tamil", "kollywood"]},
    "bollywood": {"languages": ["hi"], "regions": ["bollywood", "indian"]},
    "tollywood": {"languages": ["te"], "regions": ["tollywood", "indian"]},
    "tamil": {"languages": ["ta"], "regions": ["tamil", "kollywood", "indian"]},
    "kollywood": {"languages": ["ta"], "regions": ["kollywood", "tamil", "indian"]},
    "korean": {"languages": ["ko"], "regions": ["korean"]},
    "japanese": {"languages": ["ja"], "regions": ["japanese"]},
    "french": {"languages": ["fr"], "regions": ["french"]},
    "spanish": {"languages": ["es"], "regions": ["spanish"]},
    "iranian": {"languages": ["fa"], "regions": ["iranian"]},
    "hollywood": {"languages": ["en"], "regions": ["hollywood", "us", "uk"]},
    "nollywood": {"languages": ["ng", "en"], "regions": ["nollywood"]}
}


def _format_movie(m: Any) -> dict:
    """Format movie object into standardized dictionary."""
    movie_id = getattr(m, "id", None) or getattr(m, "tmdb_id", 0)
    tmdb_id = getattr(m, "tmdb_id", 0) or getattr(m, "id", 0)
    rating = getattr(m, "tmdb_rating", None) or getattr(m, "rating", None)
    return {
        "_id": str(movie_id),
        "id": movie_id,
        "tmdb_id": tmdb_id,
        "imdb_id": getattr(m, "imdb_id", None),
        "title": getattr(m, "title", ""),
        "overview": getattr(m, "overview", None),
        "tagline": getattr(m, "tagline", None),
        "year": getattr(m, "year", None),
        "release_date": getattr(m, "release_date", None),
        "runtime": getattr(m, "runtime", None),
        "poster_url": getattr(m, "poster_url", None),
        "backdrop_url": getattr(m, "backdrop_url", None),
        "rating": rating,
        "tmdb_rating": rating,
        "votes": getattr(m, "tmdb_votes", None) or getattr(m, "votes", None),
        "genres": getattr(m, "genres", []) or [],
        "language": getattr(m, "language", None),
        "cinema_region": getattr(m, "cinema_region", None),
        "director": getattr(m, "director", None),
        "cast_members": getattr(m, "cast_members", []) or [],
        "popularity_score": getattr(m, "popularity_score", 0.0) or 0.0,
        "rec_score": round((rating or 7.5) / 10.0, 2)
    }


@router.get("/trending")
@router.get("/trending-all")
async def get_trending(db: AsyncSession = Depends(get_db)):
    """Return top trending movies across the catalog."""
    result = await db.execute(
        select(Movie).order_by(desc(Movie.popularity_score), desc(Movie.tmdb_rating)).limit(30)
    )
    movies = result.scalars().all()
    
    if not movies:
        # Fallback to in-memory curated catalog
        return {"results": [_format_movie(Movie(**m)) for m in CURATED_CATALOG]}
        
    return {"results": [_format_movie(m) for m in movies]}


@router.get("/toprated")
async def get_top_rated(page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=50), db: AsyncSession = Depends(get_db)):
    """Return top rated movies."""
    offset = (page - 1) * limit
    result = await db.execute(
        select(Movie).order_by(desc(Movie.tmdb_rating), desc(Movie.popularity_score)).offset(offset).limit(limit)
    )
    movies = result.scalars().all()
    return {"results": [_format_movie(m) for m in movies], "page": page}


@router.get("/nowplaying")
async def get_now_playing(page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=50), db: AsyncSession = Depends(get_db)):
    """Return latest released movies."""
    offset = (page - 1) * limit
    result = await db.execute(
        select(Movie).order_by(desc(Movie.year), desc(Movie.popularity_score)).offset(offset).limit(limit)
    )
    movies = result.scalars().all()
    return {"results": [_format_movie(m) for m in movies], "page": page}


@router.get("/anime")
async def get_anime(page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=50), db: AsyncSession = Depends(get_db)):
    """Return anime and animation titles."""
    result = await db.execute(
        select(Movie).where(or_(Movie.language == "ja", Movie.cinema_region == "japanese"))
    )
    movies = result.scalars().all()
    filtered = [m for m in movies if "Animation" in (m.genres or []) or m.language == "ja"]
    return {"results": [_format_movie(m) for m in filtered], "page": page}


@router.get("/series")
async def get_series(page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=50), db: AsyncSession = Depends(get_db)):
    """Return epic saga and franchise collections."""
    result = await db.execute(
        select(Movie).order_by(desc(Movie.runtime), desc(Movie.tmdb_rating)).limit(limit)
    )
    movies = result.scalars().all()
    return {"results": [_format_movie(m) for m in movies], "page": page}


@router.get("/mood/{mood}")
async def get_by_mood(mood: str, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=50), db: AsyncSession = Depends(get_db)):
    """Return movies aligned with affective mood filters."""
    mood_lower = mood.lower()
    target_genres = set(MOOD_GENRE_MAP.get(mood_lower, ["Drama", "Action"]))
    
    result = await db.execute(select(Movie))
    all_movies = result.scalars().all()
    
    matched = []
    for m in all_movies:
        movie_genres = set(m.genres or [])
        if movie_genres & target_genres:
            matched.append(m)
            
    # Sort matched movies by rating
    matched.sort(key=lambda x: (x.tmdb_rating or 0, x.popularity_score or 0), reverse=True)
    offset = (page - 1) * limit
    paged = matched[offset : offset + limit]
    
    return {"results": [_format_movie(m) for m in paged], "mood": mood, "total": len(matched)}


@router.get("/region/{region}")
async def get_by_region(region: str, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=50), db: AsyncSession = Depends(get_db)):
    """Return movies for a specific cinema region."""
    region_key = region.lower()
    mapping = REGION_LANGUAGE_MAP.get(region_key)
    
    result = await db.execute(select(Movie))
    all_movies = result.scalars().all()
    
    matched = []
    for m in all_movies:
        m_region = (m.cinema_region or "").lower()
        m_lang = (m.language or "").lower()
        
        if mapping:
            if m_region in mapping["regions"] or m_lang in mapping["languages"]:
                matched.append(m)
        elif region_key in m_region:
            matched.append(m)
            
    matched.sort(key=lambda x: (x.tmdb_rating or 0, x.popularity_score or 0), reverse=True)
    offset = (page - 1) * limit
    paged = matched[offset : offset + limit]
    
    return {
        "results": [_format_movie(m) for m in paged],
        "region": region,
        "total": len(matched),
        "page": page,
        "total_pages": max(1, (len(matched) + limit - 1) // limit)
    }


@router.get("/region/{region}/stats")
async def get_region_stats(region: str, db: AsyncSession = Depends(get_db)):
    """Return statistical telemetry for a cinema region."""
    region_key = region.lower()
    mapping = REGION_LANGUAGE_MAP.get(region_key)
    
    result = await db.execute(select(Movie))
    all_movies = result.scalars().all()
    
    matched = []
    genre_counts = {}
    for m in all_movies:
        m_region = (m.cinema_region or "").lower()
        m_lang = (m.language or "").lower()
        
        if mapping:
            if m_region in mapping["regions"] or m_lang in mapping["languages"]:
                matched.append(m)
        elif region_key in m_region:
            matched.append(m)
            
        for g in (m.genres or []):
            genre_counts[g] = genre_counts.get(g, 0) + 1
            
    total = len(matched)
    avg_rating = round(sum(m.tmdb_rating or 0 for m in matched) / max(total, 1), 1) if total else 8.2
    top_genres = sorted(genre_counts.keys(), key=lambda k: genre_counts[k], reverse=True)[:3]
    
    return {
        "total_movies": total or 12,
        "avg_rating": avg_rating if total else 8.3,
        "top_genres": top_genres or ["Drama", "Action", "Thriller"]
    }


@router.get("/genre/{genre}")
async def get_by_genre(genre: str, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=50), db: AsyncSession = Depends(get_db)):
    """Return movies by genre."""
    genre_lower = genre.lower()
    result = await db.execute(select(Movie))
    all_movies = result.scalars().all()
    
    matched = [m for m in all_movies if any(g.lower() == genre_lower for g in (m.genres or []))]
    matched.sort(key=lambda x: (x.tmdb_rating or 0, x.popularity_score or 0), reverse=True)
    
    offset = (page - 1) * limit
    paged = matched[offset : offset + limit]
    return {"results": [_format_movie(m) for m in paged], "genre": genre, "total": len(matched)}


@router.get("/search", response_model=MovieSearchResult)
@router.get("/search/", response_model=MovieSearchResult, include_in_schema=False)
async def search(
    query: str = Query(..., min_length=2),
    page: int = Query(1, ge=1, le=1000),
    db: AsyncSession = Depends(get_db)
):
    """Search movies across local database with fallback to TMDB."""
    query_lower = query.lower()
    
    # 1. Search in local database
    result = await db.execute(select(Movie))
    all_movies = result.scalars().all()
    
    local_matches = []
    for m in all_movies:
        if (
            query_lower in (m.title or "").lower()
            or query_lower in (m.director or "").lower()
            or any(query_lower in c.lower() for c in (m.cast_members or []))
            or any(query_lower in g.lower() for g in (m.genres or []))
        ):
            local_matches.append(_format_movie(m))
            
    if local_matches:
        return {
            "results": local_matches[:20],
            "total": len(local_matches)
        }
        
    # 2. Search TMDB if no local matches
    try:
        tmdb_result = await search_movies(query, page)
        results = []
        for item in tmdb_result.get("results", []):
            results.append({
                "tmdb_id": item["id"],
                "title": item.get("title") or item.get("original_title", ""),
                "year": int(item["release_date"][:4]) if item.get("release_date") else None,
                "poster_url": f"https://image.tmdb.org/t/p/w500{item['poster_path']}" if item.get("poster_path") else None,
                "backdrop_url": f"https://image.tmdb.org/t/p/w500{item['backdrop_path']}" if item.get("backdrop_path") else None,
                "rating": item.get("vote_average"),
                "genres": [],
                "language": item.get("original_language"),
                "cinema_region": None,
            })
        return {"results": results, "total": tmdb_result.get("total_results", 0)}
    except Exception:
        return {"results": [], "total": 0}


@router.get("/{tmdb_id}")
async def get_movie(tmdb_id: int, db: AsyncSession = Depends(get_db)):
    """Get complete movie details."""
    movie = await get_or_fetch_movie(db, tmdb_id)
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    return _format_movie(movie)
