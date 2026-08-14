from pydantic import BaseModel
from typing import List, Optional
from app.schemas.movie import MovieResponse

class RecommendationResponse(BaseModel):
    items: List[MovieResponse]
    explanation: Optional[str] = None
    
class WhyThisResponse(BaseModel):
    movie_id: int
    reasons: List[str]
    confidence_score: float
