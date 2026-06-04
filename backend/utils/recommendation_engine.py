import asyncio
import json
import logging
import math
import os
from typing import Dict, List, Optional

from database import movies_collection, watch_history_collection, SessionLocal

logger = logging.getLogger("API_MONITOR")

async def get_redis_client():
    try:
        from cache.redis_client import get_redis
        return await get_redis()
    except Exception:
        return None


async def get_popularity_baseline(limit: int = 10) -> List[dict]:
    cursor = movies_collection.find({}, {"_id": 0}).sort("popularity_score", -1).limit(limit)
    return await cursor.to_list(length=None)


async def get_content_based_recommendations(movie_id: str, limit: int = 10) -> List[dict]:
    from ml.content_based import content_engine
    
    try:
        tmdb_id = int(movie_id) if str(movie_id).isdigit() else movie_id
    except ValueError:
        tmdb_id = movie_id
        
    similar_ids = content_engine.get_similar(tmdb_id, top_k=limit)
    if not similar_ids:
        return []
        
    # Fetch from database
    cursor = movies_collection.find({"tmdb_id": {"$in": similar_ids}}, {"_id": 0})
    movies = await cursor.to_list(length=None)
    
    # Sort them in the order of similar_ids
    movie_map = {m.get("tmdb_id"): m for m in movies}
    results = []
    for idx, sid in enumerate(similar_ids):
        m = movie_map.get(sid)
        if m:
            d = dict(m)
            d["rec_score"] = round(1.0 / (idx + 1), 4)
            results.append(d)
    return results


async def get_neural_recommendations(movie_id: str, limit: int = 10) -> List[dict]:
    if os.getenv("NEURALFLIX_DEMO_MODE", "true").lower() == "true" or not SessionLocal:
        return []

    def _fetch_neural():
        try:
            from models.sql_models import PostgresMovie
            with SessionLocal() as db:
                source = db.query(PostgresMovie).filter(
                    (PostgresMovie.tmdb_id == (int(movie_id) if str(movie_id).isdigit() else -1)) |
                    (PostgresMovie.imdb_id == str(movie_id))
                ).first()
                if not source or source.embedding is None:
                    return []
                similar = db.query(PostgresMovie).filter(
                    PostgresMovie.id != source.id
                ).order_by(
                    PostgresMovie.embedding.l2_distance(source.embedding)
                ).limit(limit).all()
                return [{"tmdb_id": m.tmdb_id, "title": m.title, "overview": m.overview,
                         "poster_url": m.poster_url, "rating": m.tmdb_rating,
                         "year": m.release_date[:4] if m.release_date else None} for m in similar]
        except Exception:
            return []

    return await asyncio.to_thread(_fetch_neural)


import time

_SVD_MODEL = None
_SVD_TRAINED_AT = 0.0
SVD_TTL = 3600  # Retrain hourly

def _get_svd_model(df):
    global _SVD_MODEL, _SVD_TRAINED_AT
    now = time.time()
    if _SVD_MODEL is None or (now - _SVD_TRAINED_AT) > SVD_TTL:
        from surprise import Dataset, Reader, SVD
        reader = Reader(rating_scale=(1.0, 10.0))
        data = Dataset.load_from_df(df[['user', 'item', 'rating']], reader)
        _SVD_MODEL = SVD(n_factors=100, n_epochs=20, lr_all=0.005, reg_all=0.02)
        _SVD_MODEL.fit(data.build_full_trainset())
        _SVD_TRAINED_AT = now
    return _SVD_MODEL

async def get_collaborative_recommendations(user_id: str, limit: int = 10) -> List[dict]:
    # 1. Fetch from MongoDB watch history asynchronously (optimized query sizing)
    user_history = await watch_history_collection.find(
        {"user_id": user_id},
        {"user_id": 1, "movie_id": 1, "rating": 1}
    ).limit(200).to_list(length=None)
    
    recent_history = await watch_history_collection.find(
        {"user_id": {"$ne": user_id}},
        {"user_id": 1, "movie_id": 1, "rating": 1}
    ).sort("_id", -1).limit(2000).to_list(length=None)
    
    history_docs = user_history + recent_history
    
    # 2. Run dataframe & surprise logic on a separate thread to avoid blocking FastAPI
    def _cf_logic(history_docs):
        from sqlalchemy import text
        import pandas as pd

        user_interactions = []
        if SessionLocal:
            try:
                with SessionLocal() as db:
                    result = db.execute(text("SELECT user_id, event_type, item_id FROM tracking_events"))
                    user_interactions = [dict(r._mapping) for r in result]
            except Exception:
                pass

        if not history_docs and not user_interactions:
            return []

        df_data = []
        for doc in history_docs:
            df_data.append({"user": doc.get("user_id"), "item": doc.get("movie_id"), "rating": doc.get("rating", 3.0)})
        for interaction in user_interactions:
            if interaction.get("item_id"):
                weight = 5.0 if interaction.get("event_type") == "watch" else 2.0 if interaction.get("event_type") == "click" else 1.0
                df_data.append({"user": interaction.get("user_id"), "item": interaction.get("item_id"), "rating": weight})

        if not df_data:
            return []

        df = pd.DataFrame(df_data)
        df = df.groupby(["user", "item"])["rating"].max().reset_index()
        watched_by_user = set(df[df['user'] == user_id]['item'].tolist())

        recommended_ids = []
        try:
            if len(df) > 10:
                algo = _get_svd_model(df)
                all_items = df['item'].unique()
                preds = [(item, algo.predict(user_id, item).est) for item in all_items if item not in watched_by_user]
                preds.sort(key=lambda x: x[1], reverse=True)
                recommended_ids = [p[0] for p in preds[:limit]]
        except Exception:
            pass

        if not recommended_ids:
            other_users = df[df['item'].isin(watched_by_user)]['user'].unique()
            similar_items = df[(df['user'].isin(other_users)) & (~df['item'].isin(watched_by_user))]
            item_scores = similar_items.groupby('item')['rating'].sum().sort_values(ascending=False)
            recommended_ids = item_scores.head(limit).index.tolist()

        return recommended_ids

    recommended_ids = await asyncio.to_thread(_cf_logic, history_docs)
    if not recommended_ids:
        return []
        
    cursor = movies_collection.find({"_id": {"$in": [str(rid) for rid in recommended_ids]}}, {"_id": 0})
    return await cursor.to_list(length=None)


class RecommenderOS:
    @classmethod
    async def recall(cls, movie_id: str = None, user_id: str = None, limit: int = 100) -> List[dict]:
        tasks = []
        if user_id:
            tasks.append(get_collaborative_recommendations(user_id, limit=limit // 2))
        if movie_id:
            tasks.append(get_content_based_recommendations(movie_id, limit=limit // 2))
            tasks.append(get_neural_recommendations(movie_id, limit=limit // 2))
        tasks.append(get_popularity_baseline(limit=limit // 3))
        tasks.append(cls._get_trakt_signal(limit=limit // 4))

        results = await asyncio.gather(*tasks)
        candidates, seen_ids = [], set()
        for res_list in results:
            if not res_list:
                continue
            for item in res_list:
                item_id = str(item.get("tmdb_id") or item.get("_id"))
                if movie_id and item_id == str(movie_id):
                    continue
                if item_id and item_id not in seen_ids:
                    candidates.append(item)
                    seen_ids.add(item_id)
        return candidates

    @classmethod
    async def _get_trakt_signal(cls, limit: int = 25) -> List[dict]:
        """Pull trending data from Trakt.tv as a community-sourced signal."""
        try:
            from utils.trakt_enhanced import fetch_trakt_trending
            trakt_trending = await fetch_trakt_trending("movies", limit=limit)
            if not trakt_trending:
                return []

            result = []
            for item in trakt_trending:
                tmdb_id = item.get("tmdb_id")
                if tmdb_id:
                    local = await movies_collection.find_one({"tmdb_id": tmdb_id}, {"_id": 0})
                    if local:
                        local["trakt_watchers"] = item.get("trakt_watchers", 0)
                        result.append(local)
                    else:
                        result.append({
                            "tmdb_id": tmdb_id,
                            "title": item.get("title", ""),
                            "year": item.get("year"),
                            "rating": item.get("rating", 0),
                            "genres": item.get("genres", []),
                            "overview": item.get("overview", ""),
                            "trakt_watchers": item.get("trakt_watchers", 0),
                            "popularity_score": item.get("trakt_watchers", 0) / 10,
                        })
            return result
        except Exception:
            return []

    @classmethod
    async def rank(cls, candidates: List[dict], user_id: Optional[str], movie_id: Optional[str]) -> List[dict]:
        ranked = []
        for item in candidates:
            score = 0.0
            score += math.log1p(item.get("popularity_score", 0)) * 0.1
            score += (item.get("rating", 0) / 10.0) * 0.5
            year = item.get("year")
            if year:
                score += max(0, (year - 1980) / 45) * 0.2
            trakt_watchers = item.get("trakt_watchers", 0)
            if trakt_watchers > 0:
                score += math.log1p(trakt_watchers) * 0.15
            item["rec_score"] = round(score, 4)
            ranked.append(item)
        ranked.sort(key=lambda x: x["rec_score"], reverse=True)
        return ranked

    @classmethod
    def apply_diversity(cls, results: List[dict], limit: int) -> List[dict]:
        if not results:
            return []
        selected, selected_genres = [], set()
        for item in results:
            if len(selected) >= limit:
                break
            item_genres = set(item.get("genres", []))
            overlap = item_genres.intersection(selected_genres)
            if len(overlap) > (len(item_genres) / 2) and len(selected) > 3:
                continue
            selected.append(item)
            selected_genres.update(item_genres)
        if len(selected) < limit:
            selected_ids = {str(i.get("tmdb_id")) for i in selected}
            for item in results:
                if str(item.get("tmdb_id")) not in selected_ids:
                    selected.append(item)
                    if len(selected) >= limit:
                        break
        return selected


async def hybrid_recommendation(movie_id: str = None, user_id: str = None, limit: int = 10, media_type: str = "movie") -> List[dict]:
    cache_key = f"recs:v6:u-{user_id}:m-{movie_id}"
    redis_client = await get_redis_client()
    if redis_client:
        try:
            cached = await redis_client.get(cache_key)
            if cached:
                return json.loads(cached)
        except Exception:
            pass

    candidates = await RecommenderOS.recall(movie_id, user_id, limit=limit * 5)
    ranked = await RecommenderOS.rank(candidates, user_id, movie_id)
    final = RecommenderOS.apply_diversity(ranked, limit)

    if user_id and movie_id and final:
        logger.info(f"[FEATURE_STORE] User: {user_id}, Item: {movie_id}, Candidates: {len(candidates)}, Top: {final[0]['rec_score']}")

    if redis_client:
        try:
            await redis_client.setex(cache_key, 300, json.dumps(final, default=str))
        except Exception:
            pass

    return final
