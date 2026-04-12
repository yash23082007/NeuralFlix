import os
import logging
import asyncio
from typing import Optional, AsyncGenerator
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from tenacity import retry, stop_after_attempt, wait_exponential
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("DB_FACTORY")

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DATABASE_URL = os.getenv("DATABASE_URL", "")
ASYNC_DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://") if DATABASE_URL else ""

class DatabaseManager:
    """Manages database connections with lazy initialization and retries."""
    
    _mongo_client: Optional[MongoClient] = None
    _pg_engine = None
    _pg_session_factory = None

    @classmethod
    @retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=1, min=2, max=10))
    def get_mongo_client(cls) -> MongoClient:
        if cls._mongo_client is None:
            try:
                cls._mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
                # Rapid health check
                cls._mongo_client.admin.command('ismaster')
                logger.info("✅ MongoDB connection established")
            except (ConnectionFailure, ServerSelectionTimeoutError) as e:
                logger.error(f"❌ MongoDB connection failed: {e}")
                raise
        return cls._mongo_client

    @classmethod
    def get_mongo_db(cls):
        client = cls.get_mongo_client()
        return client.neuralflix

    @classmethod
    def get_pg_engine(cls):
        if cls._pg_engine is None and ASYNC_DATABASE_URL:
            try:
                cls._pg_engine = create_async_engine(
                    ASYNC_DATABASE_URL,
                    pool_size=20,
                    max_overflow=10,
                    pool_pre_ping=True
                )
                cls._pg_session_factory = sessionmaker(
                    autocommit=False, 
                    autoflush=False, 
                    bind=cls._pg_engine, 
                    class_=AsyncSession
                )
                logger.info("✅ PostgreSQL engine initialized")
            except Exception as e:
                logger.error(f"❌ PostgreSQL initialization error: {e}")
                cls._pg_engine = None
        return cls._pg_engine

    @classmethod
    async def get_pg_session(cls) -> AsyncGenerator[AsyncSession, None]:
        if cls._pg_session_factory is None:
            cls.get_pg_engine()
        
        if cls._pg_session_factory:
            async with cls._pg_session_factory() as session:
                yield session
        else:
            yield None

# ─── Module-Level Accessors ─────────────────────────────────
# These provide the `from database import movies_collection` pattern
# that routes/*.py files expect

def get_db():
    return DatabaseManager.get_mongo_db()

async def get_async_session():
    async for session in DatabaseManager.get_pg_session():
        yield session

# Lazy collection accessors
def get_movies_collection():
    return get_db().movies

def get_users_collection():
    return get_db().users

def get_recommendations_collection():
    return get_db().recommendations

def get_watch_history_collection():
    return get_db().watch_history


# ─── Module-level collection objects (lazy proxy) ────────────
# For backwards compatibility: `from database import movies_collection`
class _LazyCollection:
    """Lazy proxy that defers MongoDB connection until first use."""
    def __init__(self, collection_name: str):
        self._name = collection_name
        self._col = None
    
    def _get(self):
        if self._col is None:
            self._col = get_db()[self._name]
        return self._col
    
    def __getattr__(self, name):
        return getattr(self._get(), name)

movies_collection = _LazyCollection("movies")
users_collection = _LazyCollection("users")
recommendations_collection = _LazyCollection("recommendations")
watch_history_collection = _LazyCollection("watch_history")

# SQLAlchemy session factory (sync, for recommendation_engine.py)
SessionLocal = None
if DATABASE_URL:
    try:
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker as sync_sessionmaker
        _sync_engine = create_engine(DATABASE_URL, pool_size=5, max_overflow=5, pool_pre_ping=True)
        SessionLocal = sync_sessionmaker(bind=_sync_engine, autocommit=False, autoflush=False)
        logger.info("✅ Sync PostgreSQL SessionLocal initialized")
    except Exception as e:
        logger.warning(f"Sync PG session not available: {e}")


def init_db():
    """Create all indexes for optimized querying."""
    db = get_db()
    movies_col = db.movies
    
    try:
        movies_col.create_index([("title", "text"), ("overview", "text")])
    except Exception:
        pass  # Index may already exist
    
    movies_col.create_index([("genres", 1)])
    movies_col.create_index([("rating", -1)])
    movies_col.create_index([("popularity_score", -1)])
    movies_col.create_index([("language", 1)])
    movies_col.create_index([("tmdb_id", 1)], unique=True, sparse=True)
    movies_col.create_index([("year", -1)])
    
    # Compound indexes for 1M+ dataset performance
    movies_col.create_index([("language", 1), ("rating", -1)])
    movies_col.create_index([("year", -1), ("popularity_score", -1)])
    movies_col.create_index([("status", 1)])
    movies_col.create_index([("imdb_id", 1)], sparse=True)
    movies_col.create_index([("cinema_region", 1)])
    
    logger.info("✅ Database indexes initialized (optimized for 1M+ movies).")
