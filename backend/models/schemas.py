from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class CastMember(BaseModel):
    name: str
    character: Optional[str] = None
    profile_url: Optional[str] = None

class MovieSchema(BaseModel):
    id: str = Field(alias="_id", description="MongoDB document ID")
    tmdb_id: Optional[int] = None
    title: str
    tagline: Optional[str] = None
    overview: Optional[str] = None
    year: Optional[int] = None
    release_date: Optional[str] = None
    runtime: Optional[int] = None
    language: Optional[str] = "en"
    genres: List[str] = []
    rating: Optional[float] = 0.0
    votes: Optional[int] = 0
    platforms: List[str] = []
    poster_url: Optional[str] = None
    backdrop_url: Optional[str] = None
    popularity_score: Optional[float] = 0.0
    cast: Optional[List[CastMember]] = []
    director: Optional[str] = None
    trailer_key: Optional[str] = None
    imdb_id: Optional[str] = None

    class Config:
        populate_by_name = True

class WatchHistorySchema(BaseModel):
    user_id: str
    movie_id: str
    rating: Optional[float] = None
    timestamp: float

class TrackingEventSchema(BaseModel):
    user_id: str
    event_type: str  # e.g., 'click', 'search', 'watch'
    item_id: Optional[str] = None  # Movie ID, if applicable
    metadata: Optional[Dict[str, Any]] = None  # Any extra payload (like search query)
    
class SearchTrackSchema(BaseModel):
    user_id: str
    query: str
    results_count: int

class UserSchema(BaseModel):
    id: str = Field(alias="_id")
    name: str
    email: Optional[str] = None
    favorite_genres: List[str] = []
    watchlist: List[str] = []

    class Config:
        populate_by_name = True
