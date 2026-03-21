from fastapi import APIRouter, Query
from typing import Optional
from database import movies_collection
from utils.tmdb_api import search_multi as tmdb_search_multi, get_poster_url, get_backdrop_url, fetch_genre_list

router = APIRouter()

TMDB_GENRE_MAP = {}

def _normalize_tmdb(movie: dict, genre_map_movie: dict, genre_map_tv: dict) -> dict:
    media_type = movie.get("media_type", "movie")
    genre_map = genre_map_tv if media_type == "tv" else genre_map_movie
    genre_names = [genre_map.get(gid, "") for gid in movie.get("genre_ids", []) if gid in genre_map]
    
    title = movie.get("title") or movie.get("name", "Unknown")
    date_field = movie.get("release_date") or movie.get("first_air_date")
    year = int(date_field[:4]) if date_field else None

    return {
        "_id": str(movie.get("id")),
        "tmdb_id": movie.get("id"),
        "title": title,
        "overview": movie.get("overview", ""),
        "year": year,
        "release_date": date_field,
        "language": movie.get("original_language", "en"),
        "genres": genre_names,
        "rating": movie.get("vote_average", 0),
        "votes": movie.get("vote_count", 0),
        "popularity_score": movie.get("popularity", 0),
        "poster_url": get_poster_url(movie.get("poster_path")),
        "backdrop_url": get_backdrop_url(movie.get("backdrop_path")),
        "platforms": [],
        "media_type": media_type,
    }

@router.get("/")
def search(
    q: str = Query(..., min_length=1),
    language: Optional[str] = Query(None, description="Filter by language code e.g. en, hi, ja"),
    page: int = Query(1, ge=1)
):
    """Search movies and tv shows by title. Uses MongoDB text index first, then TMDB multi-search API."""
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
            "backdrop_url": 1, "platforms": 1, "media_type": 1})
        .sort("popularity_score", -1)
        .limit(20)
    )

    for m in mongo_results:
        m["_id"] = str(m["_id"])
        if "media_type" not in m:
            m["media_type"] = "movie"
        results.append(m)
        seen_ids.add(m.get("tmdb_id") or m["_id"])

    # 2. TMDB live multi-search to get access to 500k+ live library
    genre_map_movie = fetch_genre_list("movie")
    genre_map_tv = fetch_genre_list("tv")
    tmdb_results = tmdb_search_multi(q, page=page)
    
    for item in tmdb_results:
        # filter out people
        if item.get("media_type") not in ["movie", "tv"]:
            continue
            
        mid = item.get("id")
        if mid not in seen_ids:
            normalized = _normalize_tmdb(item, genre_map_movie, genre_map_tv)
            if language and normalized["language"] != language:
                continue
            results.append(normalized)
            seen_ids.add(mid)

    # sort combined results purely by popularity to show best matches first
    results.sort(key=lambda x: x.get("popularity_score", 0), reverse=True)

    return {"query": q, "total": len(results), "results": results}
