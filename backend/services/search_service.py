import logging
from typing import List, Optional, Dict, Any

from database import get_movies_collection
from utils.tmdb_api import search_multi as tmdb_search_multi, get_poster_url, get_backdrop_url, fetch_genre_list
from services.movie_service import MovieService

logger = logging.getLogger("SEARCH_SERVICE")

class SearchService:
    """Handles multi-source search (Mongo + TMDB) with deduplication."""

    @classmethod
    def _normalize_item(cls, item: Dict[str, Any], genre_map_movie: Dict[int, str], genre_map_tv: Dict[int, str]) -> Dict[str, Any]:
        """Normalize TMDB multi-search item."""
        media_type = item.get("media_type", "movie")
        genre_map = genre_map_tv if media_type == "tv" else genre_map_movie
        return MovieService._normalize_tmdb(item, genre_map, media_type=media_type)

    @classmethod
    async def search(cls, q: str, language: Optional[str] = None, page: int = 1) -> Dict[str, Any]:
        """Hybrid search combining local results and global TMDB results."""
        results = []
        seen_ids = set()
        
        movies_col = get_movies_collection()

        # 1. MongoDB Full-Text Search
        query_filter = {"$text": {"$search": q}}
        if language:
            query_filter["language"] = language

        # Search against movies, adding projection for shared fields
        try:
            mongo_results = list(
                movies_col.find(query_filter, {"_id": 0})
                .sort("popularity_score", -1)
                .limit(20)
            )
        except Exception:
            regex_filter = {"title": {"$regex": q, "$options": "i"}}
            if language:
                regex_filter["language"] = language
            mongo_results = list(
                movies_col.find(regex_filter, {"_id": 0})
                .sort("popularity_score", -1)
                .limit(20)
            )

        for m in mongo_results:
            # Standardize ID
            mid = str(m.get("tmdb_id") or m.get("imdb_id"))
            if mid not in seen_ids:
                results.append(m)
                seen_ids.add(mid)

        # 2. TMDB Multi-Search (Movies + TV)
        genre_map_movie = fetch_genre_list("movie")
        genre_map_tv = fetch_genre_list("tv")
        
        tmdb_results = tmdb_search_multi(q, page=page)
        
        for item in tmdb_results:
            if item.get("media_type") not in ["movie", "tv"]:
                continue
                
            mid = item.get("id")
            if mid not in seen_ids:
                normalized = cls._normalize_item(item, genre_map_movie, genre_map_tv)
                if language and normalized.get("language") != language:
                    continue
                results.append(normalized)
                seen_ids.add(mid)

        # Re-sort combined list by popularity
        results.sort(key=lambda x: x.get("popularity_score", 0), reverse=True)

        return {
            "query": q,
            "page": page,
            "total": len(results),
            "results": results
        }
