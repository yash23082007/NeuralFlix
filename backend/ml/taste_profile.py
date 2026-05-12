from collections import Counter
from statistics import mean
from typing import List, Dict, Any

def build_taste_profile(watch_history: List[Dict[str, Any]]) -> dict:
    """
    Constructs a 'Taste DNA' profile for a user based on their watch history.
    """
    if not watch_history:
        return {
            "top_genres": [],
            "preferred_decades": [],
            "avg_runtime_preference": None,
            "language_preferences": [],
            "rating_threshold": 0.0,
            "top_directors": []
        }
        
    genres = [g for m in watch_history for g in m.get('genres', [])]
    years = [int(m['release_year']) // 10 * 10 for m in watch_history if m.get('release_year')]
    runtimes = [m['runtime'] for m in watch_history if m.get('runtime')]
    languages = [m.get('language') for m in watch_history if m.get('language')]
    ratings = [m.get('rating') for m in watch_history if m.get('rating')]
    directors = [m.get('director') for m in watch_history if m.get('director')]

    return {
        "top_genres": dict(Counter(genres).most_common(5)),
        "preferred_decades": dict(Counter(years).most_common(3)),
        "avg_runtime_preference": round(mean(runtimes), 1) if runtimes else None,
        "language_preferences": dict(Counter(languages).most_common(3)),
        "rating_threshold": round(mean(ratings), 1) if ratings else 0.0,
        "top_directors": dict(Counter(directors).most_common(5)),
    }