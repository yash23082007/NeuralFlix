import os
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
try:
    client = MongoClient(MONGO_URI)
    # The ismaster command is cheap and does not require auth.
    client.admin.command('ismaster')
    print("MongoDB connection successful")
except ConnectionFailure:
    print("Server not available")

db = client.movie_recommendation

# Collections
movies_collection = db.movies
users_collection = db.users
watch_history_collection = db.watch_history

def get_db():
    return db

def init_db():
    # Create indexes for optimized querying (compound indexes)
    movies_collection.create_index([("title", "text")])
    movies_collection.create_index([("genres", 1)])
    movies_collection.create_index([("rating", -1)])
    movies_collection.create_index([("popularity_score", -1)])
    
    print("Database indexes initialized.")
