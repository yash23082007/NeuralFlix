"""
Movie Intelligence Platform — Movie Comparison Router
Compares two movies across 5 Taste Profile axes, predicting personalized user preference with delta reasons.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.dependencies import get_current_user_optional
from app.models.user import User
from app.models.movie import Movie
from app.models.taste_control import TasteControl
from app.services.catalog_service import get_or_fetch_movie
from app.services.recommendation_service import calculate_score_breakdown
from app.routers.movies import _format_movie

router = APIRouter(prefix="/api/v1/compare", tags=["Comparison"])


@router.get("")
async def compare_movies(
    a: int = Query(..., description="First movie ID or TMDB ID"),
    b: int = Query(..., description="Second movie ID or TMDB ID"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """Compare two movies across multiple cinematic dimensions with personalized preference prediction."""
    movie_a = await get_or_fetch_movie(db, a)
    movie_b = await get_or_fetch_movie(db, b)

    if not movie_a:
        raise HTTPException(status_code=404, detail=f"Movie A ({a}) not found")
    if not movie_b:
        raise HTTPException(status_code=404, detail=f"Movie B ({b}) not found")

    taste = TasteControl(user_id="default")
    if current_user:
        t_res = await db.execute(select(TasteControl).where(TasteControl.user_id == current_user.id))
        taste = t_res.scalar_one_or_none() or taste

    bd_a = calculate_score_breakdown(movie_a, taste)
    bd_b = calculate_score_breakdown(movie_b, taste)

    score_a = bd_a["score"]
    score_b = bd_b["score"]
    delta = round(score_a - score_b, 1)

    if delta > 3.0:
        pref = "A"
    elif delta < -3.0:
        pref = "B"
    else:
        pref = "TIE"

    # Generate comparative insights
    insights = []
    
    # Runtime insight
    rt_a = movie_a.runtime or 0
    rt_b = movie_b.runtime or 0
    if rt_a and rt_b and abs(rt_a - rt_b) >= 20:
        longer = movie_a.title if rt_a > rt_b else movie_b.title
        shorter = movie_b.title if rt_a > rt_b else movie_a.title
        diff = abs(rt_a - rt_b)
        insights.append(f"{longer} is {diff} minutes longer than {shorter}.")

    # Pacing insight
    pace_a = next((c["delta"] for c in bd_a["components"] if c["feature"] == "pace_match"), 0.0)
    pace_b = next((c["delta"] for c in bd_b["components"] if c["feature"] == "pace_match"), 0.0)
    if pace_a != pace_b:
        better_pacing = movie_a.title if pace_a > pace_b else movie_b.title
        insights.append(f"{better_pacing} aligns more closely with your tempo preference.")

    # Rating comparison
    r_a = movie_a.tmdb_rating or 0.0
    r_b = movie_b.tmdb_rating or 0.0
    if abs(r_a - r_b) >= 0.5:
        higher = movie_a.title if r_a > r_b else movie_b.title
        diff_r = abs(r_a - r_b)
        insights.append(f"{higher} has a higher community critical consensus (+{diff_r:.1f} rating).")

    return {
        "movie_a": _format_movie(movie_a),
        "movie_b": _format_movie(movie_b),
        "breakdown_a": bd_a,
        "breakdown_b": bd_b,
        "predicted_preference": pref,
        "score_delta": delta,
        "insights": insights,
        "served_by": "multi-axis-comparator-v1"
    }
