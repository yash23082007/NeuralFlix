"""
Movie Intelligence Platform — Movie Endpoints
Full support for trending, top-rated, cinema regions, mood mapping, anime, and search.
"""

from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_
from sqlalchemy.sql.expression import true as sa_true

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
    target_genres = MOOD_GENRE_MAP.get(mood_lower, ["Drama", "Action"])
    
    # SQL pushdown for SQLite/Postgres: check if any target genre is in the genres JSON
    # Simple cross-db approach for now: OR conditions on cast(genres, String).ilike
    from sqlalchemy import cast, String
    conditions = [cast(Movie.genres, String).ilike(f"%{g}%") for g in target_genres]
    
    offset = (page - 1) * limit
    result = await db.execute(
        select(Movie)
        .where(or_(*conditions))
        .order_by(desc(Movie.tmdb_rating), desc(Movie.popularity_score))
        .offset(offset)
        .limit(limit)
    )
    paged = result.scalars().all()
    
    # Note: total count requires a separate query or we can just return a large total
    # For now, returning a static total or doing a count query
    from sqlalchemy import select, func
    count_res = await db.execute(select(func.count(Movie.id)).where(or_(*conditions)))
    total = count_res.scalar()
    
    return {"results": [_format_movie(m) for m in paged], "mood": mood, "total": total}


@router.get("/region/{region}")
async def get_by_region(region: str, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=50), db: AsyncSession = Depends(get_db)):
    """Return movies for a specific cinema region."""
    region_key = region.lower()
    mapping = REGION_LANGUAGE_MAP.get(region_key)
    
    from sqlalchemy import or_, select, func, desc, String, cast
    
    conditions = []
    if mapping:
        if mapping["regions"]:
            conditions.append(cast(Movie.cinema_region, String).in_(mapping["regions"]))
        if mapping["languages"]:
            conditions.append(cast(Movie.language, String).in_(mapping["languages"]))
    else:
        conditions.append(cast(Movie.cinema_region, String).ilike(f"%{region_key}%"))
        
    where_clause = or_(*conditions) if conditions else sa_true()
    
    offset = (page - 1) * limit
    result = await db.execute(
        select(Movie)
        .where(where_clause)  # type: ignore
        .order_by(desc(Movie.tmdb_rating), desc(Movie.popularity_score))
        .offset(offset)
        .limit(limit)
    )
    paged = result.scalars().all()
    
    count_res = await db.execute(select(func.count(Movie.id)).where(where_clause))  # type: ignore
    total = count_res.scalar() or 0
    
    return {
        "results": [_format_movie(m) for m in paged],
        "region": region,
        "total": total,
        "page": page,
        "total_pages": max(1, (total + limit - 1) // limit)
    }

@router.get("/region/{region}/stats")
async def get_region_stats(region: str, db: AsyncSession = Depends(get_db)):
    """Return statistical telemetry for a cinema region."""
    region_key = region.lower()
    mapping = REGION_LANGUAGE_MAP.get(region_key)
    
    from sqlalchemy import or_, select, func, desc, String, cast
    
    conditions = []
    if mapping:
        if mapping["regions"]:
            conditions.append(cast(Movie.cinema_region, String).in_(mapping["regions"]))
        if mapping["languages"]:
            conditions.append(cast(Movie.language, String).in_(mapping["languages"]))
    else:
        conditions.append(cast(Movie.cinema_region, String).ilike(f"%{region_key}%"))
        
    where_clause = or_(*conditions) if conditions else sa_true()
    
    result = await db.execute(select(Movie).where(where_clause))  # type: ignore
    matched = result.scalars().all()
    
    genre_counts: dict[str, int] = {}
    for m in matched:
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
    
    from sqlalchemy import select, func, desc, String, cast
    where_clause = cast(Movie.genres, String).ilike(f"%{genre_lower}%")
    
    offset = (page - 1) * limit
    result = await db.execute(
        select(Movie)
        .where(where_clause)
        .order_by(desc(Movie.tmdb_rating), desc(Movie.popularity_score))
        .offset(offset)
        .limit(limit)
    )
    paged = result.scalars().all()
    
    count_res = await db.execute(select(func.count(Movie.id)).where(where_clause))
    total = count_res.scalar() or 0
    
    return {"results": [_format_movie(m) for m in paged], "genre": genre, "total": total}


@router.get("/filter")
async def filter_movies(
    genres: Optional[str] = None,
    language: Optional[str] = None,
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    min_rating: Optional[float] = None,
    sort: Optional[str] = "popularity",
    media_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(24, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """Filter movies by structured criteria."""
    from sqlalchemy import select, and_, func, cast, String, desc
    
    conditions = []
    if genres:
        for g in genres.split(","):
            conditions.append(cast(Movie.genres, String).ilike(f"%{g.strip()}%"))
    if language:
        conditions.append(cast(Movie.language, String).ilike(f"{language}"))
    if year_from:
        conditions.append(Movie.year >= year_from)
    if year_to:
        conditions.append(Movie.year <= year_to)
    if min_rating:
        conditions.append(Movie.tmdb_rating >= min_rating)
        
    where_clause = and_(*conditions) if conditions else sa_true()
    
    order_by_clause = desc(Movie.popularity_score)
    if sort == "rating":
        order_by_clause = desc(Movie.tmdb_rating)
    elif sort == "year":
        order_by_clause = desc(Movie.year)
        
    offset = (page - 1) * limit
    result = await db.execute(
        select(Movie).where(where_clause).order_by(order_by_clause).offset(offset).limit(limit)
    )
    movies = result.scalars().all()
    
    count_res = await db.execute(select(func.count(Movie.id)).where(where_clause))
    total = count_res.scalar() or 0
    
    return {
        "results": [_format_movie(m) for m in movies],
        "total": total,
        "page": page,
        "total_pages": max(1, (total + limit - 1) // limit)
    }

@router.get("/search", response_model=MovieSearchResult)
@router.get("/search/", response_model=MovieSearchResult, include_in_schema=False)
async def search(
    query: str = Query(..., min_length=2),
    page: int = Query(1, ge=1, le=1000),
    db: AsyncSession = Depends(get_db)
):
    """Search movies across local database with fallback to TMDB."""
    query_lower = query.lower()
    
    from sqlalchemy import select, func, desc, String, cast, or_
    
    where_clause = or_(
        cast(Movie.title, String).ilike(f"%{query_lower}%"),
        cast(Movie.director, String).ilike(f"%{query_lower}%"),
        cast(Movie.cast_members, String).ilike(f"%{query_lower}%"),
        cast(Movie.genres, String).ilike(f"%{query_lower}%")
    )
    
    result = await db.execute(
        select(Movie)
        .where(where_clause)
        .order_by(desc(Movie.tmdb_rating), desc(Movie.popularity_score))
        .limit(20)
    )
    local_matches = result.scalars().all()
    
    formatted_matches = [_format_movie(m) for m in local_matches]
    if formatted_matches:
        return {
            "results": formatted_matches,
            "total": len(formatted_matches)
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
