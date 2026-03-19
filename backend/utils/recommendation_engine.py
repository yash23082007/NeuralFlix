import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from database import movies_collection, watch_history_collection, SessionLocal
from typing import List
import numpy as np
import redis
import json
import os
from sqlalchemy import text

# PHASE 4: Added "Real-Time Feel" Caching via Redis
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
try:
    redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
except Exception:
    redis_client = None

# Try importing surprise for Collaborative Filtering
try:
    from surprise import Dataset, Reader, SVD
    SURPRISE_AVAILABLE = True
except ImportError:
    SURPRISE_AVAILABLE = False
    print("⚠️ Surprise library not available. Collaborative filtering will use simple fallback.")

def get_popularity_baseline(limit: int = 10) -> List[dict]:
    """
    Returns the top trending movies based on the pre-calculated popularity_score.
    Used for the Cold Start problem.
    """
    movies = list(movies_collection.find({}, {"_id": 0}).sort("popularity_score", -1).limit(limit))
    return movies

def get_content_based_recommendations(movie_id: str, limit: int = 10) -> List[dict]:
    """
    Uses NLP (TfidfVectorizer + Cosine Similarity) on movie descriptions (overview/tagline) to find similar content.
    """
    # Fetch all movies to build the vector space.
    all_movies = list(movies_collection.find({}, {"_id": 1, "genres": 1, "title": 1, "poster_url": 1, "overview": 1, "tagline": 1, "rating": 1, "year": 1}))
    
    if not all_movies:
        return []

    df = pd.DataFrame(all_movies)
    
    # Check if target movie exists
    if not df[df['_id'] == movie_id].empty:
        target_idx = df[df['_id'] == movie_id].index[0]
    else:
        return []

    # Fill NaN values to avoid issues
    df['overview'] = df['overview'].fillna('')
    df['tagline'] = df['tagline'].fillna('')
    df['genre_tags'] = df['genres'].apply(lambda x: ' '.join(x) if isinstance(x, list) else '')
    
    # Combine text data for advanced TF-IDF analysis
    df['combined_features'] = df['genre_tags'] + " " + df['tagline'] + " " + df['overview']
    
    tfidf = TfidfVectorizer(stop_words='english')
    tfidf_matrix = tfidf.fit_transform(df['combined_features'])
    
    # Calculate similarity score for the target movie against all others
    cosine_sim = cosine_similarity(tfidf_matrix[target_idx], tfidf_matrix)
    scores = list(enumerate(cosine_sim[0]))
    
    # Sort on similarity (descending), skip the first one since it's the movie itself
    sorted_scores = sorted(scores, key=lambda x: x[1], reverse=True)[1:limit+1]
    
    recommended_indices = [i[0] for i in sorted_scores]
    
    # Return matched movies
    recommendations = df.iloc[recommended_indices].drop(columns=['genre_tags', 'combined_features']).to_dict('records')
    return recommendations


def get_collaborative_recommendations(user_id: str, limit: int = 10) -> List[dict]:
    """
    Finds users with similar taste based on watch history and tracking events.
    Uses Surprise library (SVD) if available, falling back to simple heuristic.
    """
    # 1. Fetch user interaction data from PostgreSQL if configured, otherwise MongoDB
    user_interactions = []
    if SessionLocal:
        try:
            with SessionLocal() as db:
                result = db.execute(text("SELECT user_id, event_type, item_id FROM tracking_events"))
                # Convert rows to dict
                user_interactions = [dict(row._mapping) for row in result]
        except Exception as e:
            print(f"PostgreSQL fetch error (tracking_events table might not exist yet): {e}")
            
    # For a unified view, let's also pull from the old watch_history in MongoDB
    history_docs = list(watch_history_collection.find({}))
    
    if not history_docs and not user_interactions:
        return []

    # Prepare DataFrame for mapping: user_id, movie_id, rating
    df_data = []
    
    for doc in history_docs:
        df_data.append({
            "user": doc.get("user_id"),
            "item": doc.get("movie_id"),
            "rating": doc.get("rating", 3.0)  # assume 3.0 if implicitly watched
        })
        
    for interaction in user_interactions:
        if interaction.get("item_id"):
            weight = 1.0
            if interaction.get("event_type") == "watch": weight = 5.0
            elif interaction.get("event_type") == "click": weight = 2.0
            
            df_data.append({
                "user": interaction.get("user_id"),
                "item": interaction.get("item_id"),
                "rating": weight
            })
            
    if not df_data:
        return []
        
    df = pd.DataFrame(df_data)
    # Aggregate duplicate interactions taking the max rating
    df = df.groupby(["user", "item"])["rating"].max().reset_index()

    watched_by_user = set(df[df['user'] == user_id]['item'].tolist())

    if SURPRISE_AVAILABLE and len(df) > 10:
        # Use Surprise Collaborative Filtering
        reader = Reader(rating_scale=(1.0, 5.0))
        data = Dataset.load_from_df(df[['user', 'item', 'rating']], reader)
        trainset = data.build_full_trainset()
        
        # Train SVD Algorithm
        algo = SVD()
        algo.fit(trainset)
        
        # Get all unique items
        all_items = df['item'].unique()
        predictions = []
        for item in all_items:
            if item not in watched_by_user:
                predictions.append((item, algo.predict(user_id, item).est))
                
        # Sort by predicted rating
        predictions.sort(key=lambda x: x[1], reverse=True)
        recommended_ids = [pred[0] for pred in predictions[:limit]]
        
    else:
        # Fallback (Simple Co-occurrence fallback)
        other_users = df[df['item'].isin(watched_by_user)]['user'].unique()
        similar_items = df[(df['user'].isin(other_users)) & (~df['item'].isin(watched_by_user))]
        item_scores = similar_items.groupby('item')['rating'].sum().reset_index()
        item_scores = item_scores.sort_values(by='rating', ascending=False)
        recommended_ids = item_scores.head(limit)['item'].tolist()
    
    if not recommended_ids:
        return []
        
    movies = list(movies_collection.find({"_id": {"$in": recommended_ids}}, {"_id": 0}))
    return movies

def hybrid_recommendation(movie_id: str = None, user_id: str = None, limit: int = 10) -> List[dict]:
    """
    Combines Popularity, Content-Based, and Collaborative Filtering depending on constraints.
    """
    # 1. Attempt Cache Retrieval for Real-Time feel
    cache_key = f"recs:u-{user_id}:m-{movie_id}"
    if redis_client:
        try:
            cached_data = redis_client.get(cache_key)
            if cached_data:
                print(f"⚡ Serving recommendations from Redis Cache for {cache_key}")
                return json.loads(cached_data)
        except Exception as e:
            print(f"Redis cache error: {e}")

    recommendations = []
    
    if user_id:
        cf_recs = get_collaborative_recommendations(user_id, limit=limit//2)
        recommendations.extend(cf_recs)
        
    if movie_id:
        cb_recs = get_content_based_recommendations(movie_id, limit=limit//2)
        # Avoid duplicates
        existing_ids = {r.get('id', r.get('_id')) for r in recommendations}
        for rec in cb_recs:
            if rec.get('_id') not in existing_ids:
                recommendations.append(rec)
                
    if len(recommendations) < limit:
        # Fallback to popularity to fill the remaining slots
        pop_recs = get_popularity_baseline(limit=limit - len(recommendations))
        existing_ids = {r.get('id', r.get('_id')) for r in recommendations}
        for rec in pop_recs:
            if rec.get('_id') not in existing_ids:
                recommendations.append(rec)
                
    final_recs = recommendations[:limit]

    # 2. Store in Redis Cache (expires in 5 minutes)
    if redis_client:
        try:
            # We must serialize custom objects like ObjectId if pymongo brings them in, 
            # assuming dict is json serializable here based on current structure.
            # Simplified cache setting:
            json_recs = json.loads(json.dumps(final_recs, default=str)) 
            redis_client.setex(cache_key, 300, json.dumps(json_recs))
        except Exception as e:
            pass

    return final_recs
