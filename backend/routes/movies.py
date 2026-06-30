from fastapi import APIRouter, Depends, Query, HTTPException, Request
from typing import List, Optional
from cache.utils import cache_response
from bson import ObjectId
import math
import logging

from models.schemas import MovieListResponse, MovieDetail, MovieBase

logger = logging.getLogger("MOVIES_ROUTE")

router = APIRouter()

# Optional PostgreSQL dependencies
_has_pg = False
try:
    import os
    if os.getenv("NEURALFLIX_DEMO_MODE", "false").lower() != "true":
        from sqlalchemy.ext.asyncio import AsyncSession
        from sqlalchemy import select, func, or_
        from db.connection import get_db
        from models.sql_models import PostgresMovie
        _has_pg = True
except Exception:
    pass

def _serialize_movie_from_dict(m: dict) -> dict:
    return {
        "tmdb_id": m.get("tmdb_id"),
        "imdb_id": m.get("imdb_id"),
        "title": m.get("title", ""),
        "overview": m.get("overview", ""),
        "year": m.get("year"),
        "release_date": m.get("release_date"),
        "language": m.get("language", "en"),
        "genres": m.get("genres", []),
        "rating": m.get("rating", 0.0),
        "votes": m.get("votes", 0),
        "popularity_score": m.get("popularity_score", 0.0),
        "poster_url": m.get("poster_url"),
        "backdrop_url": m.get("backdrop_url"),
        "platforms": m.get("platforms", []),
        "media_type": m.get("media_type", "movie"),
    }


def serialize_movie(movie) -> dict:
    if isinstance(movie, dict):
        return _serialize_movie_from_dict(movie)
    return {
        "tmdb_id": movie.tmdb_id,
        "imdb_id": getattr(movie, "imdb_id", None),
        "title": movie.title,
        "overview": movie.overview,
        "year": int(movie.release_date[:4]) if movie.release_date and len(movie.release_date) >= 4 else None,
        "release_date": movie.release_date,
        "language": movie.language or "en",
        "genres": movie.genres or [],
        "rating": getattr(movie, "tmdb_rating", 0.0),
        "votes": getattr(movie, "tmdb_votes", 0),
        "popularity_score": movie.popularity_score or 0.0,
        "poster_url": movie.poster_url,
        "backdrop_url": movie.backdrop_url,
        "platforms": movie.platforms or [],
        "media_type": "movie",
    }


def _normalize_tmdb_helper(movie: dict, genre_map: dict, region: str = None) -> dict:
    genre_ids = movie.get("genre_ids", [])
    genres = [genre_map.get(gid) for gid in genre_ids if genre_map.get(gid)]
    date_field = movie.get("release_date")
    year = None
    if date_field and len(str(date_field)) >= 4:
        try:
            year = int(str(date_field)[:4])
        except ValueError:
            pass
    votes = movie.get("vote_count", 0)
    rating = movie.get("vote_average", 0.0)
    popularity = round(rating * math.log10(votes + 1), 2) if votes > 0 else 0.0
    
    from utils.tmdb_api import get_poster_url, get_backdrop_url
    
    norm = {
        "tmdb_id": movie.get("id"),
        "title": movie.get("title") or movie.get("original_title") or "Unknown",
        "overview": movie.get("overview") or "",
        "year": year,
        "release_date": date_field,
        "language": movie.get("original_language", "en"),
        "genres": genres,
        "rating": round(rating, 1),
        "votes": votes,
        "popularity_score": popularity,
        "poster_url": get_poster_url(movie.get("poster_path")),
        "backdrop_url": get_backdrop_url(movie.get("backdrop_path")),
        "media_type": "movie"
    }
    if region:
        norm["cinema_region"] = region
    return norm


def serialize_movie_detail(movie) -> dict:
    if not movie:
        return {}
    
    cast = movie.get("cast", [])
    if isinstance(cast, str):
        cast = [{"name": actor.strip(), "character": "Actor"} for actor in cast.split(",") if actor.strip()]
    elif not cast:
        cast = []

    release_date = movie.get("release_date")
    year = movie.get("year")
    if not year and release_date and len(str(release_date)) >= 4:
        try:
            year = int(str(release_date)[:4])
        except ValueError:
            pass

    return {
        "tmdb_id": movie.get("tmdb_id"),
        "imdb_id": movie.get("imdb_id"),
        "title": movie.get("title", ""),
        "overview": movie.get("overview", ""),
        "tagline": movie.get("tagline") or "",
        "year": year,
        "release_date": release_date,
        "runtime": movie.get("runtime"),
        "language": movie.get("language") or movie.get("original_language") or "en",
        "genres": movie.get("genres") or [],
        "rating": movie.get("rating") or movie.get("vote_average") or 0.0,
        "votes": movie.get("votes") or movie.get("vote_count") or 0,
        "poster_url": movie.get("poster_url"),
        "backdrop_url": movie.get("backdrop_url"),
        "director": movie.get("director") or "",
        "cast": cast[:10],
        "trailer_key": movie.get("trailer_key"),
        "platforms": movie.get("platforms") or [],
        "media_type": movie.get("media_type") or "movie",
        "deep_metadata": movie.get("deep_metadata") or {},
        "similar": movie.get("similar") or []
    }


async def enrich_movie(movie: dict) -> dict:
    imdb_id = movie.get("imdb_id")
    tmdb_id = movie.get("tmdb_id")
    
    # 1. Resolve tmdb_id if missing but we have imdb_id
    if not tmdb_id and imdb_id:
        try:
            from utils.tmdb_api import fetch_by_external_id
            tmdb_find = await fetch_by_external_id(imdb_id, "imdb_id")
            if tmdb_find:
                tmdb_id = tmdb_find.get("id")
                movie["tmdb_id"] = tmdb_id
        except Exception as e:
            logger.error(f"Error finding TMDB ID for {imdb_id}: {e}")

    # 2. Fetch TMDB details if we have tmdb_id
    tmdb_data = None
    if tmdb_id:
        try:
            from utils.tmdb_api import fetch_movie_details
            tmdb_data = await fetch_movie_details(tmdb_id)
        except Exception as e:
            logger.error(f"Error fetching TMDB details for {tmdb_id}: {e}")

    # 3. Fetch OMDb details if we have imdb_id or by title/year
    omdb_data = None
    if imdb_id:
        try:
            from utils.omdb_api import fetch_omdb_details_by_imdb_id
            omdb_data = await fetch_omdb_details_by_imdb_id(imdb_id)
        except Exception as e:
            logger.error(f"Error fetching OMDb details for {imdb_id}: {e}")
    elif movie.get("title"):
        try:
            from utils.omdb_api import fetch_omdb_details_by_title
            omdb_data = await fetch_omdb_details_by_title(movie["title"], str(movie.get("year")) if movie.get("year") else None)
        except Exception as e:
            logger.error(f"Error fetching OMDb details for title {movie.get('title')}: {e}")

    # 4. Fetch Deep IMDb metadata
    deep_meta = None
    if imdb_id:
        try:
            from utils.imdb_api import get_deep_movie_data
            deep_meta = await get_deep_movie_data(imdb_id)
        except Exception as e:
            logger.error(f"Error fetching Deep IMDb data for {imdb_id}: {e}")

    # 5. Extract fields from APIs (favoring English fields)
    if tmdb_data:
        # Enforce English titles and descriptions
        movie["title"] = tmdb_data.get("title") or tmdb_data.get("original_title") or movie.get("title")
        movie["overview"] = tmdb_data.get("overview") or movie.get("overview")
        if tmdb_data.get("tagline"):
            movie["tagline"] = tmdb_data.get("tagline")
        if tmdb_data.get("runtime"):
            movie["runtime"] = tmdb_data.get("runtime")
        if tmdb_data.get("poster_path"):
            from utils.tmdb_api import get_poster_url
            movie["poster_url"] = get_poster_url(tmdb_data["poster_path"])
        if tmdb_data.get("backdrop_path"):
            from utils.tmdb_api import get_backdrop_url
            movie["backdrop_url"] = get_backdrop_url(tmdb_data["backdrop_path"])
        if tmdb_data.get("release_date"):
            movie["release_date"] = tmdb_data["release_date"]
            if len(tmdb_data["release_date"]) >= 4:
                try:
                    movie["year"] = int(tmdb_data["release_date"][:4])
                except ValueError:
                    pass

        t_genres = [g["name"] for g in tmdb_data.get("genres", []) if g.get("name")]
        if t_genres:
            movie["genres"] = t_genres

        credits = tmdb_data.get("credits", {})
        if credits:
            from utils.tmdb_api import get_poster_url
            cast_list = []
            for actor in credits.get("cast", [])[:10]:
                cast_list.append({
                    "name": actor.get("name"),
                    "character": actor.get("character"),
                    "profile_url": get_poster_url(actor.get("profile_path"), size="w185")
                })
            movie["cast"] = cast_list
            
            director = next((crew.get("name") for crew in credits.get("crew", []) if crew.get("job") == "Director"), None)
            if director:
                movie["director"] = director

        videos = tmdb_data.get("videos", {}).get("results", [])
        trailer_key = None
        for v in videos:
            if v.get("site") == "YouTube" and v.get("type") == "Trailer":
                trailer_key = v.get("key")
                break
        if not trailer_key and videos:
            trailer_key = videos[0].get("key")
        if trailer_key:
            movie["trailer_key"] = trailer_key

    if omdb_data:
        # Enforce English titles and descriptions
        if omdb_data.get("Title") and omdb_data["Title"] != "N/A":
            movie["title"] = omdb_data["Title"]
        if omdb_data.get("Plot") and omdb_data["Plot"] != "N/A" and len(omdb_data["Plot"]) > len(movie.get("overview", "")):
            movie["overview"] = omdb_data["Plot"]
        if not movie.get("director") and omdb_data.get("Director") and omdb_data["Director"] != "N/A":
            movie["director"] = omdb_data["Director"]
        if not movie.get("cast") and omdb_data.get("Actors") and omdb_data["Actors"] != "N/A":
            movie["cast"] = [{"name": actor.strip(), "character": "Actor"} for actor in omdb_data["Actors"].split(",")]
        if not movie.get("runtime") and omdb_data.get("Runtime") and omdb_data["Runtime"] != "N/A":
            try:
                rt_val = int("".join(filter(str.isdigit, omdb_data["Runtime"])))
                movie["runtime"] = rt_val
            except Exception:
                pass
        if not movie.get("poster_url") and omdb_data.get("Poster") and omdb_data["Poster"].startswith("http"):
            movie["poster_url"] = omdb_data["Poster"]
        if omdb_data.get("imdbRating") and omdb_data["imdbRating"] != "N/A":
            try:
                movie["rating"] = float(omdb_data["imdbRating"])
            except ValueError:
                pass
        if omdb_data.get("imdbVotes") and omdb_data["imdbVotes"] != "N/A":
            try:
                movie["votes"] = int(omdb_data["imdbVotes"].replace(",", ""))
            except ValueError:
                pass
        if not movie.get("genres") and omdb_data.get("Genre") and omdb_data["Genre"] != "N/A":
            movie["genres"] = [g.strip() for g in omdb_data["Genre"].split(",")]

    if deep_meta:
        movie["deep_metadata"] = deep_meta

    # 6. Save update back to MongoDB
    from database import movies_collection
    try:
        up_query = {}
        if movie.get("_id"):
            up_query["_id"] = movie["_id"]
        elif movie.get("imdb_id"):
            up_query["imdb_id"] = movie["imdb_id"]
        elif movie.get("tmdb_id"):
            up_query["tmdb_id"] = movie["tmdb_id"]

        if up_query:
            await movies_collection.update_one(up_query, {"$set": movie}, upsert=True)
    except Exception as e:
        logger.error(f"Error saving enriched movie: {e}")

    return movie


@router.get("/trending")
@cache_response(expire=3600)
async def get_trending_movies(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    offset = (page - 1) * limit
    if _has_pg:
        try:
            async for session in get_db():
                stmt_total = select(func.count(PostgresMovie.id))
                total = await session.scalar(stmt_total) or 0
                stmt = select(PostgresMovie).order_by(PostgresMovie.popularity_score.desc()).limit(limit).offset(offset)
                result = await session.execute(stmt)
                movies = result.scalars().all()
                return {
                    "page": page,
                    "total": total,
                    "total_pages": math.ceil(total / limit),
                    "has_next": (offset + limit) < total,
                    "results": [serialize_movie(m) for m in movies]
                }
        except Exception as e:
            logger.error(f"SQL path in get_trending failed: {e}")

    from database import movies_collection
    total = await movies_collection.count_documents({})
    movies = await movies_collection.find({}, {"_id": 0}).sort("popularity_score", -1).skip(offset).limit(limit).to_list(length=limit)

    if total < 10:
        try:
            from utils.tmdb_api import fetch_trending, fetch_genre_list
            tmdb_movies = await fetch_trending(time_window="day")
            if tmdb_movies:
                genre_map = await fetch_genre_list()
                normalized_movies = []
                for m in tmdb_movies:
                    norm = _normalize_tmdb_helper(m, genre_map)
                    try:
                        await movies_collection.update_one({"tmdb_id": norm["tmdb_id"]}, {"$set": norm}, upsert=True)
                    except Exception:
                        pass
                    normalized_movies.append(norm)
                
                seen = {str(item.get("tmdb_id")) for item in movies}
                for item in normalized_movies:
                    item_id = str(item.get("tmdb_id"))
                    if item_id not in seen:
                        movies.append(item)
                        seen.add(item_id)
                total = max(total, len(movies))
        except Exception as e:
            logger.error(f"Error fetching from TMDB trending: {e}")

    return {
        "page": page,
        "total": total,
        "total_pages": math.ceil(total / limit) if limit > 0 else 1,
        "has_next": (offset + limit) < total,
        "results": [serialize_movie(m) for m in movies[:limit]]
    }


@router.get("/search")
@cache_response(expire=60)
async def search_movies(
    request: Request,
    q: str = Query(..., min_length=2),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    offset = (page - 1) * limit
    if _has_pg:
        try:
            async for session in get_db():
                search_term = f"%{q}%"
                filters = or_(PostgresMovie.title.ilike(search_term), PostgresMovie.overview.ilike(search_term))
                stmt_total = select(func.count(PostgresMovie.id)).where(filters)
                total = await session.scalar(stmt_total) or 0
                stmt = select(PostgresMovie).where(filters).order_by(PostgresMovie.popularity_score.desc()).limit(limit).offset(offset)
                result = await session.execute(stmt)
                movies = result.scalars().all()
                return {
                    "page": page,
                    "total": total,
                    "total_pages": math.ceil(total / limit),
                    "has_next": (offset + limit) < total,
                    "results": [serialize_movie(m) for m in movies]
                }
        except Exception as e:
            logger.error(f"SQL path in search failed: {e}")

    from database import movies_collection
    query = {"$text": {"$search": q}}
    total = await movies_collection.count_documents(query)
    movies = await movies_collection.find(
        query,
        {"score": {"$meta": "textScore"}, "_id": 0}
    ).sort([("score", {"$meta": "textScore"})]).skip(offset).limit(limit).to_list(length=limit)
    return {
        "page": page,
        "total": total,
        "total_pages": math.ceil(total / limit),
        "has_next": (offset + limit) < total,
        "results": [serialize_movie(m) for m in movies]
    }


@router.get("/trending-all")
@cache_response(expire=3600)
async def get_trending_all(request: Request):
    return await get_trending_movies(request=request, limit=40)


@router.get("/popular")
@cache_response(expire=1800)
async def get_popular_movies(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    offset = (page - 1) * limit
    query = {"votes": {"$gte": 100}}
    if _has_pg:
        try:
            async for session in get_db():
                stmt_total = select(func.count(PostgresMovie.id)).where(PostgresMovie.tmdb_votes >= 100)
                total = await session.scalar(stmt_total) or 0
                stmt = select(PostgresMovie).where(PostgresMovie.tmdb_votes >= 100).order_by(PostgresMovie.popularity_score.desc()).limit(limit).offset(offset)
                result = await session.execute(stmt)
                movies = result.scalars().all()
                return {
                    "page": page,
                    "total": total,
                    "total_pages": math.ceil(total / limit),
                    "has_next": (offset + limit) < total,
                    "results": [serialize_movie(m) for m in movies]
                }
        except Exception as e:
            logger.error(f"SQL path in get_popular failed: {e}")

    from database import movies_collection
    total = await movies_collection.count_documents(query)
    movies = await movies_collection.find(query, {"_id": 0}).sort("popularity_score", -1).skip(offset).limit(limit).to_list(length=limit)
    return {
        "page": page,
        "total": total,
        "total_pages": math.ceil(total / limit),
        "has_next": (offset + limit) < total,
        "results": [serialize_movie(m) for m in movies]
    }


@router.get("/filter")
@cache_response(expire=300)
async def filter_movies(
    request: Request,
    genres: Optional[str] = None,
    language: Optional[str] = None,
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    min_rating: Optional[float] = None,
    max_rating: Optional[float] = None,
    sort: str = "popularity",
    media_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    offset = (page - 1) * limit
    
    if _has_pg:
        try:
            async for session in get_db():
                from sqlalchemy import and_, desc, asc
                filters = []
                if genres:
                    for g in genres.split(","):
                        filters.append(PostgresMovie.genres.any(g.strip()))
                if language:
                    filters.append(PostgresMovie.language == language)
                if year_from:
                    filters.append(PostgresMovie.year >= year_from)
                if year_to:
                    filters.append(PostgresMovie.year <= year_to)
                if min_rating is not None:
                    filters.append(PostgresMovie.tmdb_rating >= min_rating)
                if max_rating is not None:
                    filters.append(PostgresMovie.tmdb_rating <= max_rating)
                
                stmt_total = select(func.count(PostgresMovie.id))
                if filters:
                    stmt_total = stmt_total.where(and_(*filters))
                total = await session.scalar(stmt_total) or 0
                
                sort_map = {
                    "popularity": desc(PostgresMovie.popularity_score),
                    "rating": desc(PostgresMovie.tmdb_rating),
                    "year": desc(PostgresMovie.year),
                    "votes": desc(PostgresMovie.tmdb_votes),
                    "title": asc(PostgresMovie.title)
                }
                sort_clause = sort_map.get(sort, desc(PostgresMovie.popularity_score))
                
                stmt = select(PostgresMovie)
                if filters:
                    stmt = stmt.where(and_(*filters))
                stmt = stmt.order_by(sort_clause).limit(limit).offset(offset)
                result = await session.execute(stmt)
                movies = result.scalars().all()
                
                return {
                    "page": page,
                    "total": total,
                    "total_pages": math.ceil(total / limit),
                    "has_next": (offset + limit) < total,
                    "results": [serialize_movie(m) for m in movies]
                }
        except Exception as e:
            logger.error(f"SQL path in filter failed: {e}")

    from database import movies_collection
    query = {}
    if genres:
        genre_list = [g.strip() for g in genres.split(",")]
        query["genres"] = {"$in": genre_list}
    if language:
        query["language"] = language
    if year_from or year_to:
        query["year"] = {}
        if year_from: query["year"]["$gte"] = year_from
        if year_to:   query["year"]["$lte"] = year_to
    if min_rating is not None:
        query.setdefault("rating", {})["$gte"] = min_rating
    if max_rating is not None:
        query.setdefault("rating", {})["$lte"] = max_rating

    sort_field = {
        "popularity": ("popularity_score", -1),
        "rating": ("rating", -1),
        "year": ("year", -1),
        "votes": ("votes", -1),
        "title": ("title", 1),
    }.get(sort, ("popularity_score", -1))

    total = await movies_collection.count_documents(query)
    movies = await movies_collection.find(query, {"_id": 0}).sort(sort_field[0], sort_field[1]).skip(offset).limit(limit).to_list(length=limit)
    return {
        "page": page,
        "total": total,
        "total_pages": math.ceil(total / limit),
        "has_next": (offset + limit) < total,
        "results": [serialize_movie(m) for m in movies]
    }


@router.get("/toprated")
@cache_response(expire=3600)
async def get_top_rated(request: Request, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100)):
    offset = (page - 1) * limit
    
    if _has_pg:
        try:
            async for session in get_db():
                stmt_total = select(func.count(PostgresMovie.id))
                total = await session.scalar(stmt_total) or 0
                stmt = select(PostgresMovie).order_by(PostgresMovie.tmdb_rating.desc()).limit(limit).offset(offset)
                result = await session.execute(stmt)
                movies = result.scalars().all()
                return {
                    "page": page,
                    "total": total,
                    "total_pages": math.ceil(total / limit),
                    "has_next": (offset + limit) < total,
                    "results": [serialize_movie(m) for m in movies]
                }
        except Exception as e:
            logger.error(f"SQL path in get_top_rated failed: {e}")

    from database import movies_collection
    total = await movies_collection.count_documents({})
    movies = await movies_collection.find({}, {"_id": 0}).sort("rating", -1).skip(offset).limit(limit).to_list(length=limit)

    if total < 10:
        try:
            from utils.tmdb_api import fetch_top_rated, fetch_genre_list
            tmdb_movies = await fetch_top_rated(page=page)
            if tmdb_movies:
                genre_map = await fetch_genre_list()
                normalized_movies = []
                for m in tmdb_movies:
                    norm = _normalize_tmdb_helper(m, genre_map)
                    try:
                        await movies_collection.update_one({"tmdb_id": norm["tmdb_id"]}, {"$set": norm}, upsert=True)
                    except Exception:
                        pass
                    normalized_movies.append(norm)
                
                seen = {str(item.get("tmdb_id")) for item in movies}
                for item in normalized_movies:
                    item_id = str(item.get("tmdb_id"))
                    if item_id not in seen:
                        movies.append(item)
                        seen.add(item_id)
                total = max(total, len(movies))
        except Exception as e:
            logger.error(f"Error fetching from TMDB top_rated: {e}")

    return {
        "page": page,
        "total": total,
        "total_pages": math.ceil(total / limit) if limit > 0 else 1,
        "has_next": (offset + limit) < total,
        "results": [serialize_movie(m) for m in movies[:limit]]
    }


@router.get("/nowplaying")
@cache_response(expire=1800)
async def get_now_playing(request: Request, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100)):
    offset = (page - 1) * limit
    import datetime
    cutoff_year = datetime.datetime.now().year - 2
    query = {"year": {"$gte": cutoff_year}}
    
    if _has_pg:
        try:
            async for session in get_db():
                stmt_total = select(func.count(PostgresMovie.id)).where(PostgresMovie.year >= cutoff_year)
                total = await session.scalar(stmt_total) or 0
                stmt = select(PostgresMovie).where(PostgresMovie.year >= cutoff_year).order_by(PostgresMovie.popularity_score.desc()).limit(limit).offset(offset)
                result = await session.execute(stmt)
                movies = result.scalars().all()
                return {
                    "page": page,
                    "total": total,
                    "total_pages": math.ceil(total / limit),
                    "has_next": (offset + limit) < total,
                    "results": [serialize_movie(m) for m in movies]
                }
        except Exception as e:
            logger.error(f"SQL path in get_now_playing failed: {e}")

    from database import movies_collection
    total = await movies_collection.count_documents(query)
    movies = await movies_collection.find(query, {"_id": 0}).sort("popularity_score", -1).skip(offset).limit(limit).to_list(length=limit)

    if total < 10:
        try:
            from utils.tmdb_api import fetch_now_playing, fetch_genre_list
            tmdb_movies = await fetch_now_playing(page=page)
            if tmdb_movies:
                genre_map = await fetch_genre_list()
                normalized_movies = []
                for m in tmdb_movies:
                    norm = _normalize_tmdb_helper(m, genre_map)
                    try:
                        await movies_collection.update_one({"tmdb_id": norm["tmdb_id"]}, {"$set": norm}, upsert=True)
                    except Exception:
                        pass
                    normalized_movies.append(norm)
                
                seen = {str(item.get("tmdb_id")) for item in movies}
                for item in normalized_movies:
                    item_id = str(item.get("tmdb_id"))
                    if item_id not in seen:
                        movies.append(item)
                        seen.add(item_id)
                total = max(total, len(movies))
        except Exception as e:
            logger.error(f"Error fetching from TMDB now_playing: {e}")

    return {
        "page": page,
        "total": total,
        "total_pages": math.ceil(total / limit) if limit > 0 else 1,
        "has_next": (offset + limit) < total,
        "results": [serialize_movie(m) for m in movies[:limit]]
    }


@router.get("/anime")
@cache_response(expire=7200)
async def get_anime(request: Request, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100)):
    offset = (page - 1) * limit
    query = {"genres": "Animation"}
    
    if _has_pg:
        try:
            async for session in get_db():
                stmt_total = select(func.count(PostgresMovie.id)).where(PostgresMovie.genres.any("Animation"))
                total = await session.scalar(stmt_total) or 0
                stmt = select(PostgresMovie).where(PostgresMovie.genres.any("Animation")).order_by(PostgresMovie.popularity_score.desc()).limit(limit).offset(offset)
                result = await session.execute(stmt)
                movies = result.scalars().all()
                return {
                    "page": page,
                    "total": total,
                    "total_pages": math.ceil(total / limit),
                    "has_next": (offset + limit) < total,
                    "results": [serialize_movie(m) for m in movies]
                }
        except Exception as e:
            logger.error(f"SQL path in get_anime failed: {e}")

    from database import movies_collection
    total = await movies_collection.count_documents(query)
    movies = await movies_collection.find(query, {"_id": 0}).sort("popularity_score", -1).skip(offset).limit(limit).to_list(length=limit)
    return {
        "page": page,
        "total": total,
        "total_pages": math.ceil(total / limit),
        "has_next": (offset + limit) < total,
        "results": [serialize_movie(m) for m in movies]
    }


@router.get("/series")
@cache_response(expire=7200)
async def get_series(request: Request, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100)):
    offset = (page - 1) * limit
    from database import movies_collection
    total = await movies_collection.count_documents({"media_type": "tv"})
    movies = await movies_collection.find({"media_type": "tv"}, {"_id": 0}).sort("popularity_score", -1).skip(offset).limit(limit).to_list(length=limit)
    return {
        "page": page,
        "total": total,
        "total_pages": math.ceil(total / limit) if limit > 0 else 1,
        "has_next": (offset + limit) < total,
        "results": [serialize_movie(m) for m in movies]
    }


# Region Language Map
REGION_LANG_MAP = {
    "bollywood": ["hi"],
    "tollywood": ["te"],
    "kollywood": ["ta"],
    "tamil": ["ta"],
    "mollywood": ["ml"],
    "sandalwood": ["kn"],
    "korean": ["ko"],
    "japanese": ["ja"],
    "french": ["fr"],
    "spanish": ["es"],
    "italian": ["it"],
    "german": ["de"],
    "chinese": ["zh", "cn"],
    "iranian": ["fa"],
    "brazilian": ["pt"],
    "thai": ["th"],
    "turkish": ["tr"],
    "russian": ["ru"],
    "arabic": ["ar"],
    "hollywood": ["en"],
    "indian": ["hi", "te", "ta", "ml", "kn", "bn", "mr", "pa"],
    "nollywood": ["en"]
}


@router.get("/region/{region}")
@cache_response(expire=3600)
async def get_by_region(request: Request, region: str, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100)):
    offset = (page - 1) * limit
    langs = REGION_LANG_MAP.get(region.lower(), [])
    
    # 1. SQL Optimization path
    if _has_pg:
        try:
            async for session in get_db():
                from sqlalchemy import or_
                conditions = [PostgresMovie.cinema_region == region.lower()]
                if langs and region.lower() not in ("hollywood", "nollywood"):
                    conditions.append(PostgresMovie.language.in_(langs))
                
                filter_cond = or_(*conditions) if len(conditions) > 1 else conditions[0]
                stmt_total = select(func.count(PostgresMovie.id)).where(filter_cond)
                total = await session.scalar(stmt_total) or 0
                
                stmt = select(PostgresMovie).where(filter_cond)\
                    .order_by(PostgresMovie.popularity_score.desc())\
                    .limit(limit).offset(offset)
                result = await session.execute(stmt)
                movies = result.scalars().all()
                
                if len(movies) >= limit or total >= 10:
                    return {
                        "page": page,
                        "total": total,
                        "total_pages": math.ceil(total / limit),
                        "has_next": (offset + limit) < total,
                        "results": [serialize_movie(m) for m in movies]
                    }
        except Exception as e:
            logger.error(f"SQL path in get_by_region failed: {e}")

    # 2. Fallback to SQLCollectionAdapter (movies_collection)
    from database import movies_collection
    or_filters = [{"cinema_region": region.lower()}]
    if langs and region.lower() not in ("hollywood", "nollywood"):
        or_filters.append({"language": {"$in": langs}})
    query = {"$or": or_filters} if len(or_filters) > 1 else or_filters[0]
    
    total = await movies_collection.count_documents(query)
    movies = await movies_collection.find(query, {"_id": 0}).sort("popularity_score", -1).skip(offset).limit(limit).to_list(length=limit)
    
    # 3. Call TMDB discover if results are low (<10)
    if total < 10:
        try:
            from utils.tmdb_api import fetch_movies_by_region, fetch_genre_list
            tmdb_movies = await fetch_movies_by_region(region, page=page)
            if tmdb_movies:
                genre_map = await fetch_genre_list()
                normalized_movies = []
                for m in tmdb_movies:
                    norm = _normalize_tmdb_helper(m, genre_map, region.lower())
                    try:
                        await movies_collection.update_one(
                            {"tmdb_id": norm["tmdb_id"]},
                            {"$set": norm},
                            upsert=True
                        )
                    except Exception:
                        pass
                    normalized_movies.append(norm)
                
                seen = {str(item.get("tmdb_id")) for item in movies}
                for item in normalized_movies:
                    item_id = str(item.get("tmdb_id"))
                    if item_id not in seen:
                        movies.append(item)
                        seen.add(item_id)
                total = len(movies)
        except Exception as e:
            logger.error(f"Error fetching from TMDB region discover for {region}: {e}")
            
    return {
        "page": page,
        "total": max(total, len(movies)),
        "total_pages": math.ceil(max(total, len(movies)) / limit),
        "has_next": (offset + limit) < total,
        "results": [serialize_movie(m) for m in movies[:limit]]
    }


@router.get("/mood/{mood}")
@cache_response(expire=3600)
async def get_by_mood(request: Request, mood: str, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100)):
    try:
        from utils.tmdb_api import fetch_by_mood, fetch_genre_list
        tmdb_movies = await fetch_by_mood(mood, page=page)
        if tmdb_movies:
            genre_map = await fetch_genre_list()
            movies = [_normalize_tmdb_helper(m, genre_map) for m in tmdb_movies]
            return {
                "page": page,
                "total": len(movies) * 10,
                "total_pages": 10,
                "has_next": True,
                "results": [serialize_movie(m) for m in movies]
            }
    except Exception:
        pass
    return await get_trending_movies(request=request, page=page, limit=limit)


@router.get("/genre/{genre}")
@cache_response(expire=3600)
async def get_by_genre(request: Request, genre: str, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100)):
    offset = (page - 1) * limit
    genre_clean = genre.lower().replace("-", " ")
    if genre_clean == "sci fi":
        genre_clean = "science fiction"
    genre_cap = genre_clean.title()
    
    if _has_pg:
        try:
            async for session in get_db():
                stmt_total = select(func.count(PostgresMovie.id)).where(PostgresMovie.genres.any(genre_cap))
                total = await session.scalar(stmt_total) or 0
                stmt = select(PostgresMovie).where(PostgresMovie.genres.any(genre_cap)).order_by(PostgresMovie.popularity_score.desc()).limit(limit).offset(offset)
                result = await session.execute(stmt)
                movies = result.scalars().all()
                return {
                    "page": page,
                    "total": total,
                    "total_pages": math.ceil(total / limit),
                    "has_next": (offset + limit) < total,
                    "results": [serialize_movie(m) for m in movies]
                }
        except Exception as e:
            logger.error(f"SQL path in get_by_genre failed: {e}")

    from database import movies_collection
    pattern = {"$regex": f"^{genre_clean}$", "$options": "i"}
    total = await movies_collection.count_documents({"genres": pattern})
    movies = await movies_collection.find({"genres": pattern}, {"_id": 0}).sort("popularity_score", -1).skip(offset).limit(limit).to_list(length=limit)
    return {
        "page": page,
        "total": total,
        "total_pages": math.ceil(total / limit),
        "has_next": (offset + limit) < total,
        "results": [serialize_movie(m) for m in movies]
    }


@router.get("/region/{region}/stats")
async def get_region_stats(region: str, request: Request = None):
    """Retrieve dynamic stats representing total movies, avg rating, and top genres of a region.
    NOTE: This route MUST be defined BEFORE /{movie_id} to avoid being shadowed by the catch-all."""
    langs = REGION_LANG_MAP.get(region.lower(), [])
    
    if _has_pg:
        try:
            async for session in get_db():
                from sqlalchemy import or_, func
                conditions = [PostgresMovie.cinema_region == region.lower()]
                if langs:
                    conditions.append(PostgresMovie.language.in_(langs))
                
                # count
                stmt_total = select(func.count(PostgresMovie.id)).where(or_(*conditions))
                total = await session.scalar(stmt_total) or 0
                
                # avg rating
                stmt_avg = select(func.avg(PostgresMovie.tmdb_rating)).where(or_(*conditions))
                avg_rating = await session.scalar(stmt_avg) or 0.0
                
                # genres
                stmt_genres = select(PostgresMovie.genres).where(or_(*conditions)).limit(100)
                res = await session.execute(stmt_genres)
                genres_rows = res.scalars().all()
                genre_counts = {}
                for g_list in genres_rows:
                    if g_list:
                        for g in g_list:
                            genre_counts[g] = genre_counts.get(g, 0) + 1
                top_genres = sorted(genre_counts.items(), key=lambda x: x[1], reverse=True)[:3]
                top_genres_list = [g[0] for g in top_genres]
                
                return {
                    "total_movies": total,
                    "avg_rating": round(avg_rating, 1),
                    "top_genres": top_genres_list
                }
        except Exception as e:
            logger.error(f"Error fetching regional stats from SQL: {e}")
            
    from database import movies_collection
    or_filters = [{"cinema_region": region.lower()}]
    if langs:
        or_filters.append({"language": {"$in": langs}})
    query = {"$or": or_filters}
    
    total = await movies_collection.count_documents(query)
    sample = await movies_collection.find(query, {"genres": 1, "rating": 1, "_id": 0}).limit(100).to_list(length=100)
    
    ratings = [m.get("rating", 0) for m in sample if m.get("rating")]
    avg_rating = sum(ratings) / len(ratings) if ratings else 0.0
    
    genre_counts = {}
    for m in sample:
        for g in m.get("genres", []):
            genre_counts[g] = genre_counts.get(g, 0) + 1
    top_genres = sorted(genre_counts.items(), key=lambda x: x[1], reverse=True)[:3]
    top_genres_list = [g[0] for g in top_genres]
    
    return {
        "total_movies": total,
        "avg_rating": round(avg_rating, 1),
        "top_genres": top_genres_list
    }


@router.get("/{movie_id}")
@cache_response(expire=86400)
async def get_movie(request: Request, movie_id: str):
    """Fetch movie by ID (TMDB ID, IMDb ID, or MongoDB Hex ID)"""
    movie = None
    if _has_pg:
        try:
            async for session in get_db():
                stmt = select(PostgresMovie).where(
                    (PostgresMovie.tmdb_id == (int(movie_id) if movie_id.isdigit() else -1)) |
                    (PostgresMovie.imdb_id == movie_id)
                )
                result = await session.execute(stmt)
                postgres_movie = result.scalar_one_or_none()
                if postgres_movie:
                    from database import movies_collection
                    movie = movies_collection._serialize_to_dict(postgres_movie)
                    break
        except Exception as e:
            logger.error(f"Error fetching movie from Postgres: {e}")

    if not movie:
        from database import movies_collection
        # Construct robust MongoDB search query
        or_filters = [{"_id": movie_id}]
        try:
            if len(movie_id) == 24:
                or_filters.append({"_id": ObjectId(movie_id)})
        except Exception:
            pass
            
        if movie_id.isdigit():
            or_filters.append({"tmdb_id": int(movie_id)})
            or_filters.append({"_id": int(movie_id)})
            
        if movie_id.startswith("tt"):
            or_filters.append({"imdb_id": movie_id})

        movie = await movies_collection.find_one({"$or": or_filters})
    
    # If not found locally, try to fetch from TMDB or OMDb
    if not movie:
        movie = {}
        if movie_id.startswith("tt"):
            movie["imdb_id"] = movie_id
        elif movie_id.isdigit():
            movie["tmdb_id"] = int(movie_id)
        else:
            raise HTTPException(status_code=404, detail="Movie not found in local catalog or external API")
            
        movie = await enrich_movie(movie)
        if not movie.get("title") or movie.get("title") == "Unknown":
            raise HTTPException(status_code=404, detail="Movie not found in local catalog or external API")
    else:
        # Check if local movie lacks details (barebones ingested record)
        lacks_details = (
            not movie.get("overview") or 
            not movie.get("poster_url") or 
            not movie.get("cast") or 
            not movie.get("director") or 
            not movie.get("runtime")
        )
        if lacks_details:
            movie = await enrich_movie(movie)

    # Serialize with details
    movie_serialized = serialize_movie_detail(movie)
    
    # Fetch similar movies on-the-fly
    similar = []
    if movie_serialized.get("tmdb_id"):
        try:
            from utils.tmdb_api import fetch_movie_recommendations, get_poster_url
            tmdb_similar = await fetch_movie_recommendations(movie_serialized["tmdb_id"])
            for m in tmdb_similar[:10]:
                m_date = m.get("release_date")
                similar.append({
                    "tmdb_id": m.get("id"),
                    "title": m.get("title") or m.get("original_title"),
                    "poster_url": get_poster_url(m.get("poster_path")),
                    "rating": round(m.get("vote_average", 0), 1),
                    "release_date": m_date,
                    "year": int(m_date[:4]) if m_date else None,
                    "media_type": "movie",
                })
        except Exception as e:
            logger.error(f"Error fetching similar recommendations: {e}")
            
    movie_serialized["similar"] = similar
    return movie_serialized


# NOTE: /region/{region}/stats has been moved BEFORE /{movie_id} to prevent route shadowing
