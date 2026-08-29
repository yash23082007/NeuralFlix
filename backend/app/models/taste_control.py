"""
NeuralFlix — Taste Control Model

Five sliders that control the recommendation engine:
  Familiar ↔ Adventurous  (discovery: 0-100)
  Local ↔ Global          (global_taste: 0-100)
  Light ↔ Challenging     (challenge: 0-100)
  Fast-paced ↔ Slow-burn  (pace: 0-100)
  Popular ↔ Hidden Gems   (hidden_gems: 0-100)

Plus a diversity boost toggle.
"""

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class TasteControl(Base):
    __tablename__ = "taste_controls"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(
        String(100), ForeignKey("users.id"), unique=True, index=True
    )

    # Familiar (0) ↔ Adventurous (100)
    discovery: Mapped[int] = mapped_column(Integer, default=50)
    # Local (0) ↔ Global (100)
    global_taste: Mapped[int] = mapped_column(Integer, default=50)
    # Light (0) ↔ Challenging (100)
    challenge: Mapped[int] = mapped_column(Integer, default=50)
    # Fast-paced (0) ↔ Slow-burn (100)
    pace: Mapped[int] = mapped_column(Integer, default=50)
    # Popular (0) ↔ Hidden Gems (100)
    hidden_gems: Mapped[int] = mapped_column(Integer, default=50)

    # Diversity boost — adds extra genre/region/language variety
    diversity_boost: Mapped[bool] = mapped_column(Boolean, default=True)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relationship
    user = relationship("User", back_populates="taste_control")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if kwargs.get("discovery") is None:
            self.discovery = 50
        if kwargs.get("global_taste") is None:
            self.global_taste = 50
        if kwargs.get("challenge") is None:
            self.challenge = 50
        if kwargs.get("pace") is None:
            self.pace = 50
        if kwargs.get("hidden_gems") is None:
            self.hidden_gems = 50
        if kwargs.get("diversity_boost") is None:
            self.diversity_boost = True

    def __repr__(self) -> str:
        return (
            f"<TasteControl user={self.user_id} "
            f"disc={self.discovery} glob={self.global_taste} "
            f"chal={self.challenge} pace={self.pace} gems={self.hidden_gems}>"
        )
