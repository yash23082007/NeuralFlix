"""
NeuralFlix v4 — Movie Model

Source of truth for movie metadata. Populated from TMDB, enriched by OMDb.
JSON for genres/keywords/cast/platforms — works identically on SQLite and PostgreSQL.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Float, Index, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Movie(Base):
    __tablename__ = "movies"
    __table_args__ = (
        Index("idx_movie_popularity", "popularity_score"),
        Index("idx_movie_language_pop", "language", "popularity_score"),
        Index("idx_movie_region_pop", "cinema_region", "popularity_score"),
        Index("idx_movie_year_pop", "year", "popularity_score"),
        Index("idx_movie_rating", "tmdb_rating"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tmdb_id: Mapped[int] = mapped_column(Integer, unique=True, index=True)
    imdb_id: Mapped[Optional[str]] = mapped_column(String(50), unique=True, index=True, nullable=True)
    year: Mapped[Optional[int]] = mapped_column(Integer, index=True, nullable=True)

    # Core metadata
    title: Mapped[str] = mapped_column(String(500), index=True)
    overview: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tagline: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    genres: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    language: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    release_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    runtime: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Media
    poster_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    backdrop_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    trailer_key: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # TMDB ratings
    tmdb_rating: Mapped[Optional[float]] = mapped_column(Float, default=0.0)
    tmdb_votes: Mapped[Optional[int]] = mapped_column(Integer, default=0)
    popularity_score: Mapped[Optional[float]] = mapped_column(Float, default=0.0)

    # OMDb enrichment (fetched lazily on detail page)
    imdb_rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    imdb_votes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    rt_rating: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    metacritic: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    awards: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    omdb_checked_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Streaming platforms (JSON array)
    platforms: Mapped[Optional[list]] = mapped_column(JSON, default=list)

    # Cinema geography
    cinema_region: Mapped[Optional[str]] = mapped_column(String(50), index=True, nullable=True)

    # Credits
    director: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    cast_members: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    keywords: Mapped[Optional[list]] = mapped_column(JSON, default=list)

    # Editorial
    editorial_collections: Mapped[Optional[list]] = mapped_column(JSON, default=list)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    ratings = relationship("Rating", back_populates="movie", lazy="selectin")
    availability = relationship("MovieAvailability", back_populates="movie", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Movie id={self.id} tmdb_id={self.tmdb_id} title={self.title!r}>"
