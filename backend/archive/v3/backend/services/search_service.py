import logging
import math
import os
from typing import Optional, Dict, Any

from database import get_movies_collection
from utils.tmdb_api import search_multi as tmdb_search_multi, get_poster_url, fetch_genre_list

logger = logging.getLogger("SEARCH_SERVICE")
EXTERNAL_FILL = os.getenv("NEURALFLIX_EXTERNAL_FALLBACK", "false").lower() == "true"

def _normalize_item(item: Dict[str, Any], genre_map: Dict[int, str], media_type: str = "movie") -> Dict[str, Any]:
    genre_names = [genre_map.get(gid, "") for gid in item.get("genre_ids", []) if gid in genre_map]
    date_field = item.get("release_date") or item.get("first_air_date")
    year = None
    if date_field:
        try:
            year = int(date_field[:4])
        except (ValueError, IndexError):
            pass
    votes = item.get("vote_count", 0)
    rating = item.get("vote_average", 0)
    popularity = round(rating * math.log10(votes + 1), 2) if votes > 0 else 0
    title = item.get("title") or item.get("name", "Unknown")
    return {
        "tmdb_id": item.get("id"), "title": title, "overview": item.get("overview", ""),
        "year": year, "release_date": date_field, "language": item.get("original_language", "en"),
        "genres": genre_names, "rating": round(rating, 1), "votes": votes,
        "popularity_score": popularity, "poster_url": get_poster_url(item.get("poster_path")),
        "media_type": media_type,
    }

class SearchService:
    @classmethod
    async def search(cls, q: str, language: Optional[str] = None, page: int = 1) -> Dict[str, Any]:
        results = []
        seen_ids = set()
        movies_col = get_movies_collection()

        query_filter = {"$text": {"$search": q}}
        if language:
            query_filter["language"] = language

        try:
            mongo_results = await movies_col.find(query_filter, {"_id": 0}).sort("popularity_score", -1).limit(20).to_list(length=None)
        except Exception:
            regex_filter = {"title": {"$regex": q, "$options": "i"}}
            if language:
                regex_filter["language"] = language
            mongo_results = await movies_col.find(regex_filter, {"_id": 0}).sort("popularity_score", -1).limit(20).to_list(length=None)

        for m in mongo_results:
            mid = str(m.get("tmdb_id") or m.get("imdb_id"))
            if mid not in seen_ids:
                results.append(m)
                seen_ids.add(mid)

        if not results or EXTERNAL_FILL:
            genre_map_movie = await fetch_genre_list("movie")
            genre_map_tv = await fetch_genre_list("tv")

            tmdb_results = await tmdb_search_multi(q, page=page)
            for item in tmdb_results:
                mt = item.get("media_type")
                if mt not in ("movie", "tv"):
                    continue
                mid = item.get("id")
                if mid not in seen_ids:
                    genre_map = genre_map_tv if mt == "tv" else genre_map_movie
                    normalized = _normalize_item(item, genre_map, media_type=mt)
                    if language and normalized.get("language") != language:
                        continue
                    results.append(normalized)
                    seen_ids.add(mid)

        results.sort(key=lambda x: x.get("popularity_score", 0), reverse=True)
        return {"query": q, "page": page, "total": len(results), "results": results}
