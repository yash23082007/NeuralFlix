"""
NeuralFlix — User Schemas
Pydantic response models for user profiles, taste controls, stats, and history.
"""

from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.movie import MovieCard


class TasteControlsResponse(BaseModel):
    discovery: int = Field(ge=0, le=100)
    global_taste: int = Field(alias="global", ge=0, le=100)
    challenge: int = Field(ge=0, le=100)
    pace: int = Field(ge=0, le=100)
    hidden_gems: int = Field(alias="hiddenGems", ge=0, le=100)
    diversity_boost: bool = Field(alias="diversityBoost")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class TasteDNAProfile(BaseModel):
    top_genres: List[List[Any]] = []
    preferred_decades: List[List[Any]] = []
    avg_runtime_preference: int = 120
    language_preferences: List[List[Any]] = []
    rating_threshold: float = 7.5
    top_directors: List[List[Any]] = []


class ProfileResponse(BaseModel):
    profile: Optional[TasteDNAProfile] = None
    message: Optional[str] = None


class WatchlistResponse(BaseModel):
    watchlist: List[MovieCard]


class HistoryItem(BaseModel):
    movie: MovieCard
    watched_at: datetime
    completed: bool = False


class HistoryResponse(BaseModel):
    history: List[HistoryItem]


class UserStatsResponse(BaseModel):
    watched_count: int
    rated_count: int
    watchlist_count: int
    average_rating: Optional[float] = None
