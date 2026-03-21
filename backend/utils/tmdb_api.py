import os
import requests
from dotenv import load_dotenv

load_dotenv()

TMDB_API_KEY = os.getenv("TMDB_API_KEY")
BASE_URL = "https://api.themoviedb.org/3"
IMAGE_BASE = "https://image.tmdb.org/t/p"

def get_headers():
    return {
        "accept": "application/json"
    }

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
        "with_genres": genre_id,
        "language": language,
        "sort_by": "popularity.desc",
        "page": page,
        "vote_count.gte": 100
    }))
    return data.get('results', [])

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
        "append_to_response": "credits,videos,similar,watch/providers"
    }))
    return data if data else None

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
        "query": query, "page": page, "include_adult": "false"
    }))
    return data.get('results', [])

def fetch_movie_details(tmdb_id: int):
    if not TMDB_API_KEY: return None
    url = f"{BASE_URL}/movie/{tmdb_id}"
    data = _safe_get(url, headers=get_headers(), params=get_params({
        "language": "en-US", 
        "append_to_response": "credits,videos,similar,watch/providers"
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

def fetch_movie_poster(movie_title: str):
    results = search_movies(movie_title)
    if results:
        poster_path = results[0].get('poster_path')
        return get_poster_url(poster_path)
    return None
