import os
import sys
import logging
import asyncio

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

os.environ.setdefault("CONTENT_INDEX_PATH", os.path.join(backend_dir, "models", "content_index.faiss"))
os.environ.setdefault("CONTENT_MAP_PATH", os.path.join(backend_dir, "models", "movie_id_map.pkl"))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("BUILD_CONTENT_INDEX")


async def main():
    from ml.content_based import content_engine
    from database import movies_collection, SAMPLE_MOVIES

    logger.info("Fetching movies from database...")
    try:
        cursor = movies_collection.find({
            "overview": {"$ne": "", "$exists": True},
            "title": {"$exists": True},
        }, {
            "tmdb_id": 1, "title": 1, "overview": 1, "genres": 1,
            "director": 1, "cast": 1, "id": 1,
        })
        movies = await cursor.to_list(length=None)
    except Exception as e:
        logger.error(f"Error fetching from MongoDB: {e}")
        movies = []

    if not movies:
        logger.warning("No movies found in database. Using local SAMPLE_MOVIES fallback...")
        movies = SAMPLE_MOVIES

    logger.info(f"Building content index for {len(movies)} movies...")
    # build_index is a CPU-bound operation, let's run it in a thread
    await asyncio.to_thread(content_engine.build_index, movies)
    logger.info("Content index successfully built and saved to models/ directory")


if __name__ == "__main__":
    asyncio.run(main())

