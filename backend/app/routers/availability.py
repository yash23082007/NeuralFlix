"""
NeuralFlix — Availability Router
"""

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/movies", tags=["Availability"])


@router.get("/{movie_id}/availability")
async def get_availability(movie_id: int):
    """Get streaming availability for a movie (stub)."""
    return {
        "movie_id": movie_id,
        "platforms": [
            {"name": "Netflix", "type": "flatrate"},
            {"name": "Amazon Video", "type": "rent"}
        ]
    }
