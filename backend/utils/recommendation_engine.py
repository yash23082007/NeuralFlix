import asyncio
from collections import Counter
import json
import logging
import math
import os
import re
import time
from typing import Dict, List, Optional
import redis

from database import movies_collection, watch_history_collection, SessionLocal

logger = logging.getLogger("API_MONITOR")

REDIS_URL = None if os.getenv("NEURALFLIX_DEMO_MODE", "true").lower() == "true" else os.getenv("REDIS_URL")
redis_client = None
if REDIS_URL:
    try:
        redis_client = redis.Redis.from_url(
            REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=0.15,
            socket_timeout=0.15,
            retry_on_timeout=False,
        )
    except Exception:
        redis_client = None

# ─── TF-IDF Cache ─────────────────────────────────────
_tfidf_cache = {}
_tfidf_cache_time = 0
_TFIDF_TTL = 300

def _tokenize_movie(movie: dict) -> List[str]:
    genres = " ".join(movie.get("genres", []) or [])
    text = " ".join([
        str(movie.get("title", "")),
        str(movie.get("overview", "")),
        str(movie.get("tagline", "")),
        genres,
        str(movie.get("cinema_region", "")),
        str(movie.get("language", "")),
    ])
    return re.findall(r"[a-z0-9]+", text.lower())


def _build_tfidf_matrix():
    global _tfidf_cache, _tfidf_cache_time
    now = time.time()
    if _tfidf_cache and now - _tfidf_cache_time < _TFIDF_TTL:
        return _tfidf_cache

    all_movies = list(movies_collection.find({}, {
        "_id": 1, "genres": 1, "title": 1, "poster_url": 1,
        "overview": 1, "tagline": 1, "tmdb_id": 1, "rating": 1,
        "year": 1, "popularity_score": 1, "language": 1, "cinema_region": 1,
        "backdrop_url": 1, "platforms": 1, "media_type": 1,
    }))
    if not all_movies:
        _tfidf_cache = ([], [], {})
        return _tfidf_cache

    token_counts = [Counter(_tokenize_movie(movie)) for movie in all_movies]
    document_frequency = Counter()
    for counts in token_counts:
        document_frequency.update(counts.keys())

    total_docs = len(all_movies)
    vectors: List[Dict[str, float]] = []
    for counts in token_counts:
        vector = {}
        for token, count in counts.items():
            tf = 1.0 + math.log(count)
            idf = 1.0 + math.log((total_docs + 1) / (document_frequency[token] + 1))
            vector[token] = tf * idf
        norm = math.sqrt(sum(value * value for value in vector.values())) or 1.0
        vectors.append({token: value / norm for token, value in vector.items()})

    id_map = {}
    for idx, movie in enumerate(all_movies):
        if movie.get("_id") is not None:
            id_map[str(movie["_id"])] = idx
        if movie.get("tmdb_id") is not None:
            id_map[str(movie["tmdb_id"])] = idx

    _tfidf_cache = (all_movies, vectors, id_map)
    _tfidf_cache_time = now
    return _tfidf_cache


async def get_popularity_baseline(limit: int = 10) -> List[dict]:
    def _fetch():
        return list(movies_collection.find({}, {"_id": 0}).sort("popularity_score", -1).limit(limit))
    return await asyncio.to_thread(_fetch)


async def get_content_based_recommendations(movie_id: str, limit: int = 10) -> List[dict]:
    def _local_tfidf():
        movies, vectors, id_map = _build_tfidf_matrix()
        if not movies or movie_id not in id_map:
            return []
        target_idx = id_map[movie_id]
        target_vector = vectors[target_idx]
        scores = []
        for idx, vector in enumerate(vectors):
            if idx == target_idx:
                continue
            score = sum(weight * vector.get(token, 0.0) for token, weight in target_vector.items())
            scores.append((idx, score))

        sorted_scores = sorted(scores, key=lambda x: x[1], reverse=True)
        results = []
        for idx, score in sorted_scores[:limit]:
            d = dict(movies[idx])
            d["rec_score"] = round(float(score), 4)
            d.pop("_id", None)
            results.append(d)
        return results

    return await asyncio.to_thread(_local_tfidf)


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


async def get_collaborative_recommendations(user_id: str, limit: int = 10) -> List[dict]:
    def _cf_logic():
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

        history_docs = list(watch_history_collection.find({}))
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
            from surprise import Dataset, Reader, SVD
            if len(df) > 10:
                reader = Reader(rating_scale=(1.0, 5.0))
                data = Dataset.load_from_df(df[['user', 'item', 'rating']], reader)
                algo = SVD()
                algo.fit(data.build_full_trainset())
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

        if not recommended_ids:
            return []
        return list(movies_collection.find({"_id": {"$in": recommended_ids}}, {"_id": 0}))

    return await asyncio.to_thread(_cf_logic)


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
    async def rank(cls, candidates: List[dict], user_id: Optional[str], movie_id: Optional[str]) -> List[dict]:
        ranked = []
        for item in candidates:
            score = 0.0
            score += math.log1p(item.get("popularity_score", 0)) * 0.1
            score += (item.get("rating", 0) / 10.0) * 0.5
            year = item.get("year")
            if year:
                score += max(0, (year - 1980) / 45) * 0.2
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
    if redis_client:
        try:
            cached = redis_client.get(cache_key)
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
            redis_client.setex(cache_key, 300, json.dumps(final, default=str))
        except Exception:
            pass

    return final
