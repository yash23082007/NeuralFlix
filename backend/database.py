import os
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    client.admin.command('ismaster')
    print("✅ MongoDB connection successful")
except ConnectionFailure:
    print("❌ MongoDB server not available")

db = client.neuralflix

# MongoDB Collections
movies_collection = db.movies
users_collection = db.users
recommendations_collection = db.recommendations
watch_history_collection = db.watch_history

# Supabase / PostgreSQL Connection for Tracking Events
DATABASE_URL = os.getenv("DATABASE_URL", "")
ASYNC_DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

# SQLModel / Async SQLAlchemy setup for relational tracking data
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

if ASYNC_DATABASE_URL and ASYNC_DATABASE_URL != "":
    try:
        # Create Postgres engine (using asyncpg)
        engine = create_async_engine(
            ASYNC_DATABASE_URL,
            pool_size=20,
            max_overflow=10,
            pool_pre_ping=True
        )
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=AsyncSession)
        print("✅ PostgreSQL connection initialized via asyncpg")
    except Exception as e:
        print(f"❌ PostgreSQL connection failed: {e}")
        engine = None
        SessionLocal = None
else:
    engine = None
    SessionLocal = None
    print("⚠️ DATABASE_URL missing; PostgreSQL tracking disabled.")

async def get_async_session():
    if SessionLocal:
        async with SessionLocal() as session:
            yield session
    else:
        yield None

def get_db():
    return db

def init_db():
    """Create all indexes for optimized querying."""
    # Text index for full-text search on title + overview
    try:
        movies_collection.create_index([("title", "text"), ("overview", "text")])
    except Exception:
        pass  # Index may already exist
    
    movies_collection.create_index([("genres", 1)])
    movies_collection.create_index([("rating", -1)])
    movies_collection.create_index([("popularity_score", -1)])
    movies_collection.create_index([("language", 1)])
    movies_collection.create_index([("tmdb_id", 1)], unique=True, sparse=True)
    movies_collection.create_index([("year", -1)])
    
    print("✅ Database indexes initialized.")
