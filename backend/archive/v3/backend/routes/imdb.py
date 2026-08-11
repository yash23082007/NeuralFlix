from fastapi import APIRouter, Query
from typing import Optional, List
from utils.imdb_api import (
    fetch_imdb_titles,
    fetch_imdb_title_details,
    fetch_imdb_batch_titles,
    fetch_imdb_credits,
    fetch_imdb_release_dates,
    fetch_imdb_akas,
    fetch_imdb_seasons,
    fetch_imdb_episodes
)

router = APIRouter()

@router.get("/titles")
async def get_imdb_titles(
    types: Optional[List[str]] = Query(None),
    genres: Optional[List[str]] = Query(None),
    start_year: Optional[int] = Query(None),
    end_year: Optional[int] = Query(None),
    min_rating: Optional[float] = Query(None),
    sort_by: Optional[str] = Query(None),
    sort_order: Optional[str] = Query(None)
):
    return await fetch_imdb_titles(
        types=types, genres=genres, start_year=start_year, 
        end_year=end_year, min_rating=min_rating, 
        sort_by=sort_by, sort_order=sort_order
    )

@router.get("/titles/{title_id}")
async def get_imdb_title(title_id: str):
    return await fetch_imdb_title_details(title_id)

@router.get("/titles/batch")
async def get_imdb_batch_titles(title_ids: List[str] = Query(...)):
    return await fetch_imdb_batch_titles(title_ids)

@router.get("/titles/{title_id}/credits")
async def get_imdb_credits(title_id: str):
    return await fetch_imdb_credits(title_id)

@router.get("/titles/{title_id}/releaseDates")
async def get_imdb_release_dates(title_id: str):
    return await fetch_imdb_release_dates(title_id)

@router.get("/titles/{title_id}/akas")
async def get_imdb_akas(title_id: str):
    return await fetch_imdb_akas(title_id)

@router.get("/titles/{title_id}/seasons")
async def get_imdb_seasons(title_id: str):
    return await fetch_imdb_seasons(title_id)

@router.get("/titles/{title_id}/episodes")
async def get_imdb_episodes(title_id: str):
    return await fetch_imdb_episodes(title_id)
