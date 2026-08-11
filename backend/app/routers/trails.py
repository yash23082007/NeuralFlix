"""
NeuralFlix v4 — Trails Router
"""

import json
import os
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/v1/trails", tags=["Trails"])


def _load_trails():
    trails_file = os.path.join(os.path.dirname(__file__), "..", "seed", "cinema_trails.json")
    try:
        with open(trails_file, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


@router.get("")
async def get_trails():
    """Get all cinema trails."""
    return {"trails": _load_trails()}


@router.get("/{trail_id}")
async def get_trail(trail_id: str):
    """Get a specific cinema trail by ID."""
    trails = _load_trails()
    for t in trails:
        if t.get("id") == trail_id:
            return t
    raise HTTPException(status_code=404, detail="Trail not found")
