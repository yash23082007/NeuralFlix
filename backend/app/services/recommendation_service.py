"""
NeuralFlix — Recommendation Service

Deterministic scoring engine based on Taste Constellation.
No matrix factorization, no deep learning. 100% transparent scoring.
"""

from typing import List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.movie import Movie
from app.models.taste_control import TasteControl
from app.models.recommendation_feedback import RecommendationFeedback
from app.services.explanation_service import generate_explanation


async def get_recommendations_for_user(
    db: AsyncSession,
    user_id: str,
    taste: TasteControl,
    limit: int = 10
) -> List[dict]:
    """Get personalized recommendations based on TasteControl sliders."""
    
    # 1. Get all movies in DB
    result = await db.execute(select(Movie))
    all_movies = result.scalars().all()
    
    # 2. Get user feedback (to exclude "Not for me" movies)
    feedback_res = await db.execute(
        select(RecommendationFeedback).where(RecommendationFeedback.user_id == user_id)
    )
    excluded_movie_ids = {f.movie_id for f in feedback_res.scalars().all()}
    
    # 3. Score each movie deterministically
    scored_movies: List[Tuple[Movie, float]] = []
    
    for movie in all_movies:
        if movie.id in excluded_movie_ids:
            continue
            
        score = _calculate_score(movie, taste)
        scored_movies.append((movie, score))
        
    # 4. Sort and return top N
    scored_movies.sort(key=lambda x: x[1], reverse=True)
    top_movies = scored_movies[:limit]
    
    # 5. Format response with explanations
    response = []
    for movie, score in top_movies:
        explanation = generate_explanation(movie, taste, score)
        
        # Serialize with extra recommendation fields
        response.append({
            "tmdb_id": movie.tmdb_id,
            "title": movie.title,
            "year": movie.year,
            "poster_url": movie.poster_url,
            "backdrop_url": movie.backdrop_url,
            "rating": movie.tmdb_rating,
            "genres": movie.genres or [],
            "language": movie.language,
            "cinema_region": movie.cinema_region,
            "rec_score": round(score, 2),
            "explanation": explanation
        })
        
    return response


def _calculate_score(movie: Movie, taste: TasteControl) -> float:
    """
    Calculate deterministic match score (0-100) using sliders.
    
    Sliders (0-100):
    - discovery: familiar (0) vs adventurous (100)
    - global_taste: local (0) vs global (100)
    - challenge: light (0) vs challenging (100)
    - pace: slow (0) vs fast (100)
    - hidden_gems: popular (0) vs obscure (100)
    """
    score = 50.0  # Base score
    
    # Hidden Gems vs Popularity
    # movie.popularity_score is usually 0-100+
    pop = min(movie.popularity_score or 0, 100)
    if taste.hidden_gems > 60:
        # Penalize popular movies
        score += (100 - pop) * 0.2
    elif taste.hidden_gems < 40:
        # Reward popular movies
        score += pop * 0.2
        
    # Pace
    genres = set(movie.genres or [])
    if taste.pace > 60:
        if "Action" in genres or "Thriller" in genres:
            score += 15
        if "Drama" in genres:
            score -= 10
    elif taste.pace < 40:
        if "Drama" in genres or "Romance" in genres:
            score += 15
        if "Action" in genres:
            score -= 10
            
    # Global vs Local (assuming US/UK is "local" for simplicity)
    is_global = movie.cinema_region not in ["US", "UK", None]
    if taste.global_taste > 60 and is_global:
        score += 20
    elif taste.global_taste < 40 and not is_global:
        score += 20
        
    # Baseline quality
    rating = movie.tmdb_rating or 0
    score += rating * 2  # up to 20 points
    
    return min(max(score, 0), 100)
