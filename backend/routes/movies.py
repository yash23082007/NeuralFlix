from fastapi import APIRouter
from typing import List, Optional
from database import movies_collection
from utils.tmdb_api import fetch_movie_poster

router = APIRouter()

@router.get("/")
def get_movies(page: int = 1, search: Optional[str] = None):
    skip = (page - 1) * 20
    if search:
        # Utilizing compound text index structure
        movies = list(movies_collection.find({"$text": {"$search": search}}, {"_id": 0}).skip(skip).limit(20))
    else:
        # Return popular movies (Cold start default)
        movies = list(movies_collection.find({}, {"_id": 0}).sort("popularity_score", -1).skip(skip).limit(20))
    return movies

@router.get("/{movie_id}")
def get_movie_details_route(movie_id: str):
    details = movies_collection.find_one({"_id": movie_id}, {"_id": 0})
    if details:
        # Provide real-time data enrichment if poster is missing
        if not details.get('poster_url') or not details.get('poster_url').startswith('http'):
            poster = fetch_movie_poster(details.get('title'))
            if poster:
                details['poster_url'] = poster
        return details
    return {"error": "Movie not found"}
