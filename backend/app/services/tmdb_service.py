"""
NeuralFlix — TMDB API Service

Pooled, resilient client for the TMDB API.
Fetches movie details, search, and discover feeds.
Includes 429 rate-limit awareness and avoids retrying permanent errors (401/404).
"""

import asyncio
from typing import Any, Dict, Optional
import httpx
import structlog

from app.config import get_settings

log = structlog.get_logger()
settings = get_settings()

TMDB_BASE_URL = "https://api.themoviedb.org/3"

_client: Optional[httpx.AsyncClient] = None


def get_tmdb_client() -> httpx.AsyncClient:
    """Return a module-level pooled AsyncClient singleton."""
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(10.0, connect=5.0),
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
        )
    return _client


async def close_tmdb_client() -> None:
    """Close the pooled AsyncClient."""
    global _client
    if _client is not None and not _client.is_closed:
        await _client.aclose()
        _client = None


def _get_headers() -> dict:
    if settings.tmdb_read_access_token:
        return {
            "Authorization": f"Bearer {settings.tmdb_read_access_token}",
            "accept": "application/json"
        }
    return {"accept": "application/json"}


def _get_params(extra: dict = None) -> dict:
    params = {}
    if not settings.tmdb_read_access_token and settings.tmdb_api_key:
        params["api_key"] = settings.tmdb_api_key
    if extra:
        params.update(extra)
    return params


async def _execute_tmdb_request(url: str, params: dict, max_retries: int = 3) -> Optional[Dict[str, Any]]:
    """Execute a TMDB request with 429 Retry-After handling and non-retryable status guards."""
    client = get_tmdb_client()
    for attempt in range(1, max_retries + 1):
        try:
            response = await client.get(url, headers=_get_headers(), params=params)
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                log.info("tmdb_not_found", url=url)
                return None
            elif response.status_code in (401, 403):
                log.error("tmdb_auth_error", status=response.status_code, url=url)
                return None
            elif response.status_code == 429:
                retry_after = int(response.headers.get("Retry-After", 2))
                log.warning("tmdb_rate_limited", retry_after=retry_after, attempt=attempt)
                await asyncio.sleep(retry_after)
                continue
            else:
                log.warning("tmdb_http_error", status=response.status_code, attempt=attempt)
                if attempt == max_retries:
                    response.raise_for_status()
                await asyncio.sleep(2 ** attempt)
        except httpx.RequestError as exc:
            log.warning("tmdb_network_error", error=str(exc), attempt=attempt)
            if attempt == max_retries:
                return None
            await asyncio.sleep(2 ** attempt)
    return None


async def fetch_movie_details(tmdb_id: int) -> Optional[Dict[str, Any]]:
    """Fetch complete movie details from TMDB, including credits, videos, and keywords."""
    url = f"{TMDB_BASE_URL}/movie/{tmdb_id}"
    params = _get_params({"append_to_response": "credits,videos,keywords,release_dates"})
    return await _execute_tmdb_request(url, params)


async def search_movies(query: str, page: int = 1) -> Dict[str, Any]:
    """Search for movies on TMDB."""
    url = f"{TMDB_BASE_URL}/search/movie"
    params = _get_params({"query": query, "page": page, "include_adult": "false"})
    result = await _execute_tmdb_request(url, params)
    return result or {"results": [], "total_results": 0, "page": page}


async def discover_movies(page: int = 1, sort_by: str = "popularity.desc", extra_params: dict = None) -> Dict[str, Any]:
    """Fetch one deterministic TMDB discover page for ingestion jobs."""
    url = f"{TMDB_BASE_URL}/discover/movie"
    params_dict = {"page": page, "sort_by": sort_by, "include_adult": "false", "include_video": "false"}
    if extra_params:
        params_dict.update(extra_params)
    params = _get_params(params_dict)
    result = await _execute_tmdb_request(url, params)
    return result or {"results": [], "total_results": 0, "page": page}


def parse_tmdb_movie(data: dict) -> dict:
    """Extract and normalize TMDB fields to match our DB schema."""
    # Extract trailer key
    trailer_key = None
    if "videos" in data and "results" in data["videos"]:
        trailers = [
            v for v in data["videos"]["results"]
            if v.get("site") == "YouTube" and v.get("type") == "Trailer"
        ]
        if trailers:
            trailer_key = trailers[0]["key"]

    # Extract cast
    cast_members = []
    if "credits" in data and "cast" in data["credits"]:
        cast_members = [c["name"] for c in data["credits"]["cast"][:10]]
        
    # Extract director
    director = None
    if "credits" in data and "crew" in data["credits"]:
        directors = [c["name"] for c in data["credits"]["crew"] if c.get("job") == "Director"]
        if directors:
            director = directors[0]
            
    # Extract keywords
    keywords = []
    if "keywords" in data and "keywords" in data["keywords"]:
        keywords = [k["name"] for k in data["keywords"]["keywords"]]
        
    # Extract year
    year = None
    if data.get("release_date"):
        try:
            year = int(data["release_date"][:4])
        except ValueError:
            pass

    # Infer cinema_region from original_language if not specified
    lang = data.get("original_language", "en")
    lang_region_map = {
        "hi": "bollywood",
        "te": "tollywood",
        "ta": "tamil",
        "ko": "korean",
        "ja": "japanese",
        "fr": "french",
        "es": "spanish",
        "fa": "iranian",
        "en": "hollywood",
    }
    cinema_region = lang_region_map.get(lang, "hollywood")

    return {
        "tmdb_id": data["id"],
        "imdb_id": data.get("imdb_id"),
        "title": data.get("title") or data.get("original_title", ""),
        "overview": data.get("overview"),
        "tagline": data.get("tagline"),
        "genres": [g["name"] for g in data.get("genres", [])],
        "language": lang,
        "cinema_region": cinema_region,
        "release_date": data.get("release_date"),
        "year": year,
        "runtime": data.get("runtime"),
        "poster_url": f"https://image.tmdb.org/t/p/w500{data['poster_path']}" if data.get("poster_path") else None,
        "backdrop_url": f"https://image.tmdb.org/t/p/w1280{data['backdrop_path']}" if data.get("backdrop_path") else None,
        "trailer_key": trailer_key,
        "tmdb_rating": data.get("vote_average", 0.0),
        "tmdb_votes": data.get("vote_count", 0),
        "popularity_score": data.get("popularity", 0.0),
        "director": director,
        "cast_members": cast_members,
        "keywords": keywords,
    }
