from fastapi import APIRouter, BackgroundTasks, Depends
from models.user_profile import ImplicitEvent
from typing import Any

router = APIRouter()

@router.post("/feedback/implicit", tags=["Feedback"])
async def record_implicit_event(
    event: ImplicitEvent,
    db: Any = Depends(),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    """
    Record implicit feedback events in real-time.
    Supports events like: click, hover_poster, watch_start, watch_complete
    """
    return {"status": "recorded", "event_queued": event.event_type}

MOOD_GENRE_MAP = {
    "happy":       ["Comedy", "Animation", "Romance"],
    "sad":         ["Drama", "Romance", "Biography"],
    "excited":     ["Action", "Thriller", "Sci-Fi"],
    "scared":      ["Horror", "Mystery", "Thriller"],
    "intellectual":["Documentary", "Biography", "History"],
    "nostalgic":   ["Classic", "Animation", "Family"],
    "date_night":  ["Romance", "Comedy", "Drama"],
    "party":       ["Comedy", "Action", "Musical"],
}

@router.post("/recommend/by-mood", tags=["Recommendations"])
async def recommend_by_mood(mood: str, user_id: str):
    """
    Look up genre modifiers based on User's explicit emoji/mood
    feed into hybrid recommender.
    """
    genres = MOOD_GENRE_MAP.get(mood, [])
    # return await hybrid_recommender.recommend(
    #     user_id=user_id,
    #     genre_filter=genres,
    #     boost_factor=1.5
    # )
    
    return {
        "mood_detected": mood,
        "genre_boosts": genres,
        "recommendations": [] # To be populated by Hybrid Recommender
    }
