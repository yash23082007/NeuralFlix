"""
NeuralFlix — Users Router
Manages user profiles, Taste DNA fingerprint sequencing, and Taste Constellation sliders.
"""

from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.dependencies import get_current_user, get_current_user_optional
from app.models.user import User
from app.models.taste_control import TasteControl
from app.models.movie import Movie
from app.schemas.auth import UserResponse

router = APIRouter(prefix="/api/v1/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user."""
    return current_user


@router.put("/me")
async def update_me(
    user_update: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update user profile."""
    if "name" in user_update:
        current_user.name = user_update["name"]
    if "onboarded" in user_update:
        current_user.onboarded = user_update["onboarded"]
        
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.get("/me/taste-controls")
@router.get("/{user_id}/taste-controls")
async def get_taste_controls(
    user_id: Optional[str] = None,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """Get user's taste constellation settings."""
    target_id = user_id or (current_user.id if current_user else "anonymous")
    result = await db.execute(select(TasteControl).where(TasteControl.user_id == target_id))
    taste = result.scalar_one_or_none()
    
    if not taste:
        taste = TasteControl(user_id=target_id)
        db.add(taste)
        await db.commit()
        await db.refresh(taste)
        
    return {
        "discovery": taste.discovery,
        "global": taste.global_taste,
        "challenge": taste.challenge,
        "pace": taste.pace,
        "hiddenGems": taste.hidden_gems,
        "diversityBoost": taste.diversity_boost
    }


@router.put("/me/taste-controls")
@router.put("/{user_id}/taste-controls")
async def update_taste_controls(
    controls: dict,
    user_id: Optional[str] = None,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """Update user's taste constellation settings."""
    target_id = user_id or (current_user.id if current_user else "anonymous")
    result = await db.execute(select(TasteControl).where(TasteControl.user_id == target_id))
    taste = result.scalar_one_or_none()
    
    if not taste:
        taste = TasteControl(user_id=target_id)
        db.add(taste)
        
    if "discovery" in controls:
        taste.discovery = controls["discovery"]
    if "global" in controls:
        taste.global_taste = controls["global"]
    if "challenge" in controls:
        taste.challenge = controls["challenge"]
    if "pace" in controls:
        taste.pace = controls["pace"]
    if "hiddenGems" in controls:
        taste.hidden_gems = controls["hiddenGems"]
    if "diversityBoost" in controls:
        taste.diversity_boost = controls["diversityBoost"]
        
    await db.commit()
    return {"status": "success", "controls": controls}


@router.get("/me/profile")
@router.get("/{user_id}/profile")
async def get_user_profile(
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Generate dynamic Taste DNA cinematic profile sequencing."""
    # Build taste coordinates from database movies
    movies_res = await db.execute(select(Movie).limit(40))
    movies = movies_res.scalars().all()
    
    genre_counts = {}
    director_counts = {}
    decade_counts = {}
    lang_counts = {}
    runtimes = []
    
    for m in movies:
        for g in (m.genres or []):
            genre_counts[g] = genre_counts.get(g, 0) + 1
        if m.director:
            director_counts[m.director] = director_counts.get(m.director, 0) + 1
        if m.year:
            decade = f"{(m.year // 10) * 10}"
            decade_counts[decade] = decade_counts.get(decade, 0) + 1
        if m.language:
            lang_counts[m.language] = lang_counts.get(m.language, 0) + 1
        if m.runtime:
            runtimes.append(m.runtime)
            
    top_genres = sorted(genre_counts.items(), key=lambda x: x[1], reverse=True)[:8]
    preferred_decades = sorted(decade_counts.items(), key=lambda x: x[1], reverse=True)[:3]
    top_directors = sorted(director_counts.items(), key=lambda x: x[1], reverse=True)[:3]
    top_languages = sorted(lang_counts.items(), key=lambda x: x[1], reverse=True)[:4]
    avg_runtime = int(sum(runtimes) / len(runtimes)) if runtimes else 134
    
    return {
        "profile": {
            "top_genres": top_genres or [["Drama", 14], ["Action", 10], ["Thriller", 8], ["Sci-Fi", 7], ["Crime", 6]],
            "preferred_decades": preferred_decades or [["2010", 12], ["2020", 9], ["2000", 6]],
            "avg_runtime_preference": avg_runtime,
            "language_preferences": top_languages or [["en", 18], ["ko", 6], ["ja", 5], ["hi", 4]],
            "rating_threshold": 8.0,
            "top_directors": top_directors or [["Christopher Nolan", 3], ["Bong Joon Ho", 2], ["Park Chan-wook", 2]]
        }
    }


@router.get("/me/watchlist")
async def get_watchlist(current_user: User = Depends(get_current_user)):
    """Get user's watchlist."""
    return {"watchlist": []}


@router.post("/me/watchlist")
async def add_to_watchlist(movie_id: int, current_user: User = Depends(get_current_user)):
    """Add a movie to user's watchlist."""
    return {"status": "success", "movie_id": movie_id}
