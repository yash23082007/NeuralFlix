"""
NeuralFlix Discovery Passport — routes/discovery_passport.py

Private, meaningful discovery history for the user.
Shows exploration statistics without gamifying cultures.

Privacy controls:
  - Opt-in tracking (no tracking until user enables it)
  - Export discovery history as JSON
  - Delete all discovery history

Does NOT:
  - Turn countries/cultures into points or achievements
  - Share discovery data with other users
  - Track users across sessions without opt-in
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from core.security import get_current_user_id
from database import users_collection

router = APIRouter()


@router.get("/me/discovery-passport")
async def get_discovery_passport(
    user_id: str = Depends(get_current_user_id),
):
    """
    Aggregate the user's watch history into discovery statistics.
    Returns empty stats if the user hasn't opted in to tracking.
    """
    user = await users_collection.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check opt-in
    tracking_enabled = user.get("discovery_tracking_enabled", False)
    if not tracking_enabled:
        return {
            "trackingEnabled": False,
            "message": "Discovery tracking is disabled. Enable it to see your exploration stats.",
            "stats": None,
        }

    # Build stats from watch history
    stats = await _compute_discovery_stats(user_id)

    return {
        "trackingEnabled": True,
        "stats": stats,
    }


@router.put("/me/discovery-passport/opt-in")
async def enable_discovery_tracking(
    user_id: str = Depends(get_current_user_id),
):
    """Enable discovery passport tracking."""
    await users_collection.update_one(
        {"id": user_id},
        {"$set": {"discovery_tracking_enabled": True}},
    )
    return {"message": "Discovery tracking enabled", "trackingEnabled": True}


@router.put("/me/discovery-passport/opt-out")
async def disable_discovery_tracking(
    user_id: str = Depends(get_current_user_id),
):
    """Disable discovery passport tracking."""
    await users_collection.update_one(
        {"id": user_id},
        {"$set": {"discovery_tracking_enabled": False}},
    )
    return {"message": "Discovery tracking disabled", "trackingEnabled": False}


@router.get("/me/discovery-passport/export")
async def export_discovery_passport(
    user_id: str = Depends(get_current_user_id),
):
    """Export the user's complete discovery history as JSON."""
    user = await users_collection.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    stats = await _compute_discovery_stats(user_id)
    export_data = {
        "userId": user_id,
        "exportedAt": datetime.now(timezone.utc).isoformat(),
        "stats": stats,
    }

    return JSONResponse(
        content=export_data,
        headers={"Content-Disposition": "attachment; filename=discovery_passport.json"},
    )


@router.delete("/me/discovery-passport")
async def delete_discovery_passport(
    user_id: str = Depends(get_current_user_id),
):
    """Delete all discovery history and disable tracking."""
    await users_collection.update_one(
        {"id": user_id},
        {
            "$set": {"discovery_tracking_enabled": False},
            "$unset": {"discovery_snapshot": ""},
        },
    )
    return {"message": "Discovery history deleted and tracking disabled"}


async def _compute_discovery_stats(user_id: str) -> dict:
    """Compute discovery statistics from watch history."""
    # Fetch watch history
    watch_history = []
    try:
        from database import watch_history_collection, movies_collection

        cursor = watch_history_collection.find({"user_id": str(user_id)})
        events = await cursor.to_list(length=None)
        movie_ids = [e.get("movie_id") for e in events if e.get("movie_id")]

        for mid in movie_ids:
            try:
                m = await movies_collection.find_one(
                    {"tmdb_id": int(mid) if str(mid).isdigit() else mid},
                    {"_id": 0},
                )
                if m:
                    watch_history.append(m)
            except (ValueError, TypeError):
                pass
    except Exception:
        pass

    if not watch_history:
        return {
            "languagesExplored": 0,
            "countriesExplored": 0,
            "newDirectors": 0,
            "hiddenGemsSaved": 0,
            "comfortZoneRatio": 100,
            "discoveryRatio": 0,
            "languages": [],
            "totalFilms": 0,
        }

    # Compute stats
    languages = set()
    directors = set()
    hidden_gems = 0
    comfort_count = 0

    for m in watch_history:
        lang = m.get("language", "")
        if lang:
            languages.add(lang)

        director = m.get("director", "")
        if director:
            directors.add(director)

        pop = m.get("popularity_score", 0) or 0
        if pop < 50:
            hidden_gems += 1

        # "Comfort zone" = English-language popular films
        if lang == "en" and pop > 100:
            comfort_count += 1

    total = len(watch_history)
    discovery_count = total - comfort_count
    comfort_ratio = round((comfort_count / total * 100) if total > 0 else 100)
    discovery_ratio = 100 - comfort_ratio

    return {
        "languagesExplored": len(languages),
        "countriesExplored": len(languages),  # Approximate: 1 language ≈ 1 country
        "newDirectors": len(directors),
        "hiddenGemsSaved": hidden_gems,
        "comfortZoneRatio": comfort_ratio,
        "discoveryRatio": discovery_ratio,
        "languages": sorted(list(languages)),
        "totalFilms": total,
    }
