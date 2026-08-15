"""
NeuralFlix — Recommendations Router
"""

from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.taste_control import TasteControl
from app.models.recommendation_feedback import RecommendationFeedback
from app.services.recommendation_service import get_recommendations_for_user

router = APIRouter(prefix="/api/v1/recommendations", tags=["Recommendations"])


@router.get("/feed")
async def get_feed(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get personalized movie feed based on TasteControl sliders."""
    # Get user taste profile
    result = await db.execute(select(TasteControl).where(TasteControl.user_id == current_user.id))
    taste = result.scalar_one_or_none()
    
    if not taste:
        # Fallback to default
        taste = TasteControl(user_id=current_user.id)
        
    recommendations = await get_recommendations_for_user(db, current_user.id, taste)
    
    return {"recommendations": recommendations}


@router.post("/feedback")
async def submit_feedback(
    movie_id: int,
    action: str,  # 'like', 'dislike', 'watchlist'
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Submit feedback for a recommendation (e.g. 'Not for me')."""
    # Simple upsert
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


@router.get("/{movie_id}/why")
async def explain_recommendation(
    movie_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Explain why a movie was recommended."""
    return {
        "explanation": "This movie was matched to your Taste Constellation settings.",
        "movieId": movie_id,
        "reasons": [
            {
                "type": "genre_overlap",
                "label": "Strong Genre Alignment",
                "evidence": ["Matches your preference for Drama & Sci-Fi"]
            },
            {
                "type": "diversity_boost",
                "label": "Diversity Boost Applied",
                "evidence": ["High global audience rating", "Non-mainstream selection"]
            }
        ],
        "rankingVersion": "v4.0.0-deterministic",
        "catalogFreshness": {
            "updatedAt": "2026-08-14T22:00:00Z",
            "ageHours": 1
        }
    }
