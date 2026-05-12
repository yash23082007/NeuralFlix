from typing import Dict, List, Optional
from collections import Counter
import math


INTERACTION_THRESHOLDS = {
    "cold_start": (0, 10),
    "warming": (10, 50),
    "active": (50, float("inf")),
}

WEIGHTS: Dict[str, Dict[str, float]] = {
    "cold_start": {"content": 0.6, "popularity": 0.4, "ncf": 0.0, "seq": 0.0, "gnn": 0.0},
    "warming": {"content": 0.3, "popularity": 0.2, "ncf": 0.2, "seq": 0.2, "gnn": 0.1},
    "active": {"content": 0.2, "popularity": 0.1, "ncf": 0.3, "seq": 0.3, "gnn": 0.2},
}


def get_user_tier(interaction_count: int) -> str:
    if interaction_count < 10:
        return "cold_start"
    elif interaction_count < 50:
        return "warming"
    return "active"


def get_weights(tier: str) -> Dict[str, float]:
    return WEIGHTS.get(tier, WEIGHTS["cold_start"])


def build_onboarding_profile(selected_movies: List[dict]) -> Dict:
    genres = Counter()
    decades = Counter()
    avg_rating = 0.0
    directors = Counter()
    languages = Counter()

    for m in selected_movies:
        for g in m.get("genres", []):
            genres[g] += 1
        year = m.get("year")
        if year:
            decades[(year // 10) * 10] += 1
        avg_rating += m.get("rating", 0) or 0
        d = m.get("director")
        if d:
            directors[d] += 1
        lang = m.get("language", "en")
        languages[lang] += 1

    n = max(len(selected_movies), 1)
    return {
        "top_genres": [g for g, _ in genres.most_common(5)],
        "preferred_decades": [d for d, _ in decades.most_common(3)],
        "avg_rating": round(avg_rating / n, 2),
        "top_directors": [d for d, _ in directors.most_common(5)],
        "languages": [l for l, _ in languages.most_common(3)],
    }


def score_cold_start_candidates(candidates: List[dict], profile: Dict) -> List[dict]:
    preferred_genres = set(profile.get("top_genres", []))
    preferred_decades = set(profile.get("preferred_decades", []))
    preferred_dirs = set(profile.get("top_directors", []))
    target_rating = profile.get("avg_rating", 5.0)

    for c in candidates:
        score = 0.0
        c_genres = set(c.get("genres", []) or [])
        genre_match = len(c_genres & preferred_genres) / max(len(preferred_genres), 1)
        score += genre_match * 0.4

        c_decade = (c.get("year") // 10) * 10 if c.get("year") else 0
        score += (0.2 if c_decade in preferred_decades else 0.0)

        c_rating = c.get("rating", 0) or 0
        rating_sim = 1.0 - min(abs(c_rating - target_rating) / 10.0, 1.0)
        score += rating_sim * 0.2

        c_dir = c.get("director")
        if c_dir and c_dir in preferred_dirs:
            score += 0.1

        score += min(c.get("popularity_score", 0) / 100, 1.0) * 0.1
        c["_cold_start_score"] = round(score, 4)

    return sorted(candidates, key=lambda x: x.get("_cold_start_score", 0), reverse=True)
