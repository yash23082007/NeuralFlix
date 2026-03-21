import os
import requests
from dotenv import load_dotenv

load_dotenv()

WATCHMODE_API_KEY = os.getenv("WATCHMODE_API_KEY")
BASE_URL = "https://api.watchmode.com/v1"

def fetch_streaming_sources(imdb_id: str, region: str = "US") -> list:
    """
    Unique Takeover Feature: Tells users exactly where to watch a movie.
    Uses Watchmode API (Free Tier).
    """
    if not WATCHMODE_API_KEY or not imdb_id:
        return []
        
    # 1. Map IMDb ID to Watchmode Internal ID
    search_url = f"{BASE_URL}/search/"
    params = {
        "apiKey": WATCHMODE_API_KEY,
        "search_field": "imdb_id",
        "search_value": imdb_id
    }
    
    try:
        search_res = requests.get(search_url, params=params, timeout=5)
        if search_res.status_code != 200:
            return []
            
        title_results = search_res.json().get("title_results", [])
        if not title_results:
            return []
            
        watchmode_id = title_results[0].get("id")
        
        # 2. Fetch Sources for that Watchmode ID
        sources_url = f"{BASE_URL}/title/{watchmode_id}/sources/"
        params = {"apiKey": WATCHMODE_API_KEY, "regions": region}
        
        sources_res = requests.get(sources_url, params=params, timeout=5)
        if sources_res.status_code == 200:
            sources = sources_res.json()
            # De-duplicate by service name
            unique_sources = {}
            for s in sources:
                service = s.get("name")
                if service not in unique_sources:
                    unique_sources[service] = {
                        "name": service,
                        "type": s.get("type"), # 'sub', 'rent', 'buy'
                        "url": s.get("web_url"),
                        "format": s.get("format")
                    }
            return list(unique_sources.values())
            
    except Exception as e:
        print(f"Watchmode Error: {e}")
        
    return []
