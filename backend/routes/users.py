from fastapi import APIRouter, HTTPException, Query
from typing import List

from ml.taste_profile import build_taste_profile

router = APIRouter()

# Optional PostgreSQL dependencies
_has_pg = False
try:
    import os
    if os.getenv("NEURALFLIX_DEMO_MODE", "true").lower() != "true":
        from sqlalchemy.ext.asyncio import AsyncSession
        from sqlalchemy import select
        from db.connection import get_db
        from models.sql_models import PostgresMovie
        from db.models import WatchEvent
        _has_pg = True
except Exception:
    pass


async def _fetch_watch_history_pg(user_id: str) -> List[dict]:
    async for session in get_db():
        stmt = select(WatchEvent).where(WatchEvent.user_id == user_id)
        result = await session.execute(stmt)
        events = result.scalars().all()
        if not events:
            return []
        movie_ids = [e.movie_id for e in events]
        stmt_movies = select(PostgresMovie).where(PostgresMovie.id.in_(movie_ids))
        result_movies = await session.execute(stmt_movies)
        movies = result_movies.scalars().all()
        return [{
            "title": m.title,
            "genres": m.genres,
            "release_year": m.release_date[:4] if m.release_date else None,
            "runtime": m.runtime,
            "language": m.language,
            "rating": getattr(m, "tmdb_rating", 0.0),
            "director": getattr(m, "director", None),
        } for m in movies]


async def _fetch_watch_history_inmem(user_id: str) -> List[dict]:
    from database import watch_history_collection, movies_collection
    cursor = watch_history_collection.find({"user_id": str(user_id)})
    events = await cursor.to_list(length=None)
    if not events:
        return []
    movie_ids = [e.get("movie_id") for e in events if e.get("movie_id")]
    watch_history = []
    for mid in movie_ids:
        m = await movies_collection.find_one({"tmdb_id": int(mid) if str(mid).isdigit() else mid}, {"_id": 0})
        if m:
            watch_history.append({
                "title": m.get("title", ""),
                "genres": m.get("genres", []),
                "release_year": m.get("year"),
                "runtime": m.get("runtime"),
                "language": m.get("language"),
                "rating": m.get("rating", 0.0),
                "director": m.get("director"),
            })
    return watch_history


@router.get("/{user_id}/profile")
async def get_user_taste_profile(user_id: str):
    """Generate User's Taste DNA based on watch history."""
    if _has_pg:
        try:
            watch_history = await _fetch_watch_history_pg(user_id)
            if watch_history:
                taste_profile = build_taste_profile(watch_history)
                return {"user_id": user_id, "profile": taste_profile}
        except Exception:
            pass

    watch_history = await _fetch_watch_history_inmem(user_id)
    taste_profile = build_taste_profile(watch_history)
    return {"user_id": user_id, "profile": taste_profile}

@router.get("/{user_id}/history")
async def get_user_watch_history(user_id: str):
    """Return user's watch history with enriched movie metadata."""
    if _has_pg:
        try:
            watch_history = await _fetch_watch_history_pg(user_id)
            if watch_history:
                return {"user_id": user_id, "history": watch_history}
        except Exception:
            pass

    watch_history = await _fetch_watch_history_inmem(user_id)
    return {"user_id": user_id, "history": watch_history}


@router.post("/onboard")
async def onboard_user(data: dict):
    """
    Handles initial onboarding: sets user preferences and maps to a cluster.
    Expected data: { user_id, liked_genres, liked_movies, pref_genres, pref_languages }
    """
    user_id = data.get("user_id")
    liked_genres = data.get("pref_genres") or data.get("liked_genres") or []
    pref_languages = data.get("pref_languages") or data.get("languages") or []
    liked_movies = data.get("liked_movies", [])
    
    from database import users_collection
    await users_collection.update_one(
        {"id": str(user_id)},
        {"$set": {"onboarded": True, "pref_genres": liked_genres, "pref_languages": pref_languages}}
    )

    from database import watch_history_collection
    from datetime import datetime
    
    # Seed watch history in mongodb adapter
    for movie_id in liked_movies:
        await watch_history_collection.update_one(
            {"user_id": str(user_id), "movie_id": str(movie_id)},
            {"$set": {
                "user_id": str(user_id),
                "movie_id": str(movie_id),
                "timestamp": datetime.utcnow()
            }},
            upsert=True
        )

    # Seed SQL watch events and ratings if Postgres is enabled
    if _has_pg:
        from database import async_session_factory
        from db.models import Movie, WatchEvent, Rating
        from sqlalchemy import select
        try:
            async with async_session_factory() as session:
                for movie_id in liked_movies:
                    # Find movie SQL ID
                    try:
                        stmt = select(Movie.id).where(Movie.tmdb_id == int(movie_id))
                        res = await session.execute(stmt)
                        movie_sql_id = res.scalar()
                        if movie_sql_id:
                            # Add WatchEvent
                            we = WatchEvent(user_id=str(user_id), movie_id=movie_sql_id, completed=True)
                            session.add(we)
                            # Add Rating
                            r = Rating(user_id=str(user_id), movie_id=movie_sql_id, rating=8.0)
                            session.add(r)
                    except ValueError:
                        pass
                await session.commit()
        except Exception as e:
            print(f"Error seeding onboarding movies in SQL: {e}")
    
    return {
        "status": "success",
        "message": "User preferences saved. Engine initialized.",
        "cluster_id": "cluster_alpha_7" # Mock cluster ID
    }


async def invalidate_user_cache(user_id: str):
    try:
        from cache.redis_client import get_redis
        redis_client = await get_redis()
        if redis_client:
            keys = await redis_client.keys(f"recs:{user_id}:*")
            if keys:
                await redis_client.delete(*keys)
    except Exception:
        pass


@router.get("/{user_id}/watchlist")
async def get_watchlist(user_id: str, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100)):
    from database import users_collection
    user = await users_collection.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    watchlist_ids = user.get("watchlist", [])
    if not isinstance(watchlist_ids, list):
        watchlist_ids = []
        
    # pagination
    skip = (page - 1) * limit
    paginated_ids = watchlist_ids[skip : skip + limit]
    
    from database import movies_collection
    movies = await movies_collection.find(
        {"tmdb_id": {"$in": [int(i) for i in paginated_ids if str(i).isdigit()]}},
        {"_id": 0}
    ).to_list(length=None)
    
    # Sort them to match watchlist order
    movie_map = {m.get("tmdb_id"): m for m in movies}
    results = []
    for wid in paginated_ids:
        try:
            m = movie_map.get(int(wid))
            if m:
                results.append(m)
        except ValueError:
            pass
            
    return {"total": len(watchlist_ids), "page": page, "results": results}


@router.post("/{user_id}/watchlist/{movie_id}")
async def add_to_watchlist(user_id: str, movie_id: str):
    from database import users_collection
    user = await users_collection.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    await users_collection.update_one(
        {"id": user_id},
        {"$addToSet": {"watchlist": movie_id}}
    )
    await invalidate_user_cache(user_id)
    return {"message": "Added to watchlist"}


@router.delete("/{user_id}/watchlist/{movie_id}")
async def remove_from_watchlist(user_id: str, movie_id: str):
    from database import users_collection
    user = await users_collection.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    await users_collection.update_one(
        {"id": user_id},
        {"$pull": {"watchlist": movie_id}}
    )
    await invalidate_user_cache(user_id)
    return {"message": "Removed from watchlist"}


@router.post("/{user_id}/rate/{movie_id}")
async def rate_movie(user_id: str, movie_id: str, rating: float):
    if not 0.5 <= rating <= 10.0:
        raise HTTPException(status_code=400, detail="Rating must be between 0.5 and 10.0")
    
    # 1. Update SQL if Postgres is enabled
    if _has_pg:
        from database import async_session_factory
        from db.models import Movie, Rating
        from sqlalchemy import select
        from datetime import datetime
        try:
            async with async_session_factory() as session:
                stmt = select(Movie.id).where(Movie.tmdb_id == int(movie_id))
                res = await session.execute(stmt)
                movie_sql_id = res.scalar()
                if movie_sql_id:
                    stmt_rating = select(Rating).where(Rating.user_id == user_id, Rating.movie_id == movie_sql_id)
                    res_rating = await session.execute(stmt_rating)
                    rating_obj = res_rating.scalar_one_or_none()
                    
                    if rating_obj:
                        rating_obj.rating = rating
                        rating_obj.timestamp = int(datetime.utcnow().timestamp())
                    else:
                        rating_obj = Rating(
                            user_id=user_id,
                            movie_id=movie_sql_id,
                            rating=rating,
                            timestamp=int(datetime.utcnow().timestamp())
                        )
                        session.add(rating_obj)
                    await session.commit()
        except Exception as e:
            print(f"Postgres rating failed: {e}")

    # 2. Update adapted collections
    from database import users_collection, watch_history_collection
    from datetime import datetime
    try:
        await users_collection.update_one(
            {"id": user_id},
            {"$set": {f"ratings.{movie_id}": rating}}
        )
        await watch_history_collection.update_one(
            {"user_id": user_id, "movie_id": movie_id},
            {"$set": {"user_id": user_id, "movie_id": movie_id, "rating": rating, "timestamp": datetime.utcnow()}},
            upsert=True
        )
    except Exception as e:
        print(f"Collection rating failed: {e}")

    # 3. Invalidate Redis Cache
    await invalidate_user_cache(user_id)
    return {"message": "Rating saved", "rating": rating}


@router.get("/{user_id}/ratings")
async def get_ratings(user_id: str):
    from database import users_collection
    user = await users_collection.find_one({"id": user_id})
    if not user:
        return {"ratings": {}}
    return {"ratings": user.get("ratings", {}) or {}}


@router.get("/{user_id}/favorites")
async def get_favorites(user_id: str):
    from database import users_collection, movies_collection
    user = await users_collection.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    favorites_ids = user.get("favorites", [])
    if not favorites_ids:
        return {"results": []}
    
    movies = await movies_collection.find(
        {"tmdb_id": {"$in": [int(i) for i in favorites_ids if str(i).isdigit()]}},
        {"_id": 0}
    ).to_list(length=None)
    return {"results": movies}


@router.post("/{user_id}/favorites/{movie_id}")
async def toggle_favorite(user_id: str, movie_id: str):
    from database import users_collection
    user = await users_collection.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    favorites = user.get("favorites", [])
    if not isinstance(favorites, list):
        favorites = []
    
    if movie_id in favorites:
        await users_collection.update_one(
            {"id": user_id},
            {"$pull": {"favorites": movie_id}}
        )
        status = "removed"
    else:
        await users_collection.update_one(
            {"id": user_id},
            {"$addToSet": {"favorites": movie_id}}
        )
        status = "added"
        
    await invalidate_user_cache(user_id)
    return {"status": status}


@router.get("/{user_id}/stats")
async def get_user_stats(user_id: str):
    """Retrieve dynamic stats representing user's catalog interactions."""
    if _has_pg:
        try:
            watch_history = await _fetch_watch_history_pg(user_id)
        except Exception:
            watch_history = await _fetch_watch_history_inmem(user_id)
    else:
        watch_history = await _fetch_watch_history_inmem(user_id)
        
    from database import users_collection
    user = await users_collection.find_one({"id": user_id})
    ratings = {}
    if user:
        ratings = user.get("ratings", {}) or {}
        
    films_watched = len(watch_history)
    hours_watched = sum([m.get("runtime", 0) for m in watch_history if m.get("runtime")]) / 60.0
    avg_rating = sum(ratings.values()) / len(ratings) if ratings else 0.0
    countries = len(set([m.get("language") for m in watch_history if m.get("language")]))
    
    return {
        "films_watched": films_watched,
        "hours_watched": round(hours_watched, 1),
        "avg_rating": round(avg_rating, 2),
        "countries_watched": countries
    }
