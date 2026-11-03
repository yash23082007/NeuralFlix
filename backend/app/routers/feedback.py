"""
Movie Intelligence Platform — Feedback Router
"""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.movie import Movie
from app.models.recommendation_feedback import RecommendationFeedback

router = APIRouter(prefix="/api/v1/feedback", tags=["Feedback"])


@router.post("")
async def submit_general_feedback(
    movie_id: int,
    action: Literal["like", "dislike", "watchlist"],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Submit general feedback for a movie."""
    # Validate movie exists
    movie = await db.get(Movie, movie_id)
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    result = await db.execute(
        select(RecommendationFeedback)
        .where(RecommendationFeedback.user_id == current_user.id)
        .where(RecommendationFeedback.movie_id == movie_id)
    )
    feedback = result.scalar_one_or_none()
    
    if not feedback:
        feedback = RecommendationFeedback(
            user_id=current_user.id,
            movie_id=movie_id,
            feedback_type=action
        )
        db.add(feedback)
    else:
        feedback.feedback_type = action
        
    await db.commit()
    return {"status": "success", "action": action}
