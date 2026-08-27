"""
NeuralFlix — Movie Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.movie import MovieDetail, MovieSearchResult, MovieCard
from app.services.catalog_service import get_or_fetch_movie
from app.services.tmdb_service import search_movies

router = APIRouter(prefix="/api/v1/movies", tags=["Movies"])

@router.get("/trending")
async def get_trending():
    """Return hardcoded trending seed data for the simplified initial boot."""
    return {
        "results": [
            {
                "tmdb_id": 1,
                "title": "Example Movie",
                "genres": ["Drama"],
                "poster_url": None,
                "cinema_region": "Indian"
            }
        ]
    }


@router.get("/search", response_model=MovieSearchResult)
@router.get("/search/", response_model=MovieSearchResult, include_in_schema=False)
async def search(
    query: str = Query(..., min_length=2),
    page: int = Query(1, ge=1, le=1000)
):
    """Pass-through search to TMDB."""
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

    return {
        "results": results,
        "total": tmdb_result.get("total_results", 0),
    }


@router.get("/{tmdb_id}", response_model=MovieDetail)
async def get_movie(tmdb_id: int, db: AsyncSession = Depends(get_db)):
    """Get complete movie details (from DB or fetched from TMDB on the fly)."""
    movie = await get_or_fetch_movie(db, tmdb_id)
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    return movie


