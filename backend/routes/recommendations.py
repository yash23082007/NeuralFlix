import json
import os
import logging
from fastapi import APIRouter, HTTPException, Query, Request
from typing import List, Optional

from ml.hybrid_recommender import HybridRecommender, content_engine, ncf_model, sasrec_model, gnn_model
from utils.recommendation_engine import hybrid_recommendation

logger = logging.getLogger("API_MONITOR")
router = APIRouter()

# Instantiate the hybrid recommender singleton
recommender = HybridRecommender(content_engine, ncf_model, sasrec_model, gnn_model)

# Try to load PostgreSQL dependencies if available (not in demo mode)
_has_pg = False
try:
    if os.getenv("NEURALFLIX_DEMO_MODE", "true").lower() != "true":
        from sqlalchemy.ext.asyncio import AsyncSession
        from sqlalchemy import select
        from db.connection import get_db
        from models.sql_models import PostgresMovie
        _has_pg = True
except Exception as exc:
    logger.warning(f"PostgreSQL not available for recommendations route: {exc}")


async def _fetch_movies_from_db(tmdb_ids: List[int]) -> List[dict]:
    """Fetch movie metadata from available database (PG or fallback)."""
    if _has_pg:
        try:
            from db.connection import get_db
            from models.sql_models import PostgresMovie
            from sqlalchemy import select
            async for session in get_db():
                stmt = select(PostgresMovie).where(PostgresMovie.tmdb_id.in_(tmdb_ids))
                result = await session.execute(stmt)
                return [{
                    "tmdb_id": m.tmdb_id,
                    "title": m.title,
                    "overview": m.overview,
                    "year": int(m.release_date[:4]) if m.release_date and len(m.release_date) >= 4 else None,
                    "release_date": m.release_date,
                    "language": m.language or "en",
                    "genres": m.genres or [],
                    "rating": m.tmdb_rating or 0.0,
                    "votes": m.tmdb_votes or 0,
                    "popularity_score": m.popularity_score or 0.0,
                    "poster_url": m.poster_url,
                    "backdrop_url": m.backdrop_url,
                    "platforms": m.platforms or [],
                    "media_type": "movie",
                } for m in result.scalars().all()]
        except Exception as exc:
            logger.warning(f"PostgreSQL query failed, falling back to in-memory DB: {exc}")

    # Fallback to in-memory database
    from database import movies_collection
    movies = list(movies_collection.find({"tmdb_id": {"$in": tmdb_ids}}, {"_id": 0}))
    return movies


@router.get("/user/{user_id}")
async def get_user_recommendations(
    request: Request,
    user_id: int,
    top_k: int = Query(20, ge=1, le=50),
):
    """
    Get personalized recommendations using the Hybrid ML model.
    Checks Redis cache first before running the deep learning pipeline.
    """
    cache_key = f"recs:{user_id}:{top_k}"
    cache = getattr(request.app.state, "redis", None)

    # 1. Check Cache
    if cache:
        try:
            cached_result = await cache.get(cache_key)
            if cached_result:
                return json.loads(cached_result)
        except Exception:
            pass

    # 2. Get user watch history from database
    user_history = []
    try:
        from database import watch_history_collection
        history_docs = list(watch_history_collection.find({"user_id": str(user_id)}))
        user_history = [doc.get("movie_id") for doc in history_docs if doc.get("movie_id")]
    except Exception:
        pass

    # 3. Generate Recommendations using hybrid pipeline
    all_candidates = []
    try:
        from database import movies_collection
        all_candidates = [m.get("tmdb_id") for m in movies_collection.find({}, {"tmdb_id": 1, "_id": 0}).limit(500)]
    except Exception:
        pass

    rec_pairs = recommender.recommend(user_id=user_id, watch_history=user_history, all_candidate_ids=all_candidates, top_k=top_k)

    if not rec_pairs:
        # Fallback: use the existing recommendation engine
        fallback = await hybrid_recommendation(user_id=str(user_id), limit=top_k)
        if fallback:
            rec_pairs = [(m.get("tmdb_id"), m.get("rec_score", 0.5)) for m in fallback]

    if not rec_pairs:
        # Final fallback: popularity baseline
        from utils.recommendation_engine import get_popularity_baseline
        fallback = await get_popularity_baseline(limit=top_k)
        rec_pairs = [(m.get("tmdb_id"), 0.5) for m in fallback]

    # 4. Fetch enriched metadata
    rec_ids = [r[0] for r in rec_pairs if r[0] is not None]
    score_map = {r[0]: r[1] for r in rec_pairs}

    movies = await _fetch_movies_from_db(rec_ids)
    movie_map = {m.get("tmdb_id"): m for m in movies}

    final_recs = []
    for tmdb_id in rec_ids:
        m = movie_map.get(tmdb_id)
        if m:
            rec = dict(m)
            rec["score"] = score_map.get(tmdb_id, 0.0)
            rec["sources"] = []
            final_recs.append(rec)

    # 5. Set Cache (10 mins TTL)
    if cache and final_recs:
        try:
            await cache.setex(cache_key, 600, json.dumps(final_recs, default=str))
        except Exception:
            pass

    return {
        "movie_id": str(user_id),
        "recommendations": final_recs,
    }


@router.get("/{movie_id}")
async def get_movie_recommendations(
    movie_id: str,
    top_k: int = Query(10, ge=1, le=50),
):
    """
    Get hybrid or content-based recommendations for a specific movie.
    Used for the 'Similar Movies' or 'Recommendations' section.
    """
    try:
        from utils.recommendation_engine import hybrid_recommendation
        recs = await hybrid_recommendation(movie_id=str(movie_id), limit=top_k)
        return {
            "movie_id": str(movie_id),
            "recommendations": recs
        }
    except Exception as e:
        logger.error(f"Failed to generate recommendations for movie {movie_id}: {e}")
        from utils.recommendation_engine import get_popularity_baseline
        fallback = await get_popularity_baseline(limit=top_k)
        return {
            "movie_id": str(movie_id),
            "recommendations": fallback
        }

