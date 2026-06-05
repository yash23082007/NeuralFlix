from sqlalchemy import Column, Integer, String, Float, Text, DateTime, Boolean, JSON, ARRAY, ForeignKey, Index
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime
from sqlalchemy.ext.compiler import compiles

# Map ARRAY type to JSON for SQLite dialect compatibility
@compiles(ARRAY, "sqlite")
def compile_array_sqlite(element, compiler, **kw):
    return "JSON"

try:
    from pgvector.sqlalchemy import Vector
    HAS_PGVECTOR = True
except ImportError:
    HAS_PGVECTOR = False

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(String(100), primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    name = Column(String(255), default="")
    is_admin = Column(Boolean, default=False)
    auth_type = Column(String(50), default="local")
    onboarded = Column(Boolean, default=False)
    pref_genres = Column(ARRAY(String), default=[])
    created_at = Column(DateTime, default=datetime.utcnow)
    preferences_json = Column(JSON, default=dict)

    watch_events = relationship("WatchEvent", back_populates="user")
    ratings = relationship("Rating", back_populates="user")


class Movie(Base):
    __tablename__ = "movies"
    __table_args__ = (
        Index("idx_popularity_desc", "popularity_score"),
        Index("idx_language_popularity", "language", "popularity_score"),
        Index("idx_region_popularity", "cinema_region", "popularity_score"),
        Index("idx_year_popularity", "year", "popularity_score"),
        Index("idx_rating_desc", "tmdb_rating"),
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tmdb_id = Column(Integer, unique=True, index=True, nullable=False)
    imdb_id = Column(String(50), unique=True, index=True)
    movielens_id = Column(Integer, unique=True, index=True)
    year = Column(Integer, index=True)

    title = Column(String(500), index=True, nullable=False)
    overview = Column(Text)
    tagline = Column(Text)
    genres = Column(ARRAY(String))
    language = Column(String(20))
    release_date = Column(String(50))
    runtime = Column(Integer)

    poster_url = Column(String(500))
    backdrop_url = Column(String(500))
    tmdb_rating = Column(Float, default=0.0)
    tmdb_votes = Column(Integer, default=0)
    popularity_score = Column(Float, default=0.0)

    # Multi-source ratings
    imdb_rating = Column(Float)
    imdb_votes = Column(Integer)
    rt_rating = Column(String(20))
    metacritic = Column(String(20))
    filmfare_wins = Column(Integer, default=0)
    oscar_wins = Column(Integer, default=0)

    platforms = Column(ARRAY(String))
    ott_global = Column(JSON)
    cinema_region = Column(String(50), index=True)
    is_indian = Column(Boolean, default=False)
    indian_industry = Column(String(50))

    director = Column(String(255))
    cast_members = Column(JSON)
    trailer_key = Column(String(200))
    keywords = Column(ARRAY(String))
    budget = Column(Integer)
    box_office = Column(String(100))
    awards = Column(Text)

    if HAS_PGVECTOR:
        embedding = Column(Vector(384))
    else:
        embedding = Column(JSON)

    created_at = Column(DateTime, default=datetime.utcnow)

    ratings = relationship("Rating", back_populates="movie")


class Rating(Base):
    __tablename__ = "ratings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String(100), ForeignKey("users.id"), index=True)
    movie_id = Column(Integer, ForeignKey("movies.id"), index=True)
    rating = Column(Float, nullable=False)
    timestamp = Column(Integer, default=lambda: int(datetime.utcnow().timestamp()), index=True)

    user = relationship("User", back_populates="ratings")
    movie = relationship("Movie", back_populates="ratings")


class WatchEvent(Base):
    __tablename__ = "watch_events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String(100), ForeignKey("users.id"), index=True, nullable=False)
    movie_id = Column(Integer, ForeignKey("movies.id"), index=True, nullable=False)
    watch_time = Column(Integer, default=0)
    completed = Column(Boolean, default=False)
    timestamp = Column(Integer, default=lambda: int(datetime.utcnow().timestamp()), index=True)

    user = relationship("User", back_populates="watch_events")
