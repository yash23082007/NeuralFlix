"""
Movie Intelligence Platform — Explanation Service

Generates human-readable, mathematically grounded explanations from actual score deltas.
Strict honesty: no explanation is generated without real non-zero score components.
"""

from typing import Any, Dict
from app.models.movie import Movie
from app.models.taste_control import TasteControl


def generate_explanation(movie: Movie, taste: TasteControl, score: float = 0.0) -> str:
    """Generate a single honest sentence explaining why this movie was recommended."""
    from app.services.recommendation_service import calculate_score_breakdown
    breakdown = calculate_score_breakdown(movie, taste)
    return breakdown["explanation"]


def generate_structured_explanation(movie: Movie, taste: TasteControl) -> Dict[str, Any]:
    """Generate structured XAI attributions for the WhyRecommended sheet."""
    from app.services.recommendation_service import calculate_score_breakdown
    breakdown = calculate_score_breakdown(movie, taste)
    
    reasons = []
    for c in breakdown["components"]:
        if c["delta"] > 0:
            reasons.append({
                "type": c["feature"],
                "label": c["because"],
                "evidence": [f"+{c['delta']} match delta", c["feature"].replace("_", " ").title()]
            })

    return {
        "movieId": movie.tmdb_id or movie.id,
        "explanation": breakdown["explanation"],
        "factors": [r["label"] for r in reasons],
        "reasons": reasons,
        "score": breakdown["score"],
        "rankingVersion": "4.0-DeterministicTaste-v1",
        "catalogFreshness": {
            "updatedAt": movie.release_date or "2024-01-01"
        }
    }
