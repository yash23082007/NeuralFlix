import httpx
import asyncio
from typing import Dict, Any, List, Optional
from fastapi import HTTPException

# Authoritative Deep Data Resource
IMDB_BASE_URL = "https://api.imdbapi.dev"

async def _make_async_request(endpoint: str, params: dict = None) -> Dict[str, Any]:
    url = f"{IMDB_BASE_URL}{endpoint}"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params, timeout=10)
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            print(f"IMDb API Error at {endpoint}: {e}")
    return {}

# --- CORE SEARCH & METADATA (Legacy Support Ported to Async) ---

async def fetch_imdb_titles(types: List[str] = None, genres: List[str] = None, 
                           start_year: int = None, end_year: int = None,
                           min_rating: float = None, sort_by: str = None, 
                           sort_order: str = None) -> Dict[str, Any]:
    params = {}
    if types: params['types'] = types
    if genres: params['genres'] = genres
    if start_year: params['startYear'] = start_year
    if end_year: params['endYear'] = end_year
    if min_rating: params['minAggregateRating'] = min_rating
    if sort_by: params['sortBy'] = sort_by
    if sort_order: params['sortOrder'] = sort_order
    
    return await _make_async_request("/titles", params=params)

async def fetch_imdb_title_details(title_id: str) -> Dict[str, Any]:
    return await _make_async_request(f"/titles/{title_id}")

async def fetch_imdb_batch_titles(title_ids: List[str]) -> Dict[str, Any]:
    params = {'titleIds': title_ids}
    return await _make_async_request("/titles:batchGet", params=params)

# --- PHASE 11: PREMIUM ENRICHMENT (New Authoritative Features) ---

async def get_deep_movie_data(imdb_id: str):
    """
    Authoritative Deep Data Heist.
    Fetches Parents Guide, Box Office, Awards, and Trivia concurrently.
    """
    if not imdb_id or not imdb_id.startswith("tt"):
        return {}

    async with httpx.AsyncClient() as client:
        try:
            # Concurrently fetch deep metadata
            responses = await asyncio.gather(
                client.get(f"{IMDB_BASE_URL}/titles/{imdb_id}/parentsGuide"),
                client.get(f"{IMDB_BASE_URL}/titles/{imdb_id}/boxOffice"),
                client.get(f"{IMDB_BASE_URL}/titles/{imdb_id}/trivia"),
                client.get(f"{IMDB_BASE_URL}/titles/{imdb_id}/awardNominations"),
                return_exceptions=True
            )

            # Safeguard against API failures
            data = {}
            keys = ["parents_guide", "box_office", "trivia", "awards"]
            
            for i, response in enumerate(responses):
                if isinstance(response, httpx.Response) and response.status_code == 200:
                    data[keys[i]] = response.json()
                else:
                    data[keys[i]] = None

            return data
        except Exception as e:
            print(f"IMDb API Premium Error: {e}")
            return {}

async def get_starmeter():
    """Fetches trending actors/names for the homepage."""
    return await _make_async_request("/chart/starmeter")

# Other legacy endpoints ported to async
async def fetch_imdb_credits(title_id: str) -> Dict[str, Any]:
    return await _make_async_request(f"/titles/{title_id}/credits")

async def fetch_imdb_release_dates(title_id: str) -> Dict[str, Any]:
    return await _make_async_request(f"/titles/{title_id}/releaseDates")

async def fetch_imdb_akas(title_id: str) -> Dict[str, Any]:
    return await _make_async_request(f"/titles/{title_id}/akas")

async def fetch_imdb_seasons(title_id: str) -> Dict[str, Any]:
    return await _make_async_request(f"/titles/{title_id}/seasons")

async def fetch_imdb_episodes(title_id: str) -> Dict[str, Any]:
    return await _make_async_request(f"/titles/{title_id}/episodes")
