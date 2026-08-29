"""
Movie Intelligence Platform — Users Router
Manages user profiles, Taste Profile fingerprint sequencing, onboarding, and Taste Profile sliders.
"""

from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.taste_control import TasteControl
from app.models.movie import Movie
from app.models.recommendation_feedback import WatchlistItem, Rating
from app.models.watch_event import WatchEvent
from app.schemas.auth import UserResponse
from app.schemas.user import (
    TasteControlsResponse,
    ProfileResponse,
    TasteDNAProfile,
    WatchlistResponse,
    HistoryResponse,
    HistoryItem,
    UserStatsResponse,
)
from app.routers.movies import _format_movie

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


class OnboardRequest(BaseModel):
    user_id: Optional[str] = None
    liked_movies: List[Any] = Field(default_factory=list)
    pref_genres: List[str] = Field(default_factory=list)
    pref_languages: List[str] = Field(default_factory=list)


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


@router.post("/onboard")
@router.post("/me/onboard")
async def complete_onboarding(
    payload: OnboardRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Complete user onboarding: seed initial ratings, watch history, and calibrate Taste Profile."""
    current_user.onboarded = True

    # 1. Process liked movies
    for item in payload.liked_movies:
        m_id = None
        if isinstance(item, int) or (isinstance(item, str) and item.isdigit()):
            m_id = int(item)
            movie = await db.get(Movie, m_id)
            if not movie:
                m_res = await db.execute(select(Movie).where(Movie.tmdb_id == m_id))
                movie = m_res.scalar_one_or_none()
        elif isinstance(item, dict):
            m_id = item.get("id") or item.get("tmdb_id")
            movie = await db.get(Movie, int(m_id)) if m_id else None
        else:
            movie = None

        if movie:
            # Add 5-star rating and watch event
            db.add(Rating(user_id=current_user.id, movie_id=movie.id, rating=5.0))
            db.add(WatchEvent(user_id=current_user.id, movie_id=movie.id, completed=True))

    # 2. Calibrate Taste Profile sliders
    t_res = await db.execute(select(TasteControl).where(TasteControl.user_id == current_user.id))
    taste = t_res.scalar_one_or_none()
    if not taste:
        taste = TasteControl(user_id=current_user.id)
        db.add(taste)

    # Adjust global slider if non-English languages chosen
    if any(l != "en" for l in payload.pref_languages):
        taste.global_taste = 75

    # Adjust pace slider based on genres
    genres_lower = [g.lower() for g in payload.pref_genres]
    if any(g in genres_lower for g in ["action", "thriller", "adventure"]):
        taste.pace = 65
    elif any(g in genres_lower for g in ["drama", "documentary", "romance"]):
        taste.pace = 35

    # Adjust challenge if mystery/sci-fi selected
    if any(g in genres_lower for g in ["science fiction", "sci-fi", "mystery", "history"]):
        taste.challenge = 70

    await db.commit()
    await db.refresh(current_user)

    return {"status": "success", "message": "Onboarding completed successfully"}


@router.get("/me/taste-controls", response_model=TasteControlsResponse)
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

    return TasteControlsResponse(  # type: ignore
        discovery=taste.discovery,
        global_taste=taste.global_taste,
        challenge=taste.challenge,
        pace=taste.pace,
        hidden_gems=taste.hidden_gems,
        diversity_boost=taste.diversity_boost
    )


@router.put("/me/taste-controls", response_model=TasteControlsResponse)
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
    await db.refresh(taste)
    return TasteControlsResponse(  # type: ignore
        discovery=taste.discovery,
        global_taste=taste.global_taste,
        challenge=taste.challenge,
        pace=taste.pace,
        hidden_gems=taste.hidden_gems,
        diversity_boost=taste.diversity_boost
    )


@router.get("/me/profile", response_model=ProfileResponse)
async def get_user_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Generate dynamic Taste Profile cinematic profile sequencing from real user interactions and catalog."""
    watched_res = await db.execute(
        select(Movie).join(WatchEvent, WatchEvent.movie_id == Movie.id)
        .where(WatchEvent.user_id == current_user.id)
    )
    user_movies = watched_res.scalars().all()

    if not user_movies:
        ratings_res = await db.execute(
            select(Movie).join(Rating, Rating.movie_id == Movie.id)
            .where(Rating.user_id == current_user.id)
        )
        user_movies = ratings_res.scalars().all()

    if not user_movies:
        # Fallback to catalog seed
        all_res = await db.execute(select(Movie).limit(10))
        user_movies = all_res.scalars().all()

    # Aggregate DNA
    genre_counts: dict[str, int] = {}
    decade_counts: dict[str, int] = {}
    director_counts: dict[str, int] = {}
    lang_counts: dict[str, int] = {}
    total_runtime = 0
    valid_runtimes = 0

    for m in user_movies:
        for g in m.genres or []:
            genre_counts[g] = genre_counts.get(g, 0) + 1
        if m.year:
            decade = f"{(m.year // 10) * 10}s"
            decade_counts[decade] = decade_counts.get(decade, 0) + 1
        if m.director:
            director_counts[m.director] = director_counts.get(m.director, 0) + 1
        if m.language:
            lang_counts[m.language] = lang_counts.get(m.language, 0) + 1
        if m.runtime:
            total_runtime += m.runtime
            valid_runtimes += 1

    top_genres = [list(x) for x in sorted(genre_counts.items(), key=lambda x: -x[1])[:5]]
    top_decades = [list(x) for x in sorted(decade_counts.items(), key=lambda x: -x[1])[:3]]
    top_directors = [list(x) for x in sorted(director_counts.items(), key=lambda x: -x[1])[:3]]
    top_langs = [list(x) for x in sorted(lang_counts.items(), key=lambda x: -x[1])[:3]]

    avg_runtime = round(total_runtime / valid_runtimes, 1) if valid_runtimes else 115.0

    profile = TasteDNAProfile(
        top_genres=top_genres or [("Drama", 5), ("Sci-Fi", 4)],  # type: ignore
        preferred_decades=top_decades or [("2010s", 5), ("2020s", 3)],  # type: ignore
        top_directors=top_directors or [("Christopher Nolan", 3)],  # type: ignore
        language_preferences=top_langs or [("en", 8)],  # type: ignore
        avg_runtime_preference=int(avg_runtime),
        rating_threshold=7.0
    )

    return ProfileResponse(profile=profile)


@router.get("/me/watchlist", response_model=WatchlistResponse)
async def get_watchlist(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's watchlist."""
    result = await db.execute(
        select(Movie).join(WatchlistItem, WatchlistItem.movie_id == Movie.id)
        .where(WatchlistItem.user_id == current_user.id)
        .order_by(WatchlistItem.added_at.desc())
    )
    movies = result.scalars().all()
    return WatchlistResponse(watchlist=[_format_movie(m) for m in movies])  # type: ignore


@router.post("/me/watchlist")
async def add_to_watchlist(
    movie_id: int = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add a movie to user's watchlist."""
    movie = await db.get(Movie, movie_id)
    if not movie:
        m_res = await db.execute(select(Movie).where(Movie.tmdb_id == movie_id))
        movie = m_res.scalar_one_or_none()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    existing = await db.execute(select(WatchlistItem).where(
        WatchlistItem.user_id == current_user.id, WatchlistItem.movie_id == movie.id
    ))
    if not existing.scalar_one_or_none():
        db.add(WatchlistItem(user_id=current_user.id, movie_id=movie.id))
        await db.commit()
    return {"status": "success", "movie_id": movie_id}


@router.delete("/me/watchlist/{movie_id}")
async def remove_from_watchlist(
    movie_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove a movie from user's watchlist."""
    result = await db.execute(select(WatchlistItem).where(
        WatchlistItem.user_id == current_user.id, WatchlistItem.movie_id == movie_id
    ))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Movie is not in your watchlist")
    await db.delete(item)
    await db.commit()
    return {"status": "success", "movie_id": movie_id}


@router.get("/me/history", response_model=HistoryResponse)
async def get_history(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's watch history."""
    offset = (page - 1) * limit
    result = await db.execute(
        select(Movie, WatchEvent).join(WatchEvent, WatchEvent.movie_id == Movie.id)
        .where(WatchEvent.user_id == current_user.id)
        .order_by(WatchEvent.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    rows = result.all()
    history_items = [
        HistoryItem(movie=_format_movie(movie), watched_at=event.created_at, completed=event.completed)  # type: ignore
        for movie, event in rows
    ]
    return HistoryResponse(history=history_items)


@router.get("/me/stats", response_model=UserStatsResponse)
async def get_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get aggregate statistics for the current user."""
    from sqlalchemy import func
    watched_count = await db.scalar(select(func.count()).select_from(WatchEvent).where(WatchEvent.user_id == current_user.id)) or 0
    rated_count = await db.scalar(select(func.count()).select_from(Rating).where(Rating.user_id == current_user.id)) or 0
    watchlist_count = await db.scalar(select(func.count()).select_from(WatchlistItem).where(WatchlistItem.user_id == current_user.id)) or 0
    
    avg_rating = await db.scalar(select(func.avg(Rating.rating)).where(Rating.user_id == current_user.id))
    avg_rating = round(avg_rating, 2) if avg_rating is not None else None

    return UserStatsResponse(
        watched_count=watched_count,
        rated_count=rated_count,
        watchlist_count=watchlist_count,
        average_rating=avg_rating
    )


@router.put("/me/ratings/{movie_id}")
async def rate_movie(
    movie_id: int,
    rating: float = Query(..., ge=0, le=5),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Submit or update a movie rating."""
    movie = await db.get(Movie, movie_id)
    if not movie:
        m_res = await db.execute(select(Movie).where(Movie.tmdb_id == movie_id))
        movie = m_res.scalar_one_or_none()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    result = await db.execute(select(Rating).where(Rating.user_id == current_user.id, Rating.movie_id == movie.id))
    item = result.scalar_one_or_none()
    if item:
        item.rating = rating
    else:
        db.add(Rating(user_id=current_user.id, movie_id=movie.id, rating=rating))
    await db.commit()
    return {"status": "success", "movie_id": movie_id, "rating": rating}
