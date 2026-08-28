"""Truthful recommendation telemetry."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.movie import Movie

router = APIRouter(prefix="/api/v1/ml", tags=["Machine Learning"])

@router.get("/overview")
async def get_ml_overview(db: AsyncSession = Depends(get_db)):
    count = await db.scalar(select(func.count(Movie.id))) or 0
    average = await db.scalar(select(func.avg(Movie.tmdb_rating)))
    movies = (await db.execute(select(Movie))).scalars().all()
    genres: dict[str, int] = {}
    regions: dict[str, int] = {}
    for movie in movies:
        for genre in movie.genres or []:
            genres[genre] = genres.get(genre, 0) + 1
        if movie.cinema_region:
            regions[movie.cinema_region] = regions.get(movie.cinema_region, 0) + 1
    return {
        "catalog_size": count,
        "average_rating": round(float(average), 2) if average is not None else None,
        "top_genres": [{"name": k, "count": v} for k, v in sorted(genres.items(), key=lambda x: -x[1])[:6]],
        "top_regions": [{"name": k, "count": v} for k, v in sorted(regions.items(), key=lambda x: -x[1])[:6]],
        "pipeline": [{"stage": "Ranker", "method": "Taste Constellation deterministic scorer"}, {"stage": "Explanation", "method": "Score-component attribution"}],
        "model_cards": [{"name": "Taste Constellation v0", "type": "Deterministic ranker", "status": "Active", "purpose": "User-steerable recommendations"}],
    }
