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
DATABASE_URL = os.getenv("DATABASE_URL")

# SQLAlchemy setup for relational tracking data
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

if DATABASE_URL:
    try:
        # Create Supabase Postgres engine (using psycopg2)
        engine = create_engine(DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        print("✅ Supabase PostgreSQL connection initialized via SQLAlchemy")
    except Exception as e:
        print(f"❌ Supabase PostgreSQL connection failed: {e}")
        engine = None
        SessionLocal = None
else:
    engine = None
    SessionLocal = None
    print("⚠️ DATABASE_URL missing; PostgreSQL tracking disabled.")

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
