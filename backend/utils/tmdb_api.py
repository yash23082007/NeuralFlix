import os
import requests
from dotenv import load_dotenv

load_dotenv()

TMDB_API_KEY = os.getenv("TMDB_API_KEY")
BASE_URL = "https://api.themoviedb.org/3"
IMAGE_BASE = "https://image.tmdb.org/t/p"

# ─── Global Cinema Region Map ─────────────────────────────────
GLOBAL_REGIONS = {
    # Indian Industries
    "bollywood":  {"country": "IN", "language": "hi"},
    "tollywood":  {"country": "IN", "language": "te"},
    "kollywood":  {"country": "IN", "language": "ta"},
    "mollywood":  {"country": "IN", "language": "ml"},
    "sandalwood": {"country": "IN", "language": "kn"},
    "bengali":    {"country": "IN", "language": "bn"},
    "marathi":    {"country": "IN", "language": "mr"},
    "punjabi":    {"country": "IN", "language": "pa"},
    "indian":     {"country": "IN"},

    # Global Regions
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
    "indonesian": {"country": "ID", "language": "id"},
    "turkish":    {"country": "TR", "language": "tr"},
    "scandinavian": {"language": "sv"},
    "russian":    {"country": "RU", "language": "ru"},
    "arabic":     {"language": "ar"},
}

INDIAN_INDUSTRIES = {
    'bollywood':  {'lang': 'hi', 'flag': '🎬', 'accent': '#FF6B35', 'hub': 'Mumbai'},
    'tollywood':  {'lang': 'te', 'flag': '🌟', 'accent': '#F39C12', 'hub': 'Hyderabad'},
    'kollywood':  {'lang': 'ta', 'flag': '🎭', 'accent': '#E74C3C', 'hub': 'Chennai'},
    'mollywood':  {'lang': 'ml', 'flag': '🌿', 'accent': '#27AE60', 'hub': 'Kerala'},
    'sandalwood': {'lang': 'kn', 'flag': '🌳', 'accent': '#8E44AD', 'hub': 'Bangalore'},
    'bengali':    {'lang': 'bn', 'flag': '🎪', 'accent': '#2980B9', 'hub': 'Kolkata'},
    'marathi':    {'lang': 'mr', 'flag': '🏯', 'accent': '#D35400', 'hub': 'Pune'},
    'punjabi':    {'lang': 'pa', 'flag': '💛', 'accent': '#F1C40F', 'hub': 'Chandigarh'},
}


def get_headers():
    return {"accept": "application/json"}


def get_params(extra_params=None):
    params = {"api_key": TMDB_API_KEY}
    if extra_params:
        params.update(extra_params)
    return params


def _safe_get(url: str, params: dict = None, headers: dict = None):
    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f"TMDB Error: {e}")
    return {}


def get_poster_url(path: str, size: str = "w500") -> str | None:
    if path:
        return f"{IMAGE_BASE}/{size}{path}"
    return None


def get_backdrop_url(path: str) -> str | None:
    if path:
        return f"{IMAGE_BASE}/original{path}"
    return None


# ─── Core Endpoints ────────────────────────────────────────────

def fetch_popular_movies(page: int = 1, language: str = "en-US"):
    if not TMDB_API_KEY: return []
    url = f"{BASE_URL}/movie/popular"
    data = _safe_get(url, headers=get_headers(), params=get_params({"language": language, "page": page}))
    return data.get('results', [])


def fetch_top_rated(page: int = 1, language: str = "en-US"):
    if not TMDB_API_KEY: return []
    url = f"{BASE_URL}/movie/top_rated"
    data = _safe_get(url, headers=get_headers(), params=get_params({"language": language, "page": page}))
    return data.get('results', [])


def fetch_trending(media_type: str = "movie", time_window: str = "week"):
    if not TMDB_API_KEY: return []
    url = f"{BASE_URL}/trending/{media_type}/{time_window}"
    data = _safe_get(url, headers=get_headers(), params=get_params({"language": "en-US"}))
    return data.get('results', [])


def fetch_now_playing(page: int = 1):
    if not TMDB_API_KEY: return []
    url = f"{BASE_URL}/movie/now_playing"
    data = _safe_get(url, headers=get_headers(), params=get_params({"language": "en-US", "page": page}))
    return data.get('results', [])


def fetch_by_genre(genre_id: int, language: str = "en-US", page: int = 1):
    if not TMDB_API_KEY: return []
    url = f"{BASE_URL}/discover/movie"
    data = _safe_get(url, headers=get_headers(), params=get_params({
        "with_genres": genre_id, "language": language,
        "sort_by": "popularity.desc", "page": page, "vote_count.gte": 100
    }))
    return data.get('results', [])


# ─── Regional Cinema Endpoints ─────────────────────────────────

def fetch_movies_by_region(region: str, page: int = 1, sort_by: str = "popularity.desc"):
    """Fetch movies by cinema region name (e.g., 'korean', 'bollywood', 'french')."""
    if not TMDB_API_KEY: return []
    url = f"{BASE_URL}/discover/movie"
    
    region_config = GLOBAL_REGIONS.get(region.lower(), {"language": "en"})
    query_params = {"sort_by": sort_by, "page": page, "vote_count.gte": 50}
    
    if "country" in region_config:
        query_params["with_origin_country"] = region_config["country"]
    if "language" in region_config:
        query_params["with_original_language"] = region_config["language"]
    
    data = _safe_get(url, headers=get_headers(), params=get_params(query_params))
    return data.get('results', [])


def fetch_indian_movies(page: int = 1, language: str = None):
    """Fetch Indian movies. Optionally filter by language (hi, ta, te, ml, kn, etc.)."""
    if not TMDB_API_KEY: return []
    url = f"{BASE_URL}/discover/movie"
    params = {
        "with_origin_country": "IN",
        "sort_by": "popularity.desc",
        "page": page,
        "vote_count.gte": 30
    }
    if language:
        params["with_original_language"] = language
    data = _safe_get(url, headers=get_headers(), params=get_params(params))
    return data.get('results', [])


def fetch_korean_movies(page: int = 1):
    """Fetch Korean movies."""
    return fetch_movies_by_region("korean", page=page)


def fetch_international_movies(page: int = 1):
    """Fetch non-English international films (excluding US/UK/India)."""
    if not TMDB_API_KEY: return []
    url = f"{BASE_URL}/discover/movie"
    data = _safe_get(url, headers=get_headers(), params=get_params({
        "sort_by": "popularity.desc",
        "page": page,
        "vote_count.gte": 100,
        "without_origin_country": "US|GB",
        "with_original_language": "ko|ja|fr|es|de|it|zh|pt|fa|tr|sv|da|no"
    }))
    return data.get('results', [])


def fetch_award_winners(page: int = 1):
    """Fetch highly rated, widely acclaimed films (award-winner proxy)."""
    if not TMDB_API_KEY: return []
    url = f"{BASE_URL}/discover/movie"
    data = _safe_get(url, headers=get_headers(), params=get_params({
        "sort_by": "vote_average.desc",
        "vote_count.gte": 5000,
        "vote_average.gte": 7.8,
        "page": page
    }))
    return data.get('results', [])


def fetch_hidden_gems(page: int = 1):
    """Fetch underrated films with high ratings but low vote counts."""
    if not TMDB_API_KEY: return []
    url = f"{BASE_URL}/discover/movie"
    data = _safe_get(url, headers=get_headers(), params=get_params({
        "sort_by": "vote_average.desc",
        "vote_count.gte": 200,
        "vote_count.lte": 5000,
        "vote_average.gte": 7.5,
        "page": page
    }))
    return data.get('results', [])


def fetch_by_era(start_year: int, end_year: int, page: int = 1, country: str = None):
    """Fetch movies by era/decade."""
    if not TMDB_API_KEY: return []
    url = f"{BASE_URL}/discover/movie"
    params = {
        "sort_by": "vote_average.desc",
        "vote_count.gte": 200,
        "primary_release_date.gte": f"{start_year}-01-01",
        "primary_release_date.lte": f"{end_year}-12-31",
        "page": page
    }
    if country:
        params["with_origin_country"] = country
    data = _safe_get(url, headers=get_headers(), params=get_params(params))
    return data.get('results', [])


def fetch_by_mood(mood: str, page: int = 1):
    """Fetch movies by mood/vibe using TMDB discover filters."""
    if not TMDB_API_KEY: return []
    
    mood_map = {
        "feel_good":     {"with_genres": "35,10749", "sort_by": "popularity.desc"},
        "mind_blown":    {"with_genres": "53,878,9648", "sort_by": "vote_average.desc", "vote_count.gte": 500},
        "adrenaline":    {"with_genres": "28,12", "sort_by": "popularity.desc"},
        "want_to_cry":   {"with_genres": "18", "with_keywords": "5565|9748|10683", "sort_by": "vote_average.desc"},
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
    data = _safe_get(url, headers=get_headers(), params=get_params(params))
    return data.get('results', [])


# ─── Indian Industry Endpoint ───────────────────────────────────

def fetch_indian_industry(industry: str, page: int = 1):
    """Fetch movies from a specific Indian film industry."""
    cfg = INDIAN_INDUSTRIES.get(industry.lower())
    if not cfg:
        return fetch_indian_movies(page=page)
    return fetch_indian_movies(page=page, language=cfg['lang'])


# ─── TV / Series ────────────────────────────────────────────────

def fetch_tv_shows(page: int = 1, language: str = "en-US"):
    if not TMDB_API_KEY: return []
    url = f"{BASE_URL}/tv/popular"
    data = _safe_get(url, headers=get_headers(), params=get_params({"language": language, "page": page}))
    return data.get('results', [])


def fetch_tv_details(tmdb_id: int):
    if not TMDB_API_KEY: return None
    url = f"{BASE_URL}/tv/{tmdb_id}"
    data = _safe_get(url, headers=get_headers(), params=get_params({
        "language": "en-US", 
        "append_to_response": "credits,videos,similar,watch/providers,external_ids"
    }))
    if data and "external_ids" in data:
        data["imdb_id"] = data["external_ids"].get("imdb_id")
    return data if data else None


# ─── Search ─────────────────────────────────────────────────────

def search_movies(query: str, page: int = 1, language: str = "en-US"):
    if not TMDB_API_KEY: return []
    url = f"{BASE_URL}/search/movie"
    data = _safe_get(url, headers=get_headers(), params=get_params({
        "query": query, "language": language, "page": page, "include_adult": "false"
    }))
    return data.get('results', [])


def search_multi(query: str, page: int = 1):
    if not TMDB_API_KEY: return []
    url = f"{BASE_URL}/search/multi"
    data = _safe_get(url, headers=get_headers(), params=get_params({
        "query": query, "page": page, "include_adult": "false", "language": "en-US"
    }))
    return data.get('results', [])


# ─── Details & Metadata ─────────────────────────────────────────

def fetch_movie_details(tmdb_id: int):
    if not TMDB_API_KEY: return None
    url = f"{BASE_URL}/movie/{tmdb_id}"
    data = _safe_get(url, headers=get_headers(), params=get_params({
        "language": "en-US", 
        "append_to_response": "credits,videos,similar,watch/providers,keywords"
    }))
    return data if data else None


def fetch_movie_recommendations(tmdb_id: int, page: int = 1):
    if not TMDB_API_KEY: return []
    url = f"{BASE_URL}/movie/{tmdb_id}/recommendations"
    data = _safe_get(url, headers=get_headers(), params=get_params({
        "language": "en-US", "page": page
    }))
    return data.get('results', [])


def fetch_watch_providers(tmdb_id: int, region: str = "IN"):
    if not TMDB_API_KEY: return []
    url = f"{BASE_URL}/movie/{tmdb_id}/watch/providers"
    data = _safe_get(url, headers=get_headers(), params=get_params())
    if data:
        results = data.get('results', {})
        for reg in [region, "US"]:
            if reg in results:
                flatrate = results[reg].get('flatrate', [])
                if flatrate is None: flatrate = []
                return [p['provider_name'] for p in flatrate]
    return []


def fetch_genre_list(media_type: str = "movie"):
    if not TMDB_API_KEY: return {}
    url = f"{BASE_URL}/genre/{media_type}/list"
    data = _safe_get(url, headers=get_headers(), params=get_params({"language": "en"}))
    genres = data.get('genres', [])
    return {g['id']: g['name'] for g in genres}


def fetch_person_details(person_id: int):
    """Fetch actor/director details."""
    if not TMDB_API_KEY: return None
    url = f"{BASE_URL}/person/{person_id}"
    data = _safe_get(url, headers=get_headers(), params=get_params({
        "language": "en-US",
        "append_to_response": "movie_credits,external_ids,images"
    }))
    return data if data else None


def fetch_by_external_id(external_id: str, source: str = "imdb_id"):
    if not TMDB_API_KEY: return None
    url = f"{BASE_URL}/find/{external_id}"
    data = _safe_get(url, headers=get_headers(), params=get_params({
        "external_source": source
    }))
    if data:
        movie_results = data.get("movie_results", [])
        if movie_results:
            return movie_results[0]
    return None


def fetch_movie_poster(movie_title: str):
    results = search_movies(movie_title)
    if results:
        poster_path = results[0].get('poster_path')
        return get_poster_url(poster_path)
    return None
