from pydantic import BaseModel, Field
from typing import List, Optional

class MovieSchema(BaseModel):
    id: str = Field(alias="_id", description="IMDb or unique ID")
    title: str
    year: Optional[int] = None
    language: Optional[str] = "en"
    genres: List[str] = []
    rating: Optional[float] = 0.0
    votes: Optional[int] = 0
    platforms: List[str] = []
    poster_url: Optional[str] = None
    popularity_score: Optional[float] = 0.0
    overview: Optional[str] = None

    class Config:
        populate_by_name = True
        
class WatchHistorySchema(BaseModel):
    user_id: str
    movie_id: str
    rating: Optional[float] = None
    timestamp: float
