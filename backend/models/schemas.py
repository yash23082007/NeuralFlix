from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional, Any, Dict

class CastMember(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    name: str
    character: str
    profile_url: Optional[str] = None

class MovieBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
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
    metacritic: Optional[int] = None
    deep_metadata: Optional[Any] = None

class MovieListResponse(BaseModel):
    page: int = 1
    limit: int = 20
    total: int
    results: List[MovieBase]
    next_cursor: Optional[str] = None

class SearchResponse(MovieListResponse):
    query: str

class RecommendationBase(MovieBase):
    score: float = 0.0
    sources: List[str] = []

class RecommendationResponse(BaseModel):
    movie_id: str
    recommendations: List[RecommendationBase]
    algo_used: str = "hybrid_ensemble"
    cache_hit: bool = False

class StreamingPlatform(BaseModel):
    name: str
    url: Optional[str] = None
    type: str = "subscription" # subscription | rent | buy

class StreamingResponse(BaseModel):
    movie_id: int
    platforms: List[StreamingPlatform]

class OnboardingRequest(BaseModel):
    liked_movies: List[int]
    disliked_movies: List[int]
    top_genres: List[str] = []

class OnboardingResponse(BaseModel):
    cluster_id: int
    initial_recommendations: List[MovieBase]

class UserProfile(BaseModel):
    user_id: str
    taste_vector: Optional[List[float]] = None
    top_genres: List[Dict[str, Any]] = []
    watched_count: int = 0
    avg_rating: float = 0.0

class AsyncTaskResponse(BaseModel):
    task_id: str
    status: str
    result: Optional[Any] = None

class GenericResponse(BaseModel):
    message: str
    error_id: Optional[str] = None
