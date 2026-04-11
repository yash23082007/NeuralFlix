import math
import logging
from typing import List, Optional, Dict, Any

from database import get_movies_collection
from models.schemas import MovieBase, MovieDetail, CastMember
from services.base_service import BaseService
from utils.tmdb_api import (
    fetch_trending as tmdb_trending,
    fetch_top_rated as tmdb_top_rated,
    fetch_popular_movies,
    fetch_movie_details as tmdb_details,
    fetch_watch_providers,
    fetch_genre_list,
    get_poster_url,
    get_backdrop_url,
    fetch_movie_poster,
    fetch_now_playing,
    fetch_by_genre,
    fetch_tv_shows,
    fetch_tv_details,
    fetch_korean_movies as tmdb_fetch_korean,
    fetch_international_movies as tmdb_fetch_international,
    fetch_indian_movies as tmdb_fetch_indian
)
from utils.omdb_api import fetch_omdb_details_by_imdb_id, fetch_omdb_details_by_title
from utils.imdb_api import fetch_imdb_title_details, get_deep_movie_data

logger = logging.getLogger("MOVIE_SERVICE")

class MovieService(BaseService):
    """
    Business logic layer for movie and TV media.
    Encapsulates database access and external API fallbacks.
    """

    @classmethod
    def _normalize_tmdb(cls, movie: Dict[str, Any], genre_map: Dict[int, str], providers: List[str] = None, media_type: str = "movie") -> Dict[str, Any]:
        """Normalize TMDB data structure into localized DTO."""
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

    @classmethod
    async def get_movies(cls, page: int = 1, limit: int = 20, language: Optional[str] = None, genre: Optional[str] = None) -> Dict[str, Any]:
        """Get paginated movies from DB with TMDB fallback."""
        query_filter = {}
        if language:
            query_filter["language"] = language
        if genre:
            query_filter["genres"] = {"$regex": genre, "$options": "i"}

        skip = (page - 1) * limit
        movies_col = get_movies_collection()
        
        # We use a cursor then list to avoid connection on start issues
        movies = list(
            movies_col.find(query_filter, {"_id": 0})
            .sort("popularity_score", -1)
            .skip(skip)
            .limit(limit)
        )

        if len(movies) < 5:
            logger.info("MongoDB hit sparse results; falling back to TMDB Discover.")
            genre_map = fetch_genre_list()
            tmdb_data = fetch_popular_movies(page=page)
            movies = [cls._normalize_tmdb(m, genre_map) for m in tmdb_data]

        return {"results": movies}

    @classmethod
    async def get_trending(cls) -> Dict[str, Any]:
        """Get trending movies."""
        movies_col = get_movies_collection()
        movies = list(
            movies_col.find({}, {"_id": 0})
            .sort("popularity_score", -1)
            .limit(20)
        )
        if len(movies) < 5:
            genre_map = fetch_genre_list()
            tmdb_data = tmdb_trending("movie", "week")
            movies = [cls._normalize_tmdb(m, genre_map) for m in tmdb_data]
        return {"results": movies}

    @classmethod
    async def get_indian_movies(cls, page: int = 1) -> Dict[str, Any]:
        """Get Indian movies."""
        movies_col = get_movies_collection()
        movies = list(
            movies_col.find(
                {"language": {"$in": ["hi", "ta", "te", "ml", "kn"]}}, 
                {"_id": 0}
            )
            .sort("popularity_score", -1)
            .limit(20)
        )
        if len(movies) < 5:
            genre_map = fetch_genre_list()
            tmdb_data = tmdb_fetch_indian(page=page)
            movies = [cls._normalize_tmdb(m, genre_map) for m in tmdb_data]
        return {"results": movies}

    @classmethod
    async def get_movie_details(cls, movie_id: str, media_type: str = "movie") -> Optional[Dict[str, Any]]:
        """Get full details of a movie or TV show."""
        movies_col = get_movies_collection()
        
        # Try Cache/DB first
        query = {"$or": [{"_id": movie_id}, {"tmdb_id": int(movie_id) if movie_id.isdigit() else -1}]}
        details = movies_col.find_one(query, {"_id": 0})
        
        if details:
            if "media_type" not in details:
                details["media_type"] = media_type
            
            imdb_id = details.get("imdb_id")
            if imdb_id:
                details["deep_metadata"] = await get_deep_movie_data(imdb_id)
            return details

        # Fallback to Live TMDB
        if not movie_id.isdigit():
            return None
            
        tmdb_id = int(movie_id)
        if media_type == "tv":
            data = fetch_tv_details(tmdb_id)
        else:
            data = tmdb_details(tmdb_id)

        if not data:
            return None

        # Build detailed payload
        genres = [g["name"] for g in data.get("genres", [])]
        credits = data.get("credits", {})
        
        cast = []
        for actor in credits.get("cast", [])[:10]:
            cast.append({
                "name": actor.get("name"),
                "character": actor.get("character"),
                "profile_url": get_poster_url(actor.get("profile_path"), size="w185")
            })

        director = next((c.get("name") for c in credits.get("crew", []) if c.get("job") == "Director"), None)
        
        # Similar items
        similar = []
        for m in data.get("similar", {}).get("results", [])[:10]:
            m_date = m.get("release_date") or m.get("first_air_date")
            similar.append({
                "tmdb_id": m.get("id"),
                "title": m.get("title") or m.get("name"),
                "poster_url": get_poster_url(m.get("poster_path")),
                "rating": round(m.get("vote_average", 0), 1),
                "release_date": m_date,
                "year": int(m_date[:4]) if m_date else None,
                "media_type": media_type
            })

        main_title = data.get("title") or data.get("name")
        main_date = data.get("release_date") or data.get("first_air_date")
        
        # Enrichment from OMDb/IMDb
        omdb_data = fetch_omdb_details_by_imdb_id(data.get("imdb_id")) if data.get("imdb_id") else fetch_omdb_details_by_title(main_title)
        
        return {
            "tmdb_id": data.get("id"),
            "title": main_title,
            "overview": data.get("overview"),
            "year": int(main_date[:4]) if main_date else None,
            "release_date": main_date,
            "runtime": data.get("runtime"),
            "language": data.get("original_language"),
            "genres": genres,
            "rating": round(data.get("vote_average", 0), 1),
            "votes": data.get("vote_count", 0),
            "poster_url": get_poster_url(data.get("poster_path")),
            "backdrop_url": get_backdrop_url(data.get("backdrop_path")),
            "cast": cast,
            "director": director,
            "similar": similar,
            "imdb_id": data.get("imdb_id"),
            "omdb_rating": omdb_data.get("imdbRating") if omdb_data else None,
            "media_type": media_type,
            "deep_metadata": await get_deep_movie_data(data.get("imdb_id")) if data.get("imdb_id") else None,
        }
