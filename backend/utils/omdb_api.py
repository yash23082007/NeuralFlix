import os
import requests
from dotenv import load_dotenv

load_dotenv()

# We can keep OMDB_API_KEY from environment later
# If not provided, the API call will return an error so handle safely
OMDB_API_KEY = os.getenv("OMDB_API_KEY", "")
BASE_URL = "http://www.omdbapi.com/"

def fetch_omdb_details_by_imdb_id(imdb_id: str):
    if not OMDB_API_KEY or not imdb_id:
        return None
    url = f"{BASE_URL}?i={imdb_id}&apikey={OMDB_API_KEY}"
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get("Response") == "True":
                return data
    except Exception as e:
        print(f"OMDB Error: {e}")
    return None

def fetch_omdb_details_by_title(title: str, year: str = None):
    if not OMDB_API_KEY or not title:
        return None
    url = f"{BASE_URL}?t={title}&apikey={OMDB_API_KEY}"
    if year:
        url += f"&y={year}"
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get("Response") == "True":
                return data
    except Exception as e:
        print(f"OMDB Error: {e}")
    return None
