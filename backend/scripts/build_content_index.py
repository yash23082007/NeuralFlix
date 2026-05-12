import os
import sys
import logging

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

os.environ.setdefault("CONTENT_INDEX_PATH", os.path.join(backend_dir, "models", "content_index.faiss"))
os.environ.setdefault("CONTENT_MAP_PATH", os.path.join(backend_dir, "models", "movie_id_map.pkl"))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("BUILD_CONTENT_INDEX")


def main():
    from ml.content_based import content_engine
    from database import movies_collection

    logger.info("Fetching movies from database...")
    movies = list(movies_collection.find({
        "overview": {"$ne": "", "$exists": True},
        "title": {"$exists": True},
    }, {
        "tmdb_id": 1, "title": 1, "overview": 1, "genres": 1,
        "director": 1, "cast": 1, "id": 1,
    }))

    if not movies:
        logger.warning("No movies found in database. Loading seed data...")
        try:
            from scripts.seed_dummy_data import seed_all
            seed_all()
            movies = list(movies_collection.find({}, {
                "tmdb_id": 1, "title": 1, "overview": 1, "genres": 1,
                "director": 1, "cast": 1, "id": 1,
            }))
        except Exception as exc:
            logger.error(f"Could not seed data: {exc}")
            return

    logger.info(f"Building FAISS index for {len(movies)} movies...")
    content_engine.build_index(movies)
    logger.info(f"Index saved to {os.environ['CONTENT_INDEX_PATH']}")
    logger.info(f"Movie ID map saved to {os.environ['CONTENT_MAP_PATH']}")


if __name__ == "__main__":
    main()
