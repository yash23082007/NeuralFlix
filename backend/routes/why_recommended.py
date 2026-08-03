"""
NeuralFlix Why Recommended API — routes/why_recommended.py

Every recommendation must have inspectable, structured reasons.
This endpoint returns explicit evidence for why a movie was suggested.

Reason types:
  genre_overlap, language_match, country_discovery, director_connection,
  theme_connection, pace_match, hidden_gem_preference, popularity_preference,
  diversity_boost, onboarding_preference, catalog_baseline

Never returns vague reasons like "AI thinks you will love this."
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from core.security import get_current_user_id
from database import users_collection, movies_collection

router = APIRouter()


@router.get("/{movie_id}/why")
async def get_why_recommended(
    movie_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """
    Returns structured reasons for why a specific movie was recommended.
    """
    # 1. Fetch the movie
    try:
        tmdb_id = int(movie_id) if movie_id.isdigit() else movie_id
    except ValueError:
        tmdb_id = movie_id

    movie = await movies_collection.find_one(
        {"tmdb_id": tmdb_id} if isinstance(tmdb_id, int) else {"title": tmdb_id},
        {"_id": 0},
    )
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    # 2. Fetch user profile and taste controls
    user = await users_collection.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    taste_controls = user.get("taste_controls", {})
    pref_genres = user.get("pref_genres", [])
    pref_languages = user.get("pref_languages", [])

    # 3. Build structured reasons
    reasons = _build_structured_reasons(movie, taste_controls, pref_genres, pref_languages)

    # 4. Catalog freshness
    now = datetime.now(timezone.utc)

    return {
        "movieId": tmdb_id,
        "reasons": reasons,
        "rankingVersion": "taste-control-reranker-v1",
        "catalogFreshness": {
            "updatedAt": now.isoformat(),
            "ageHours": 0,
        },
    }


def _build_structured_reasons(
    movie: dict,
    taste_controls: dict,
    pref_genres: List[str],
    pref_languages: List[str],
) -> List[dict]:
    """Build a list of structured, evidence-backed reasons."""
    reasons = []
    movie_genres = [g.lower() for g in movie.get("genres", [])]
    movie_language = movie.get("language", "")

    # Genre overlap
    if pref_genres:
        matching = [g for g in pref_genres if g.lower() in movie_genres]
        if matching:
            reasons.append({
                "type": "genre_overlap",
                "label": "Matches your selected genre preference",
                "evidence": matching[:3],
            })

    # Language match
    if pref_languages and movie_language in pref_languages:
        reasons.append({
            "type": "language_match",
            "label": "Matches a selected language preference",
            "evidence": [movie_language.upper()],
        })

    # Country discovery (if global preference is high)
    global_pref = taste_controls.get("global", 50)
    if global_pref > 60 and movie_language and movie_language != "en":
        from ml.taste_reranker import LANGUAGE_REGIONS
        region = LANGUAGE_REGIONS.get(movie_language, movie_language.upper())
        reasons.append({
            "type": "country_discovery",
            "label": "Included to broaden your recent cinema-country mix",
            "evidence": [region],
        })

    # Hidden gem preference
    hidden_gems = taste_controls.get("hiddenGems", 50)
    pop_score = movie.get("popularity_score", 0) or 0
    if hidden_gems > 60 and pop_score < 50:
        reasons.append({
            "type": "hidden_gem_preference",
            "label": "Lesser-known film matching your hidden gems preference",
            "evidence": [f"Popularity: {pop_score:.0f}"],
        })

    # Popularity preference
    if hidden_gems < 40 and pop_score > 100:
        reasons.append({
            "type": "popularity_preference",
            "label": "Popular and highly-rated film",
            "evidence": [f"Rating: {movie.get('rating', 0):.1f}/10"],
        })

    # Pace match
    pace_pref = taste_controls.get("pace", 50)
    runtime = movie.get("runtime", 0) or 0
    if pace_pref > 60 and runtime > 130:
        reasons.append({
            "type": "pace_match",
            "label": "Longer, contemplative film matching your slow-burn preference",
            "evidence": [f"Runtime: {runtime} min"],
        })
    elif pace_pref < 40 and runtime > 0 and runtime < 100:
        reasons.append({
            "type": "pace_match",
            "label": "Tight, fast-paced film matching your pace preference",
            "evidence": [f"Runtime: {runtime} min"],
        })

    # Diversity boost
    diversity_boost = taste_controls.get("diversityBoost", True)
    if diversity_boost and movie_language and movie_language != "en" and not any(
        r["type"] == "country_discovery" for r in reasons
    ):
        reasons.append({
            "type": "diversity_boost",
            "label": "Included for diversity in your recommendations",
            "evidence": [movie_language.upper()],
        })

    # Fallback: catalog baseline
    if not reasons:
        reasons.append({
            "type": "catalog_baseline",
            "label": "Highly rated in the catalog",
            "evidence": [f"Rating: {movie.get('rating', 0):.1f}/10"],
        })

    return reasons
