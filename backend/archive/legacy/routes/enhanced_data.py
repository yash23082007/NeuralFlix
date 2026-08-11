"""
Enhanced Data Routes — Streaming Availability, Multi-Source Ratings, Trakt Trending.

These endpoints power the JustWatch-style streaming badges and 
Letterboxd-style multi-rating displays on the frontend.
"""

from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional

router = APIRouter()


# ─── Streaming Availability ───────────────────────────────

@router.get("/streaming/{tmdb_id}")
async def get_streaming(
    tmdb_id: int,
    imdb_id: Optional[str] = None,
    media_type: str = Query("movie", pattern="^(movie|tv)$"),
    regions: Optional[str] = Query(None, description="Comma-separated region codes: IN,US,GB"),
):
    """
    Get unified streaming availability for a title.
    Aggregates TMDB Watch Providers + Watchmode deep links.
    """
    from utils.streaming_aggregator import get_streaming_availability

    region_list = regions.split(",") if regions else None
    result = await get_streaming_availability(tmdb_id, imdb_id, media_type, region_list)
    return result


@router.post("/streaming/batch")
async def batch_streaming(
    tmdb_ids: List[int],
    media_type: str = Query("movie", pattern="^(movie|tv)$"),
    regions: Optional[str] = Query(None),
):
    """
    Batch fetch streaming provider names for multiple movies.
    Returns {tmdb_id: ["Netflix", "Prime Video", ...]}
    Used for displaying provider badges on movie cards.
    """
    from utils.streaming_aggregator import batch_fetch_providers

    region_list = regions.split(",") if regions else None
    result = await batch_fetch_providers(tmdb_ids, media_type, region_list)
    return {"providers": result}


# ─── Multi-Source Ratings ─────────────────────────────────

@router.get("/ratings/{tmdb_id}")
async def get_ratings(
    tmdb_id: int,
    imdb_id: Optional[str] = None,
    media_type: str = Query("movie", pattern="^(movie|tv)$"),
):
    """
    Get aggregated ratings from TMDB, IMDb, Rotten Tomatoes, and Metacritic.
    Returns individual scores + a weighted NeuralFlix composite score.
    """
    from utils.rating_aggregator import get_aggregated_ratings

    result = await get_aggregated_ratings(tmdb_id, imdb_id, media_type)
    return result


@router.get("/ratings/{tmdb_id}/badges")
async def get_rating_badges(
    tmdb_id: int,
    imdb_id: Optional[str] = None,
):
    """
    Lightweight rating badges for movie card display.
    Returns: {"imdb": "8.3", "rt": "92%", "mc": "85", "neuralflix_score": "82.5/100"}
    """
    from utils.rating_aggregator import get_rating_badges as _get_badges

    return await _get_badges(tmdb_id, imdb_id)


# ─── Trakt.tv Public Endpoints ────────────────────────────

@router.get("/trakt/trending")
async def trakt_trending(
    media_type: str = Query("movies", pattern="^(movies|shows)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    """
    Get currently trending titles from Trakt.tv community.
    These are movies/shows being watched RIGHT NOW.
    No authentication required (uses Client ID only).
    """
    from utils.trakt_enhanced import fetch_trakt_trending

    results = await fetch_trakt_trending(media_type, page, limit)
    return {"results": results, "total": len(results), "source": "trakt"}


@router.get("/trakt/popular")
async def trakt_popular(
    media_type: str = Query("movies", pattern="^(movies|shows)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    """
    Get most popular titles on Trakt.tv (all-time).
    """
    from utils.trakt_enhanced import fetch_trakt_popular

    results = await fetch_trakt_popular(media_type, page, limit)
    return {"results": results, "total": len(results), "source": "trakt"}


@router.get("/trakt/most-watched")
async def trakt_most_watched(
    media_type: str = Query("movies", pattern="^(movies|shows)$"),
    period: str = Query("weekly", pattern="^(daily|weekly|monthly|yearly|all)$"),
):
    """
    Get most watched titles for a period from Trakt.tv.
    """
    from utils.trakt_enhanced import fetch_trakt_most_watched

    results = await fetch_trakt_most_watched(media_type, period)
    return {"results": results, "total": len(results), "source": "trakt", "period": period}
