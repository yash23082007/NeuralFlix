"""
NeuralFlix — Recommendation Feedback, Watchlist, Rating, Impression Models

Four models that capture user interaction with the recommendation system:
- RecommendationFeedback: "Not for me" + reason
- WatchlistItem: user's saved movies
- Rating: explicit 1-5 star rating
- RecommendationImpression: what was shown, when, and what happened
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class RecommendationFeedback(Base):
    """User says 'Not for me' with a specific reason."""
    __tablename__ = "recommendation_feedback"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(
        String(100), ForeignKey("users.id"), index=True
    )
    movie_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("movies.id"), index=True
    )
    # Feedback reason: too_slow, too_dark, wrong_language, not_my_genre,
    # already_watched, not_available, hide_similar
    feedback_type: Mapped[str] = mapped_column(String(50))
    ranking_version: Mapped[str] = mapped_column(String(100), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<Feedback user={self.user_id} movie={self.movie_id} type={self.feedback_type}>"


class WatchlistItem(Base):
    """A movie saved to the user's watchlist."""
    __tablename__ = "watchlist_items"
    __table_args__ = (
        UniqueConstraint("user_id", "movie_id", name="uq_watchlist_user_movie"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(
        String(100), ForeignKey("users.id"), index=True
    )
    movie_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("movies.id"), index=True
    )
    added_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="watchlist_items")

    def __repr__(self) -> str:
        return f"<WatchlistItem user={self.user_id} movie={self.movie_id}>"


class Rating(Base):
    """Explicit user rating (1.0 – 5.0)."""
    __tablename__ = "ratings"
    __table_args__ = (
        UniqueConstraint("user_id", "movie_id", name="uq_rating_user_movie"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(
        String(100), ForeignKey("users.id"), index=True
    )
    movie_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("movies.id"), index=True
    )
    rating: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="ratings")
    movie = relationship("Movie", back_populates="ratings")

    def __repr__(self) -> str:
        return f"<Rating user={self.user_id} movie={self.movie_id} rating={self.rating}>"


class RecommendationImpression(Base):
    """Tracks what recommendations were shown and user reactions.
    
    This is the foundation for honest future evaluation.
    Do not train on this data until you have enough volume and consent.
    """
    __tablename__ = "recommendation_impressions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(
        String(100), ForeignKey("users.id"), index=True
    )
    movie_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("movies.id"), index=True
    )
    ranking_version: Mapped[str] = mapped_column(String(100), default="")
    position: Mapped[int] = mapped_column(Integer, default=0)
    context: Mapped[str] = mapped_column(
        String(50), default="home_feed"
    )  # home_feed, taste_refresh, similar, search

    # Interaction timestamps — populated as events occur
    shown_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    clicked_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    saved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    dismissed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    watched_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    def __repr__(self) -> str:
        return f"<Impression user={self.user_id} movie={self.movie_id} pos={self.position}>"
