"""
Trakt.tv Enhanced Integration — Public trending + user data.

Adds public (no-auth) endpoints for Trakt trending/popular movies,
and enhances the existing OAuth-based user watch history.
"""

import os
import time
import logging
from typing import Dict, List, Optional, Any

import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("TRAKT_ENHANCED")

TRAKT_CLIENT_ID = os.getenv("TRAKT_CLIENT_ID")
TRAKT_CLIENT_SECRET = os.getenv("TRAKT_CLIENT_SECRET")
TRAKT_REDIRECT_URI = os.getenv("TRAKT_REDIRECT_URI", "http://localhost:8000/api/trakt/callback")
TRAKT_API_URL = "https://api.trakt.tv"

# ─── Cache ────────────────────────────────────────────────
_trakt_cache: Dict[str, Any] = {}
_trakt_cache_ts: Dict[str, float] = {}
_CACHE_TTL = 600  # 10 minutes


def _get_cached(key: str) -> Optional[Any]:
    if key in _trakt_cache and time.time() - _trakt_cache_ts.get(key, 0) < _CACHE_TTL:
        return _trakt_cache[key]
    return None


def _set_cached(key: str, value: Any):
    _trakt_cache[key] = value
    _trakt_cache_ts[key] = time.time()


def _get_public_headers() -> Dict[str, str]:
    """Headers for public (no-auth) Trakt API calls."""
    return {
        "Content-Type": "application/json",
        "trakt-api-version": "2",
        "trakt-api-key": TRAKT_CLIENT_ID or "",
    }


def _get_auth_headers(access_token: str) -> Dict[str, str]:
    """Headers for authenticated Trakt API calls."""
    headers = _get_public_headers()
    headers["Authorization"] = f"Bearer {access_token}"
    return headers


# ─── OAuth Helpers ────────────────────────────────────────

def get_trakt_auth_url() -> str:
    """Returns the Trakt.tv OAuth2 login URL for the user to authenticate."""
    return (
        f"{TRAKT_API_URL}/oauth/authorize"
        f"?response_type=code"
        f"&client_id={TRAKT_CLIENT_ID}"
        f"&redirect_uri={TRAKT_REDIRECT_URI}"
    )


async def exchange_trakt_code(code: str) -> dict:
    """Exchanges the OAuth code for an Access Token."""
    if not TRAKT_CLIENT_ID or not TRAKT_CLIENT_SECRET:
        raise ValueError("Missing Trakt credentials in .env")

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{TRAKT_API_URL}/oauth/token",
            json={
                "code": code,
                "client_id": TRAKT_CLIENT_ID,
                "client_secret": TRAKT_CLIENT_SECRET,
                "redirect_uri": TRAKT_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
            headers={"Content-Type": "application/json"},
        )
        if response.status_code == 200:
            return response.json()
        return {"error": response.text}


# ─── Public Endpoints (No Auth Required) ──────────────────

async def fetch_trakt_trending(
    media_type: str = "movies",
    page: int = 1,
    limit: int = 20,
    extended: bool = True,
) -> List[Dict]:
    """
    Fetch currently trending movies/shows from Trakt.
    These are titles being watched RIGHT NOW by the Trakt community.
    Only requires Client ID (no OAuth).
    """
    if not TRAKT_CLIENT_ID:
        return []

    cache_key = f"trakt_trending:{media_type}:{page}:{limit}"
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            params = {"page": page, "limit": limit}
            if extended:
                params["extended"] = "full"

            resp = await client.get(
                f"{TRAKT_API_URL}/{media_type}/trending",
                headers=_get_public_headers(),
                params=params,
            )
            if resp.status_code != 200:
                logger.warning(f"Trakt trending returned {resp.status_code}")
                return []

            raw = resp.json()
            results = []
            for item in raw:
                movie = item.get("movie") or item.get("show", {})
                results.append({
                    "trakt_watchers": item.get("watchers", 0),
                    "title": movie.get("title"),
                    "year": movie.get("year"),
                    "trakt_id": movie.get("ids", {}).get("trakt"),
                    "tmdb_id": movie.get("ids", {}).get("tmdb"),
                    "imdb_id": movie.get("ids", {}).get("imdb"),
                    "slug": movie.get("ids", {}).get("slug"),
                    "overview": movie.get("overview"),
                    "runtime": movie.get("runtime"),
                    "rating": movie.get("rating"),
                    "votes": movie.get("votes"),
                    "genres": movie.get("genres", []),
                    "language": movie.get("language"),
                    "certification": movie.get("certification"),
                })

            _set_cached(cache_key, results)
            return results

    except Exception as e:
        logger.error(f"Trakt trending error: {e}")
        return []


async def fetch_trakt_popular(
    media_type: str = "movies",
    page: int = 1,
    limit: int = 20,
) -> List[Dict]:
    """
    Fetch most popular movies/shows on Trakt (all-time).
    Only requires Client ID (no OAuth).
    """
    if not TRAKT_CLIENT_ID:
        return []

    cache_key = f"trakt_popular:{media_type}:{page}:{limit}"
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{TRAKT_API_URL}/{media_type}/popular",
                headers=_get_public_headers(),
                params={"page": page, "limit": limit, "extended": "full"},
            )
            if resp.status_code != 200:
                return []

            raw = resp.json()
            results = []
            for movie in raw:
                results.append({
                    "title": movie.get("title"),
                    "year": movie.get("year"),
                    "tmdb_id": movie.get("ids", {}).get("tmdb"),
                    "imdb_id": movie.get("ids", {}).get("imdb"),
                    "overview": movie.get("overview"),
                    "rating": movie.get("rating"),
                    "votes": movie.get("votes"),
                    "genres": movie.get("genres", []),
                })

            _set_cached(cache_key, results)
            return results

    except Exception as e:
        logger.error(f"Trakt popular error: {e}")
        return []


async def fetch_trakt_most_watched(
    media_type: str = "movies",
    period: str = "weekly",
) -> List[Dict]:
    """
    Fetch most watched movies on Trakt for a given period.
    Periods: daily, weekly, monthly, yearly, all
    """
    if not TRAKT_CLIENT_ID:
        return []

    cache_key = f"trakt_watched:{media_type}:{period}"
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{TRAKT_API_URL}/{media_type}/watched/{period}",
                headers=_get_public_headers(),
                params={"limit": 20, "extended": "full"},
            )
            if resp.status_code != 200:
                return []

            raw = resp.json()
            results = []
            for item in raw:
                movie = item.get("movie") or item.get("show", {})
                results.append({
                    "watcher_count": item.get("watcher_count", 0),
                    "play_count": item.get("play_count", 0),
                    "title": movie.get("title"),
                    "year": movie.get("year"),
                    "tmdb_id": movie.get("ids", {}).get("tmdb"),
                    "imdb_id": movie.get("ids", {}).get("imdb"),
                    "rating": movie.get("rating"),
                    "genres": movie.get("genres", []),
                })

            _set_cached(cache_key, results)
            return results

    except Exception as e:
        logger.error(f"Trakt most-watched error: {e}")
        return []


# ─── Authenticated Endpoints ─────────────────────────────

async def fetch_trakt_watch_history(access_token: str) -> list:
    """Fetches the user's entire movie watch history from Trakt."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{TRAKT_API_URL}/sync/history/movies",
            headers=_get_auth_headers(access_token),
            params={"limit": 1000},
        )
        if response.status_code == 200:
            return response.json()
        return []


async def fetch_trakt_watchlist(access_token: str) -> list:
    """Fetches user watchlist from Trakt."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{TRAKT_API_URL}/sync/watchlist/movies",
            headers=_get_auth_headers(access_token),
        )
        if response.status_code == 200:
            return response.json()
        return []


async def fetch_trakt_ratings(access_token: str) -> list:
    """Fetches user's movie ratings from Trakt."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{TRAKT_API_URL}/sync/ratings/movies",
            headers=_get_auth_headers(access_token),
        )
        if response.status_code == 200:
            return response.json()
        return []


async def fetch_trakt_recommendations(access_token: str) -> list:
    """Fetches personalized recommendations from Trakt (requires OAuth)."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{TRAKT_API_URL}/recommendations/movies",
            headers=_get_auth_headers(access_token),
            params={"limit": 30, "extended": "full"},
        )
        if response.status_code == 200:
            return response.json()
        return []
