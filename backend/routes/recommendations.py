import asyncio
import json
import os
import logging
from fastapi import APIRouter, HTTPException, Query, Request, Path
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

    # Fallback to in-memory database (async Motor)
    from database import movies_collection
    cursor = movies_collection.find({"tmdb_id": {"$in": tmdb_ids}}, {"_id": 0})
    return await cursor.to_list(length=None)


@router.get("/user/{user_id}")
async def get_user_recommendations(
    request: Request,
    user_id: int = Path(..., ge=1, le=100000),
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

    # 2. Get user watch history from database asynchronously
    user_history = []
    try:
        from database import watch_history_collection
        history_docs = await watch_history_collection.find({"user_id": str(user_id)}).to_list(length=None)
        # Clamp context window to the last 50 items for sequential models
        user_history = [doc.get("movie_id") for doc in history_docs if doc.get("movie_id")][-50:]
    except Exception:
        pass

    # 3. Safe User ID clamping
    safe_user_id = user_id
    if ncf_model and hasattr(ncf_model, "user_gmf_emb"):
        safe_user_id = min(user_id, ncf_model.user_gmf_emb.num_embeddings - 1)

    # 4. Candidate Pool retrieval (cached for 60s to prevent serial DB hits)
    all_candidates = []
    candidates_cache_key = "candidate_pool_ids"
    if cache:
        try:
            cached_pool = await cache.get(candidates_cache_key)
            if cached_pool:
                all_candidates = json.loads(cached_pool)
        except Exception:
            pass

    if not all_candidates:
        try:
            from database import movies_collection
            cursor = movies_collection.find({}, {"tmdb_id": 1, "_id": 0}).limit(150)
            candidate_docs = await cursor.to_list(length=None)
            all_candidates = [m.get("tmdb_id") for m in candidate_docs if m.get("tmdb_id") is not None]
            if cache and all_candidates:
                await cache.setex(candidates_cache_key, 60, json.dumps(all_candidates))
        except Exception:
            pass

    # 5. Generate recommendations
    rec_pairs = []
    is_cold_start = not user_history

    if is_cold_start:
        # Resolve Taste Onboarding Profile for cold start users
        try:
            from database import users_collection, movies_collection
            user_doc = await users_collection.find_one({"id": f"usr{user_id}"})
            if not user_doc:
                user_doc = await users_collection.find_one({"id": str(user_id)})
            
            pref_genres = user_doc.get("pref_genres") if user_doc else None
            if pref_genres:
                cursor = movies_collection.find({"genres": {"$in": pref_genres}}, {"_id": 0}).sort("popularity_score", -1).limit(100)
                candidates = await cursor.to_list(length=None)
                if not candidates:
                    cursor = movies_collection.find({}, {"_id": 0}).sort("popularity_score", -1).limit(100)
                    candidates = await cursor.to_list(length=None)
                
                from ml.cold_start import build_onboarding_profile, score_cold_start_candidates
                profile = build_onboarding_profile([{"genres": pref_genres, "rating": 7.5}])
                scored_candidates = score_cold_start_candidates(candidates, profile)
                rec_pairs = [(m.get("tmdb_id"), m.get("_cold_start_score", 0.5)) for m in scored_candidates[:top_k]]
        except Exception as exc:
            logger.error(f"Failed to fetch onboarding profile for cold start user {user_id}: {exc}")

    if not rec_pairs:
        # Run hybrid pipeline recommendation (CPU-bound, wrap in to_thread)
        def _run_recommender():
            return recommender.recommend(
                user_id=safe_user_id,
                watch_history=user_history,
                all_candidate_ids=all_candidates,
                top_k=top_k
            )
        rec_pairs = await asyncio.to_thread(_run_recommender)

    if not rec_pairs:
        # Fallback: hybrid baseline
        fallback = await hybrid_recommendation(user_id=str(user_id), limit=top_k)
        if fallback:
            rec_pairs = [(m.get("tmdb_id"), m.get("rec_score", 0.5)) for m in fallback]

    if not rec_pairs:
        # Final fallback: popularity baseline
        from utils.recommendation_engine import get_popularity_baseline
        fallback = await get_popularity_baseline(limit=top_k)
        rec_pairs = [(m.get("tmdb_id"), 0.5) for m in fallback]

    # 6. Fetch enriched metadata
    rec_ids = [r[0] for r in rec_pairs if r[0] is not None]
    score_map = {r[0]: r[1] for r in rec_pairs}

    movies = await _fetch_movies_from_db(rec_ids)
    
    # Enrich and align score mapping
    for m in movies:
        m["score"] = score_map.get(m.get("tmdb_id"), 0.0)

    # 7. Pipeline Reranking: Ensemble Ranker, Diversity filter, and Exploration Bandit
    # Stage 1: Ensemble Ranker (if available)
    try:
        from ml.ranker import MovieRanker
        ranker = MovieRanker(model_path="models/ranker_model.txt")
        user_features = {"preferred_genres": [], "preferred_decades": [], "avg_rating": 7.0}
        if not is_cold_start:
            from ml.taste_profile import build_taste_profile
            # Simple metadata mockup
            profile = build_taste_profile([{
                "title": m.get("title"),
                "genres": m.get("genres"),
                "release_year": m.get("year"),
                "language": m.get("language"),
                "rating": m.get("rating"),
                "director": m.get("director")
            } for m in movies])
            user_features = {
                "preferred_genres": profile.get("top_genres", []),
                "preferred_decades": [int(d) for d, _ in profile.get("preferred_decades", []) if str(d).isdigit()],
                "avg_rating": profile.get("rating_threshold", 7.0)
            }
        movies = ranker.rank(movies, user_features)
    except Exception as e:
        logger.warning(f"Skipping ranker pipeline: {e}")

    # Stage 2: Genre diversity clustering
    try:
        from ml.diversity import ensure_diversity
        movies = ensure_diversity(movies, n_clusters=min(5, len(movies)))
    except Exception as e:
        logger.warning(f"Skipping diversity pipeline: {e}")

    # Stage 3: Thompson sampling exploration bandit
    try:
        from ml.exploration_bandit import ThompsonSamplingBandit
        from utils.recommendation_engine import get_popularity_baseline
        bandit = ThompsonSamplingBandit(epsilon=0.15)
        # Fetch fresh popular content as exploration items
        explore_pool = await get_popularity_baseline(limit=top_k)
        movies = bandit.recommend_with_exploration(
            exploit_candidates=movies,
            explore_candidates=explore_pool,
            top_k=top_k
        )
    except Exception as e:
        logger.warning(f"Skipping bandit pipeline: {e}")

    # Final map output format
    final_recs = []
    for m in movies:
        rec = dict(m)
        rec["score"] = m.get("score") or m.get("rec_score") or 0.5
        rec["sources"] = []
        final_recs.append(rec)

    # 8. Set Cache (10 mins TTL)
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
