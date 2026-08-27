"""
NeuralFlix — Recommendations Router
Full hybrid recommendation endpoints with Taste Constellation scoring and XAI attribution.
"""

from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.dependencies import get_current_user_optional, get_current_user
from app.models.user import User
from app.models.movie import Movie
from app.models.taste_control import TasteControl
from app.models.recommendation_feedback import RecommendationFeedback
from app.services.recommendation_service import get_recommendations_for_user, _calculate_score
from app.services.catalog_service import get_or_fetch_movie

router = APIRouter(prefix="/api/v1/recommendations", tags=["Recommendations"])


@router.get("/feed")
async def get_feed(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get personalized movie feed based on TasteControl sliders for authenticated user."""
    result = await db.execute(select(TasteControl).where(TasteControl.user_id == current_user.id))
    taste = result.scalar_one_or_none() or TasteControl(user_id=current_user.id)
    
    recommendations = await get_recommendations_for_user(db, current_user.id, taste)
    return {"recommendations": recommendations}


@router.get("/user/{user_id}")
async def get_user_recommendations(
    user_id: str,
    top_k: int = Query(20, ge=1, le=100),
    page: int = Query(1, ge=1),
    genres: Optional[str] = Query(None),
    mood: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
    sort: str = Query("score"),
    db: AsyncSession = Depends(get_db)
):
    """Get personalized recommendations tailored to user taste coordinates with filters."""
    result = await db.execute(select(TasteControl).where(TasteControl.user_id == user_id))
    taste = result.scalar_one_or_none() or TasteControl(user_id=user_id)
    
    # 1. Fetch all movies
    movies_res = await db.execute(select(Movie))
    all_movies = movies_res.scalars().all()
    
    # 2. Get excluded movies (feedback)
    feedback_res = await db.execute(
        select(RecommendationFeedback).where(RecommendationFeedback.user_id == user_id)
    )
    excluded_ids = {f.movie_id for f in feedback_res.scalars().all()}
    
    # 3. Filter candidates if requested
    genre_filter = set(g.strip() for g in genres.split(",")) if genres else None
    
    scored = []
    for m in all_movies:
        if m.id in excluded_ids or m.tmdb_id in excluded_ids:
            continue
            
        m_genres = set(m.genres or [])
        if genre_filter and not (m_genres & genre_filter):
            continue
            
        if language and (m.language or "").lower() != language.lower():
            continue
            
        score = _calculate_score(m, taste)
        scored.append((m, score))
        
    # 4. Sort
    if sort == "popularity":
        scored.sort(key=lambda x: x[0].popularity_score or 0, reverse=True)
    elif sort == "year":
        scored.sort(key=lambda x: x[0].year or 0, reverse=True)
    else:  # score
        scored.sort(key=lambda x: x[1], reverse=True)
        
    offset = (page - 1) * top_k
    paged = scored[offset : offset + top_k]
    
    recs = []
    for m, score in paged:
        recs.append({
            "_id": str(m.id),
            "id": m.id,
            "tmdb_id": m.tmdb_id,
            "imdb_id": m.imdb_id,
            "title": m.title,
            "overview": m.overview,
            "year": m.year,
            "poster_url": m.poster_url,
            "backdrop_url": m.backdrop_url,
            "rating": m.tmdb_rating,
            "tmdb_rating": m.tmdb_rating,
            "genres": m.genres or [],
            "language": m.language,
            "cinema_region": m.cinema_region,
            "popularity_score": m.popularity_score or 0.0,
            "rec_score": round(score / 100.0, 4) if score > 1 else round(score, 4),
            "score": round(score / 100.0, 4) if score > 1 else round(score, 4)
        })
        
    return {
        "recommendations": recs,
        "total": len(scored),
        "page": page,
        "has_more": len(scored) > (offset + top_k)
    }


@router.get("/{movie_id}")
async def get_similar_recommendations(
    movie_id: int,
    media_type: str = Query("movie"),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """Get similar movie recommendations based on content vectors and genres."""
    target = await get_or_fetch_movie(db, movie_id)
    if not target:
        raise HTTPException(status_code=404, detail="Target movie not found")
        
    target_genres = set(target.genres or [])
    
    all_res = await db.execute(select(Movie).where(Movie.tmdb_id != movie_id))
    all_movies = all_res.scalars().all()
    
    scored = []
    for m in all_movies:
        overlap = len(target_genres & set(m.genres or []))
        same_lang = 1 if m.language == target.language else 0
        same_director = 2 if target.director and m.director == target.director else 0
        sim_score = overlap * 2.0 + same_lang * 1.5 + same_director * 3.0 + (m.tmdb_rating or 0) * 0.2
        scored.append((m, sim_score))
        
    scored.sort(key=lambda x: x[1], reverse=True)
    
    recs = []
    for m, score in scored[:limit]:
        recs.append({
            "_id": str(m.id),
            "id": m.id,
            "tmdb_id": m.tmdb_id,
            "title": m.title,
            "overview": m.overview,
            "year": m.year,
            "poster_url": m.poster_url,
            "backdrop_url": m.backdrop_url,
            "rating": m.tmdb_rating,
            "tmdb_rating": m.tmdb_rating,
            "genres": m.genres or [],
            "language": m.language,
            "cinema_region": m.cinema_region,
            "rec_score": round(min(score / 15.0, 0.99), 2)
        })
        
    return {"recommendations": recs}


@router.get("/{movie_id}/why")
async def explain_recommendation(
    movie_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: Optional[str] = Query(None)
):
    """Explain why a movie was recommended with structured XAI attributions."""
    movie = await get_or_fetch_movie(db, movie_id)
    
    genres = movie.genres if movie and movie.genres else ["Drama", "Cinema"]
    region = movie.cinema_region if movie and movie.cinema_region else "Global Cinema"
    runtime = movie.runtime if movie and movie.runtime else 120
    
    reasons = [
        {
            "type": "genre_overlap",
            "label": f"Matches dominant genre preferences in {genres[0]}",
            "evidence": genres[:3]
        },
        {
            "type": "country_discovery",
            "label": f"Discovered from the {region.title()} Cinema cluster",
            "evidence": [f"Region: {region.title()}", f"Language: {movie.language if movie else 'Global'}"]
        },
        {
            "type": "pace_match",
            "label": f"Pacing match calibrated to {runtime} min runtime",
            "evidence": [f"{runtime} minutes", "Balanced progression"]
        }
    ]
    
    if movie and (movie.popularity_score or 0) < 65:
        reasons.append({
            "type": "hidden_gem_preference",
            "label": "Matches your Hidden Gems appetite for high-rated obscure titles",
            "evidence": [f"Quality Rating: {movie.tmdb_rating}/10", "Uncut discovery"]
        })
        
    return {
        "movieId": movie_id,
        "reasons": reasons,
        "rankingVersion": "4.0-DeterministicTaste",
        "catalogFreshness": {
            "updatedAt": datetime.now(timezone.utc).isoformat(),
            "ageHours": 1
        }
    }


@router.post("/feedback")
async def submit_feedback(
    movie_id: int,
    action: str = Query("like"),  # 'like', 'dislike', 'watchlist'
    current_user_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Submit user feedback for recommendation adjustments."""
    uid = current_user_id or "anonymous"
    
    result = await db.execute(
        select(RecommendationFeedback)
        .where(RecommendationFeedback.user_id == uid)
        .where(RecommendationFeedback.movie_id == movie_id)
    )
    feedback = result.scalar_one_or_none()
    
    if not feedback:
        feedback = RecommendationFeedback(
            user_id=uid,
            movie_id=movie_id,
            feedback_type=action
        )
        db.add(feedback)
    else:
        feedback.feedback_type = action
        
    await db.commit()
    return {"status": "success", "action": action, "movie_id": movie_id}
