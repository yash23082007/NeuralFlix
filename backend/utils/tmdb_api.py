import os
import requests
from dotenv import load_dotenv

load_dotenv()

TMDB_API_KEY = os.getenv("TMDB_API_KEY")
BASE_URL = "https://api.themoviedb.org/3"

def get_headers():
    return {
        "accept": "application/json"
    }

def fetch_popular_movies(page: int = 1):
    if not TMDB_API_KEY or TMDB_API_KEY == "your_tmdb_api_key_here":
        return []
    
    url = f"{BASE_URL}/movie/popular?api_key={TMDB_API_KEY}&language=en-US&page={page}"
    response = requests.get(url, headers=get_headers())
    if response.status_code == 200:
        return response.json().get('results', [])
    return []

def search_movies(query: str, page: int = 1):
    if not TMDB_API_KEY or TMDB_API_KEY == "your_tmdb_api_key_here":
        return []
        
    url = f"{BASE_URL}/search/movie?api_key={TMDB_API_KEY}&query={query}&language=en-US&page={page}"
    response = requests.get(url, headers=get_headers())
    if response.status_code == 200:
        return response.json().get('results', [])
    return []

def fetch_movie_details(movie_id: str):
    if not TMDB_API_KEY or TMDB_API_KEY == "your_tmdb_api_key_here":
        return None
        
    url = f"{BASE_URL}/movie/{movie_id}?api_key={TMDB_API_KEY}&language=en-US"
    response = requests.get(url, headers=get_headers())
    if response.status_code == 200:
        return response.json()
    return None

def fetch_movie_recommendations(movie_id: str):
    if not TMDB_API_KEY or TMDB_API_KEY == "your_tmdb_api_key_here":
        return []
        
    url = f"{BASE_URL}/movie/{movie_id}/recommendations?api_key={TMDB_API_KEY}&language=en-US&page=1"
    response = requests.get(url, headers=get_headers())
    if response.status_code == 200:
        return response.json().get('results', [])
    return []

def fetch_movie_poster(movie_title: str):
    if not TMDB_API_KEY or TMDB_API_KEY == "your_tmdb_api_key_here":
        return None
        
    url = f"{BASE_URL}/search/movie?api_key={TMDB_API_KEY}&query={movie_title}"
    response = requests.get(url, headers=get_headers())
    if response.status_code == 200:
        data = response.json()
        if data.get('results'):
            poster_path = data['results'][0].get('poster_path')
            if poster_path:
                return f"https://image.tmdb.org/t/p/w500{poster_path}"
    return None
