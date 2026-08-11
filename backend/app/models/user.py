"""
NeuralFlix — User Model

SQLAlchemy 2.0 typed model. JSON for array/dict columns.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(100), primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(255), default="")
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    auth_type: Mapped[str] = mapped_column(String(50), default="local")
    onboarded: Mapped[bool] = mapped_column(Boolean, default=False)

    # Preferences stored as JSON — no custom ARRAY type
    pref_genres: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    preferences_json: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )

    # Relationships
    watch_events = relationship("WatchEvent", back_populates="user", lazy="selectin")
    ratings = relationship("Rating", back_populates="user", lazy="selectin")
    watchlist_items = relationship("WatchlistItem", back_populates="user", lazy="selectin")
    taste_control = relationship("TasteControl", back_populates="user", uselist=False, lazy="selectin")

    def __repr__(self) -> str:
        return f"<User id={self.id} username={self.username}>"
