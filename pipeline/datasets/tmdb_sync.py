"""Resumable TMDB catalog sync.

Run from the repository root with TMDB credentials configured in the environment.
The job is intentionally opt-in and never runs during a user request.
"""
import argparse
import asyncio
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))
from sqlalchemy import select
from app.database import async_session
from app.models.movie import Movie
from app.services.tmdb_service import discover_movies, fetch_movie_details, parse_tmdb_movie

CHECKPOINT = Path("pipeline/.tmdb-checkpoint.json")

async def sync(max_pages: int) -> int:
    state = json.loads(CHECKPOINT.read_text()) if CHECKPOINT.exists() else {"page": 1}
    inserted = 0
    async with async_session() as db:
        for page in range(int(state["page"]), max_pages + 1):
            listing = await discover_movies(page)
            for item in listing.get("results", []):
                tmdb_id = item.get("id")
                if not tmdb_id:
                    continue
                exists = await db.scalar(select(Movie.id).where(Movie.tmdb_id == tmdb_id))
                if exists:
                    continue
                details = await fetch_movie_details(tmdb_id)
                if details:
                    db.add(Movie(**parse_tmdb_movie(details)))
                    inserted += 1
            await db.commit()
            CHECKPOINT.parent.mkdir(parents=True, exist_ok=True)
            CHECKPOINT.write_text(json.dumps({"page": page + 1}, indent=2))
    return inserted

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-pages", type=int, default=1)
    args = parser.parse_args()
    print(f"Inserted {asyncio.run(sync(args.max_pages))} movies")
