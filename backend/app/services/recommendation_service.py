"""
Movie Intelligence Platform — Recommendation Service

Deterministic scoring engine based on Taste Profile v1.
Multi-axis transparent scoring with per-component attributions.
"""

from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.movie import Movie
from app.models.taste_control import TasteControl
from app.models.recommendation_feedback import RecommendationFeedback
from app.routers.movies import _format_movie


def calculate_score_breakdown(movie: Movie, taste: TasteControl) -> Dict[str, Any]:
    """
    Calculate deterministic match score (0-100) and return per-component attributions.
    
    Axes:
    - baseline_quality: TMDB rating weight (up to 20 pts)
    - pace_match: pace slider (0=slow burn / drama, 100=high octane / action)
    - global_taste: global slider (0=local/domestic cinema, 100=world cinema)
    - hidden_gems: obscure high-quality gems (low popularity + strong rating)
    - challenge: light entertainment (comedy/family) vs complex (mystery/sci-fi/noir)
    - discovery: familiar favorites vs adventurous boundary-pushing movies
    """
    score = 30.0  # Base calibration
    components: List[Dict[str, Any]] = []

    # Sliders safe resolution
    s_glob = getattr(taste, "global_taste", 50) if getattr(taste, "global_taste", None) is not None else 50
    s_chal = getattr(taste, "challenge", 50) if getattr(taste, "challenge", None) is not None else 50
    s_pace = getattr(taste, "pace", 50) if getattr(taste, "pace", None) is not None else 50
    s_gems = getattr(taste, "hidden_gems", 50) if getattr(taste, "hidden_gems", None) is not None else 50

    # 1. Baseline Quality
    rating = movie.tmdb_rating or 7.0
    quality_delta = round((rating / 10.0) * 20.0, 1)
    score += quality_delta
    components.append({
        "feature": "baseline_quality",
        "delta": quality_delta,
        "because": f"TMDB rating of {rating:.1f}/10"
    })

    # 2. Hidden Gems Axis (0-100)
    pop = min(movie.popularity_score or 0.0, 100.0)
    votes = movie.tmdb_votes or 0
    if s_gems >= 55:
        gem_bonus = round(((100.0 - pop) / 100.0) * ((s_gems - 50) / 50.0) * 20.0, 1)
        if votes < 5000 and rating >= 7.5:
            gem_bonus += 5.0
        score += gem_bonus
        if gem_bonus > 3.0:
            components.append({
                "feature": "hidden_gems",
                "delta": gem_bonus,
                "because": f"High rating ({rating:.1f}) with indie discovery profile (pop: {pop:.0f}/100)"
            })
    elif s_gems <= 45:
        pop_bonus = round((pop / 100.0) * ((50 - s_gems) / 50.0) * 15.0, 1)
        score += pop_bonus
        if pop_bonus > 3.0:
            components.append({
                "feature": "popularity_affinity",
                "delta": pop_bonus,
                "because": f"Widely acclaimed popular title (pop: {pop:.0f}/100)"
            })

    # 3. Pace Axis (0-100)
    genres = set(movie.genres or [])
    runtime = movie.runtime or 110
    if s_pace > 55:
        pace_weight = (s_pace - 50) / 50.0
        pace_delta = 0.0
        if "Action" in genres or "Thriller" in genres or "Adventure" in genres:
            pace_delta += round(15.0 * pace_weight, 1)
        if runtime <= 105:
            pace_delta += round(5.0 * pace_weight, 1)
        if "Drama" in genres and "Action" not in genres:
            pace_delta -= round(8.0 * pace_weight, 1)
        score += pace_delta
        if pace_delta != 0:
            components.append({
                "feature": "pace_match",
                "delta": pace_delta,
                "because": "Calibrated for fast-paced, high-momentum storytelling" if pace_delta > 0 else "Slower pacing than your setting"
            })
    elif s_pace < 45:
        pace_weight = (50 - s_pace) / 50.0
        pace_delta = 0.0
        if "Drama" in genres or "Romance" in genres or "Mystery" in genres:
            pace_delta += round(15.0 * pace_weight, 1)
        if runtime >= 125:
            pace_delta += round(5.0 * pace_weight, 1)
        if "Action" in genres and "Drama" not in genres:
            pace_delta -= round(8.0 * pace_weight, 1)
        score += pace_delta
        if pace_delta != 0:
            components.append({
                "feature": "pace_match",
                "delta": pace_delta,
                "because": "Matches your preference for deliberate, slow-burn narratives" if pace_delta > 0 else "Faster pacing than your preference"
            })

    # 4. Global Cinema Axis (0-100)
    region = (movie.cinema_region or "").lower()
    lang = (movie.language or "").lower()
    is_world_cinema = region not in ["us", "uk", "hollywood", ""] or lang not in ["en", ""]
    if s_glob >= 55:
        global_weight = (s_glob - 50) / 50.0
        if is_world_cinema:
            global_delta = round(20.0 * global_weight, 1)
            score += global_delta
            components.append({
                "feature": "global_taste",
                "delta": global_delta,
                "because": f"{region.title() if region else lang.upper()} cinema outside domestic Hollywood"
            })
    elif s_glob <= 45:
        local_weight = (50 - s_glob) / 50.0
        if not is_world_cinema:
            local_delta = round(15.0 * local_weight, 1)
            score += local_delta
            components.append({
                "feature": "domestic_cinema",
                "delta": local_delta,
                "because": "English-language / Hollywood cinema preference"
            })

    # 5. Challenge Axis (0-100)
    challenging_genres = {"Science Fiction", "Mystery", "History", "Documentary", "War", "Crime"}
    light_genres = {"Comedy", "Animation", "Family", "Music"}
    if s_chal >= 55:
        chal_weight = (s_chal - 50) / 50.0
        if genres & challenging_genres:
            chal_delta = round(12.0 * chal_weight, 1)
            score += chal_delta
            components.append({
                "feature": "challenge_match",
                "delta": chal_delta,
                "because": "Thought-provoking thematic complexity"
            })
    elif s_chal <= 45:
        light_weight = (50 - s_chal) / 50.0
        if genres & light_genres:
            light_delta = round(12.0 * light_weight, 1)
            score += light_delta
            components.append({
                "feature": "accessible_entertainment",
                "delta": light_delta,
                "because": "Accessible, feel-good entertainment"
            })


    final_score = min(max(round(score, 1), 5.0), 99.0)
    
    positive_reasons = [c["because"] for c in components if c["delta"] > 2.0 and c["feature"] != "baseline_quality"]
    if positive_reasons:
        explanation = f"Recommended: {', '.join(positive_reasons[:2])}."
    else:
        explanation = f"Matched to your Taste Profile profile with a {rating:.1f}/10 quality rating."

    return {
        "score": final_score,
        "rec_score": round(final_score / 100.0, 4),
        "components": components,
        "explanation": explanation
    }


def _calculate_score(movie: Movie, taste: TasteControl) -> float:
    """Helper returning scalar score (0-100)."""
    return calculate_score_breakdown(movie, taste)["score"]


async def get_recommendations_for_user(
    db: AsyncSession,
    user_id: str,
    taste: TasteControl,
    limit: int = 20,
    mode: str = "for_you",
    genres: Optional[List[str]] = None,
    language: Optional[str] = None,
    mood: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Get personalized recommendations with mode routing and grounded XAI attributions."""
    result = await db.execute(select(Movie))
    all_movies = result.scalars().all()

    # Exclude rejected movies from feedback
    feedback_res = await db.execute(
        select(RecommendationFeedback).where(RecommendationFeedback.user_id == user_id)
    )
    excluded_ids = {f.movie_id for f in feedback_res.scalars().all()}

    scored_movies: List[Tuple[Movie, Dict[str, Any]]] = []

    for movie in all_movies:
        if movie.id in excluded_ids or movie.tmdb_id in excluded_ids:
            continue

        movie_genres = set(movie.genres or [])
        if genres and not movie_genres.intersection(genres):
            continue
        if language and (movie.language or "").lower() != language.lower():
            continue

        if mood:
            mood_genre_map = {
                "intense": {"Action", "Thriller", "Crime", "Mystery"},
                "chill": {"Comedy", "Animation", "Family", "Romance"},
                "funny": {"Comedy", "Family", "Animation"},
                "scary": {"Horror", "Thriller", "Mystery"},
                "romantic": {"Romance", "Drama"},
                "thoughtful": {"Drama", "Mystery", "History", "Science Fiction"},
                "epic": {"Adventure", "Fantasy", "Science Fiction", "Action"},
            }
            target_mood_genres = mood_genre_map.get(mood.lower())
            if target_mood_genres and not movie_genres.intersection(target_mood_genres):
                continue

        breakdown = calculate_score_breakdown(movie, taste)
        score = breakdown["score"]

        # Mode calibrations
        if mode == "hidden_gems":
            if (movie.popularity_score or 0) < 70 and (movie.tmdb_rating or 0) >= 7.6:
                score += 15.0
            else:
                score -= 10.0
        elif mode == "tonight":
            runtime = movie.runtime or 120
            if runtime <= 120:
                score += 10.0
            else:
                score -= 15.0
        elif mode == "outside_bubble":
            if movie.cinema_region not in ["US", "UK", "hollywood", None]:
                score += 20.0

        breakdown["score"] = score
        breakdown["rec_score"] = round(score / 100.0, 4)
        scored_movies.append((movie, breakdown))

    scored_movies.sort(key=lambda x: x[1]["score"], reverse=True)
    top_items = scored_movies[:limit]

    formatted = []
    for movie, breakdown in top_items:
        m_dict = _format_movie(movie)
        m_dict["rec_score"] = breakdown["rec_score"]
        m_dict["score"] = breakdown["rec_score"]
        m_dict["explanation"] = breakdown["explanation"]
        m_dict["components"] = breakdown["components"]
        formatted.append(m_dict)

    return formatted
