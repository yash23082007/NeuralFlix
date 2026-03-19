from fastapi import APIRouter, Query
from typing import Optional
from database import movies_collection
from utils.tmdb_api import search_movies as tmdb_search, get_poster_url, get_backdrop_url, fetch_genre_list

router = APIRouter()

TMDB_GENRE_MAP = {}

def _normalize_tmdb(movie: dict, genre_map: dict) -> dict:
    genre_names = [genre_map.get(gid, "") for gid in movie.get("genre_ids", []) if gid in genre_map]
    return {
        "_id": str(movie.get("id")),
        "tmdb_id": movie.get("id"),
        "title": movie.get("title", "Unknown"),
        "overview": movie.get("overview", ""),
        "year": int(movie.get("release_date", "0000")[:4]) if movie.get("release_date") else None,
        "release_date": movie.get("release_date"),
        "language": movie.get("original_language", "en"),
        "genres": genre_names,
        "rating": movie.get("vote_average", 0),
        "votes": movie.get("vote_count", 0),
        "popularity_score": movie.get("popularity", 0),
        "poster_url": get_poster_url(movie.get("poster_path")),
        "backdrop_url": get_backdrop_url(movie.get("backdrop_path")),
        "platforms": [],
    }

@router.get("/")
def search(
    q: str = Query(..., min_length=1),
    language: Optional[str] = Query(None, description="Filter by language code e.g. en, hi, ja"),
    page: int = Query(1, ge=1)
):
    """Search movies by title. Uses MongoDB text index first, then TMDB API as fallback."""
    results = []
    seen_ids = set()

    # 1. MongoDB text search
    query_filter = {"$text": {"$search": q}}
    if language:
        query_filter["language"] = language

    mongo_results = list(
        movies_collection.find(query_filter, {"_id": 1, "tmdb_id": 1, "title": 1,
            "overview": 1, "year": 1, "release_date": 1, "language": 1, "genres": 1,
            "rating": 1, "votes": 1, "popularity_score": 1, "poster_url": 1,
            "backdrop_url": 1, "platforms": 1})
        .sort("popularity_score", -1)
        .limit(20)
    )

    for m in mongo_results:
        m["_id"] = str(m["_id"])
        results.append(m)
        seen_ids.add(m.get("tmdb_id") or m["_id"])

    # 2. TMDB live search to supplement
    if len(results) < 10:
        genre_map = fetch_genre_list()
        tmdb_results = tmdb_search(q, page=page)
        for movie in tmdb_results:
            mid = movie.get("id")
            if mid not in seen_ids:
                normalized = _normalize_tmdb(movie, genre_map)
                if language and normalized["language"] != language:
                    continue
                results.append(normalized)
                seen_ids.add(mid)

    return {"query": q, "total": len(results), "results": results}
