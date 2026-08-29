"""
Movie Intelligence Platform — Movie Schemas
"""

from typing import List, Optional

from pydantic import BaseModel


class MovieBase(BaseModel):
    tmdb_id: int
    imdb_id: Optional[str] = None
    title: str
    year: Optional[int] = None
    poster_url: Optional[str] = None
    backdrop_url: Optional[str] = None
    rating: Optional[float] = None
    genres: List[str] = []
    language: Optional[str] = None
    cinema_region: Optional[str] = None

    # Used for explainability UI
    rec_score: Optional[float] = None
    editorial_collections: List[str] = []

    model_config = {"from_attributes": True}


class MovieCard(MovieBase):
    """Lightweight representation for feeds/grids."""
    pass


class MovieDetail(MovieBase):
    """Full representation for movie page."""
    overview: Optional[str] = None
    tagline: Optional[str] = None
    runtime: Optional[int] = None
    release_date: Optional[str] = None
    director: Optional[str] = None
    cast_members: List[str] = []
    trailer_key: Optional[str] = None
    platforms: List[str] = []

    # OMDb enriched fields
    imdb_rating: Optional[float] = None
    imdb_votes: Optional[int] = None
    rt_rating: Optional[str] = None
    metacritic: Optional[str] = None
    awards: Optional[str] = None


class MovieSearchResult(BaseModel):
    results: List[MovieCard]
    total: int


class PaginatedMovies(BaseModel):
    results: List[MovieCard]
    page: int
    total_pages: int
