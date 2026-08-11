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
_trails_cache: Optional[list] = None

# Built-in curated fallback trails
DEFAULT_TRAILS = [
    {
        "id": "hindi-parallel-to-iranian-realism",
        "title": "From Hindi Parallel Cinema to Iranian Social Realism",
        "description": "Explore quiet realism, moral ambiguity, and ordinary people under societal pressure.",
        "region": "global",
        "themeTags": ["Social Realism", "Morality", "Quiet Realism", "Parallel Cinema"],
        "movies": [
            {"tmdb_id": 353569, "title": "Masaan", "year": 2015, "language": "hi", "genres": ["Drama"]},
            {"tmdb_id": 257094, "title": "Court", "year": 2014, "language": "mr", "genres": ["Drama"]},
            {"tmdb_id": 64688, "title": "A Separation", "year": 2011, "language": "fa", "genres": ["Drama", "Mystery"]},
            {"tmdb_id": 39397, "title": "Taste of Cherry", "year": 1997, "language": "fa", "genres": ["Drama"]},
            {"tmdb_id": 390051, "title": "The Salesman", "year": 2016, "language": "fa", "genres": ["Drama", "Thriller"]}
        ],
        "transitionReasons": [
            "Masaan and Court both examine how archaic social institutions press against personal grief in modern India.",
            "Court and A Separation shift from institutional critique to intimate moral ambiguity within domestic space.",
            "A Separation and Taste of Cherry move deeper into minimalist Iranian realism and contemplative pacing.",
            "Taste of Cherry and The Salesman bridge existential reflection with intense psychological tension."
        ],
        "isEditorial": True,
        "updatedAt": "2026-08-01T00:00:00Z"
    },
    {
        "id": "korean-thriller-to-nordic-noir",
        "title": "Korean Thrillers to Nordic Noir",
        "description": "From explosive revenge & suspense in Seoul to freezing psychological tension in Scandinavia.",
        "region": "global",
        "themeTags": ["Suspense", "Noir", "Psychological Thriller", "Atmospheric"],
        "movies": [
            {"tmdb_id": 496243, "title": "Parasite", "year": 2019, "language": "ko", "genres": ["Thriller", "Drama"]},
            {"tmdb_id": 491584, "title": "Burning", "year": 2018, "language": "ko", "genres": ["Mystery", "Drama"]},
            {"tmdb_id": 447332, "title": "The Quiet Girl", "year": 2022, "language": "ga", "genres": ["Drama"]}
        ],
        "transitionReasons": [
            "Parasite and Burning explore class resentment veiled beneath razor-sharp suspense.",
            "Burning transitions into slow-burn atmospheric mystery spanning global boundaries."
        ],
        "isEditorial": True,
        "updatedAt": "2026-08-01T00:00:00Z"
    }
]


def _load_trails() -> list:
    global _trails_cache
    if _trails_cache:
        return _trails_cache

    candidate_paths = [
        os.path.join(os.path.dirname(__file__), "..", "data", "cinema_trails.json"),
        os.path.join(os.path.dirname(__file__), "data", "cinema_trails.json"),
        "data/cinema_trails.json",
        "backend/data/cinema_trails.json",
    ]

    for path in candidate_paths:
        try:
            if os.path.exists(path):
                with open(path, "r", encoding="utf-8") as f:
                    loaded = json.load(f)
                    if loaded:
                        _trails_cache = loaded
                        return _trails_cache
        except Exception:
            pass

    _trails_cache = DEFAULT_TRAILS
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
