import asyncio
import os
import sys

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import engine, Base
from app.models.movie import Movie
from app.seed.curated_tmdb_ids import CLASSICS, WORLD_CINEMA, INDIE_GEMS

async def main():
    print("Seeding database...")
    Base.metadata.create_all(bind=engine)
    print("Done!")

if __name__ == "__main__":
    asyncio.run(main())
