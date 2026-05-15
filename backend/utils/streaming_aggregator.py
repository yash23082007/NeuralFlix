"""
Streaming Aggregator — Unified "Where to Watch" engine.

Combines TMDB Watch Providers + Watchmode into a single, normalized response.
Inspired by JustWatch's UX: provider logos, type (stream/rent/buy), and links.
"""

import asyncio
import logging
import os
import time
from typing import Dict, List, Optional, Any

import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("STREAMING_AGGREGATOR")

TMDB_API_KEY = os.getenv("TMDB_API_KEY")
TMDB_BASE = "https://api.themoviedb.org/3"
TMDB_IMG = "https://image.tmdb.org/t/p"

WATCHMODE_API_KEY = os.getenv("WATCHMODE_API_KEY")
WATCHMODE_BASE = "https://api.watchmode.com/v1"

# ─── In-memory cache ──────────────────────────────────────
_provider_cache: Dict[str, Any] = {}
_provider_cache_ts: Dict[str, float] = {}
_CACHE_TTL = 3600  # 1 hour — streaming data changes slowly


def _get_cached(key: str) -> Optional[Any]:
    if key in _provider_cache and time.time() - _provider_cache_ts.get(key, 0) < _CACHE_TTL:
        return _provider_cache[key]
    return None


def _set_cached(key: str, value: Any):
    _provider_cache[key] = value
    _provider_cache_ts[key] = time.time()


# ─── Provider Logo Map ────────────────────────────────────
# TMDB provides logo_path for each provider, we construct full URLs
def _provider_logo(logo_path: str) -> Optional[str]:
    if logo_path:
        return f"{TMDB_IMG}/w92{logo_path}"
    return None


# ─── TMDB Watch Providers ─────────────────────────────────
async def fetch_tmdb_providers(
    tmdb_id: int,
    media_type: str = "movie",
    regions: List[str] = None
) -> Dict[str, List[Dict]]:
    """
    Fetch streaming/rent/buy availability from TMDB.
    Returns normalized provider data organized by type.
    """
    if not TMDB_API_KEY:
        return {}

    if regions is None:
        regions = ["IN", "US", "GB", "CA", "AU", "DE", "FR", "KR", "JP"]

    cache_key = f"tmdb_providers:{media_type}:{tmdb_id}"
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            url = f"{TMDB_BASE}/{media_type}/{tmdb_id}/watch/providers"
            resp = await client.get(url, params={"api_key": TMDB_API_KEY})
            if resp.status_code != 200:
                return {}

            data = resp.json()
            all_results = data.get("results", {})

            # Aggregate across requested regions, prioritize first match
            providers: Dict[str, List[Dict]] = {
                "stream": [],
                "rent": [],
                "buy": [],
                "ads": [],
            }
            seen_providers: Dict[str, set] = {k: set() for k in providers}

            for region in regions:
                region_data = all_results.get(region, {})
                for category, tmdb_key in [
                    ("stream", "flatrate"),
                    ("rent", "rent"),
                    ("buy", "buy"),
                    ("ads", "ads"),
                ]:
                    for p in region_data.get(tmdb_key, []):
                        provider_name = p.get("provider_name", "")
                        if provider_name not in seen_providers[category]:
                            seen_providers[category].add(provider_name)
                            providers[category].append({
                                "name": provider_name,
                                "provider_id": p.get("provider_id"),
                                "logo_url": _provider_logo(p.get("logo_path")),
                                "type": category,
                                "region": region,
                                "display_priority": p.get("display_priority", 999),
                            })

            # Sort each category by display priority
            for cat in providers:
                providers[cat].sort(key=lambda x: x.get("display_priority", 999))

            # Also create a flat "all" list (unique by name)
            all_flat = []
            all_seen = set()
            for cat in ["stream", "rent", "buy", "ads"]:
                for p in providers[cat]:
                    if p["name"] not in all_seen:
                        all_flat.append(p)
                        all_seen.add(p["name"])

            result = {
                **providers,
                "all": all_flat,
                "tmdb_link": all_results.get(regions[0], {}).get("link"),
            }

            _set_cached(cache_key, result)
            return result

    except Exception as e:
        logger.error(f"TMDB providers error: {e}")
        return {}


# ─── Watchmode Integration ─────────────────────────────────
async def fetch_watchmode_sources(imdb_id: str, region: str = "US") -> List[Dict]:
    """
    Fetch streaming sources from Watchmode API.
    Returns list of normalized provider entries with deep links.
    """
    if not WATCHMODE_API_KEY or not imdb_id:
        return []

    cache_key = f"watchmode:{imdb_id}:{region}"
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached

    try:
        async with httpx.AsyncClient(timeout=8) as client:
            # Step 1: Map IMDb ID to Watchmode ID
            search_resp = await client.get(
                f"{WATCHMODE_BASE}/search/",
                params={
                    "apiKey": WATCHMODE_API_KEY,
                    "search_field": "imdb_id",
                    "search_value": imdb_id,
                }
            )
            if search_resp.status_code != 200:
                return []

            title_results = search_resp.json().get("title_results", [])
            if not title_results:
                return []

            watchmode_id = title_results[0].get("id")

            # Step 2: Fetch sources
            sources_resp = await client.get(
                f"{WATCHMODE_BASE}/title/{watchmode_id}/sources/",
                params={"apiKey": WATCHMODE_API_KEY, "regions": region}
            )
            if sources_resp.status_code != 200:
                return []

            raw_sources = sources_resp.json()

            # Normalize and deduplicate
            unique: Dict[str, Dict] = {}
            for s in raw_sources:
                name = s.get("name", "")
                stype = s.get("type", "")
                key = f"{name}:{stype}"
                if key not in unique:
                    unique[key] = {
                        "name": name,
                        "type": _normalize_type(stype),
                        "url": s.get("web_url"),
                        "format": s.get("format"),
                        "price": s.get("price"),
                        "source": "watchmode",
                    }

            result = list(unique.values())
            _set_cached(cache_key, result)
            return result

    except Exception as e:
        logger.error(f"Watchmode sources error: {e}")
        return []


def _normalize_type(wm_type: str) -> str:
    """Normalize Watchmode type strings to our standard categories."""
    mapping = {"sub": "stream", "rent": "rent", "buy": "buy", "free": "ads", "addon": "stream"}
    return mapping.get(wm_type, "stream")


# ─── Unified Aggregation ──────────────────────────────────
async def get_streaming_availability(
    tmdb_id: int,
    imdb_id: Optional[str] = None,
    media_type: str = "movie",
    regions: List[str] = None,
) -> Dict[str, Any]:
    """
    Master aggregation function.
    Fetches from TMDB + Watchmode in parallel, merges and deduplicates.
    """
    cache_key = f"streaming:{media_type}:{tmdb_id}"
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached

    tasks = [fetch_tmdb_providers(tmdb_id, media_type, regions)]
    if imdb_id:
        tasks.append(fetch_watchmode_sources(imdb_id))

    results = await asyncio.gather(*tasks, return_exceptions=True)

    tmdb_result = results[0] if not isinstance(results[0], Exception) else {}
    watchmode_result = results[1] if len(results) > 1 and not isinstance(results[1], Exception) else []

    # Merge Watchmode deep links into TMDB provider data
    wm_by_name = {s["name"].lower(): s for s in watchmode_result} if watchmode_result else {}

    for category in ["stream", "rent", "buy", "ads"]:
        for provider in tmdb_result.get(category, []):
            wm_match = wm_by_name.get(provider["name"].lower())
            if wm_match:
                provider["deep_link"] = wm_match.get("url")
                provider["price"] = wm_match.get("price")

    # Build summary for quick display on cards
    stream_names = [p["name"] for p in tmdb_result.get("stream", [])[:5]]
    
    result = {
        "providers": tmdb_result,
        "summary": {
            "streaming_on": stream_names,
            "total_providers": len(tmdb_result.get("all", [])),
            "has_stream": len(tmdb_result.get("stream", [])) > 0,
            "has_rent": len(tmdb_result.get("rent", [])) > 0,
            "has_buy": len(tmdb_result.get("buy", [])) > 0,
        },
    }

    _set_cached(cache_key, result)
    return result


# ─── Batch Provider Fetch (for MovieCards) ─────────────────
async def batch_fetch_providers(
    tmdb_ids: List[int],
    media_type: str = "movie",
    regions: List[str] = None,
) -> Dict[int, List[str]]:
    """
    Fetch streaming provider names for multiple movies at once.
    Returns {tmdb_id: ["Netflix", "Prime Video", ...]}
    Used for displaying provider badges on movie cards.
    """
    async def _fetch_one(tid: int) -> tuple:
        providers = await fetch_tmdb_providers(tid, media_type, regions)
        names = [p["name"] for p in providers.get("stream", [])[:4]]
        return (tid, names)

    # Limit concurrency to avoid TMDB rate limits
    semaphore = asyncio.Semaphore(8)

    async def _limited(tid: int):
        async with semaphore:
            return await _fetch_one(tid)

    results = await asyncio.gather(*[_limited(tid) for tid in tmdb_ids], return_exceptions=True)

    provider_map = {}
    for r in results:
        if isinstance(r, tuple):
            provider_map[r[0]] = r[1]

    return provider_map
