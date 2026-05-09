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
    print("Surprise library not available.")

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

class RecommenderOS:
    """
    Production-grade Recommender OS (V6.0). 
    Separates Candidate Generation (Recall) from Ranking (Scoring).
    """

    @classmethod
    async def recall(cls, movie_id: str = None, user_id: str = None, limit: int = 100) -> List[dict]:
        """Candidate Generation: High-recall, low-precision set of potential items."""
        tasks = []
        
        # 1. Collaborative Recall
        if user_id:
            tasks.append(get_collaborative_recommendations(user_id, limit=limit // 2))
        
        # 2. Content-Based Recall
        if movie_id:
            tasks.append(get_content_based_recommendations(movie_id, limit=limit // 2))
            tasks.append(get_neural_recommendations(movie_id, limit=limit // 2))
        
        # 3. Global Popularity (Safety Net)
        tasks.append(get_popularity_baseline(limit=limit // 3))

        results = await asyncio.gather(*tasks)
        
        # Flatten and deduplicate
        candidates = []
        seen_ids = set()
        for res_list in results:
            if not res_list: continue
            for item in res_list:
                item_id = str(item.get("tmdb_id") or item.get("_id"))
                if item_id and item_id not in seen_ids:
                    candidates.append(item)
                    seen_ids.add(item_id)
        
        return candidates

    @classmethod
    async def rank(cls, candidates: List[dict], user_id: Optional[str], movie_id: Optional[str]) -> List[dict]:
        """Ranking Stage: Score the recall set for specific user-item relevance."""
        # In a real environment, this would call a Cross-Encoder or XGBoost model.
        # Here we use a Weighted Multi-Heuristic Scorer.
        ranked = []
        for item in candidates:
            score = 0.0
            
            # Feature A: Popularity (Log normalized)
            pop = item.get("popularity_score", 0)
            score += np.log1p(pop) * 0.1
            
            # Feature B: Rating
            rating = item.get("rating", 0)
            score += (rating / 10.0) * 0.5
            
            # Feature C: Recency
            year = item.get("year")
            if year:
                recency_bonus = max(0, (year - 1980) / 45) * 0.2
                score += recency_bonus

            item["rec_score"] = round(score, 4)
            ranked.append(item)

        # Sort by final score
        ranked.sort(key=lambda x: x["rec_score"], reverse=True)
        return ranked

    @classmethod
    def apply_diversity(cls, results: List[dict], limit: int) -> List[dict]:
        """MMR-lite: Ensure genre diversity in the top N."""
        if not results: return []
        
        selected = []
        selected_genres = set()
        
        for item in results:
            if len(selected) >= limit: break
            
            item_genres = set(item.get("genres", []))
            # If 50% of genres already seen, penalize slightly (diversity check)
            overlap = item_genres.intersection(selected_genres)
            if len(overlap) > (len(item_genres) / 2) and len(selected) > 3:
                continue # Skip for now to favor different genre
            
            selected.append(item)
            selected_genres.update(item_genres)
            
        # If we didn't fill the limit due to diversity being too aggressive, fill it up
        if len(selected) < limit:
            selected_ids = {str(i.get("tmdb_id")) for i in selected}
            for item in results:
                if str(item.get("tmdb_id")) not in selected_ids:
                    selected.append(item)
                    if len(selected) >= limit: break
                    
        return selected

async def hybrid_recommendation(movie_id: str = None, user_id: str = None, limit: int = 10, media_type: str = "movie") -> List[dict]:
    """Unified entrypoint for V6.0 Multi-Stage Recommendation Engine."""
    
    # 1. Cache Check
    cache_key = f"recs:v6:u-{user_id}:m-{movie_id}"
    if redis_client:
        try:
            cached = redis_client.get(cache_key)
            if cached: return json.loads(cached)
        except Exception: pass

    # 2. Recall (Candidate Generation)
    candidates = await RecommenderOS.recall(movie_id, user_id, limit=limit*5)
    
    # 3. Ranking
    ranked = await RecommenderOS.rank(candidates, user_id, movie_id)
    
    # 4. Filter & Diversity
    final = RecommenderOS.apply_diversity(ranked, limit)

    # 5. Telemetry & Feature Logging
    if user_id and movie_id:
        log_features(user_id, movie_id, {"candidates_count": len(candidates), "top_score": final[0]["rec_score"] if final else 0})

    # 6. Set Cache (5 min)
    if redis_client:
        try:
            redis_client.setex(cache_key, 300, json.dumps(final, default=str))
        except Exception: pass

    return final
