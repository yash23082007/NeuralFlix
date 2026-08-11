from pydantic import BaseModel
from typing import Dict, List, Optional
from datetime import datetime

class ImplicitEvent(BaseModel):
    user_id: str
    movie_id: str
    event_type: str # click, hover_poster, watch_start, watch_complete
    timestamp: datetime

class MoodEntry(BaseModel):
    mood: str
    timestamp: datetime

class UserProfile(BaseModel):
    user_id: str
    genre_affinity: Dict[str, float]      # {"Sci-Fi": 0.87, "Horror": 0.12}
    director_affinity: Dict[str, float]
    actor_affinity: Dict[str, float]
    embedding: List[float]                # 768-dim user vector
    watch_history: List[str]              # movie_ids
    explicit_ratings: Dict[str, float]    # movie_id -> rating
    implicit_signals: List[ImplicitEvent] # clicks, hovers, watch %
    mood_history: List[MoodEntry]
    updated_at: datetime
