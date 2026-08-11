"""
NeuralFlix Taste-Control Reranker — ml/taste_reranker.py

A deterministic, explainable reranker that adjusts recommendation scores
based on the user's explicit taste constellation preferences.

This is part of the PRODUCTION recommendation path — no PyTorch required.
Every score adjustment is traceable to a named preference slider.
"""

import math
from typing import Dict, List, Optional, Tuple


# Language-to-region mapping for the global/local preference axis
LANGUAGE_REGIONS = {
    "en": "Hollywood", "hi": "India", "ko": "South Korea", "ja": "Japan",
    "fr": "France", "es": "Spain/Latin America", "de": "Germany",
    "it": "Italy", "pt": "Brazil/Portugal", "zh": "China",
    "ru": "Russia", "ar": "Middle East", "th": "Thailand",
    "tr": "Turkey", "fa": "Iran", "sv": "Sweden", "da": "Denmark",
    "no": "Norway", "fi": "Finland", "pl": "Poland",
}

# Genre categories for the challenge/light axis
CHALLENGING_GENRES = {"drama", "documentary", "history", "war", "crime"}
LIGHT_GENRES = {"comedy", "animation", "family", "romance", "music"}

# Genre categories for the pace axis
FAST_GENRES = {"action", "adventure", "thriller", "horror", "science fiction"}
SLOW_GENRES = {"drama", "romance", "documentary", "history", "mystery"}


def compute_popularity_norm(movie: dict) -> float:
    """Normalize popularity score to 0–1 range."""
    pop = movie.get("popularity_score", 0) or 0
    # Log-scale normalization with a reasonable cap
    return min(1.0, math.log1p(pop) / math.log1p(1000))


def compute_novelty_norm(movie: dict) -> float:
    """Inverse popularity — higher for hidden gems."""
    return 1.0 - compute_popularity_norm(movie)


def compute_global_distance(movie: dict, user_language: str = "en") -> float:
    """
    How 'globally distant' a movie is from the user's default language.
    0.0 = same language, 1.0 = different language/region.
    """
    movie_lang = movie.get("language", "en")
    if movie_lang == user_language:
        return 0.0
    return 1.0


def compute_challenge_score(movie: dict) -> float:
    """Score 0–1 based on genre complexity. 1.0 = challenging."""
    genres = {g.lower() for g in movie.get("genres", [])}
    challenging_overlap = len(genres & CHALLENGING_GENRES)
    light_overlap = len(genres & LIGHT_GENRES)
    total = challenging_overlap + light_overlap
    if total == 0:
        return 0.5
    return challenging_overlap / total


def compute_pace_score(movie: dict) -> float:
    """Score 0–1 based on pace inference from genres and runtime. 1.0 = slow-burn."""
    genres = {g.lower() for g in movie.get("genres", [])}
    fast_overlap = len(genres & FAST_GENRES)
    slow_overlap = len(genres & SLOW_GENRES)
    total = fast_overlap + slow_overlap
    genre_pace = slow_overlap / total if total > 0 else 0.5

    # Factor in runtime — longer movies tend to be slower paced
    runtime = movie.get("runtime", 0) or 0
    runtime_factor = min(1.0, max(0.0, (runtime - 80) / 100)) if runtime > 0 else 0.5

    return (genre_pace + runtime_factor) / 2


def compute_content_similarity(movie: dict) -> float:
    """Use existing rec_score or content similarity if available."""
    return movie.get("rec_score", 0) or movie.get("content_similarity", 0) or movie.get("score", 0.5)


def rerank_with_taste(
    candidates: List[dict],
    taste: Dict[str, any],
    user_language: str = "en",
) -> List[dict]:
    """
    Rerank candidates based on user's taste constellation preferences.

    Score formula (all weights sum to 1.0):
      0.45 * content_similarity
    + 0.15 * popularity_factor (influenced by hiddenGems slider)
    + 0.15 * novelty_factor (influenced by hiddenGems slider)
    + 0.10 * global_distance (influenced by global slider)
    + 0.08 * challenge_match (influenced by challenge slider)
    + 0.07 * pace_match (influenced by pace slider)

    Returns candidates with updated 'score' and 'taste_factors' for explainability.
    """
    hidden_gems = taste.get("hiddenGems", 50) / 100.0
    global_pref = taste.get("global", 50) / 100.0
    challenge_pref = taste.get("challenge", 50) / 100.0
    pace_pref = taste.get("pace", 50) / 100.0
    discovery_pref = taste.get("discovery", 50) / 100.0
    diversity_boost = taste.get("diversityBoost", True)

    scored = []
    for movie in candidates:
        content_sim = compute_content_similarity(movie)
        pop_norm = compute_popularity_norm(movie)
        novelty_norm = compute_novelty_norm(movie)
        global_dist = compute_global_distance(movie, user_language)
        challenge = compute_challenge_score(movie)
        pace = compute_pace_score(movie)

        # Score components
        content_factor = content_sim * 0.45
        popularity_factor = pop_norm * (1 - hidden_gems) * 0.15
        novelty_factor = novelty_norm * hidden_gems * 0.15
        global_factor = global_dist * global_pref * 0.10
        challenge_factor = abs(challenge - (1 - challenge_pref)) * -0.08 + 0.08  # Closer match = higher
        pace_factor = abs(pace - pace_pref) * -0.07 + 0.07  # Closer match = higher

        # Discovery bonus: higher discovery preference boosts movies with lower content similarity
        discovery_bonus = (1 - content_sim) * discovery_pref * 0.05

        total = content_factor + popularity_factor + novelty_factor + global_factor + challenge_factor + pace_factor + discovery_bonus

        movie_copy = dict(movie)
        movie_copy["score"] = round(total, 6)
        movie_copy["taste_factors"] = {
            "content_similarity": round(content_factor, 4),
            "popularity": round(popularity_factor, 4),
            "novelty": round(novelty_factor, 4),
            "global_distance": round(global_factor, 4),
            "challenge_match": round(challenge_factor, 4),
            "pace_match": round(pace_factor, 4),
            "discovery_bonus": round(discovery_bonus, 4),
        }
        scored.append(movie_copy)

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored


def build_taste_reasons(movie: dict, taste: Dict[str, any]) -> List[dict]:
    """
    Generate structured explanation reasons based on taste factors.
    Used by the Why Recommended API.
    """
    reasons = []
    factors = movie.get("taste_factors", {})

    if not factors:
        return reasons

    hidden_gems = taste.get("hiddenGems", 50)
    global_pref = taste.get("global", 50)

    if factors.get("novelty", 0) > factors.get("popularity", 0) and hidden_gems > 60:
        reasons.append({
            "type": "hidden_gem_preference",
            "label": "Matches your hidden gems preference",
            "evidence": [f"Hidden gems slider: {hidden_gems}%"],
        })

    if factors.get("popularity", 0) > factors.get("novelty", 0) and hidden_gems < 40:
        reasons.append({
            "type": "popularity_preference",
            "label": "Popular and well-rated",
            "evidence": [f"Popularity score: {movie.get('popularity_score', 0):.0f}"],
        })

    if factors.get("global_distance", 0) > 0.05 and global_pref > 60:
        reasons.append({
            "type": "country_discovery",
            "label": "Included to broaden your cinema-country mix",
            "evidence": [LANGUAGE_REGIONS.get(movie.get("language", ""), movie.get("language", ""))],
        })

    return reasons
