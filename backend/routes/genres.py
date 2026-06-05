from fastapi import APIRouter
from database import movies_collection

router = APIRouter()

@router.get("/")
async def get_genres():
    """Return all unique genres from the movies collection."""
    all_movies = await movies_collection.find({}, {"genres": 1}).to_list(length=10000)
    genre_set = set()
    for movie in all_movies:
        genres = movie.get("genres", [])
        if isinstance(genres, list):
            for g in genres:
                if g:
                    genre_set.add(g)
        elif isinstance(genres, str):
            for g in genres.split(","):
                g = g.strip()
                if g:
                    genre_set.add(g)
    return {"genres": sorted(genre_set)}
