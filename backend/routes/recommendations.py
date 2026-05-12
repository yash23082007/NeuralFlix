import json
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from db.connection import get_db
from models.sql_models import PostgresMovie
from models.schemas import RecommendationResponse, RecommendationBase
from ml.hybrid_recommender import HybridRecommender, content_engine, ncf_model, sasrec_model, gnn_model

router = APIRouter()

# Instantiate the hybrid recommender singleton
recommender = HybridRecommender(content_engine, ncf_model, sasrec_model, gnn_model)

@router.get("/user/{user_id}", response_model=RecommendationResponse)
async def get_user_recommendations(
    request: Request,
    user_id: int, 
    top_k: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """
    Get personalized recommendations using the Hybrid ML model.
    Checks Redis cache first before running the deep learning pipeline.
    """
    cache_key = f"recs:{user_id}:{top_k}"
    cache = request.app.state.cache
    
    # 1. Check Cache
    if cache:
        cached_result = await cache.get(cache_key)
        if cached_result:
            return {
                "movie_id": str(user_id),
                "recommendations": json.loads(cached_result)
            }
    
    # 2. Get user watch history from database (Stub: Requires watch event logic)
    # user_history = await get_watch_history(user_id, db)
    # Using an empty list as fallback which triggers "cold start" in the engine
    user_history = [] 
    
    # 3. Generate Recommendations
    rec_pairs = recommender.recommend(user_id=user_id, watch_history=user_history, top_k=top_k)
    # rec_pairs is a list of tuples: [(tmdb_id, score), ...]
    
    if not rec_pairs:
        # Fallback to mostly popular items
        stmt = select(PostgresMovie).order_by(PostgresMovie.popularity_score.desc()).limit(top_k)
        result = await db.execute(stmt)
        fallback_movies = result.scalars().all()
        rec_pairs = [(m.tmdb_id, 0.5) for m in fallback_movies]
    
    # 4. Fetch the enriched metadata from PostgreSQL
    rec_ids = [r[0] for r in rec_pairs]
    score_map = {r[0]: r[1] for r in rec_pairs}
    
    stmt = select(PostgresMovie).where(PostgresMovie.tmdb_id.in_(rec_ids))
    result = await db.execute(stmt)
    movies = result.scalars().all()
    
    # Keep ordering from the engine
    movie_map = {m.tmdb_id: m for m in movies}
    
    final_recs = []
    for tmdb_id in rec_ids:
        m = movie_map.get(tmdb_id)
        if m:
            final_recs.append({
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
                "score": score_map.get(tmdb_id, 0.0),
                "sources": []
            })
            
    # 5. Set Cache (e.g. 10 mins TTL)
    if cache and final_recs:
        await cache.setex(cache_key, 600, json.dumps(final_recs))
        
    return {
        "movie_id": str(user_id),
        "recommendations": final_recs
    }
