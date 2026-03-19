from fastapi import APIRouter, Query
from typing import Optional
from database import movies_collection
from utils.tmdb_api import (
    fetch_trending as tmdb_trending,
    fetch_top_rated as tmdb_top_rated,
    fetch_popular_movies,
    fetch_movie_details as tmdb_details,
    fetch_movie_recommendations as tmdb_recommendations,
    fetch_watch_providers,
    fetch_genre_list,
    get_poster_url,
    get_backdrop_url,
    fetch_movie_poster,
    fetch_now_playing,
    fetch_by_genre,
    fetch_tv_shows,
    fetch_tv_details,
)
import math

router = APIRouter()

PLATFORM_COLORS = {
    "Netflix": "#e50914",
    "Amazon Prime Video": "#00a8e1",
    "Disney+": "#113ccf",
    "Apple TV+": "#555555",
    "Hulu": "#1ce783",
    "HBO Max": "#5822b4",
    "Paramount+": "#0064ff",
    "Peacock": "#f5c518",
    "Hotstar": "#1f80e0",
    "JioCinema": "#8b2fc1",
}

def _normalize_tmdb(movie: dict, genre_map: dict, providers: list = None, media_type: str = "movie") -> dict:
    genre_names = [genre_map.get(gid, "") for gid in movie.get("genre_ids", []) if gid in genre_map]
    year = None
    date_field = movie.get("release_date") or movie.get("first_air_date")
    if date_field:
        try:
            year = int(date_field[:4])
        except Exception:
            pass
    votes = movie.get("vote_count", 0)
    rating = movie.get("vote_average", 0)
    popularity = round(rating * math.log10(votes + 1), 2) if votes > 0 else 0
    title = movie.get("title") or movie.get("name", "Unknown")
    return {
        "_id": str(movie.get("id")),
        "tmdb_id": movie.get("id"),
        "title": title,
        "overview": movie.get("overview", ""),
        "year": year,
        "release_date": date_field,
        "language": movie.get("original_language", "en"),
        "genres": genre_names,
        "rating": round(rating, 1),
        "votes": votes,
        "popularity_score": popularity,
        "poster_url": get_poster_url(movie.get("poster_path")),
        "backdrop_url": get_backdrop_url(movie.get("backdrop_path")),
        "platforms": providers or [],
        "media_type": media_type,
    }

@router.get("/")
def get_movies(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    language: Optional[str] = None,
    genre: Optional[str] = None
):
    """Browse movies from MongoDB with optional filters."""
    query_filter = {}
    if language:
        query_filter["language"] = language
    if genre:
        query_filter["genres"] = {"$regex": genre, "$options": "i"}

    skip = (page - 1) * limit
    movies = list(
        movies_collection.find(query_filter, {"_id": 0})
        .sort("popularity_score", -1)
        .skip(skip)
        .limit(limit)
    )

    # If DB is sparse, supplement from TMDB
    if len(movies) < 5:
        genre_map = fetch_genre_list()
        tmdb_data = fetch_popular_movies(page=page)
        movies = [_normalize_tmdb(m, genre_map) for m in tmdb_data]

    return {"page": page, "total": len(movies), "results": movies}

@router.get("/trending")
def get_trending():
    """Return weekly trending movies — from DB if populated, else live TMDB."""
    movies = list(
        movies_collection.find({}, {"_id": 0})
        .sort("popularity_score", -1)
        .limit(20)
    )
    if len(movies) < 5:
        genre_map = fetch_genre_list()
        tmdb_data = tmdb_trending("movie", "week")
        movies = [_normalize_tmdb(m, genre_map) for m in tmdb_data]
    return {"results": movies}

@router.get("/toprated")
def get_top_rated(page: int = Query(1, ge=1)):
    """Return top-rated movies."""
    movies = list(
        movies_collection.find({}, {"_id": 0})
        .sort("rating", -1)
        .limit(20)
    )
    if len(movies) < 5:
        genre_map = fetch_genre_list()
        tmdb_data = tmdb_top_rated(page=page)
        movies = [_normalize_tmdb(m, genre_map) for m in tmdb_data]
    return {"results": movies}

@router.get("/nowplaying")
def get_now_playing(page: int = Query(1, ge=1)):
    """Return now playing movies."""
    genre_map = fetch_genre_list()
    tmdb_data = fetch_now_playing(page=page)
    movies = [_normalize_tmdb(m, genre_map) for m in tmdb_data]
    return {"results": movies}

@router.get("/bollywood")
def get_bollywood(page: int = Query(1, ge=1)):
    """Return Hindi (Bollywood) movies."""
    movies = list(
        movies_collection.find({"language": "hi"}, {"_id": 0})
        .sort("popularity_score", -1)
        .limit(20)
    )
    if len(movies) < 5:
        genre_map = fetch_genre_list()
        tmdb_data = fetch_popular_movies(page=page, language="hi-IN")
        movies = [_normalize_tmdb(m, genre_map) for m in tmdb_data]
    return {"results": movies}

@router.get("/anime")
def get_anime(page: int = Query(1, ge=1)):
    """Return Japanese anime / animation movies."""
    movies = list(
        movies_collection.find(
            {"$or": [{"language": "ja"}, {"genres": {"$regex": "Animation", "$options": "i"}}]},
            {"_id": 0}
        )
        .sort("popularity_score", -1)
        .limit(20)
    )
    if len(movies) < 5:
        genre_map = fetch_genre_list()
        tmdb_data = fetch_by_genre(16, language="ja-JP", page=page)  # 16 = Animation
        movies = [_normalize_tmdb(m, genre_map) for m in tmdb_data]
    return {"results": movies}

@router.get("/series")
def get_series(page: int = Query(1, ge=1), language: Optional[str] = None):
    """Return trending TV/web series from TMDB."""
    genre_map = fetch_genre_list(media_type="tv")
    tmdb_data = fetch_tv_shows(page=page, language=language or "en-US")
    series = [_normalize_tmdb(s, genre_map, media_type="tv") for s in tmdb_data]
    return {"results": series}

@router.get("/trending-all")
def get_trending_all():
    """Return trending movies AND series combined."""
    genre_map_movie = fetch_genre_list("movie")
    genre_map_tv = fetch_genre_list("tv")

    movies = tmdb_trending("movie", "week")[:10]
    series = tmdb_trending("tv", "week")[:10]

    results = [_normalize_tmdb(m, genre_map_movie, media_type="movie") for m in movies]
    results += [_normalize_tmdb(s, genre_map_tv, media_type="tv") for s in series]

    import random
    random.shuffle(results)
    return {"results": results}

@router.get("/genre/{genre_name}")
def get_by_genre(genre_name: str, page: int = Query(1, ge=1), language: Optional[str] = None):
    """Return movies filtered by genre name, paginated."""
    query_filter = {"genres": {"$regex": genre_name, "$options": "i"}}
    if language:
        query_filter["language"] = language

    skip = (page - 1) * 20
    movies = list(
        movies_collection.find(query_filter, {"_id": 0})
        .sort("popularity_score", -1)
        .skip(skip)
        .limit(20)
    )

    # Supplement with TMDB if needed
    if len(movies) < 5:
        genre_map = fetch_genre_list()
        # Map genre name to TMDB genre id
        GENRE_ID_MAP = {
            "action": 28, "comedy": 35, "drama": 18, "horror": 27,
            "romance": 10749, "sci-fi": 878, "thriller": 53,
            "animation": 16, "adventure": 12, "crime": 80,
            "fantasy": 14, "mystery": 9648, "documentary": 99
        }
        genre_id = GENRE_ID_MAP.get(genre_name.lower())
        if genre_id:
            tmdb_data = fetch_by_genre(genre_id, language=language or "en-US", page=page)
            movies = [_normalize_tmdb(m, genre_map) for m in tmdb_data]

    return {"genre": genre_name, "page": page, "results": movies}

@router.get("/{movie_id}")
def get_movie_details(movie_id: str):
    """Get full movie details. Tries MongoDB first, then TMDB API."""
    # Try MongoDB by tmdb_id or string _id
    details = movies_collection.find_one(
        {"$or": [{"_id": movie_id}, {"tmdb_id": int(movie_id) if movie_id.isdigit() else -1}]},
        {"_id": 0}
    )
    if details:
        if not details.get("poster_url"):
            details["poster_url"] = fetch_movie_poster(details.get("title", ""))
        return details

    # Full live fetch from TMDB
    if movie_id.isdigit():
        tmdb_id = int(movie_id)
        data = tmdb_details(tmdb_id)
        if data:
            genres = [g["name"] for g in data.get("genres", [])]

            # Extract cast (top 10)
            cast = []
            credits = data.get("credits", {})
            for actor in credits.get("cast", [])[:10]:
                cast.append({
                    "name": actor.get("name"),
                    "character": actor.get("character"),
                    "profile_url": get_poster_url(actor.get("profile_path"), size="w185")
                })

            # Extract director
            director = None
            for crew in credits.get("crew", []):
                if crew.get("job") == "Director":
                    director = crew.get("name")
                    break

            # Trailer key
            trailer_key = None
            for video in data.get("videos", {}).get("results", []):
                if video.get("type") == "Trailer" and video.get("site") == "YouTube":
                    trailer_key = video.get("key")
                    break

            # Platforms
            providers_data = data.get("watch/providers", {}).get("results", {})
            platforms = []
            for region in ["IN", "US"]:
                if region in providers_data:
                    flatrate = providers_data[region].get("flatrate", [])
                    platforms = [p["provider_name"] for p in flatrate]
                    if platforms:
                        break

            # Similar movies
            similar = []
            for m in data.get("similar", {}).get("results", [])[:10]:
                similar.append({
                    "_id": str(m.get("id")),
                    "tmdb_id": m.get("id"),
                    "title": m.get("title"),
                    "poster_url": get_poster_url(m.get("poster_path")),
                    "rating": round(m.get("vote_average", 0), 1),
                    "release_date": m.get("release_date"),
                    "year": int(m["release_date"][:4]) if m.get("release_date") else None,
                    "overview": m.get("overview", ""),
                    "genres": [],
                    "platforms": [],
                    "votes": m.get("vote_count", 0),
                })

            votes = data.get("vote_count", 0)
            rating = round(data.get("vote_average", 0), 1)
            popularity = round(rating * math.log10(votes + 1), 2) if votes > 0 else 0

            return {
                "_id": str(data.get("id")),
                "tmdb_id": data.get("id"),
                "title": data.get("title"),
                "overview": data.get("overview"),
                "year": int(data.get("release_date", "0000")[:4]) if data.get("release_date") else None,
                "release_date": data.get("release_date"),
                "runtime": data.get("runtime"),
                "language": data.get("original_language"),
                "genres": genres,
                "rating": rating,
                "votes": votes,
                "popularity_score": popularity,
                "poster_url": get_poster_url(data.get("poster_path")),
                "backdrop_url": get_backdrop_url(data.get("backdrop_path")),
                "platforms": platforms,
                "cast": cast,
                "director": director,
                "trailer_key": trailer_key,
                "similar": similar,
                "tagline": data.get("tagline"),
                "budget": data.get("budget"),
                "imdb_id": data.get("imdb_id"),
                "media_type": "movie",
            }

    return {"error": "Movie not found"}
