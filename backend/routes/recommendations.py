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
    if os.getenv("NEURALFLIX_DEMO_MODE", "false").lower() != "true":
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


async def _get_candidate_pool(user_id: str, user_history: list, limit: int = 5000) -> list:
    """
    Stratified candidate sampling:
    - 40% popularity-weighted (top films the user hasn't seen)
    - 30% genre-matched to user taste
    - 20% recent releases (last 2 years)
    - 10% random exploration
    """
    from database import async_session_factory
    from db.models import Movie, User
    from sqlalchemy import select, func, or_, String
    
    watched_tmdb_ids = set(user_history)
    
    try:
        async with async_session_factory() as session:
            # Get user's preferred genres if any
            pref_genres = []
            user_stmt = select(User.pref_genres).where(User.id == f"usr{user_id}")
            user_res = await session.execute(user_stmt)
            pref_genres = user_res.scalar() or []
            if not pref_genres:
                user_stmt2 = select(User.pref_genres).where(User.id == str(user_id))
                user_res2 = await session.execute(user_stmt2)
                pref_genres = user_res2.scalar() or []
            
            # 1. Tier 1: Popular unwatched (40%)
            t1_limit = int(limit * 0.4)
            t1_stmt = select(Movie.tmdb_id).where(Movie.tmdb_id.notin_(watched_tmdb_ids) if watched_tmdb_ids else True)\
                .order_by(Movie.popularity_score.desc()).limit(t1_limit)
            t1_res = await session.execute(t1_stmt)
            popular_ids = [r[0] for r in t1_res.all() if r[0] is not None]
            
            # 2. Tier 2: Genre-matched (30%)
            t2_limit = int(limit * 0.3)
            genre_ids = []
            if pref_genres:
                conditions = []
                for genre in pref_genres:
                    conditions.append(Movie.genres.cast(String).ilike(f"%{genre}%"))
                if conditions:
                    t2_stmt = select(Movie.tmdb_id).where(
                        Movie.tmdb_id.notin_(watched_tmdb_ids) if watched_tmdb_ids else True,
                        or_(*conditions)
                    ).order_by(Movie.popularity_score.desc()).limit(t2_limit)
                    t2_res = await session.execute(t2_stmt)
                    genre_ids = [r[0] for r in t2_res.all() if r[0] is not None]
            
            # 3. Tier 3: Recent releases (20%)
            import datetime
            current_year = datetime.datetime.now().year
            cutoff_date = f"{current_year - 2}-01-01"
            t3_limit = int(limit * 0.2)
            t3_stmt = select(Movie.tmdb_id).where(
                Movie.tmdb_id.notin_(watched_tmdb_ids) if watched_tmdb_ids else True,
                Movie.release_date >= cutoff_date
            ).order_by(Movie.popularity_score.desc()).limit(t3_limit)
            t3_res = await session.execute(t3_stmt)
            recent_ids = [r[0] for r in t3_res.all() if r[0] is not None]
            
            # 4. Tier 4: Random exploration (10%)
            t4_limit = int(limit * 0.1)
            t4_stmt = select(Movie.tmdb_id).where(
                Movie.tmdb_id.notin_(watched_tmdb_ids) if watched_tmdb_ids else True
            ).order_by(func.random()).limit(t4_limit)
            t4_res = await session.execute(t4_stmt)
            random_ids = [r[0] for r in t4_res.all() if r[0] is not None]
            
            # Combine all and deduplicate while preserving order (popular first)
            seen = set()
            candidates = []
            for cid in (popular_ids + genre_ids + recent_ids + random_ids):
                if cid not in seen:
                    seen.add(cid)
                    candidates.append(cid)
                    
            return candidates[:limit]
    except Exception as exc:
        logger.error(f"Error in stratified candidate sampling: {exc}")
        # Fallback to simple query
        from database import movies_collection
        try:
            cursor = movies_collection.find({}, {"tmdb_id": 1, "_id": 0}).limit(limit)
            candidate_docs = await cursor.to_list(length=None)
            return [m.get("tmdb_id") for m in candidate_docs if m.get("tmdb_id") is not None]
        except Exception:
            return []

def _build_explanation(movie: dict, user_history: list, profile: dict) -> str:
    """Generate a human-readable explanation for why this movie was recommended."""
    if not user_history:
        return "New release you might enjoy"
        
    genres = set(movie.get("genres", []))
    top_genres_field = profile.get("top_genres", {})
    if isinstance(top_genres_field, dict):
        user_top_genres = set(top_genres_field.keys())
    elif isinstance(top_genres_field, list):
        user_top_genres = set()
        for item in top_genres_field:
            if isinstance(item, (tuple, list)):
                if len(item) > 0:
                    user_top_genres.add(item[0])
            elif isinstance(item, str):
                user_top_genres.add(item)
    else:
        user_top_genres = set()
        
    matching_genres = genres & user_top_genres
    
    top_directors = profile.get("top_directors", {})
    if isinstance(top_directors, list):
        top_directors_set = set(top_directors)
    elif isinstance(top_directors, dict):
        top_directors_set = set(top_directors.keys())
    else:
        top_directors_set = set()
        
    if movie.get("director") in top_directors_set:
        return f"You enjoy films by {movie['director']}"
        
    if matching_genres:
        return f"Matches your {', '.join(list(matching_genres)[:2])} preference"
        
    if movie.get("language"):
        lang_prefs = str(profile.get("language_preferences", ""))
        if movie["language"] in lang_prefs:
            return f"More {movie['language'].upper()} cinema"
            
    return "Popular with similar taste profiles"


@router.get("/user/{user_id}")
async def get_user_recommendations(
    request: Request,
    user_id: str = Path(...),
    top_k: int = Query(20, ge=1, le=50),
    genres: Optional[str] = Query(None),
    mood: Optional[str] = Query(None),
    sort: Optional[str] = Query("score"),
    language: Optional[str] = Query(None)
):
    """
    Get personalized recommendations using the Hybrid ML model.
    Checks Redis cache first before running the deep learning pipeline.
    """
    has_active_filters = bool(genres or mood or language or sort != "score")
    cache_key = f"recs:{user_id}:{top_k}:{genres}:{mood}:{language}:{sort}"
    cache = getattr(request.app.state, "redis", None)

    # 1. Check Cache
    if cache:
        try:
            cached_result = await cache.get(cache_key)
            if cached_result:
                return json.loads(cached_result)
        except Exception:
            pass

    # 2. Get user watch history from database asynchronously (mapping back to tmdb_ids)
    user_history = []
    try:
        from database import async_session_factory
        from db.models import WatchEvent, Movie
        from sqlalchemy import select
        async with async_session_factory() as session:
            stmt = select(Movie.tmdb_id).join(WatchEvent, WatchEvent.movie_id == Movie.id)\
                .where(WatchEvent.user_id == str(user_id))\
                .order_by(WatchEvent.timestamp.asc())\
                .limit(50)
            res = await session.execute(stmt)
            user_history = [r[0] for r in res.all() if r[0] is not None]
    except Exception as e:
        logger.error(f"Error fetching user watch history: {e}")

    # 3. Safe User ID clamping
    safe_user_id = 0
    if ncf_model and hasattr(ncf_model, "user_gmf_emb"):
        import hashlib
        if user_id.isdigit():
            safe_user_id = min(int(user_id), ncf_model.user_gmf_emb.num_embeddings - 1)
        else:
            h = hashlib.sha256(user_id.encode("utf-8")).hexdigest()
            safe_user_id = int(h, 16) % ncf_model.user_gmf_emb.num_embeddings

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
        all_candidates = await _get_candidate_pool(user_id, user_history, limit=5000)
        if cache and all_candidates:
            try:
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
    taste_profile = {}
    try:
        from ml.ranker import MovieRanker
        ranker = MovieRanker(model_path="models/ranker_model.txt")
        user_features = {"preferred_genres": [], "preferred_decades": [], "avg_rating": 7.0}
        if not is_cold_start and user_history:
            from ml.taste_profile import build_taste_profile
            history_movies = await _fetch_movies_from_db(user_history)
            taste_profile = build_taste_profile([{
                "title": m.get("title"),
                "genres": m.get("genres"),
                "release_year": m.get("year"),
                "runtime": m.get("runtime"),
                "language": m.get("language"),
                "rating": m.get("rating"),
                "director": m.get("director")
            } for m in history_movies])

            pref_genres = []
            top_genres_field = taste_profile.get("top_genres", {})
            if isinstance(top_genres_field, dict):
                pref_genres = list(top_genres_field.keys())
            elif isinstance(top_genres_field, list):
                for item in top_genres_field:
                    if isinstance(item, (tuple, list)):
                        if len(item) > 0:
                            pref_genres.append(item[0])
                    else:
                        pref_genres.append(item)

            pref_decades_list = []
            pref_decades = taste_profile.get("preferred_decades", {})
            if isinstance(pref_decades, dict):
                pref_decades_list = [int(d) for d in pref_decades.keys() if str(d).isdigit() or isinstance(d, int)]
            else:
                for item in pref_decades:
                    if isinstance(item, (tuple, list)):
                        d = item[0]
                    else:
                        d = item
                    if str(d).isdigit() or isinstance(d, int):
                        pref_decades_list.append(int(d))

            user_features = {
                "preferred_genres": pref_genres,
                "preferred_decades": pref_decades_list,
                "avg_rating": taste_profile.get("rating_threshold", 7.0)
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

    # Build User Taste Profile for explanations (reused cache or fallback if needed)
    if not taste_profile and not is_cold_start and user_history:
        try:
            from ml.taste_profile import build_taste_profile
            history_movies = await _fetch_movies_from_db(user_history)
            taste_profile = build_taste_profile([{
                "title": m.get("title"),
                "genres": m.get("genres"),
                "release_year": m.get("year"),
                "runtime": m.get("runtime"),
                "language": m.get("language"),
                "rating": m.get("rating"),
                "director": m.get("director")
            } for m in history_movies])
        except Exception as exc:
            logger.warning(f"Failed to build taste profile: {exc}")

    # Final map output format
    final_recs = []
    for m in movies:
        rec = dict(m)
        rec["score"] = m.get("score") or m.get("rec_score") or 0.5
        rec["sources"] = []
        rec["explanation"] = _build_explanation(rec, user_history, taste_profile)
        final_recs.append(rec)

    # Apply filters dynamically
    if genres:
        genre_list = [g.strip().lower() for g in genres.split(",")]
        final_recs = [r for r in final_recs if any(g.lower() in genre_list for g in r.get("genres", []))]
        
    if language:
        final_recs = [r for r in final_recs if r.get("language") == language]
        
    if mood:
        mood_genres = {
            "chill": ["comedy", "romance", "family"],
            "intense": ["thriller", "horror", "mystery", "crime"],
            "thoughtful": ["drama", "documentary", "history"],
            "exciting": ["action", "adventure", "science fiction", "sci-fi"],
            "romantic": ["romance", "drama"],
            "scary": ["horror", "thriller"]
        }.get(mood.lower(), [])
        if mood_genres:
            final_recs = [r for r in final_recs if any(g.lower() in mood_genres for g in r.get("genres", []))]
            
    if sort == "popularity":
        final_recs.sort(key=lambda x: x.get("popularity_score", 0.0), reverse=True)
    elif sort == "year":
        final_recs.sort(key=lambda x: x.get("year", 0) or 0, reverse=True)
    else:
        final_recs.sort(key=lambda x: x.get("score", 0.0), reverse=True)

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
