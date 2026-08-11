"""
NeuralFlix — Users Router
"""

from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.taste_control import TasteControl
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
async def get_taste_controls(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's taste constellation settings."""
    result = await db.execute(select(TasteControl).where(TasteControl.user_id == current_user.id))
    taste = result.scalar_one_or_none()
    
    if not taste:
        taste = TasteControl(user_id=current_user.id)
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
async def update_taste_controls(
    controls: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update user's taste constellation settings."""
    result = await db.execute(select(TasteControl).where(TasteControl.user_id == current_user.id))
    taste = result.scalar_one_or_none()
    
    if not taste:
        taste = TasteControl(user_id=current_user.id)
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
    return {"status": "success"}


@router.get("/me/watchlist")
async def get_watchlist(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Get user's watchlist."""
    from app.models.recommendation_feedback import WatchlistItem
    from app.models.movie import Movie
    
    result = await db.execute(
        select(Movie).join(WatchlistItem, WatchlistItem.movie_id == Movie.id)
        .where(WatchlistItem.user_id == current_user.id)
        .order_by(WatchlistItem.added_at.desc())
    )
    movies = result.scalars().all()
    
    return {"watchlist": movies}


@router.post("/me/watchlist")
async def add_to_watchlist(tmdb_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Add a movie to user's watchlist using TMDB ID."""
    from app.services.catalog_service import get_or_fetch_movie
    from app.models.recommendation_feedback import WatchlistItem
    
    movie = await get_or_fetch_movie(db, tmdb_id)
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
        
    result = await db.execute(
        select(WatchlistItem)
        .where(WatchlistItem.user_id == current_user.id)
        .where(WatchlistItem.movie_id == movie.id)
    )
    if result.scalar_one_or_none():
        return {"status": "success", "message": "Already in watchlist"}
        
    item = WatchlistItem(user_id=current_user.id, movie_id=movie.id)
    db.add(item)
    await db.commit()
    return {"status": "success"}

@router.delete("/me/watchlist/{tmdb_id}")
async def remove_from_watchlist(tmdb_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Remove a movie from user's watchlist."""
    from app.models.movie import Movie
    from app.models.recommendation_feedback import WatchlistItem
    
    result = await db.execute(select(Movie.id).where(Movie.tmdb_id == tmdb_id))
    movie_id = result.scalar_one_or_none()
    
    if not movie_id:
        return {"status": "success"}
        
    result = await db.execute(
        select(WatchlistItem)
        .where(WatchlistItem.user_id == current_user.id)
        .where(WatchlistItem.movie_id == movie_id)
    )
    item = result.scalar_one_or_none()
    if item:
        await db.delete(item)
        await db.commit()
        
    return {"status": "success"}
