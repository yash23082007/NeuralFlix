import os
import sys
import logging
from dotenv import load_dotenv
from pymongo import MongoClient

# Add root folder to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import init_engines, sync_session_factory, sync_engine
from db.models import Base, Movie, User, WatchEvent, Rating

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("MIGRATOR")

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DATABASE_URL = os.getenv("DATABASE_URL", "")

def migrate():
    logger.info("=" * 60)
    logger.info("  NeuralFlix MongoDB to SQL Migration Script")
    logger.info("=" * 60)

    # 1. Connect to MongoDB
    logger.info("Connecting to MongoDB...")
    try:
        mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        # Test connection
        mongo_client.admin.command("ismaster")
        mongo_db = mongo_client.neuralflix
        logger.info("✅ Connected to MongoDB successfully.")
    except Exception as e:
        logger.error(f"❌ Failed to connect to MongoDB ({e}). Ensure MongoDB is running and MONGO_URI is correct.")
        logger.error("Migration aborted.")
        return

    # 2. Connect to SQL and initialize tables
    logger.info("Initializing SQL Database...")
    init_engines()
    try:
        Base.metadata.create_all(bind=sync_engine)
        logger.info("✅ SQL database tables initialized successfully.")
    except Exception as e:
        logger.error(f"❌ Failed to initialize SQL tables: {e}")
        logger.error("Migration aborted.")
        return

    db = sync_session_factory()

    try:
        # 3. Migrate Users
        logger.info("Migrating Users...")
        mongo_users = list(mongo_db.users.find({}))
        logger.info(f"Found {len(mongo_users)} users in MongoDB.")
        
        user_count = 0
        for u in mongo_users:
            # Check if user already exists in SQL
            user_id = str(u.get("id") or u.get("_id"))
            exists = db.query(User).filter(User.id == user_id).first()
            if exists:
                continue

            sql_user = User(
                id=user_id,
                email=u.get("email"),
                username=u.get("username") or u.get("name"),
                hashed_password=u.get("hashed_password", "no-password-migrated"),
                preferences_json=u.get("preferences_json") or {"pref_genres": u.get("pref_genres", [])}
            )
            db.add(sql_user)
            user_count += 1
        
        db.commit()
        logger.info(f"✅ Migrated {user_count} new users to SQL.")

        # 4. Migrate Movies
        logger.info("Migrating Movies...")
        mongo_movies = list(mongo_db.movies.find({}))
        logger.info(f"Found {len(mongo_movies)} movies in MongoDB.")

        movie_count = 0
        for m in mongo_movies:
            tmdb_id = m.get("tmdb_id") or m.get("_id")
            if not tmdb_id:
                continue
            
            try:
                tmdb_id = int(tmdb_id)
            except ValueError:
                continue

            exists = db.query(Movie).filter(Movie.tmdb_id == tmdb_id).first()
            if exists:
                continue

            sql_movie = Movie(
                tmdb_id=tmdb_id,
                imdb_id=m.get("imdb_id"),
                title=m.get("title", "Unknown"),
                overview=m.get("overview", ""),
                tagline=m.get("tagline"),
                genres=m.get("genres", []),
                language=m.get("language", "en"),
                release_date=m.get("release_date"),
                runtime=m.get("runtime"),
                poster_url=m.get("poster_url"),
                backdrop_url=m.get("backdrop_url"),
                tmdb_rating=m.get("rating") or m.get("vote_average") or 0.0,
                tmdb_votes=m.get("votes") or m.get("vote_count") or 0,
                popularity_score=m.get("popularity_score") or 0.0,
                platforms=m.get("platforms", []),
                cinema_region=m.get("cinema_region"),
                is_indian=m.get("is_indian", False),
                indian_industry=m.get("indian_industry"),
                director=m.get("director"),
                budget=m.get("budget"),
                box_office=m.get("box_office"),
                awards=m.get("awards"),
                keywords=m.get("keywords", []),
                cast_members=m.get("cast") or m.get("cast_members")
            )
            db.add(sql_movie)
            movie_count += 1
        
        db.commit()
        logger.info(f"✅ Migrated {movie_count} new movies to SQL.")

        # 5. Migrate Watch History
        logger.info("Migrating Watch History...")
        mongo_history = list(mongo_db.watch_history.find({}))
        logger.info(f"Found {len(mongo_history)} watch history records in MongoDB.")

        history_count = 0
        for h in mongo_history:
            user_id = str(h.get("user_id"))
            # Movie ID could be string tmdb_id or object id, let's match to SQL Movie.id or tmdb_id
            movie_id_str = str(h.get("movie_id"))
            
            # Find the movie in SQL
            movie = None
            if movie_id_str.isdigit():
                movie = db.query(Movie).filter(Movie.tmdb_id == int(movie_id_str)).first()
            if not movie:
                # Try finding by title or other matching fields
                continue
                
            # Create WatchEvent in SQL
            watch_event = WatchEvent(
                user_id=user_id,
                movie_id=movie.id,
                watch_time=h.get("watch_time", 0),
                completed=h.get("completed", False)
            )
            db.add(watch_event)
            
            # If rating exists, migrate to Rating
            if "rating" in h:
                rating = Rating(
                    user_id=user_id,
                    movie_id=movie.id,
                    rating=float(h["rating"])
                )
                db.add(rating)

            history_count += 1
        
        db.commit()
        logger.info(f"✅ Migrated {history_count} watch history records to SQL.")

        logger.info("=" * 60)
        logger.info("  Migration completed successfully!")
        logger.info("=" * 60)

    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error during migration: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
