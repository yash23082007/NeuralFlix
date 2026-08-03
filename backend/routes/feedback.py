"""
NeuralFlix Recommendation Feedback — routes/feedback.py

Allows users to explicitly correct recommendations instead of being silently profiled.
Feedback updates user's explicit preference weights, never used for unrelated ad targeting.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from typing import Optional
from core.security import get_current_user_id
from database import users_collection

router = APIRouter()

ALLOWED_REASONS = {
    "already_watched",
    "not_interested",
    "too_slow",
    "too_dark",
    "wrong_language",
    "wrong_mood",
    "not_available",
    "not_my_genre",
    "hide_similar",
}

ALLOWED_ACTIONS = {"not_interested", "dismiss", "hide"}


class FeedbackPayload(BaseModel):
    movieId: int
    action: str = "not_interested"
    reason: str

    @field_validator("reason")
    @classmethod
    def validate_reason(cls, v):
        if v not in ALLOWED_REASONS:
            raise ValueError(f"Reason must be one of: {', '.join(sorted(ALLOWED_REASONS))}")
        return v

    @field_validator("action")
    @classmethod
    def validate_action(cls, v):
        if v not in ALLOWED_ACTIONS:
            raise ValueError(f"Action must be one of: {', '.join(sorted(ALLOWED_ACTIONS))}")
        return v


# Mapping: feedback reason → taste control adjustments
REASON_ADJUSTMENTS = {
    "too_slow": {"pace": -10},       # Reduce slow-burn preference
    "too_dark": {"challenge": -10},  # Reduce challenging preference
    "wrong_language": {},            # No auto-adjust; explicit language filter
    "wrong_mood": {},                # User should use taste controls
    "not_my_genre": {},              # Will be used for genre exclusion
    "not_interested": {},            # Generic dismiss
    "already_watched": {},           # No preference change
    "not_available": {},             # Availability issue, not taste
    "hide_similar": {},              # Content-level filter
}


@router.post("/feedback")
async def submit_feedback(
    payload: FeedbackPayload,
    user_id: str = Depends(get_current_user_id),
):
    """
    Submit feedback on a recommendation.
    Updates explicit user preference weights based on the feedback reason.
    """
    user = await users_collection.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 1. Store the feedback event
    feedback_entry = {
        "movieId": payload.movieId,
        "action": payload.action,
        "reason": payload.reason,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    await users_collection.update_one(
        {"id": user_id},
        {"$push": {"feedback_history": feedback_entry}},
    )

    # 2. Apply taste control adjustments if applicable
    adjustments = REASON_ADJUSTMENTS.get(payload.reason, {})
    if adjustments:
        taste_controls = user.get("taste_controls", {
            "discovery": 50, "global": 50, "challenge": 50,
            "pace": 50, "hiddenGems": 50, "diversityBoost": True,
        })

        for key, delta in adjustments.items():
            current = taste_controls.get(key, 50)
            taste_controls[key] = max(0, min(100, current + delta))

        await users_collection.update_one(
            {"id": user_id},
            {"$set": {"taste_controls": taste_controls}},
        )

    # 3. Add movie to dismissed list (so it's excluded from future recs)
    await users_collection.update_one(
        {"id": user_id},
        {"$addToSet": {"dismissed_movies": payload.movieId}},
    )

    return {
        "message": "Feedback recorded",
        "adjustments_applied": bool(adjustments),
        "reason": payload.reason,
    }


@router.get("/feedback/history")
async def get_feedback_history(
    user_id: str = Depends(get_current_user_id),
):
    """Get the user's feedback history."""
    user = await users_collection.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "feedback": user.get("feedback_history", []),
        "dismissed_count": len(user.get("dismissed_movies", [])),
    }
