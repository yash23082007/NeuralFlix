import logging
import os
from typing import Optional, Dict, Any

from database import get_movies_collection
from utils.tmdb_api import (
    fetch_trending as tmdb_trending,
    fetch_popular_movies,
    fetch_movie_details as tmdb_details,
    fetch_genre_list,
    get_poster_url,
    get_backdrop_url,
    fetch_tv_details,
    fetch_indian_movies as tmdb_fetch_indian,
)
from utils.imdb_api import get_deep_movie_data

logger = logging.getLogger("MOVIE_SERVICE")
EXTERNAL_FILL = os.getenv("NEURALFLIX_EXTERNAL_FALLBACK", "false").lower() == "true"

_GENRE_CACHE = {}

async def _get_genre_map(media_type="movie"):
    if media_type not in _GENRE_CACHE:
        _GENRE_CACHE[media_type] = await fetch_genre_list(media_type)
    return _GENRE_CACHE[media_type]

def _merge_movies(primary, secondary, limit=20):
    merged = []
    seen = set()
    for movie in [*primary, *secondary]:
        movie_id = str(movie.get("tmdb_id") or movie.get("_id") or movie.get("title"))
        if movie_id in seen:
            continue
        seen.add(movie_id)
        merged.append(movie)
        if len(merged) >= limit:
            break
    return merged

def _should_fetch_external(local_count: int, min_local: int = 1) -> bool:
    return local_count < min_local or (EXTERNAL_FILL and local_count < 5)

class MovieService:
    @classmethod
    async def get_movies(cls, page: int = 1, limit: int = 20, language: Optional[str] = None, genre: Optional[str] = None) -> Dict[str, Any]:
        query_filter = {}
        if language:
            query_filter["language"] = language
        if genre:
            query_filter["genres"] = {"$regex": genre, "$options": "i"}
        skip = (page - 1) * limit
        movies_col = get_movies_collection()
        movies = list(movies_col.find(query_filter, {"_id": 0}).sort("popularity_score", -1).skip(skip).limit(limit))
        if _should_fetch_external(len(movies)):
            genre_map = await _get_genre_map()
            tmdb_data = await fetch_popular_movies(page=page)
            if tmdb_data:
                movies = _merge_movies(movies, [cls._normalize_tmdb(m, genre_map) for m in tmdb_data], limit)
        return {"results": movies}

    @classmethod
    async def get_trending(cls) -> Dict[str, Any]:
        movies_col = get_movies_collection()
        movies = list(movies_col.find({}, {"_id": 0}).sort("popularity_score", -1).limit(20))
        if _should_fetch_external(len(movies)):
            genre_map = await _get_genre_map()
            tmdb_data = await tmdb_trending("movie", "week")
            if tmdb_data:
                movies = _merge_movies(movies, [cls._normalize_tmdb(m, genre_map) for m in tmdb_data], 20)
        return {"results": movies}

    @classmethod
    async def get_indian_movies(cls, page: int = 1) -> Dict[str, Any]:
        movies_col = get_movies_collection()
        movies = list(movies_col.find({"language": {"$in": ["hi", "ta", "te", "ml", "kn"]}}, {"_id": 0}).sort("popularity_score", -1).limit(20))
        if _should_fetch_external(len(movies)):
            genre_map = await _get_genre_map()
            tmdb_data = await tmdb_fetch_indian(page=page)
            if tmdb_data:
                movies = _merge_movies(movies, [cls._normalize_tmdb(m, genre_map) for m in tmdb_data], 20)
        return {"results": movies}

    @classmethod
    async def get_movie_details(cls, movie_id: str, media_type: str = "movie") -> Optional[Dict[str, Any]]:
        movies_col = get_movies_collection()
        query = {"$or": [{"_id": movie_id}, {"tmdb_id": int(movie_id) if movie_id.isdigit() else -1}]}
        details = movies_col.find_one(query, {"_id": 0})
        if details:
            if "media_type" not in details:
                details["media_type"] = media_type
            imdb_id = details.get("imdb_id")
            if imdb_id:
                details["deep_metadata"] = await get_deep_movie_data(imdb_id)
            return details
        if not movie_id.isdigit():
            return None
        tmdb_id = int(movie_id)
        data = await tmdb_details(tmdb_id) if media_type != "tv" else await fetch_tv_details(tmdb_id)
        if not data:
            return None

        genres = [g["name"] for g in data.get("genres", [])]
        credits = data.get("credits", {})
        cast = [{"name": a.get("name"), "character": a.get("character"),
                 "profile_url": get_poster_url(a.get("profile_path"), size="w185")}
                for a in credits.get("cast", [])[:10]]
        director = next((c.get("name") for c in credits.get("crew", []) if c.get("job") == "Director"), None)
        similar = []
        for m in data.get("similar", {}).get("results", [])[:10]:
            m_date = m.get("release_date") or m.get("first_air_date")
            similar.append({
                "tmdb_id": m.get("id"), "title": m.get("title") or m.get("name"),
                "poster_url": get_poster_url(m.get("poster_path")),
                "rating": round(m.get("vote_average", 0), 1),
                "release_date": m_date, "year": int(m_date[:4]) if m_date else None,
                "media_type": media_type,
            })

        main_title = data.get("title") or data.get("name")
        main_date = data.get("release_date") or data.get("first_air_date")

        return {
            "tmdb_id": data.get("id"), "title": main_title, "overview": data.get("overview"),
            "year": int(main_date[:4]) if main_date else None, "release_date": main_date,
            "runtime": data.get("runtime"), "language": data.get("original_language"),
            "genres": genres, "rating": round(data.get("vote_average", 0), 1),
            "votes": data.get("vote_count", 0), "poster_url": get_poster_url(data.get("poster_path")),
            "backdrop_url": get_backdrop_url(data.get("backdrop_path")), "cast": cast,
            "director": director, "similar": similar, "imdb_id": data.get("imdb_id"),
            "deep_metadata": await get_deep_movie_data(data.get("imdb_id")) if data.get("imdb_id") else None,
            "media_type": media_type,
        }

    @staticmethod
    def _normalize_tmdb(movie: Dict[str, Any], genre_map: Dict[int, str], providers=None, media_type: str = "movie") -> Dict[str, Any]:
        import math
        genre_names = [genre_map.get(gid, "") for gid in movie.get("genre_ids", []) if gid in genre_map]
        date_field = movie.get("release_date") or movie.get("first_air_date")
        year = None
        if date_field:
            try:
                year = int(date_field[:4])
            except (ValueError, IndexError):
                pass
        votes = movie.get("vote_count", 0)
        rating = movie.get("vote_average", 0)
        popularity = round(rating * math.log10(votes + 1), 2) if votes > 0 else 0
        title = movie.get("title") or movie.get("name", "Unknown")
        return {
            "tmdb_id": movie.get("id"), "title": title, "overview": movie.get("overview", ""),
            "year": year, "release_date": date_field, "language": movie.get("original_language", "en"),
            "genres": genre_names, "rating": round(rating, 1), "votes": votes,
            "popularity_score": popularity, "poster_url": get_poster_url(movie.get("poster_path")),
            "backdrop_url": get_backdrop_url(movie.get("backdrop_path")), "platforms": providers or [],
            "media_type": media_type,
        }
