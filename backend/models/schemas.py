from pydantic import BaseModel, HttpUrl, Field
from typing import List, Optional, Any

class CastMember(BaseModel):
    name: str
    character: str
    profile_url: Optional[str] = None

class MovieBase(BaseModel):
    tmdb_id: int
    title: str
    overview: Optional[str] = ""
    year: Optional[int] = None
    release_date: Optional[str] = None
    language: str = "en"
    genres: List[str] = []
    rating: float = 0.0
    votes: int = 0
    popularity_score: float = 0.0
    poster_url: Optional[str] = None
    backdrop_url: Optional[str] = None
    platforms: List[str] = []
    media_type: str = "movie"

class MovieDetail(MovieBase):
    runtime: Optional[int] = None
    cast: List[CastMember] = []
    director: Optional[str] = None
    trailer_key: Optional[str] = None
    similar: List[MovieBase] = []
    tagline: Optional[str] = None
    budget: Optional[int] = None
    imdb_id: Optional[str] = None
    omdb_rating: Optional[str] = None
    rt_rating: Optional[str] = None
    box_office: Optional[str] = None
    awards: Optional[str] = None
    imdb_api_rating: Optional[float] = None
    imdb_api_votes: Optional[int] = None
    metacritic: Optional[int] = None
    deep_metadata: Optional[Any] = None

class MovieListResponse(BaseModel):
    page: Optional[int] = 1
    total: int
    results: List[MovieBase]

class SearchResponse(MovieListResponse):
    query: str

class RecommendationBase(MovieBase):
    score: Optional[float] = None
    sources: Optional[List[Any]] = None

class RecommendationResponse(BaseModel):
    movie_id: str
    recommendations: List[RecommendationBase]

class AsyncTaskResponse(BaseModel):
    task_id: str
    status: str
    result: Optional[Any] = None

class GenericResponse(BaseModel):
    message: str
    error_id: Optional[str] = None


# ─── Tracking Schemas ────────────────────────────────────────
class TrackingEventSchema(BaseModel):
    user_id: str
    event_type: str  # "click", "watch", "like", "watchlist_add"
    item_id: str
    metadata: Optional[dict] = None

class SearchTrackSchema(BaseModel):
    user_id: str
    query: str
    results_count: int = 0
