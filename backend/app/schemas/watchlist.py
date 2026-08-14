from pydantic import BaseModel
from typing import List
from datetime import datetime
from app.schemas.movie import MovieResponse

class WatchlistResponse(BaseModel):
    items: List[MovieResponse]
    total_count: int
