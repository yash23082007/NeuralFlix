import asyncio
import os
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
    fetch_movies_by_region,
    fetch_by_mood,
)
from utils.omdb_api import fetch_omdb_details_by_imdb_id, fetch_omdb_details_by_title
from utils.imdb_api import fetch_imdb_title_details, get_deep_movie_data

router = APIRouter()
EXTERNAL_FILL = os.getenv("NEURALFLIX_EXTERNAL_FALLBACK", "false").lower() == "true"

PLATFORM_COLORS = {
    "Netflix": "#e50914", "Amazon Prime Video": "#00a8e1", "Disney+": "#113ccf",
    "Apple TV+": "#555555", "Hulu": "#1ce783", "HBO Max": "#5822b4",
    "Paramount+": "#0064ff", "Peacock": "#f5c518", "Hotstar": "#1f80e0",
    "JioCinema": "#8b2fc1",
}

_GENRE_CACHE = {}

async def _get_genre_map(media_type="movie"):
    if media_type not in _GENRE_CACHE:
        _GENRE_CACHE[media_type] = await fetch_genre_list(media_type)
    return _GENRE_CACHE[media_type]

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
    import math
    popularity = round(rating * math.log10(votes + 1), 2) if votes > 0 else 0
    title = movie.get("title") or movie.get("name", "Unknown")
    return {
        "_id": str(movie.get("id")), "tmdb_id": movie.get("id"), "title": title,
        "overview": movie.get("overview", ""), "year": year, "release_date": date_field,
        "language": movie.get("original_language", "en"), "genres": genre_names,
        "rating": round(rating, 1), "votes": votes, "popularity_score": popularity,
        "poster_url": get_poster_url(movie.get("poster_path")),
        "backdrop_url": get_backdrop_url(movie.get("backdrop_path")),
        "platforms": providers or [], "media_type": media_type,
    }

def _merge_movies(primary: list, secondary: list, limit: int = 20) -> list:
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

async def _db_or_tmdb(query_filter, sort_key="popularity_score", limit=20, fetch_tmdb_fn=None):
    movies = list(movies_collection.find(query_filter, {"_id": 0}).sort(sort_key, -1).limit(limit))
    if _should_fetch_external(len(movies)) and fetch_tmdb_fn:
        genre_map = await _get_genre_map()
        tmdb_data = await fetch_tmdb_fn()
        if tmdb_data:
            movies = _merge_movies(movies, [_normalize_tmdb(m, genre_map) for m in tmdb_data], limit)
    return movies

@router.get("/")
async def get_movies(
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
    language: Optional[str] = None, genre: Optional[str] = None
):
    query_filter = {}
    if language:
        query_filter["language"] = language
    if genre:
        query_filter["genres"] = {"$regex": genre, "$options": "i"}
    skip = (page - 1) * limit
    movies = list(movies_collection.find(query_filter, {"_id": 0}).sort("popularity_score", -1).skip(skip).limit(limit))
    if _should_fetch_external(len(movies)):
        genre_map = await _get_genre_map()
        tmdb_data = await fetch_popular_movies(page=page)
        if tmdb_data:
            movies = _merge_movies(movies, [_normalize_tmdb(m, genre_map) for m in tmdb_data], limit)
    return {"page": page, "total": len(movies), "results": movies}

@router.get("/trending")
async def get_trending():
    movies = await _db_or_tmdb({}, fetch_tmdb_fn=lambda: tmdb_trending("movie", "week"))
    return {"results": movies}

@router.get("/toprated")
async def get_top_rated(page: int = Query(1, ge=1)):
    movies = list(movies_collection.find({}, {"_id": 0}).sort("rating", -1).limit(20))
    if len(movies) < 5:
        genre_map = await _get_genre_map()
        tmdb_data = await tmdb_top_rated(page=page)
        movies = [_normalize_tmdb(m, genre_map) for m in tmdb_data]
    return {"results": movies}

@router.get("/nowplaying")
async def get_now_playing(page: int = Query(1, ge=1)):
    local_movies = list(movies_collection.find(
        {"year": {"$gte": 2023}},
        {"_id": 0},
    ).sort("year", -1).limit(20))
    tmdb_data = []
    if _should_fetch_external(len(local_movies)):
        genre_map = await _get_genre_map()
        tmdb_data = await fetch_now_playing(page=page)
    movies = _merge_movies([_normalize_tmdb(m, genre_map) for m in tmdb_data], local_movies, 20) if tmdb_data else local_movies
    if not movies:
        movies = list(movies_collection.find({}, {"_id": 0}).sort("year", -1).limit(20))
    return {"results": movies}

@router.get("/region/{region_name}")
async def get_by_region(region_name: str, page: int = Query(1, ge=1)):
    skip = (page - 1) * 20
    region_key = region_name.lower()
    query_filter = {"cinema_region": region_key}
    if region_key == "indian":
        query_filter = {"$or": [
            {"cinema_region": "indian"},
            {"cinema_region": {"$in": ["bollywood", "tollywood", "kollywood", "mollywood"]}},
            {"language": {"$in": ["hi", "ta", "te", "ml", "kn"]}},
        ]}
    movies = list(movies_collection.find(query_filter, {"_id": 0}).sort("popularity_score", -1).skip(skip).limit(20))
    if _should_fetch_external(len(movies)):
        genre_map = await _get_genre_map()
        tmdb_data = await fetch_movies_by_region(region_name, page=page)
        if tmdb_data:
            movies = _merge_movies(movies, [_normalize_tmdb(m, genre_map) for m in tmdb_data], 20)
    return {"region": region_name, "page": page, "total": len(movies), "results": movies}

@router.get("/mood/{mood_name}")
async def get_by_mood(mood_name: str, page: int = Query(1, ge=1)):
    mood_map = {
        "feel_good":     {"genres": {"$in": ["Comedy", "Romance", "Family"]}},
        "mind_blown":    {"genres": {"$in": ["Thriller", "Mystery", "Science Fiction"]}},
        "adrenaline":    {"genres": {"$in": ["Action", "Adventure", "Crime"]}},
        "want_to_cry":   {"genres": {"$in": ["Drama"]}, "rating": {"$gte": 7.0}},
        "deep_thoughts": {"genres": {"$in": ["Drama", "Documentary"]}},
        "family_time":   {"genres": {"$in": ["Family", "Animation"]}},
        "date_night":    {"genres": {"$in": ["Romance", "Comedy"]}},
        "desi_vibes":    {"cinema_region": {"$in": ["indian", "bollywood", "tollywood", "kollywood", "mollywood"]}},
        "korean_wave":   {"cinema_region": "korean"},
        "anime_night":   {"$or": [{"language": "ja"}, {"genres": {"$regex": "Animation", "$options": "i"}}]},
        "french_mood":   {"cinema_region": "french"},
        "nollywood_night": {"cinema_region": "nollywood"},
        "90s_bollywood": {"cinema_region": "indian", "year": {"$gte": 1990, "$lte": 1999}},
        "80s_nostalgia": {"year": {"$gte": 1980, "$lte": 1989}},
        "classic_cinema": {"year": {"$lte": 1970}, "rating": {"$gte": 7.5}},
        "new_releases":  {"year": {"$gte": 2024}},
        "award_winners": {"rating": {"$gte": 7.8}, "votes": {"$gte": 5000}},
        "hidden_gems":   {"rating": {"$gte": 7.5}, "votes": {"$lte": 5000, "$gte": 200}},
    }
    query_filter = mood_map.get(mood_name.lower(), {})
    skip = (page - 1) * 20
    movies = list(movies_collection.find(query_filter, {"_id": 0}).sort("popularity_score", -1).skip(skip).limit(20))
    if _should_fetch_external(len(movies)):
        genre_map = await _get_genre_map()
        tmdb_data = await fetch_by_mood(mood_name, page=page)
        if tmdb_data:
            movies = _merge_movies(movies, [_normalize_tmdb(m, genre_map) for m in tmdb_data], 20)
    return {"mood": mood_name, "page": page, "results": movies}

@router.get("/anime")
async def get_anime(page: int = Query(1, ge=1)):
    movies = list(movies_collection.find(
        {"$or": [{"language": "ja"}, {"genres": {"$regex": "Animation", "$options": "i"}}]},
        {"_id": 0}).sort("popularity_score", -1).limit(20))
    if _should_fetch_external(len(movies)):
        genre_map = await _get_genre_map()
        tmdb_data = await fetch_by_genre(16, language="ja-JP", page=page)
        if tmdb_data:
            movies = _merge_movies(movies, [_normalize_tmdb(m, genre_map) for m in tmdb_data], 20)
    return {"results": movies}

@router.get("/series")
async def get_series(page: int = Query(1, ge=1), language: Optional[str] = None):
    genre_map = await _get_genre_map("tv")
    tmdb_data = await fetch_tv_shows(page=page, language=language or "en-US")
    series = [_normalize_tmdb(s, genre_map, media_type="tv") for s in tmdb_data]
    return {"results": series}

@router.get("/trending-all")
async def get_trending_all():
    local_results = list(movies_collection.find({}, {"_id": 0}).sort("popularity_score", -1).limit(20))
    results = []
    if _should_fetch_external(len(local_results)):
        genre_map_movie = await _get_genre_map("movie")
        genre_map_tv = await _get_genre_map("tv")
        movies_t, series_t = await asyncio.gather(
            tmdb_trending("movie", "week"), tmdb_trending("tv", "week")
        )
        results = [_normalize_tmdb(m, genre_map_movie, media_type="movie") for m in movies_t[:10]]
        results += [_normalize_tmdb(s, genre_map_tv, media_type="tv") for s in series_t[:10]]
    results = _merge_movies(results, local_results, 20) if results else local_results
    import random
    random.shuffle(results)
    return {"results": results}

@router.get("/genre/{genre_name}")
async def get_by_genre(genre_name: str, page: int = Query(1, ge=1), language: Optional[str] = None):
    query_filter = {"genres": {"$regex": genre_name, "$options": "i"}}
    if language:
        query_filter["language"] = language
    skip = (page - 1) * 20
    movies = list(movies_collection.find(query_filter, {"_id": 0}).sort("popularity_score", -1).skip(skip).limit(20))
    if _should_fetch_external(len(movies)):
        genre_map = await _get_genre_map()
        GENRE_ID_MAP = {"action": 28, "comedy": 35, "drama": 18, "horror": 27,
                        "romance": 10749, "sci-fi": 878, "thriller": 53,
                        "animation": 16, "adventure": 12, "crime": 80,
                        "fantasy": 14, "mystery": 9648, "documentary": 99}
        genre_id = GENRE_ID_MAP.get(genre_name.lower())
        if genre_id:
            tmdb_data = await fetch_by_genre(genre_id, language=language or "en-US", page=page)
            if tmdb_data:
                movies = _merge_movies(movies, [_normalize_tmdb(m, genre_map) for m in tmdb_data], 20)
    return {"genre": genre_name, "page": page, "results": movies}

@router.get("/{movie_id}")
async def get_movie_details(movie_id: str, media_type: str = Query("movie")):
    query = {"$or": [{"_id": movie_id}, {"tmdb_id": int(movie_id) if movie_id.isdigit() else -1}]}
    details = movies_collection.find_one(query, {"_id": 0})
    if details:
        if "media_type" not in details:
            details["media_type"] = media_type
        if not details.get("poster_url"):
            details["poster_url"] = await fetch_movie_poster(details.get("title", ""))
        imdb_id = details.get("imdb_id")
        if imdb_id:
            details["deep_metadata"] = await get_deep_movie_data(imdb_id)
        return details
    if movie_id.isdigit():
        tmdb_id = int(movie_id)
        data = await tmdb_details(tmdb_id) if media_type != "tv" else await fetch_tv_details(tmdb_id)
        if data:
            genres = [g["name"] for g in data.get("genres", [])]

            credits = data.get("credits", {})
            cast = [{"name": a.get("name"), "character": a.get("character"),
                     "profile_url": get_poster_url(a.get("profile_path"), size="w185")}
                    for a in credits.get("cast", [])[:10]]
            director = next((c.get("name") for c in credits.get("crew", []) if c.get("job") == "Director"), None)
            trailer_key = next((v.get("key") for v in data.get("videos", {}).get("results", [])
                               if v.get("type") == "Trailer" and v.get("site") == "YouTube"), None)

            providers_data = data.get("watch/providers", {}).get("results", {})
            platforms = []
            for region in ["IN", "US"]:
                if region in providers_data:
                    flatrate = providers_data[region].get("flatrate", [])
                    platforms = [p["provider_name"] for p in flatrate]
                    if platforms:
                        break

            similar = []
            for m in data.get("similar", {}).get("results", [])[:10]:
                m_date = m.get("release_date") or m.get("first_air_date")
                similar.append({
                    "_id": str(m.get("id")), "tmdb_id": m.get("id"),
                    "title": m.get("title") or m.get("name"),
                    "poster_url": get_poster_url(m.get("poster_path")),
                    "rating": round(m.get("vote_average", 0), 1),
                    "release_date": m_date, "year": int(m_date[:4]) if m_date else None,
                    "overview": m.get("overview", ""), "genres": [], "platforms": [],
                    "votes": m.get("vote_count", 0), "media_type": media_type
                })

            main_title = data.get("title") or data.get("name")
            main_date = data.get("release_date") or data.get("first_air_date")

            # Parallel enrichment
            imdb_id = data.get("imdb_id")
            omdb_task = fetch_omdb_details_by_imdb_id(imdb_id) if imdb_id else fetch_omdb_details_by_title(main_title)
            imdb_task = fetch_imdb_title_details(imdb_id) if imdb_id else None
            deep_task = get_deep_movie_data(imdb_id) if imdb_id else None

            tasks = [omdb_task]
            if imdb_task:
                tasks.append(imdb_task)
            if deep_task:
                tasks.append(deep_task)

            results = await asyncio.gather(*tasks)
            omdb_data = results[0]
            imdb_dev_data = results[1] if len(results) > 1 else None
            deep_data = results[2] if len(results) > 2 else None

            extra_imdb_rating = omdb_data.get("imdbRating") if omdb_data else None
            extra_box_office = omdb_data.get("BoxOffice") if omdb_data else None
            extra_awards = omdb_data.get("Awards") if omdb_data else None
            rt_rating = None
            if omdb_data and "Ratings" in omdb_data:
                for r in omdb_data["Ratings"]:
                    if r.get("Source") == "Rotten Tomatoes":
                        rt_rating = r.get("Value", "").replace("%", "")
                        break
            imdb_api_rating = imdb_dev_data.get("rating", {}).get("aggregateRating") if imdb_dev_data else None
            imdb_api_votes = imdb_dev_data.get("rating", {}).get("voteCount") if imdb_dev_data else None
            metacritic_score = imdb_dev_data.get("metacritic", {}).get("score") if imdb_dev_data else None

            votes = data.get("vote_count", 0)
            rating = round(data.get("vote_average", 0), 1)
            import math
            popularity = round(rating * math.log10(votes + 1), 2) if votes > 0 else 0

            return {
                "_id": str(data.get("id")), "tmdb_id": data.get("id"), "title": main_title,
                "overview": data.get("overview"), "year": int(main_date[:4]) if main_date else None,
                "release_date": main_date, "runtime": data.get("runtime") or (
                    data.get("episode_run_time")[0] if data.get("episode_run_time") else None),
                "language": data.get("original_language"), "genres": genres, "rating": rating,
                "votes": votes, "popularity_score": popularity,
                "poster_url": get_poster_url(data.get("poster_path")),
                "backdrop_url": get_backdrop_url(data.get("backdrop_path")),
                "platforms": platforms, "cast": cast, "director": director,
                "trailer_key": trailer_key, "similar": similar, "tagline": data.get("tagline"),
                "budget": data.get("budget"), "imdb_id": imdb_id, "omdb_rating": extra_imdb_rating,
                "rt_rating": rt_rating, "box_office": extra_box_office, "awards": extra_awards,
                "imdb_api_rating": imdb_api_rating, "imdb_api_votes": imdb_api_votes,
                "metacritic": metacritic_score, "deep_metadata": deep_data, "media_type": media_type,
            }
    return {"error": "Movie not found"}
