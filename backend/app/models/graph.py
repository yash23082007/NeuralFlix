"""
Movie Intelligence Platform — Normalized Graph & Ingestion Platform Models

Models for people, credits, keywords, search queries, ML model versions, and sync checkpoints.
"""

from datetime import datetime, timezone
from typing import Optional, Any
from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class Person(Base):
    __tablename__ = "people"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tmdb_person_id: Mapped[Optional[int]] = mapped_column(Integer, unique=True, index=True, nullable=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    known_for: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # Acting, Directing
    profile_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)


class MovieCast(Base):
    __tablename__ = "movie_cast"
    __table_args__ = (
        UniqueConstraint("movie_id", "person_id", name="uq_movie_cast_person"),
        Index("idx_cast_person", "person_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    movie_id: Mapped[int] = mapped_column(Integer, ForeignKey("movies.id", ondelete="CASCADE"), index=True)
    person_id: Mapped[int] = mapped_column(Integer, ForeignKey("people.id", ondelete="CASCADE"), index=True)
    character_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    cast_order: Mapped[Optional[int]] = mapped_column(Integer, default=0)


class MovieCrew(Base):
    __tablename__ = "movie_crew"
    __table_args__ = (
        UniqueConstraint("movie_id", "person_id", "job", name="uq_movie_crew_person_job"),
        Index("idx_crew_person_job", "person_id", "job"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    movie_id: Mapped[int] = mapped_column(Integer, ForeignKey("movies.id", ondelete="CASCADE"), index=True)
    person_id: Mapped[int] = mapped_column(Integer, ForeignKey("people.id", ondelete="CASCADE"), index=True)
    job: Mapped[str] = mapped_column(String(100), index=True)  # Director, Writer, Composer


class Keyword(Base):
    __tablename__ = "keywords"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tmdb_keyword_id: Mapped[Optional[int]] = mapped_column(Integer, unique=True, index=True, nullable=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True)


class MovieKeyword(Base):
    __tablename__ = "movie_keywords"
    __table_args__ = (
        UniqueConstraint("movie_id", "keyword_id", name="uq_movie_keyword"),
        Index("idx_movie_keywords_kw", "keyword_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    movie_id: Mapped[int] = mapped_column(Integer, ForeignKey("movies.id", ondelete="CASCADE"), index=True)
    keyword_id: Mapped[int] = mapped_column(Integer, ForeignKey("keywords.id", ondelete="CASCADE"), index=True)


class SearchQuery(Base):
    __tablename__ = "search_queries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(100), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    raw_query: Mapped[str] = mapped_column(String(500))
    parsed_intent: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    result_count: Mapped[Optional[int]] = mapped_column(Integer, default=0)
    clicked_movie_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("movies.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))


class ModelVersion(Base):
    __tablename__ = "model_versions"

    id: Mapped[str] = mapped_column(String(100), primary_key=True)  # 'content-tfidf-v1', 'hybrid-v3'
    trained_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    train_window: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    metrics: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)  # {"recall@10": ..., "ndcg@10": ...}
    artifact_uri: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)


class IngestionCheckpoint(Base):
    __tablename__ = "ingestion_checkpoints"

    job_name: Mapped[str] = mapped_column(String(100), primary_key=True)  # 'tmdb_popular_sync'
    last_page: Mapped[int] = mapped_column(Integer, default=1)
    last_synced_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_key: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="idle")  # 'running', 'idle', 'completed', 'error'
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
