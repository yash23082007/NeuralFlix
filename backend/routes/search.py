from fastapi import APIRouter, Query, HTTPException
from typing import Optional

from services.search_service import SearchService
from models.schemas import SearchResponse

router = APIRouter()

@router.get("/", response_model=SearchResponse)
async def search(
    q: str = Query(..., min_length=1),
    language: Optional[str] = Query(None, description="Filter by language code (e.g. en, hi, ja)"),
    page: int = Query(1, ge=1)
):
    """
    Search movies and TV shows across global library.
    Combines local database index with real-time TMDB multi-search.
    """
    try:
        results = await SearchService.search(q, language=language, page=page)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search operation failed: {str(e)}")

