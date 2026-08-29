"""
Movie Intelligence Platform — Movie Availability Model

Tracks streaming platform availability per region.
Stores checked_at and expires_at — freshness is computed at response time.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class MovieAvailability(Base):
    __tablename__ = "movie_availability"
    __table_args__ = (
        UniqueConstraint(
            "movie_id", "region", "platform",
            name="uq_availability_movie_region_platform"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    movie_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("movies.id"), index=True
    )
    region: Mapped[str] = mapped_column(String(10))  # e.g. "IN", "US"
    platform: Mapped[str] = mapped_column(String(100))  # e.g. "Netflix", "Prime Video"
    source: Mapped[str] = mapped_column(String(50), default="watchmode")
    availability_type: Mapped[str] = mapped_column(
        String(20), default="stream"
    )  # stream, rent, buy

    # Freshness — computed at response time, not stored as stale hours
    checked_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationship
    movie = relationship("Movie", back_populates="availability")

    @property
    def age_hours(self) -> int:
        """How many hours since last check."""
        return int((datetime.utcnow() - self.checked_at).total_seconds() / 3600)

    @property
    def is_fresh(self) -> bool:
        """Is this data still within its freshness window?"""
        if self.expires_at is None:
            return self.age_hours < 24  # default 24h freshness
        return datetime.utcnow() < self.expires_at

    def __repr__(self) -> str:
        return f"<Availability movie={self.movie_id} {self.platform} ({self.region})>"
