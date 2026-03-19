import os
import requests
from dotenv import load_dotenv

load_dotenv()

TMDB_ACCESS_TOKEN = os.getenv("TMDB_READ_ACCESS_TOKEN")
TMDB_API_KEY = os.getenv("TMDB_API_KEY")
BASE_URL = "https://api.themoviedb.org/3"
IMAGE_BASE = "https://image.tmdb.org/t/p"

def get_headers():
    return {
        "accept": "application/json",
        "Authorization": f"Bearer {TMDB_ACCESS_TOKEN}"
    }

def get_poster_url(path: str, size: str = "w500") -> str | None:
    if path:
        return f"{IMAGE_BASE}/{size}{path}"
    return None

def get_backdrop_url(path: str) -> str | None:
    if path:
        return f"{IMAGE_BASE}/original{path}"
    return None

def fetch_popular_movies(page: int = 1, language: str = "en-US"):
    if not TMDB_ACCESS_TOKEN:
        return []
    url = f"{BASE_URL}/movie/popular?language={language}&page={page}"
    response = requests.get(url, headers=get_headers())
    if response.status_code == 200:
        return response.json().get('results', [])
    return []

def fetch_top_rated(page: int = 1, language: str = "en-US"):
    if not TMDB_ACCESS_TOKEN:
        return []
    url = f"{BASE_URL}/movie/top_rated?language={language}&page={page}"
    response = requests.get(url, headers=get_headers())
    if response.status_code == 200:
        return response.json().get('results', [])
    return []

def fetch_trending(media_type: str = "movie", time_window: str = "week"):
    if not TMDB_ACCESS_TOKEN:
        return []
    url = f"{BASE_URL}/trending/{media_type}/{time_window}?language=en-US"
    response = requests.get(url, headers=get_headers())
    if response.status_code == 200:
        return response.json().get('results', [])
    return []

def fetch_now_playing(page: int = 1):
    if not TMDB_ACCESS_TOKEN:
        return []
    url = f"{BASE_URL}/movie/now_playing?language=en-US&page={page}"
    response = requests.get(url, headers=get_headers())
    if response.status_code == 200:
        return response.json().get('results', [])
    return []

def fetch_by_genre(genre_id: int, language: str = "en-US", page: int = 1):
    if not TMDB_ACCESS_TOKEN:
        return []
    url = f"{BASE_URL}/discover/movie?with_genres={genre_id}&language={language}&sort_by=popularity.desc&page={page}&vote_count.gte=100"
    response = requests.get(url, headers=get_headers())
    if response.status_code == 200:
        return response.json().get('results', [])
    return []

def fetch_tv_shows(page: int = 1, language: str = "en-US"):
    """Fetch trending / popular TV shows."""
    if not TMDB_ACCESS_TOKEN:
        return []
    url = f"{BASE_URL}/tv/popular?language={language}&page={page}"
    response = requests.get(url, headers=get_headers())
    if response.status_code == 200:
        return response.json().get('results', [])
    return []

def fetch_tv_details(tmdb_id: int):
    """Fetch full TV series details."""
    if not TMDB_ACCESS_TOKEN:
        return None
    url = f"{BASE_URL}/tv/{tmdb_id}?language=en-US&append_to_response=credits,videos,similar,watch/providers"
    response = requests.get(url, headers=get_headers())
    if response.status_code == 200:
        return response.json()
    return None

def search_movies(query: str, page: int = 1, language: str = "en-US"):
    if not TMDB_ACCESS_TOKEN:
        return []
    url = f"{BASE_URL}/search/movie?query={query}&language={language}&page={page}&include_adult=false"
    response = requests.get(url, headers=get_headers())
    if response.status_code == 200:
        return response.json().get('results', [])
    return []

def search_multi(query: str, page: int = 1):
    """Search movies AND TV shows together."""
    if not TMDB_ACCESS_TOKEN:
        return []
    url = f"{BASE_URL}/search/multi?query={query}&page={page}&include_adult=false"
    response = requests.get(url, headers=get_headers())
    if response.status_code == 200:
        return response.json().get('results', [])
    return []

def fetch_movie_details(tmdb_id: int):
    if not TMDB_ACCESS_TOKEN:
        return None
    url = f"{BASE_URL}/movie/{tmdb_id}?language=en-US&append_to_response=credits,videos,similar,watch/providers"
    response = requests.get(url, headers=get_headers())
    if response.status_code == 200:
        return response.json()
    return None

def fetch_movie_recommendations(tmdb_id: int, page: int = 1):
    if not TMDB_ACCESS_TOKEN:
        return []
    url = f"{BASE_URL}/movie/{tmdb_id}/recommendations?language=en-US&page={page}"
    response = requests.get(url, headers=get_headers())
    if response.status_code == 200:
        return response.json().get('results', [])
    return []

def fetch_watch_providers(tmdb_id: int, region: str = "IN"):
    """Fetch streaming platforms for a movie in a given region (IN = India)."""
    if not TMDB_ACCESS_TOKEN:
        return []
    url = f"{BASE_URL}/movie/{tmdb_id}/watch/providers"
    response = requests.get(url, headers=get_headers())
    if response.status_code == 200:
        data = response.json().get('results', {})
        for reg in [region, "US"]:
            if reg in data:
                flatrate = data[reg].get('flatrate', [])
                return [p['provider_name'] for p in flatrate]
    return []

def fetch_genre_list(media_type: str = "movie"):
    """Returns TMDB genre id -> name mapping."""
    if not TMDB_ACCESS_TOKEN:
        return {}
    url = f"{BASE_URL}/genre/{media_type}/list?language=en"
    response = requests.get(url, headers=get_headers())
    if response.status_code == 200:
        genres = response.json().get('genres', [])
        return {g['id']: g['name'] for g in genres}
    return {}

def fetch_movie_poster(movie_title: str):
    results = search_movies(movie_title)
    if results:
        poster_path = results[0].get('poster_path')
        return get_poster_url(poster_path)
    return None
