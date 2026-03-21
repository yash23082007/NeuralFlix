from sqlalchemy import Column, Integer, String, Float, Text, ARRAY, JSON
from sqlalchemy.orm import declarative_base

try:
    from pgvector.sqlalchemy import Vector
    HAS_PGVECTOR = True
except ImportError:
    HAS_PGVECTOR = False

Base = declarative_base()

class PostgresMovie(Base):
    """
    SQLAlchemy Model for the Supabase (PostgreSQL) 'movies' table.
    Unifies TMDB, IMDb, and OMDb data with imdb_id deduplication.
    """
    __tablename__ = 'movies'

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tmdb_id = Column(Integer, unique=True, index=True, nullable=False)
    imdb_id = Column(String(50), unique=True, index=True)
    movielens_id = Column(Integer, unique=True, index=True)
    
    # Core Metadata
    title = Column(String(500), index=True, nullable=False)
    overview = Column(Text)
    tagline = Column(Text)
    genres = Column(ARRAY(String))
    language = Column(String(20))
    release_date = Column(String(50))
    runtime = Column(Integer)
    
    # Availabilities
    platforms = Column(ARRAY(String))
    
    # Scores & Ratings unified from BIG THREE
    tmdb_rating = Column(Float)
    tmdb_votes = Column(Integer)
    popularity_score = Column(Float)
    
    imdb_rating = Column(Float)
    imdb_votes = Column(Integer)
    
    rt_rating = Column(String(20))
    metacritic = Column(String(20))
    box_office = Column(String(100))
    awards = Column(Text)
    
    # Media
    poster_url = Column(Text)
    backdrop_url = Column(Text)
    trailer_key = Column(String(200))
    
    # People
    director = Column(String(255))
    cast_members = Column(JSON)

    # ML: Semantic Embeddings (384 dims for all-MiniLM-L6-v2)
    if HAS_PGVECTOR:
        embedding = Column(Vector(384))
