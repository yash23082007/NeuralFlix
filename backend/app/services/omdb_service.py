"""
NeuralFlix — OMDb API Service

Lightweight client for OMDb API to fetch extra ratings (IMDb, Rotten Tomatoes, Metacritic).
"""

from typing import Any, Dict, Optional
import httpx
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import get_settings

log = structlog.get_logger()
settings = get_settings()

OMDB_BASE_URL = "https://www.omdbapi.com/"
_timeout = httpx.Timeout(10.0, connect=5.0)

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def fetch_omdb_ratings(imdb_id: str) -> Optional[Dict[str, Any]]:
    """Fetch movie ratings from OMDb using IMDb ID."""
    if not settings.omdb_api_key:
        log.warning("omdb_api_key_missing")
        return None
        
    if not imdb_id:
        return None

    params = {
        "apikey": settings.omdb_api_key,
        "i": imdb_id
    }
    
    async with httpx.AsyncClient(timeout=_timeout) as client:
        response = await client.get(OMDB_BASE_URL, params=params)
        
        if response.status_code != 200:
            log.warning("omdb_fetch_failed", status=response.status_code, imdb_id=imdb_id)
            return None
            
        data = response.json()
        if data.get("Response") == "False":
            log.warning("omdb_movie_not_found", error=data.get("Error"), imdb_id=imdb_id)
            return None
            
        return data

def parse_omdb_ratings(data: dict) -> dict:
    """Extract standard ratings from OMDb response."""
    ratings = {
        "imdb_rating": None,
        "rotten_tomatoes": None,
        "metacritic": None
    }
    
    try:
        ratings["imdb_rating"] = float(data.get("imdbRating"))
    except (ValueError, TypeError):
        pass

    for r in data.get("Ratings", []):
        if r["Source"] == "Rotten Tomatoes":
            try:
                ratings["rotten_tomatoes"] = int(r["Value"].replace("%", ""))
            except (ValueError, AttributeError):
                pass
        elif r["Source"] == "Metacritic":
            try:
                ratings["metacritic"] = int(r["Value"].split("/")[0])
            except (ValueError, AttributeError):
                pass
                
    return ratings
