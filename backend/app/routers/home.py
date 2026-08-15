from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.movie import Movie
from app.services.tmdb_service import fetch_trending

router = APIRouter(prefix="/api/v1/home", tags=["Home"])

@router.get("")
async def get_home(db: AsyncSession = Depends(get_db)):
    """Return home data, falling back to TMDB trending when DB is sparse."""
    
    # Get Top 10 Popular from DB
    pop_res = await db.execute(select(Movie).order_by(Movie.popularity_score.desc()).limit(10))
    trending = pop_res.scalars().all()
    
    # Get Top 10 Rated (with minimum votes)
    rated_res = await db.execute(
        select(Movie)
        .where(Movie.tmdb_votes > 100)
        .order_by(Movie.tmdb_rating.desc())
        .limit(10)
    )
    top_rated = rated_res.scalars().all()
    
    # If DB is sparse (< 5 trending), supplement from TMDB
    tmdb_trending = []
    if len(trending) < 5:
        try:
            tmdb_result = await fetch_trending()
            for item in tmdb_result.get("results", [])[:10]:
                rd = item.get("release_date")
                year = int(rd[:4]) if rd and len(rd) >= 4 and rd[:4].isdigit() else None
                tmdb_trending.append({
                    "tmdb_id": item["id"],
                    "title": item.get("title") or item.get("original_title", ""),
                    "year": year,
                    "poster_url": f"https://image.tmdb.org/t/p/w500{item['poster_path']}" if item.get("poster_path") else None,
                    "backdrop_url": f"https://image.tmdb.org/t/p/w1280{item['backdrop_path']}" if item.get("backdrop_path") else None,
                    "rating": item.get("vote_average"),
                    "genres": [],
                    "language": item.get("original_language"),
                    "cinema_region": None,
                })
        except Exception:
            pass
    
    # Merge: DB movies first, then TMDB supplement
    final_trending = trending if len(trending) >= 5 else tmdb_trending
    final_top_rated = top_rated if len(top_rated) >= 5 else tmdb_trending[:10]
    
    # Featured movie: pick the first trending with a backdrop
    featured = None
    if final_trending:
        for m in final_trending:
            backdrop = m.get("backdrop_url") if isinstance(m, dict) else getattr(m, "backdrop_url", None)
            if backdrop:
                featured = m
                break
        if not featured:
            featured = final_trending[0]
    
    # Cold start collections
    collections_res = await db.execute(
        select(Movie).where(Movie.editorial_collections != None)
    )
    collection_movies = collections_res.scalars().all()
    
    cold_start = []
    if collection_movies:
        cold_start.append({
            "id": "starter-pack",
            "title": "World Cinema Starter Pack",
            "movies": collection_movies[:5]
        })
    
    return {
        "featured": featured,
        "trending": final_trending,
        "topRated": final_top_rated,
        "regions": {},
        "coldStartCollections": cold_start
    }

