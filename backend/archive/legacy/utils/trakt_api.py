import os
import httpx
from dotenv import load_dotenv

load_dotenv()

# Trakt.tv API Configuration
TRAKT_CLIENT_ID = os.getenv("TRAKT_CLIENT_ID")
TRAKT_CLIENT_SECRET = os.getenv("TRAKT_CLIENT_SECRET")
# e.g. http://localhost:8000/api/trakt/callback
TRAKT_REDIRECT_URI = os.getenv("TRAKT_REDIRECT_URI", "http://localhost:8000/api/trakt/callback")

TRAKT_API_URL = "https://api.trakt.tv"

def get_trakt_auth_url() -> str:
    """Returns the Trakt.tv OAuth2 login URL for the user to authenticate."""
    return f"{TRAKT_API_URL}/oauth/authorize?response_type=code&client_id={TRAKT_CLIENT_ID}&redirect_uri={TRAKT_REDIRECT_URI}"

async def exchange_trakt_code(code: str) -> dict:
    """
    Exchanges the OAuth code for an Access Token.
    Returns the JSON payload containing access_token, refresh_token, etc.
    """
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
                "grant_type": "authorization_code"
            },
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 200:
            return response.json()
        return {"error": response.text}

async def fetch_trakt_watch_history(access_token: str) -> list:
    """
    Fetches the user's entire movie watch history from Trakt natively.
    Returns a list of dicts.
    """
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{TRAKT_API_URL}/sync/history/movies",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}",
                "trakt-api-version": "2",
                "trakt-api-key": TRAKT_CLIENT_ID
            },
            params={"limit": 1000} # Grab up to top 1000 history entries
        )
        if response.status_code == 200:
            return response.json()
        return []

async def fetch_trakt_watchlist(access_token: str) -> list:
    """Fetches user watchlist from Trakt"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{TRAKT_API_URL}/sync/watchlist/movies",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}",
                "trakt-api-version": "2",
                "trakt-api-key": TRAKT_CLIENT_ID
            }
        )
        if response.status_code == 200:
            return response.json()
        return []
