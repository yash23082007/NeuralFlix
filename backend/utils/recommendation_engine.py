import pandas as pd
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from database import movies_collection, watch_history_collection
from typing import List

def get_popularity_baseline(limit: int = 10) -> List[dict]:
    """
    Returns the top trending movies based on the pre-calculated popularity_score.
    Used for the Cold Start problem.
    """
    movies = list(movies_collection.find({}, {"_id": 0}).sort("popularity_score", -1).limit(limit))
    return movies

def get_content_based_recommendations(movie_id: str, limit: int = 10) -> List[dict]:
    """
    Uses NLP (CountVectorizer + Cosine Similarity) on movie genres to find similar content.
    """
    # Fetch all movies to build the vector space.
    # In a production environment with 100k records, this would be periodically pre-computed
    # and stored in a similarity matrix, or we'd use Annoy/FAISS.
    all_movies = list(movies_collection.find({}, {"_id": 1, "genres": 1, "title": 1, "poster_url": 1, "overview": 1, "rating": 1, "year": 1}))
    
    if not all_movies:
        return []

    df = pd.DataFrame(all_movies)
    
    # Check if target movie exists
    if not df[df['_id'] == movie_id].empty:
        target_idx = df[df['_id'] == movie_id].index[0]
    else:
        return []

    # Map genres to space-separated strings for CountVectorizer
    df['genre_tags'] = df['genres'].apply(lambda x: ' '.join(x) if isinstance(x, list) else '')
    
    cv = CountVectorizer()
    count_matrix = cv.fit_transform(df['genre_tags'])
    
    # Calculate similarity score for the target movie against all others
    cosine_sim = cosine_similarity(count_matrix[target_idx], count_matrix)
    scores = list(enumerate(cosine_sim[0]))
    
    # Sort on similarity (descending), skip the first one since it's the movie itself
    sorted_scores = sorted(scores, key=lambda x: x[1], reverse=True)[1:limit+1]
    
    recommended_indices = [i[0] for i in sorted_scores]
    
    # Return matched movies
    recommendations = df.iloc[recommended_indices].drop(columns=['genre_tags']).to_dict('records')
    return recommendations


def get_collaborative_recommendations(user_id: str, limit: int = 10) -> List[dict]:
    """
    Finds users with similar taste based on watch history and returns movies they highly rated.
    """
    # 1. Get current user's history
    user_history = list(watch_history_collection.find({"user_id": user_id}))
    if not user_history:
        return []
    
    user_movie_ids = [h["movie_id"] for h in user_history if h.get("rating", 0) >= 3.5]
    
    # 2. Find other users who watched the same highly rated movies
    similar_users_pipeline = [
        {"$match": {"movie_id": {"$in": user_movie_ids}, "user_id": {"$ne": user_id}, "rating": {"$gte": 3.5}}},
        {"$group": {"_id": "$user_id", "overlap_count": {"$sum": 1}}},
        {"$sort": {"overlap_count": -1}},
        {"$limit": 5} # Top 5 similar users
    ]
    
    similar_users = list(watch_history_collection.aggregate(similar_users_pipeline))
    if not similar_users:
        return []
        
    similar_user_ids = [u["_id"] for u in similar_users]
    
    # 3. Get highly rated movies from those similar users that the current user hasn't seen
    all_user_watched = [h["movie_id"] for h in user_history]
    
    recommendation_pipeline = [
        {"$match": {
            "user_id": {"$in": similar_user_ids},
            "movie_id": {"$nin": all_user_watched},
            "rating": {"$gte": 4.0}
        }},
        {"$group": {"_id": "$movie_id", "score": {"$avg": "$rating"}}},
        {"$sort": {"score": -1}},
        {"$limit": limit}
    ]
    
    recommended_movies = list(watch_history_collection.aggregate(recommendation_pipeline))
    
    if not recommended_movies:
        return []
        
    recommended_ids = [r["_id"] for r in recommended_movies]
    
    # 4. Fetch the full movie details from the database
    movies = list(movies_collection.find({"_id": {"$in": recommended_ids}}, {"_id": 0}))
    return movies

def hybrid_recommendation(movie_id: str = None, user_id: str = None, limit: int = 10) -> List[dict]:
    """
    Combines Popularity, Content-Based, and Collaborative Filtering depending on constraints.
    """
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
                
    return recommendations[:limit]
