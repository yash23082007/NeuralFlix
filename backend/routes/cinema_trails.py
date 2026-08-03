"""
NeuralFlix Cinema Trails API — routes/cinema_trails.py

Curated discovery journeys across global cinema.
Each trail connects films through editorial transition reasons.

Cultural explanations are NOT auto-generated — they are editorially curated.
"""

import json
import os
from fastapi import APIRouter, HTTPException
from typing import List, Optional

router = APIRouter()

# Load curated trails from static JSON
_TRAILS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "cinema_trails.json")
_trails_cache: Optional[list] = None


def _load_trails() -> list:
    global _trails_cache
    if _trails_cache is not None:
        return _trails_cache
    try:
        with open(_TRAILS_PATH, "r", encoding="utf-8") as f:
            _trails_cache = json.load(f)
    except FileNotFoundError:
        _trails_cache = []
    return _trails_cache


@router.get("")
async def list_cinema_trails():
    """List all available cinema trails (summary view)."""
    trails = _load_trails()
    return {
        "trails": [
            {
                "id": t["id"],
                "title": t["title"],
                "description": t["description"],
                "region": t["region"],
                "themeTags": t["themeTags"],
                "movieCount": len(t.get("movieIds", [])),
                "isEditorial": t.get("isEditorial", True),
                "updatedAt": t.get("updatedAt"),
            }
            for t in trails
        ],
        "total": len(trails),
    }


@router.get("/{trail_id}")
async def get_cinema_trail(trail_id: str):
    """
    Get a specific cinema trail with enriched movie data and transition reasons.
    """
    trails = _load_trails()
    trail = next((t for t in trails if t["id"] == trail_id), None)
    if not trail:
        raise HTTPException(status_code=404, detail="Cinema trail not found")

    # Try to enrich movie data from the database
    enriched_movies = []
    try:
        from database import movies_collection
        for movie_stub in trail.get("movies", []):
            tmdb_id = movie_stub.get("tmdb_id")
            if tmdb_id:
                db_movie = await movies_collection.find_one(
                    {"tmdb_id": tmdb_id}, {"_id": 0}
                )
                if db_movie:
                    enriched_movies.append(db_movie)
                else:
                    enriched_movies.append(movie_stub)
            else:
                enriched_movies.append(movie_stub)
    except Exception:
        enriched_movies = trail.get("movies", [])

    return {
        "id": trail["id"],
        "title": trail["title"],
        "description": trail["description"],
        "region": trail["region"],
        "themeTags": trail["themeTags"],
        "movies": enriched_movies,
        "transitionReasons": trail["transitionReasons"],
        "createdBy": trail.get("createdBy", "editorial"),
        "isEditorial": trail.get("isEditorial", True),
        "updatedAt": trail.get("updatedAt"),
    }
