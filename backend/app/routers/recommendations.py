"""
Movie Intelligence Platform — Recommendations Router
Hybrid recommendation endpoints with Taste Profile scoring and grounded XAI attributions.
"""

from typing import Any, Dict, List, Optional, Literal
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.dependencies import get_current_user_optional, get_current_user
from app.models.user import User
from app.models.movie import Movie
from app.models.taste_control import TasteControl
from app.models.recommendation_feedback import RecommendationFeedback
from app.services.recommendation_service import (
    get_recommendations_for_user,
    calculate_score_breakdown,
)
from app.services.explanation_service import generate_structured_explanation
from app.services.catalog_service import get_or_fetch_movie
from app.routers.movies import _format_movie

router = APIRouter(prefix="/api/v1/recommendations", tags=["Recommendations"])


@router.get("/popular")
async def get_popular(db: AsyncSession = Depends(get_db)):
    """Fallback endpoint for popular recommendations."""
    from app.routers.movies import get_trending
    return await get_trending(db)


@router.get("/feed")
async def get_feed(
    top_k: int = Query(20, ge=1, le=100),
    mode: str = Query("for_you"),
    genres: Optional[str] = Query(None),
    mood: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get personalized movie feed based on TasteControl sliders for authenticated user."""
    result = await db.execute(select(TasteControl).where(TasteControl.user_id == current_user.id))
    taste = result.scalar_one_or_none() or TasteControl(user_id=current_user.id)

    genre_list = [g.strip() for g in genres.split(",")] if genres else None
    recommendations = await get_recommendations_for_user(
        db,
        current_user.id,
        taste,
        limit=top_k,
        mode=mode,
        genres=genre_list,
        mood=mood,
        language=language
    )
    return {
        "recommendations": recommendations,
        "served_by": "deterministic-taste-v1",
        "mode": mode
    }


@router.get("/similar/{movie_id}")
@router.get("/{movie_id}")
async def get_similar_recommendations(
    movie_id: int,
    limit: int = Query(10, ge=1, le=50),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """Get similar movie recommendations based on genre, director, region, and taste."""
    target = await get_or_fetch_movie(db, movie_id)
    if not target:
        raise HTTPException(status_code=404, detail="Target movie not found")

    target_genres = set(target.genres or [])
    all_res = await db.execute(select(Movie).where(Movie.tmdb_id != movie_id))
    all_movies = all_res.scalars().all()

    taste = TasteControl(user_id="default")
    if current_user:
        t_res = await db.execute(select(TasteControl).where(TasteControl.user_id == current_user.id))
        taste = t_res.scalar_one_or_none() or taste

    scored = []
    for m in all_movies:
        overlap = len(target_genres & set(m.genres or []))
        same_lang = 1.5 if m.language == target.language else 0.0
        same_director = 3.0 if target.director and m.director == target.director else 0.0
        same_region = 1.5 if target.cinema_region and m.cinema_region == target.cinema_region else 0.0
        base_quality = (m.tmdb_rating or 7.0) * 0.2

        similarity = (overlap * 2.5) + same_lang + same_director + same_region + base_quality
        scored.append((m, similarity))

    scored.sort(key=lambda x: x[1], reverse=True)
    top_movies = scored[:limit]

    recs = []
    for m, sim_score in top_movies:
        f_movie = _format_movie(m)
        f_movie["rec_score"] = round(min(sim_score / 15.0, 0.99), 2)
        recs.append(f_movie)

    return {"recommendations": recs, "served_by": "content-similarity-v1"}


@router.get("/{movie_id}/why")
async def explain_recommendation(
    movie_id: int,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """Explain why a movie was recommended with structured mathematical XAI attributions."""
    movie = await get_or_fetch_movie(db, movie_id)
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    taste = TasteControl(user_id="default")
    if current_user:
        result = await db.execute(select(TasteControl).where(TasteControl.user_id == current_user.id))
        taste = result.scalar_one_or_none() or taste

    explanation_data = generate_structured_explanation(movie, taste)
    return explanation_data


@router.post("/feedback")
async def submit_feedback(
    movie_id: int = Query(...),
    action: Literal[
        "like", "dislike", "watchlist", "not_interested", "too_slow",
        "too_dark", "wrong_language", "not_my_genre", "already_watched",
        "not_available", "hide_similar"
    ] = Query("like"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Submit user feedback for recommendation calibration."""
    uid = current_user.id

    result = await db.execute(
        select(RecommendationFeedback)
        .where(RecommendationFeedback.user_id == uid)
        .where(RecommendationFeedback.movie_id == movie_id)
    )
    feedback = result.scalar_one_or_none()

    if not feedback:
        from app.config import get_settings
        settings = get_settings()
        feedback = RecommendationFeedback(
            user_id=uid,
            movie_id=movie_id,
            feedback_type=action,
            ranking_version=settings.ranker_id
        )
        db.add(feedback)
    else:
        feedback.feedback_type = action

    await db.commit()
    return {"status": "success", "action": action, "movie_id": movie_id}
