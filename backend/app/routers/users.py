"""
NeuralFlix v4 — Users Router
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
async def get_watchlist(current_user: User = Depends(get_current_user)):
    """Get user's watchlist."""
    return {"watchlist": []}  # Stub for now


@router.post("/me/watchlist")
async def add_to_watchlist(movie_id: int, current_user: User = Depends(get_current_user)):
    """Add a movie to user's watchlist."""
    return {"status": "success"}  # Stub for now
