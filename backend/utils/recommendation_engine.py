import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from database import movies_collection, watch_history_collection, SessionLocal
from typing import List, Optional
import numpy as np
import redis
import json
import os
import asyncio
from sqlalchemy import text
from models.sql_models import PostgresMovie
import httpx
import logging

try:
    from utils.vector_engine import generate_query_embedding
    HAS_VECTOR_ENGINE = True
except ImportError:
    HAS_VECTOR_ENGINE = False
    print("⚠️ Vector engine not available. Neural recommendations disabled.")

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")
try:
    redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
except Exception:
    redis_client = None

try:
    from surprise import Dataset, Reader, SVD
    SURPRISE_AVAILABLE = True
except ImportError:
    SURPRISE_AVAILABLE = False
    print("⚠️ Surprise library not available.")

ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", "http://localhost:8001")
logger = logging.getLogger("API_MONITOR")

def log_features(user_id: str, movie_id: str, context: dict):
    """Stub for MLFeatureStore logging."""
    logger.info(f"[FEATURE_STORE] Logged interaction - User: {user_id}, Item: {movie_id}, Context: {context}")

def apply_mmr(recommendations: List[dict], limit: int) -> List[dict]:
    """
    Maximal Marginal Relevance (MMR) stub.
    In a full ML pipeline, this would penalize recommendations too similar to ones already in the selected set
    to increase overall diversity.
    """
    if len(recommendations) <= limit:
        return recommendations
    logger.info("Applying MMR diversity pass to recommendations")
    # For now, just return top N, but logic goes here
    return recommendations[:limit]

async def get_popularity_baseline(limit: int = 10) -> List[dict]:
    """Returns top trending movies async via thread."""
    def _fetch():
        return list(movies_collection.find({}, {"_id": 0}).sort("popularity_score", -1).limit(limit))
    return await asyncio.to_thread(_fetch)

async def get_content_based_recommendations(movie_id: str, limit: int = 10) -> List[dict]:
    def _fetch_target():
        return movies_collection.find_one({"_id": movie_id})
    target_movie = await asyncio.to_thread(_fetch_target)
    
    if not target_movie or not target_movie.get("overview"):
        return []

    # 1. ML Microservice Async Call
    try:
        query = target_movie.get("overview", "") + " " + target_movie.get("tagline", "")
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{ML_SERVICE_URL}/recommend/rank",
                json={"query": query},
                timeout=8.0
            )
        if response.status_code == 200:
            data = response.json()
            ranked_movies = data.get("ranked_results", [])
            filtered = [m for m in ranked_movies if str(m.get("_id")) != str(movie_id)]
            if filtered:
                return filtered[:limit]
    except Exception as e:
        logger.warning(f"ML Service unreachable, using local TF-IDF: {e}")

    # 2. Local Fallback TF-IDF
    def _local_tfidf():
        all_movies = list(movies_collection.find({}, {"_id": 1, "genres": 1, "title": 1, "poster_url": 1, "overview": 1, "tagline": 1}))
        if not all_movies: return []
        df = pd.DataFrame(all_movies)
        if df[df['_id'] == movie_id].empty: return []
        target_idx = df[df['_id'] == movie_id].index[0]
        
        df['overview'] = df['overview'].fillna('')
        df['tagline'] = df['tagline'].fillna('')
        df['genre_tags'] = df['genres'].apply(lambda x: ' '.join(x) if isinstance(x, list) else '')
        df['combined_features'] = df['genre_tags'] + " " + df['tagline'] + " " + df['overview']
        
        tfidf = TfidfVectorizer(stop_words='english')
        tfidf_matrix = tfidf.fit_transform(df['combined_features'])
        cosine_sim = cosine_similarity(tfidf_matrix[target_idx], tfidf_matrix)
        scores = list(enumerate(cosine_sim[0]))
        sorted_scores = sorted(scores, key=lambda x: x[1], reverse=True)[1:limit+1]
        recommended_indices = [i[0] for i in sorted_scores]
        return df.iloc[recommended_indices].drop(columns=['genre_tags', 'combined_features']).to_dict('records')
    
    return await asyncio.to_thread(_local_tfidf)

async def get_neural_recommendations(movie_id: str, limit: int = 10) -> List[dict]:
    if not SessionLocal: return []
    def _fetch_neural():
        try:
            with SessionLocal() as db:
                source_movie = db.query(PostgresMovie).filter(
                    (PostgresMovie.tmdb_id == (int(movie_id) if str(movie_id).isdigit() else -1)) |
                    (PostgresMovie.imdb_id == str(movie_id))
                ).first()
                if not source_movie or source_movie.embedding is None: return []
                similar_movies = db.query(PostgresMovie).filter(PostgresMovie.id != source_movie.id).order_by(PostgresMovie.embedding.l2_distance(source_movie.embedding)).limit(limit).all()
                results = []
                for m in similar_movies:
                    results.append({
                        "_id": str(m.id), "tmdb_id": m.tmdb_id, "title": m.title,
                        "overview": m.overview, "poster_url": m.poster_url,
                        "rating": m.tmdb_rating, "year": m.release_date[:4] if m.release_date else None
                    })
                return results
        except Exception: return []
    return await asyncio.to_thread(_fetch_neural)

async def get_collaborative_recommendations(user_id: str, limit: int = 10) -> List[dict]:
    def _cf_logic():
        user_interactions = []
        if SessionLocal:
            try:
                with SessionLocal() as db:
                    result = db.execute(text("SELECT user_id, event_type, item_id FROM tracking_events"))
                    user_interactions = [dict(row._mapping) for row in result]
            except Exception: pass
                
        history_docs = list(watch_history_collection.find({}))
        if not history_docs and not user_interactions: return []

        df_data = []
        for doc in history_docs:
            df_data.append({"user": doc.get("user_id"), "item": doc.get("movie_id"), "rating": doc.get("rating", 3.0)})
            
        for interaction in user_interactions:
            if interaction.get("item_id"):
                weight = 1.0
                if interaction.get("event_type") == "watch": weight = 5.0
                elif interaction.get("event_type") == "click": weight = 2.0
                df_data.append({"user": interaction.get("user_id"), "item": interaction.get("item_id"), "rating": weight})
                
        if not df_data: return []
            
        df = pd.DataFrame(df_data)
        df = df.groupby(["user", "item"])["rating"].max().reset_index()
        watched_by_user = set(df[df['user'] == user_id]['item'].tolist())

        if SURPRISE_AVAILABLE and len(df) > 10:
            reader = Reader(rating_scale=(1.0, 5.0))
            data = Dataset.load_from_df(df[['user', 'item', 'rating']], reader)
            trainset = data.build_full_trainset()
            algo = SVD()
            algo.fit(trainset)
            all_items = df['item'].unique()
            predictions = []
            for item in all_items:
                if item not in watched_by_user:
                    predictions.append((item, algo.predict(user_id, item).est))
            predictions.sort(key=lambda x: x[1], reverse=True)
            recommended_ids = [pred[0] for pred in predictions[:limit]]
        else:
            other_users = df[df['item'].isin(watched_by_user)]['user'].unique()
            similar_items = df[(df['user'].isin(other_users)) & (~df['item'].isin(watched_by_user))]
            item_scores = similar_items.groupby('item')['rating'].sum().reset_index()
            item_scores = item_scores.sort_values(by='rating', ascending=False)
            recommended_ids = item_scores.head(limit)['item'].tolist()
        
        if not recommended_ids: return []
        return list(movies_collection.find({"_id": {"$in": recommended_ids}}, {"_id": 0}))
    
    return await asyncio.to_thread(_cf_logic)

async def hybrid_recommendation(movie_id: str = None, user_id: str = None, limit: int = 10, media_type: str = "movie") -> List[dict]:
    cache_key = f"recs:u-{user_id}:m-{movie_id}:t-{media_type}"
    if redis_client:
        try:
            cached_data = redis_client.get(cache_key)
            if cached_data:
                return json.loads(cached_data)
        except Exception: pass

    recommendations = []
    
    # Run CF and CB concurrently if both are available
    tasks = []
    if user_id:
        tasks.append(get_collaborative_recommendations(user_id, limit=limit//2))
    else:
        tasks.append(asyncio.sleep(0)) # placeholder
        
    if movie_id:
        tasks.append(get_content_based_recommendations(movie_id, limit=limit))
    else:
        tasks.append(asyncio.sleep(0))
        
    results = await asyncio.gather(*tasks)
    
    # Merge CF
    if user_id and results[0]:
        recommendations.extend(results[0])
        
    # Merge CB
    if movie_id and results[1]:
        existing_ids = {str(r.get('id', r.get('_id'))) for r in recommendations}
        for rec in results[1]:
            if str(rec.get('_id')) not in existing_ids:
                recommendations.append(rec)
                existing_ids.add(str(rec.get('_id')))
                
        if len(recommendations) < limit:
            from utils.tmdb_api import fetch_movie_recommendations, fetch_genre_list, _safe_get, get_headers, get_params
            from routes.movies import _normalize_tmdb
            live_recs = []
            
            if str(movie_id).isdigit():
                url = f"https://api.themoviedb.org/3/{media_type}/{movie_id}/similar"
                data = await asyncio.to_thread(_safe_get, url, headers=get_headers(), params=get_params({"language": "en-US"}))
                live_recs = data.get('results', []) if data else []

            if live_recs:
                g_map = await asyncio.to_thread(fetch_genre_list)
                for lr in live_recs:
                    normalized = _normalize_tmdb(lr, g_map)
                    normalized["media_type"] = media_type
                    if str(normalized['_id']) not in existing_ids:
                        recommendations.append(normalized)
                        existing_ids.add(str(normalized['_id']))
                        if len(recommendations) >= limit: break

    # Merge Neural
    if movie_id and len(recommendations) < limit:
        neural_recs = await get_neural_recommendations(movie_id, limit=limit)
        existing_ids = {str(r.get('id', r.get('_id', r.get('tmdb_id')))) for r in recommendations}
        for nr in neural_recs:
            if str(nr.get('tmdb_id')) not in existing_ids:
                recommendations.append(nr)
                existing_ids.add(str(nr.get('tmdb_id')))
                if len(recommendations) >= limit: break

    # Final Fallback to Popular
    if len(recommendations) < limit:
        pop_recs = await get_popularity_baseline(limit=limit)
        existing_ids = {str(r.get('id', r.get('_id', r.get('tmdb_id')))) for r in recommendations}
        for rec in pop_recs:
            rid = str(rec.get('tmdb_id', rec.get('_id')))
            if rid not in existing_ids:
                recommendations.append(rec)
                existing_ids.add(rid)
                if len(recommendations) >= limit: break
                
    # Apply MMR Diversity Filtering
    final_recs = apply_mmr(recommendations, limit)

    # Feature Logging
    if user_id and movie_id:
        log_features(user_id, movie_id, {"recs_generated": len(final_recs)})

    if redis_client:
        try:
            json_recs = json.loads(json.dumps(final_recs, default=str)) 
            redis_client.setex(cache_key, 300, json.dumps(json_recs))
        except Exception: pass

    return final_recs
