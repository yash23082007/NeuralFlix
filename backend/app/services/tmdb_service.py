"""
NeuralFlix — TMDB API Service

Lightweight client for TMDB API. Fetches movie details and populates
the local database schema. Uses tenacity for robust retries.
"""

from typing import Any, Dict, Optional
import httpx
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import get_settings

log = structlog.get_logger()
settings = get_settings()

TMDB_BASE_URL = "https://api.themoviedb.org/3"

# Common HTTPX client settings
_timeout = httpx.Timeout(10.0, connect=5.0)

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


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def fetch_movie_details(tmdb_id: int) -> Optional[Dict[str, Any]]:
    """Fetch complete movie details from TMDB, including credits and videos."""
    url = f"{TMDB_BASE_URL}/movie/{tmdb_id}"
    params = _get_params({"append_to_response": "credits,videos,keywords,release_dates"})
    
    async with httpx.AsyncClient(timeout=_timeout) as client:
        response = await client.get(url, headers=_get_headers(), params=params)
        
        if response.status_code == 404:
            log.warning("tmdb_movie_not_found", tmdb_id=tmdb_id)
            return None
            
        response.raise_for_status()
        return response.json()


async def search_movies(query: str, page: int = 1) -> Dict[str, Any]:
    """Search for movies on TMDB."""
    url = f"{TMDB_BASE_URL}/search/movie"
    params = _get_params({"query": query, "page": page, "include_adult": "false"})
    
    async with httpx.AsyncClient(timeout=_timeout) as client:
        response = await client.get(url, headers=_get_headers(), params=params)
        response.raise_for_status()
        return response.json()


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
            
    # Map to schema dictionary
    return {
        "tmdb_id": data["id"],
        "imdb_id": data.get("imdb_id"),
        "title": data.get("title") or data.get("original_title", ""),
        "overview": data.get("overview"),
        "tagline": data.get("tagline"),
        "genres": [g["name"] for g in data.get("genres", [])],
        "language": data.get("original_language"),
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
