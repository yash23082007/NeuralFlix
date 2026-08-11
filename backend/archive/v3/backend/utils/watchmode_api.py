"""
Watchmode API — utils/watchmode_api.py

Fetches streaming sources (where to watch) via the Watchmode API.
Maps IMDb ID → Watchmode ID → streaming sources with deep links.

NOTE: The async version in streaming_aggregator.py is the primary integration.
This module provides the standalone utility functions.
"""

import os
from datetime import datetime, timezone
from typing import List, Dict, Optional

import httpx
from dotenv import load_dotenv

load_dotenv()

WATCHMODE_API_KEY = os.getenv("WATCHMODE_API_KEY")
BASE_URL = "https://api.watchmode.com/v1"


async def fetch_streaming_sources(
    imdb_id: str,
    region: str = "US",
    timeout: float = 5.0,
) -> List[Dict]:
    """
    Fetch streaming availability for a title via Watchmode.

    Returns a list of provider dicts with:
      - name: Service name (e.g., "Netflix")
      - type: 'sub', 'rent', 'buy'
      - url: Deep link to the title on that service
      - format: e.g., "HD", "SD"
      - checkedAt: ISO timestamp of when data was fetched
    """
    if not WATCHMODE_API_KEY or not imdb_id:
        return []

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            # 1. Map IMDb ID to Watchmode Internal ID
            search_resp = await client.get(
                f"{BASE_URL}/search/",
                params={
                    "apiKey": WATCHMODE_API_KEY,
                    "search_field": "imdb_id",
                    "search_value": imdb_id,
                },
            )
            if search_resp.status_code != 200:
                return []

            title_results = search_resp.json().get("title_results", [])
            if not title_results:
                return []

            watchmode_id = title_results[0].get("id")

            # 2. Fetch Sources for that Watchmode ID
            sources_resp = await client.get(
                f"{BASE_URL}/title/{watchmode_id}/sources/",
                params={"apiKey": WATCHMODE_API_KEY, "regions": region},
            )
            if sources_resp.status_code != 200:
                return []

            sources = sources_resp.json()
            now_iso = datetime.now(timezone.utc).isoformat()

            # De-duplicate by service name
            unique_sources: Dict[str, Dict] = {}
            for s in sources:
                service = s.get("name")
                if service and service not in unique_sources:
                    unique_sources[service] = {
                        "name": service,
                        "type": s.get("type"),  # 'sub', 'rent', 'buy'
                        "url": s.get("web_url"),
                        "format": s.get("format"),
                        "checkedAt": now_iso,
                    }
            return list(unique_sources.values())

    except httpx.TimeoutException:
        return []
    except Exception as e:
        print(f"Watchmode Error: {e}")

    return []


async def check_watchmode_freshness(imdb_id: str, region: str = "US") -> Optional[Dict]:
    """
    Check streaming availability and return freshness metadata.

    Returns:
      {
        "sources": [...],
        "checkedAt": "2026-08-06T00:00:00Z",
        "sourceCount": 3,
        "availabilityStatus": "fresh"  # fresh (<24h), aging (24-72h), stale (>72h)
      }
    """
    sources = await fetch_streaming_sources(imdb_id, region)
    now = datetime.now(timezone.utc)

    return {
        "sources": sources,
        "checkedAt": now.isoformat(),
        "sourceCount": len(sources),
        "availabilityStatus": "fresh",  # Just fetched, so always fresh
    }
