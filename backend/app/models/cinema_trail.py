from sqlalchemy import Column, Integer, String, JSON, DateTime
from sqlalchemy.sql import func
from app.models.base import Base

class CinemaTrail(Base):
    __tablename__ = "cinema_trails"

    id = Column(Integer, primary_key=True, index=True)
    theme = Column(String, nullable=False)
    description = Column(String, nullable=True)
    movies = Column(JSON, nullable=False) # List of tmdb_ids
    created_at = Column(DateTime(timezone=True), server_default=func.now())
