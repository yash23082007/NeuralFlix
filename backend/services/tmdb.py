import os
import httpx
import logging
from typing import List, Dict, Optional, Any
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger("TMDB_SERVICE")

TMDB_API_KEY = os.getenv("TMDB_API_KEY", "")
TMDB_BASE_URL = "https://api.themoviedb.org/3"

class TMDBService:
    def __init__(self):
        self.api_key = TMDB_API_KEY
        self.headers = {
            "accept": "application/json",
            "Authorization": f"Bearer {os.getenv('TMDB_READ_TOKEN', '')}"
        }

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=6))
    async def get_movie_details(self, tmdb_id: int) -> Optional[Dict[str, Any]]:
        """Fetch full movie details including credits and release dates."""
        async with httpx.AsyncClient() as client:
            try:
                params = {"api_key": self.api_key, "append_to_response": "credits,videos,watch/providers,release_dates"}
                response = await client.get(f"{TMDB_BASE_URL}/movie/{tmdb_id}", params=params)
                response.raise_for_status()
                return response.json()
            except Exception as e:
                logger.error(f"Error fetching TMDB movie {tmdb_id}: {e}")
                return None

    async def get_trending(self, time_window: str = "day") -> List[Dict[str, Any]]:
        """Fetch trending movies for a given window (day/week)."""
        async with httpx.AsyncClient() as client:
            try:
                params = {"api_key": self.api_key}
                response = await client.get(f"{TMDB_BASE_URL}/trending/movie/{time_window}", params=params)
                response.raise_for_status()
                return response.json().get("results", [])
            except Exception as e:
                logger.error(f"Error fetching TMDB trending: {e}")
                return []

    async def get_streaming_providers(self, tmdb_id: int, region: str = "US") -> List[Dict[str, Any]]:
        """Fetch streaming availability (JustWatch integration via TMDB)."""
        details = await self.get_movie_details(tmdb_id)
        if not details:
            return []
        
        providers = details.get("watch/providers", {}).get("results", {}).get(region, {})
        platforms = []
        
        # Mapping to our internal StreamingPlatform schema
        for provider in providers.get("flatrate", []):
            platforms.append({
                "name": provider["provider_name"],
                "url": None, # TMDB doesn't provide direct URLs usually
                "type": "subscription"
            })
        for provider in providers.get("rent", []):
            platforms.append({
                "name": provider["provider_name"],
                "type": "rent"
            })
        for provider in providers.get("buy", []):
            platforms.append({
                "name": provider["provider_name"],
                "type": "buy"
            })
            
        return platforms

    def get_poster_url(self, path: Optional[str], size: str = "w500") -> Optional[str]:
        if not path:
            return None
        return f"https://image.tmdb.org/t/p/{size}{path}"

tmdb_service = TMDBService()
