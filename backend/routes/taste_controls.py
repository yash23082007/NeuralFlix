"""
NeuralFlix Taste Controls API — routes/taste_controls.py

Manages the user's explicit taste constellation preferences.
These five dual-axis sliders directly influence the recommendation reranker.

Controls:
  - discovery:   0 (familiar) ↔ 100 (adventurous)
  - global_pref: 0 (local)    ↔ 100 (global)
  - challenge:   0 (light)    ↔ 100 (challenging)
  - pace:        0 (fast)     ↔ 100 (slow-burn)
  - hiddenGems:  0 (popular)  ↔ 100 (hidden gems)
  - diversityBoost: true/false
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from core.security import get_current_user_id
from database import users_collection

router = APIRouter()


class TasteControlPayload(BaseModel):
    discovery: int = Field(default=50, ge=0, le=100)
    global_pref: int = Field(default=50, ge=0, le=100, alias="global")
    challenge: int = Field(default=50, ge=0, le=100)
    pace: int = Field(default=50, ge=0, le=100)
    hiddenGems: int = Field(default=50, ge=0, le=100)
    diversityBoost: bool = True

    model_config = {"populate_by_name": True}


class TasteControlResponse(BaseModel):
    discovery: int = 50
    global_pref: int = Field(default=50, alias="global")
    challenge: int = 50
    pace: int = 50
    hiddenGems: int = 50
    diversityBoost: bool = True

    model_config = {"populate_by_name": True}


@router.put("/me/taste-controls")
async def update_taste_controls(
    payload: TasteControlPayload,
    user_id: str = Depends(get_current_user_id),
):
    """
    Save or update the user's taste constellation preferences.
    These are explicit, user-set values — never inferred without disclosure.
    """
    taste_data = {
        "taste_controls": {
            "discovery": payload.discovery,
            "global": payload.global_pref,
            "challenge": payload.challenge,
            "pace": payload.pace,
            "hiddenGems": payload.hiddenGems,
            "diversityBoost": payload.diversityBoost,
        }
    }

    result = await users_collection.update_one(
        {"id": user_id},
        {"$set": taste_data},
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "Taste controls updated", "controls": taste_data["taste_controls"]}


@router.get("/me/taste-controls")
async def get_taste_controls(
    user_id: str = Depends(get_current_user_id),
):
    """
    Retrieve the user's current taste constellation preferences.
    Returns defaults (all 50, diversity boost on) if not set.
    """
    user = await users_collection.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    defaults = {
        "discovery": 50,
        "global": 50,
        "challenge": 50,
        "pace": 50,
        "hiddenGems": 50,
        "diversityBoost": True,
    }

    controls = user.get("taste_controls", defaults)
    return controls


@router.delete("/me/taste-controls")
async def reset_taste_controls(
    user_id: str = Depends(get_current_user_id),
):
    """Reset taste controls to defaults."""
    defaults = {
        "discovery": 50,
        "global": 50,
        "challenge": 50,
        "pace": 50,
        "hiddenGems": 50,
        "diversityBoost": True,
    }

    await users_collection.update_one(
        {"id": user_id},
        {"$set": {"taste_controls": defaults}},
    )

    return {"message": "Taste controls reset to defaults", "controls": defaults}
