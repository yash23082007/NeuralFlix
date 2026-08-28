"""
NeuralFlix — Users Router
Manages user profiles, Taste DNA fingerprint sequencing, and Taste Constellation sliders.
"""

from typing import Any, Optional, Literal
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.dependencies import get_current_user, get_current_user_optional
from app.models.user import User
from app.models.taste_control import TasteControl
from app.models.movie import Movie
from app.models.recommendation_feedback import WatchlistItem, Rating
from app.models.watch_event import WatchEvent
from app.schemas.auth import UserResponse

router = APIRouter(prefix="/api/v1/users", tags=["Users"])

class UserUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=100)
    onboarded: Optional[bool] = None

class TasteControlsUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    discovery: Optional[int] = Field(default=None, ge=0, le=100)
    global_taste: Optional[int] = Field(default=None, alias="global", ge=0, le=100)
    challenge: Optional[int] = Field(default=None, ge=0, le=100)
    pace: Optional[int] = Field(default=None, ge=0, le=100)
    hidden_gems: Optional[int] = Field(default=None, alias="hiddenGems", ge=0, le=100)
    diversity_boost: Optional[bool] = Field(default=None, alias="diversityBoost")


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user."""
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_me(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update user profile."""
    if user_update.name is not None:
        current_user.name = user_update.name
    if user_update.onboarded is not None:
        current_user.onboarded = user_update.onboarded
        
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.get("/me/taste-controls")
async def get_taste_controls(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's taste constellation settings."""
    target_id = current_user.id
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
async def update_taste_controls(
    controls: TasteControlsUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update user's taste constellation settings."""
    target_id = current_user.id
    controls_data = controls.model_dump(by_alias=True, exclude_none=True)
    result = await db.execute(select(TasteControl).where(TasteControl.user_id == target_id))
    taste = result.scalar_one_or_none()
    
    if not taste:
        taste = TasteControl(user_id=target_id)
        db.add(taste)
        
    if "discovery" in controls_data:
        taste.discovery = controls_data["discovery"]
    if "global" in controls_data:
        taste.global_taste = controls_data["global"]
    if "challenge" in controls_data:
        taste.challenge = controls_data["challenge"]
    if "pace" in controls_data:
        taste.pace = controls_data["pace"]
    if "hiddenGems" in controls_data:
        taste.hidden_gems = controls_data["hiddenGems"]
    if "diversityBoost" in controls_data:
        taste.diversity_boost = controls_data["diversityBoost"]
        
    await db.commit()
    return {"status": "success", "controls": controls_data}


@router.get("/me/profile")
async def get_user_profile(
    current_user: User = Depends(get_current_user),
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
async def get_watchlist(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Get user's watchlist."""
    result = await db.execute(
        select(Movie).join(WatchlistItem, WatchlistItem.movie_id == Movie.id)
        .where(WatchlistItem.user_id == current_user.id)
        .order_by(WatchlistItem.added_at.desc())
    )
    return {"watchlist": result.scalars().all()}


@router.post("/me/watchlist")
async def add_to_watchlist(movie_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Add a movie to user's watchlist."""
    movie = await db.get(Movie, movie_id)
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    existing = await db.execute(select(WatchlistItem).where(
        WatchlistItem.user_id == current_user.id, WatchlistItem.movie_id == movie_id
    ))
    if not existing.scalar_one_or_none():
        db.add(WatchlistItem(user_id=current_user.id, movie_id=movie_id))
        await db.commit()
    return {"status": "success", "movie_id": movie_id}


@router.delete("/me/watchlist/{movie_id}")
async def remove_from_watchlist(movie_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WatchlistItem).where(
        WatchlistItem.user_id == current_user.id, WatchlistItem.movie_id == movie_id
    ))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Movie is not in your watchlist")
    await db.delete(item)
    await db.commit()
    return {"status": "success", "movie_id": movie_id}


@router.get("/me/history")
async def get_history(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Movie, WatchEvent).join(WatchEvent, WatchEvent.movie_id == Movie.id)
        .where(WatchEvent.user_id == current_user.id).order_by(WatchEvent.created_at.desc()))
    return {"history": [{"movie": movie, "watched_at": event.created_at, "completed": event.completed} for movie, event in result.all()]}


@router.get("/me/stats")
async def get_stats(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    watched = await db.execute(select(WatchEvent).where(WatchEvent.user_id == current_user.id))
    ratings = await db.execute(select(Rating).where(Rating.user_id == current_user.id))
    watchlist = await db.execute(select(WatchlistItem).where(WatchlistItem.user_id == current_user.id))
    watched_rows, rating_rows, watchlist_rows = watched.scalars().all(), ratings.scalars().all(), watchlist.scalars().all()
    return {"watched_count": len(watched_rows), "rated_count": len(rating_rows), "watchlist_count": len(watchlist_rows),
            "average_rating": round(sum(r.rating for r in rating_rows) / len(rating_rows), 2) if rating_rows else None}


@router.put("/me/ratings/{movie_id}")
async def rate_movie(movie_id: int, rating: float = Query(..., ge=0, le=5), current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not await db.get(Movie, movie_id):
        raise HTTPException(status_code=404, detail="Movie not found")
    result = await db.execute(select(Rating).where(Rating.user_id == current_user.id, Rating.movie_id == movie_id))
    item = result.scalar_one_or_none()
    if item:
        item.rating = rating
    else:
        db.add(Rating(user_id=current_user.id, movie_id=movie_id, rating=rating))
    await db.commit()
    return {"status": "success", "movie_id": movie_id, "rating": rating}
