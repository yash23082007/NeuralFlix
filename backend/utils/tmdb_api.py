import os
import time
import asyncio
import json
from functools import lru_cache
from dotenv import load_dotenv
import httpx

load_dotenv()

TMDB_API_KEY = os.getenv("TMDB_API_KEY")
BASE_URL = "https://api.tmdb.org/3"
IMAGE_BASE = "https://image.tmdb.org/t/p"

# ─── In-memory cache with TTL ────────────────────────
_cache = {}
_cache_ttl = {}

def _cached(key: str, ttl: int = 300):
    if key in _cache and time.time() - _cache_ttl.get(key, 0) < ttl:
        return _cache[key]
    return None

def _set_cache(key: str, value, ttl: int = 300):
    _cache[key] = value
    _cache_ttl[key] = time.time()

def _clear_cache():
    _cache.clear()
    _cache_ttl.clear()

SHARED_CLIENT = None

async def get_client():
    global SHARED_CLIENT
    if SHARED_CLIENT is None or SHARED_CLIENT.is_closed:
        limits = httpx.Limits(max_keepalive_connections=20, max_connections=100)
        SHARED_CLIENT = httpx.AsyncClient(timeout=15.0, limits=limits)
    return SHARED_CLIENT

async def _safe_get(url: str, params: dict = None, headers: dict = None, cache_ttl: int = 0):
    cache_key = f"{url}:{json.dumps(params or {})}"
    if cache_ttl:
        cached = _cached(cache_key, cache_ttl)
        if cached is not None:
            return cached
    try:
        client = await get_client()
        response = await client.get(url, headers=headers, params=params)
        if response.status_code == 200:
            data = response.json()
            if cache_ttl:
                _set_cache(cache_key, data, cache_ttl)
            return data
    except Exception as e:
        print(f"TMDB Error: {e}")
    return {}

def get_poster_url(path: str, size: str = "w500") -> str | None:
    return f"{IMAGE_BASE}/{size}{path}" if path else None

def get_backdrop_url(path: str) -> str | None:
    return f"{IMAGE_BASE}/original{path}" if path else None

# ─── Global Cinema Region Map ─────────────────────────
GLOBAL_REGIONS = {
    "bollywood":  {"country": "IN", "language": "hi"},
    "tollywood":  {"country": "IN", "language": "te"},
    "kollywood":  {"country": "IN", "language": "ta"},
    "mollywood":  {"country": "IN", "language": "ml"},
    "sandalwood": {"country": "IN", "language": "kn"},
    "bengali":    {"country": "IN", "language": "bn"},
    "marathi":    {"country": "IN", "language": "mr"},
    "punjabi":    {"country": "IN", "language": "pa"},
    "indian":     {"country": "IN"},
    "korean":     {"country": "KR", "language": "ko"},
    "japanese":   {"country": "JP", "language": "ja"},
    "french":     {"country": "FR", "language": "fr"},
    "hollywood":  {"country": "US", "language": "en"},
    "spanish":    {"language": "es"},
    "italian":    {"country": "IT", "language": "it"},
    "german":     {"country": "DE", "language": "de"},
    "chinese":    {"country": "CN", "language": "zh"},
    "iranian":    {"country": "IR", "language": "fa"},
    "nollywood":  {"country": "NG"},
    "brazilian":  {"country": "BR", "language": "pt"},
    "thai":       {"country": "TH", "language": "th"},
    "turkish":    {"country": "TR", "language": "tr"},
    "russian":    {"country": "RU", "language": "ru"},
    "arabic":     {"language": "ar"},
}

TMDB_READ_ACCESS_TOKEN = os.getenv("TMDB_READ_ACCESS_TOKEN")

def _get_headers():
    headers = {"accept": "application/json"}
    if TMDB_READ_ACCESS_TOKEN:
        headers["Authorization"] = f"Bearer {TMDB_READ_ACCESS_TOKEN}"
    return headers

def _get_params(extra=None):
    p = {}
    if not TMDB_READ_ACCESS_TOKEN and TMDB_API_KEY:
        p["api_key"] = TMDB_API_KEY
    if extra:
        p.update(extra)
    return p

# ─── Core Endpoints (All async) ───────────────────────

async def fetch_popular_movies(page: int = 1, language: str = "en-US"):
    if not TMDB_API_KEY: return []
    url = f"{BASE_URL}/movie/popular"
    data = await _safe_get(url, headers=_get_headers(), params=_get_params({"language": language, "page": page}), cache_ttl=120)
    return data.get('results', [])

async def fetch_top_rated(page: int = 1, language: str = "en-US"):
    if not TMDB_API_KEY: return []
    url = f"{BASE_URL}/movie/top_rated"
    data = await _safe_get(url, headers=_get_headers(), params=_get_params({"language": language, "page": page}), cache_ttl=300)
    return data.get('results', [])

async def fetch_trending(media_type: str = "movie", time_window: str = "week"):
    if not TMDB_API_KEY: return []
    url = f"{BASE_URL}/trending/{media_type}/{time_window}"
    data = await _safe_get(url, headers=_get_headers(), params=_get_params({"language": "en-US"}), cache_ttl=180)
    return data.get('results', [])

async def fetch_now_playing(page: int = 1):
    if not TMDB_API_KEY: return []
    url = f"{BASE_URL}/movie/now_playing"
    data = await _safe_get(url, headers=_get_headers(), params=_get_params({"language": "en-US", "page": page}), cache_ttl=120)
    return data.get('results', [])

async def fetch_by_genre(genre_id: int, language: str = "en-US", page: int = 1):
    if not TMDB_API_KEY: return []
    url = f"{BASE_URL}/discover/movie"
    data = await _safe_get(url, headers=_get_headers(), params=_get_params({
        "with_genres": genre_id, "language": language,
        "sort_by": "popularity.desc", "page": page, "vote_count.gte": 100
    }), cache_ttl=120)
    return data.get('results', [])

async def fetch_movies_by_region(region: str, page: int = 1, sort_by: str = "popularity.desc"):
    if not TMDB_API_KEY: return []
    url = f"{BASE_URL}/discover/movie"
    region_config = GLOBAL_REGIONS.get(region.lower(), {"language": "en"})
    query_params = {"sort_by": sort_by, "page": page, "vote_count.gte": 50}
    if "country" in region_config:
        query_params["with_origin_country"] = region_config["country"]
    if "language" in region_config:
        query_params["with_original_language"] = region_config["language"]
    data = await _safe_get(url, headers=_get_headers(), params=_get_params(query_params), cache_ttl=120)
    return data.get('results', [])

async def fetch_indian_movies(page: int = 1, language: str = None):
    if not TMDB_API_KEY: return []
    url = f"{BASE_URL}/discover/movie"
    params = {"with_origin_country": "IN", "sort_by": "popularity.desc", "page": page, "vote_count.gte": 30}
    if language:
        params["with_original_language"] = language
    data = await _safe_get(url, headers=_get_headers(), params=_get_params(params), cache_ttl=120)
    return data.get('results', [])

async def fetch_korean_movies(page: int = 1):
    return await fetch_movies_by_region("korean", page=page)

async def fetch_international_movies(page: int = 1):
    if not TMDB_API_KEY: return []
    url = f"{BASE_URL}/discover/movie"
    data = await _safe_get(url, headers=_get_headers(), params=_get_params({
        "sort_by": "popularity.desc", "page": page, "vote_count.gte": 100,
        "without_origin_country": "US|GB",
        "with_original_language": "ko|ja|fr|es|de|it|zh|pt|fa|tr|sv|da|no"
    }), cache_ttl=120)
    return data.get('results', [])

async def fetch_award_winners(page: int = 1):
    if not TMDB_API_KEY: return []
    url = f"{BASE_URL}/discover/movie"
    data = await _safe_get(url, headers=_get_headers(), params=_get_params({
        "sort_by": "vote_average.desc", "vote_count.gte": 5000, "vote_average.gte": 7.8, "page": page
    }), cache_ttl=300)
    return data.get('results', [])

async def fetch_hidden_gems(page: int = 1):
    if not TMDB_API_KEY: return []
    url = f"{BASE_URL}/discover/movie"
    data = await _safe_get(url, headers=_get_headers(), params=_get_params({
        "sort_by": "vote_average.desc", "vote_count.gte": 200, "vote_count.lte": 5000, "vote_average.gte": 7.5, "page": page
    }), cache_ttl=300)
    return data.get('results', [])

async def fetch_by_era(start_year: int, end_year: int, page: int = 1, country: str = None):
    if not TMDB_API_KEY: return []
    url = f"{BASE_URL}/discover/movie"
    params = {"sort_by": "vote_average.desc", "vote_count.gte": 200,
              "primary_release_date.gte": f"{start_year}-01-01",
              "primary_release_date.lte": f"{end_year}-12-31", "page": page}
    if country:
        params["with_origin_country"] = country
    data = await _safe_get(url, headers=_get_headers(), params=_get_params(params), cache_ttl=600)
    return data.get('results', [])

async def fetch_by_mood(mood: str, page: int = 1):
    if not TMDB_API_KEY: return []
    mood_map = {
        "feel_good":     {"with_genres": "35,10749", "sort_by": "popularity.desc"},
        "mind_blown":    {"with_genres": "53,878,9648", "sort_by": "vote_average.desc", "vote_count.gte": 500},
        "adrenaline":    {"with_genres": "28,12", "sort_by": "popularity.desc"},
        "want_to_cry":   {"with_genres": "18", "sort_by": "vote_average.desc"},
        "deep_thoughts": {"with_genres": "18,99", "sort_by": "vote_average.desc", "vote_count.gte": 500},
        "family_time":   {"with_genres": "10751,16", "sort_by": "popularity.desc"},
        "date_night":    {"with_genres": "10749,35", "sort_by": "popularity.desc"},
        "desi_vibes":    {"with_origin_country": "IN", "sort_by": "popularity.desc"},
        "korean_wave":   {"with_original_language": "ko", "sort_by": "popularity.desc"},
        "anime_night":   {"with_genres": "16", "with_original_language": "ja", "sort_by": "popularity.desc"},
        "french_mood":   {"with_original_language": "fr", "sort_by": "vote_average.desc", "vote_count.gte": 200},
        "classic_cinema": {"sort_by": "vote_average.desc", "vote_count.gte": 1000, "primary_release_date.lte": "1970-12-31"},
        "new_releases":  {"sort_by": "popularity.desc", "primary_release_date.gte": "2024-01-01"},
        "award_winners": {"sort_by": "vote_average.desc", "vote_count.gte": 5000, "vote_average.gte": 7.8},
        "hidden_gems":   {"sort_by": "vote_average.desc", "vote_count.gte": 200, "vote_count.lte": 5000, "vote_average.gte": 7.5},
        "nollywood_night": {"with_origin_country": "NG", "sort_by": "popularity.desc"},
        "90s_bollywood": {"with_origin_country": "IN", "primary_release_date.gte": "1990-01-01", "primary_release_date.lte": "1999-12-31"},
        "80s_nostalgia": {"primary_release_date.gte": "1980-01-01", "primary_release_date.lte": "1989-12-31", "sort_by": "popularity.desc"},
    }
    params = mood_map.get(mood.lower(), {"sort_by": "popularity.desc"})
    params["page"] = page
    if "vote_count.gte" not in params:
        params["vote_count.gte"] = 50
    url = f"{BASE_URL}/discover/movie"
    data = await _safe_get(url, headers=_get_headers(), params=_get_params(params), cache_ttl=120)
    return data.get('results', [])

async def fetch_indian_industry(industry: str, page: int = 1):
    cfg = {
        'bollywood': {'lang': 'hi'}, 'tollywood': {'lang': 'te'},
        'kollywood': {'lang': 'ta'}, 'mollywood': {'lang': 'ml'},
        'sandalwood': {'lang': 'kn'}, 'bengali': {'lang': 'bn'},
        'marathi': {'lang': 'mr'}, 'punjabi': {'lang': 'pa'},
    }.get(industry.lower())
    if not cfg:
        return await fetch_indian_movies(page=page)
    return await fetch_indian_movies(page=page, language=cfg['lang'])

async def fetch_tv_shows(page: int = 1, language: str = "en-US"):
    if not TMDB_API_KEY: return []
    url = f"{BASE_URL}/tv/popular"
    data = await _safe_get(url, headers=_get_headers(), params=_get_params({"language": language, "page": page}), cache_ttl=120)
    return data.get('results', [])

async def fetch_tv_details(tmdb_id: int):
    if not TMDB_API_KEY: return None
    url = f"{BASE_URL}/tv/{tmdb_id}"
    data = await _safe_get(url, headers=_get_headers(), params=_get_params({
        "language": "en-US",
        "append_to_response": "credits,videos,similar,watch/providers,external_ids"
    }))
    if data and "external_ids" in data:
        data["imdb_id"] = data["external_ids"].get("imdb_id")
    return data if data else None

async def search_movies(query: str, page: int = 1, language: str = "en-US"):
    if not TMDB_API_KEY: return []
    url = f"{BASE_URL}/search/movie"
    data = await _safe_get(url, headers=_get_headers(), params=_get_params({
        "query": query, "language": language, "page": page, "include_adult": "false"
    }), cache_ttl=60)
    return data.get('results', [])

async def search_multi(query: str, page: int = 1):
    if not TMDB_API_KEY: return []
    url = f"{BASE_URL}/search/multi"
    data = await _safe_get(url, headers=_get_headers(), params=_get_params({
        "query": query, "page": page, "include_adult": "false", "language": "en-US"
    }), cache_ttl=60)
    return data.get('results', [])

async def fetch_movie_details(tmdb_id: int):
    if not TMDB_API_KEY: return None
    url = f"{BASE_URL}/movie/{tmdb_id}"
    data = await _safe_get(url, headers=_get_headers(), params=_get_params({
        "language": "en-US",
        "append_to_response": "credits,videos,similar,watch/providers,keywords"
    }))
    return data if data else None

async def fetch_movie_recommendations(tmdb_id: int, page: int = 1):
    if not TMDB_API_KEY: return []
    url = f"{BASE_URL}/movie/{tmdb_id}/recommendations"
    data = await _safe_get(url, headers=_get_headers(), params=_get_params({
        "language": "en-US", "page": page
    }), cache_ttl=600)
    return data.get('results', [])

async def fetch_watch_providers(tmdb_id: int, region: str = "IN"):
    if not TMDB_API_KEY: return []
    url = f"{BASE_URL}/movie/{tmdb_id}/watch/providers"
    data = await _safe_get(url, headers=_get_headers(), params=_get_params())
    if data:
        results = data.get('results', {})
        for reg in [region, "US"]:
            if reg in results:
                flatrate = results[reg].get('flatrate', []) or []
                return [p['provider_name'] for p in flatrate]
    return []

_genre_cache = {}

async def fetch_genre_list(media_type: str = "movie"):
    if media_type in _genre_cache:
        return _genre_cache[media_type]
    if not TMDB_API_KEY: return {}
    url = f"{BASE_URL}/genre/{media_type}/list"
    data = await _safe_get(url, headers=_get_headers(), params=_get_params({"language": "en"}), cache_ttl=86400)
    genres = data.get('genres', [])
    result = {g['id']: g['name'] for g in genres}
    _genre_cache[media_type] = result
    return result

async def fetch_person_details(person_id: int):
    if not TMDB_API_KEY: return None
    url = f"{BASE_URL}/person/{person_id}"
    data = await _safe_get(url, headers=_get_headers(), params=_get_params({
        "language": "en-US", "append_to_response": "movie_credits,external_ids,images"
    }))
    return data if data else None

async def fetch_by_external_id(external_id: str, source: str = "imdb_id"):
    if not TMDB_API_KEY: return None
    url = f"{BASE_URL}/find/{external_id}"
    data = await _safe_get(url, headers=_get_headers(), params=_get_params({"external_source": source}))
    if data:
        movie_results = data.get("movie_results", [])
        if movie_results:
            return movie_results[0]
    return None

async def fetch_movie_poster(movie_title: str):
    results = await search_movies(movie_title)
    if results:
        poster_path = results[0].get('poster_path')
        return get_poster_url(poster_path)
    return None
