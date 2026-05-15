"""
Multi-Source Rating Aggregator — Combines ratings from TMDB, OMDb (IMDb/RT/Metacritic).

Inspired by Letterboxd's multi-badge rating display and IMDb's comprehensive score panels.
Provides a unified rating object with normalized scores for frontend display.
"""

import asyncio
import logging
import time
from typing import Any, Dict, Optional

from utils.omdb_api import fetch_omdb_details_by_imdb_id
from utils.tmdb_api import fetch_movie_details, fetch_tv_details

logger = logging.getLogger("RATING_AGGREGATOR")

# ─── Cache ────────────────────────────────────────────────
_rating_cache: Dict[str, Any] = {}
_rating_cache_ts: Dict[str, float] = {}
_CACHE_TTL = 1800  # 30 minutes


def _get_cached(key: str) -> Optional[Any]:
    if key in _rating_cache and time.time() - _rating_cache_ts.get(key, 0) < _CACHE_TTL:
        return _rating_cache[key]
    return None


def _set_cached(key: str, value: Any):
    _rating_cache[key] = value
    _rating_cache_ts[key] = time.time()


# ─── Rating Extraction Helpers ─────────────────────────────

def _extract_rt_score(omdb_data: dict) -> Optional[Dict[str, Any]]:
    """Extract Rotten Tomatoes score from OMDb ratings array."""
    if not omdb_data:
        return None
    for r in omdb_data.get("Ratings", []):
        if r.get("Source") == "Rotten Tomatoes":
            value = r.get("Value", "").replace("%", "")
            try:
                score = int(value)
                return {
                    "score": score,
                    "label": f"{score}%",
                    "sentiment": "fresh" if score >= 60 else "rotten",
                    "source": "Rotten Tomatoes",
                    "icon": "🍅" if score >= 60 else "🤢",
                }
            except (ValueError, TypeError):
                pass
    return None


def _extract_metacritic(omdb_data: dict) -> Optional[Dict[str, Any]]:
    """Extract Metacritic score from OMDb data."""
    if not omdb_data:
        return None
    metascore = omdb_data.get("Metascore")
    if metascore and metascore != "N/A":
        try:
            score = int(metascore)
            if score >= 61:
                sentiment = "favorable"
            elif score >= 40:
                sentiment = "mixed"
            else:
                sentiment = "unfavorable"
            return {
                "score": score,
                "label": str(score),
                "sentiment": sentiment,
                "source": "Metacritic",
                "color": "#66CC33" if sentiment == "favorable" else "#FFCC33" if sentiment == "mixed" else "#FF0000",
            }
        except (ValueError, TypeError):
            pass
    return None


def _extract_imdb_rating(omdb_data: dict) -> Optional[Dict[str, Any]]:
    """Extract IMDb rating from OMDb data."""
    if not omdb_data:
        return None
    rating = omdb_data.get("imdbRating")
    votes = omdb_data.get("imdbVotes", "").replace(",", "")
    if rating and rating != "N/A":
        try:
            score = float(rating)
            return {
                "score": score,
                "label": rating,
                "votes": int(votes) if votes.isdigit() else 0,
                "source": "IMDb",
                "color": "#F5C518",
            }
        except (ValueError, TypeError):
            pass
    return None


def _extract_tmdb_rating(tmdb_data: dict) -> Optional[Dict[str, Any]]:
    """Extract TMDB community rating."""
    if not tmdb_data:
        return None
    rating = tmdb_data.get("vote_average")
    votes = tmdb_data.get("vote_count", 0)
    if rating and rating > 0:
        return {
            "score": round(rating, 1),
            "label": str(round(rating, 1)),
            "votes": votes,
            "source": "TMDB",
            "color": "#01D277",
        }
    return None


# ─── Normalized Score Computation ─────────────────────────

def _compute_neuralflix_score(ratings: Dict[str, Any]) -> float:
    """
    Compute a weighted NeuralFlix aggregate score (0-100).
    Weighted average: IMDb (35%), TMDB (25%), RT (25%), Metacritic (15%).
    """
    scores = []
    weights = []

    if ratings.get("imdb"):
        scores.append(ratings["imdb"]["score"] * 10)  # Scale 0-10 → 0-100
        weights.append(0.35)

    if ratings.get("tmdb"):
        scores.append(ratings["tmdb"]["score"] * 10)  # Scale 0-10 → 0-100
        weights.append(0.25)

    if ratings.get("rotten_tomatoes"):
        scores.append(ratings["rotten_tomatoes"]["score"])  # Already 0-100
        weights.append(0.25)

    if ratings.get("metacritic"):
        scores.append(ratings["metacritic"]["score"])  # Already 0-100
        weights.append(0.15)

    if not scores:
        return 0.0

    # Normalize weights to sum to 1
    total_weight = sum(weights)
    weighted_score = sum(s * w for s, w in zip(scores, weights)) / total_weight

    return round(weighted_score, 1)


# ─── Main Aggregation Function ────────────────────────────

async def get_aggregated_ratings(
    tmdb_id: int,
    imdb_id: Optional[str] = None,
    media_type: str = "movie",
) -> Dict[str, Any]:
    """
    Fetch and aggregate ratings from all sources.
    Returns a unified ratings object with individual and composite scores.
    """
    cache_key = f"ratings:{media_type}:{tmdb_id}"
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached

    # Fetch TMDB details (for vote_average)
    tmdb_data = None
    omdb_data = None

    tasks = []
    if tmdb_id:
        if media_type == "tv":
            tasks.append(fetch_tv_details(tmdb_id))
        else:
            tasks.append(fetch_movie_details(tmdb_id))
    else:
        tasks.append(asyncio.sleep(0))  # placeholder

    if imdb_id:
        tasks.append(fetch_omdb_details_by_imdb_id(imdb_id))
    else:
        tasks.append(asyncio.sleep(0))  # placeholder

    results = await asyncio.gather(*tasks, return_exceptions=True)

    tmdb_data = results[0] if not isinstance(results[0], Exception) and isinstance(results[0], dict) else None
    omdb_data = results[1] if len(results) > 1 and not isinstance(results[1], Exception) and isinstance(results[1], dict) else None

    # If we got TMDB data but no imdb_id, try to extract it
    if tmdb_data and not imdb_id:
        imdb_id = tmdb_data.get("imdb_id")
        if imdb_id and not omdb_data:
            omdb_data = await fetch_omdb_details_by_imdb_id(imdb_id)

    # Extract individual ratings
    ratings = {}

    imdb_rating = _extract_imdb_rating(omdb_data)
    if imdb_rating:
        ratings["imdb"] = imdb_rating

    tmdb_rating = _extract_tmdb_rating(tmdb_data)
    if tmdb_rating:
        ratings["tmdb"] = tmdb_rating

    rt_rating = _extract_rt_score(omdb_data)
    if rt_rating:
        ratings["rotten_tomatoes"] = rt_rating

    mc_rating = _extract_metacritic(omdb_data)
    if mc_rating:
        ratings["metacritic"] = mc_rating

    # Compute composite
    composite_score = _compute_neuralflix_score(ratings)

    # Additional OMDb metadata
    awards = omdb_data.get("Awards") if omdb_data else None
    box_office = omdb_data.get("BoxOffice") if omdb_data else None

    result = {
        "ratings": ratings,
        "composite_score": composite_score,
        "composite_label": f"{composite_score}/100",
        "total_sources": len(ratings),
        "awards": awards if awards and awards != "N/A" else None,
        "box_office": box_office if box_office and box_office != "N/A" else None,
    }

    _set_cached(cache_key, result)
    return result


# ─── Quick Rating Badges (for MovieCard display) ──────────

async def get_rating_badges(tmdb_id: int, imdb_id: Optional[str] = None) -> Dict[str, str]:
    """
    Lightweight function that returns just the badge data for card display.
    Returns: {"imdb": "8.3", "rt": "92%", "mc": "85"}
    """
    full_ratings = await get_aggregated_ratings(tmdb_id, imdb_id)
    badges = {}

    for key, source_key in [("imdb", "imdb"), ("rt", "rotten_tomatoes"), ("mc", "metacritic")]:
        if source_key in full_ratings.get("ratings", {}):
            badges[key] = full_ratings["ratings"][source_key]["label"]

    badges["neuralflix_score"] = full_ratings.get("composite_label", "")
    return badges
