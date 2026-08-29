"""
Movie Intelligence Platform — SQLAlchemy 2.0 Declarative Base

All models inherit from this Base. Uses modern Mapped/mapped_column syntax.
JSON type is used for arrays in both SQLite and PostgreSQL — no custom types.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all Movie Intelligence Platform ORM models."""
    pass
