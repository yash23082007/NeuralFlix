"""
NeuralFlix AI Chat — Conversational Movie Recommendation Endpoint

Accepts a user message, queries the movie database for relevant results,
and returns an AI-powered natural language response with movie cards.
Falls back to curated keyword-based suggestions when no LLM key is set.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import logging
import asyncio
import random

from database import movies_collection
from utils.tmdb_api import fetch_genre_list, get_poster_url, get_backdrop_url

logger = logging.getLogger("CHAT_ROUTE")

router = APIRouter()


# ─── Request / Response Schemas ──────────────────────────────

class ChatMessage(BaseModel):
    role: str  # "user" or "ai"
    text: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []

class MovieSuggestion(BaseModel):
    tmdb_id: Optional[int] = None
    title: str
    overview: Optional[str] = ""
    poster_url: Optional[str] = None
    rating: Optional[float] = 0.0
    year: Optional[int] = None
    genres: List[str] = []

class ChatResponse(BaseModel):
    reply: str
    movies: List[MovieSuggestion] = []


# ─── Keyword → Query Mapping ────────────────────────────────

MOOD_KEYWORDS = {
    "happy": {"genres": {"$in": ["Comedy", "Romance", "Family"]}, "rating": {"$gte": 6.5}},
    "sad": {"genres": {"$in": ["Drama"]}, "rating": {"$gte": 7.0}},
    "scary": {"genres": {"$in": ["Horror", "Thriller"]}},
    "action": {"genres": {"$in": ["Action", "Adventure"]}},
    "romantic": {"genres": {"$in": ["Romance"]}},
    "funny": {"genres": {"$in": ["Comedy"]}},
    "thriller": {"genres": {"$in": ["Thriller", "Mystery", "Crime"]}},
    "animated": {"genres": {"$in": ["Animation"]}},
    "sci-fi": {"genres": {"$in": ["Science Fiction"]}},
    "fantasy": {"genres": {"$in": ["Fantasy"]}},
    "documentary": {"genres": {"$in": ["Documentary"]}},
    "bollywood": {"cinema_region": "bollywood"},
    "indian": {"cinema_region": "indian"},
    "korean": {"cinema_region": "korean"},
    "japanese": {"language": "ja"},
    "anime": {"$or": [{"language": "ja"}, {"genres": {"$regex": "Animation", "$options": "i"}}]},
    "french": {"cinema_region": "french"},
    "classic": {"year": {"$lte": 1980}, "rating": {"$gte": 7.5}},
    "new": {"year": {"$gte": 2024}},
    "underrated": {"rating": {"$gte": 7.5}, "votes": {"$lte": 5000, "$gte": 200}},
    "award": {"rating": {"$gte": 8.0}, "votes": {"$gte": 10000}},
    "emotional": {"genres": {"$in": ["Drama"]}, "rating": {"$gte": 7.5}},
    "mind": {"genres": {"$in": ["Thriller", "Mystery", "Science Fiction"]}},
    "family": {"genres": {"$in": ["Family", "Animation"]}},
    "crime": {"genres": {"$in": ["Crime", "Thriller"]}},
    "war": {"genres": {"$in": ["War", "History"]}},
    "music": {"genres": {"$in": ["Music"]}},
    "superhero": {"genres": {"$in": ["Action", "Science Fiction"]}, "rating": {"$gte": 6.0}},
}

FALLBACK_REPLIES = [
    "Here are some cinematic gems I think you'll love based on your vibe:",
    "Great taste! Check out these handpicked recommendations:",
    "I've curated these films just for you — each one is a masterpiece in its own right:",
    "Based on what you're looking for, these should be perfect:",
    "You've got excellent taste. Here's what I'd recommend tonight:",
]


def _extract_query_filter(message: str) -> dict:
    """Extract a MongoDB query filter from the user's natural language message."""
    msg_lower = message.lower()
    
    for keyword, query_filter in MOOD_KEYWORDS.items():
        if keyword in msg_lower:
            return query_filter
    
    # Fallback: text search
    return {"$text": {"$search": message}}


def _format_movie(doc: dict) -> dict:
    """Normalize a MongoDB movie document to MovieSuggestion format."""
    return {
        "tmdb_id": doc.get("tmdb_id"),
        "title": doc.get("title", "Unknown"),
        "overview": (doc.get("overview") or "")[:200],
        "poster_url": doc.get("poster_url"),
        "rating": round(doc.get("rating", 0), 1),
        "year": doc.get("year"),
        "genres": doc.get("genres", [])[:3],
    }


async def _fetch_movies_for_message(message: str, limit: int = 6) -> List[dict]:
    """Find relevant movies from MongoDB based on the user message."""
    query_filter = _extract_query_filter(message)
    
    try:
        movies = list(
            movies_collection.find(query_filter, {"_id": 0})
            .sort("popularity_score", -1)
            .limit(limit)
        )
    except Exception:
        # If text index doesn't exist or query fails, do a regex title search
        movies = list(
            movies_collection.find(
                {"title": {"$regex": message.split()[0] if message.split() else ".", "$options": "i"}},
                {"_id": 0}
            )
            .sort("popularity_score", -1)
            .limit(limit)
        )
    
    # If DB is sparse, supplement with trending
    if len(movies) < 3:
        trending = list(
            movies_collection.find({}, {"_id": 0})
            .sort("popularity_score", -1)
            .limit(limit)
        )
        existing_ids = {m.get("tmdb_id") for m in movies}
        for t in trending:
            if t.get("tmdb_id") not in existing_ids:
                movies.append(t)
            if len(movies) >= limit:
                break
    
    return [_format_movie(m) for m in movies]


async def _generate_llm_reply(message: str, movies: List[dict]) -> Optional[str]:
    """Try to generate an AI reply using the configured LLM provider."""
    api_key = os.getenv("LLM_API_KEY") or os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY")
    
    if not api_key:
        return None
    
    try:
        from services.llm_service import llm_service
        movie_titles = ", ".join([m.get("title", "") for m in movies[:5]])
        
        system_prompt = f"""You are NeuralFlix AI — a charismatic, knowledgeable movie recommendation assistant.
The user said: "{message}"
We found these movies: {movie_titles}.
Write a brief, engaging response (2-3 sentences) explaining why these movies match their request.
Be conversational, warm, and cinematic in tone. Use emoji sparingly."""
        
        # Use the existing LLM service
        provider = os.getenv("LLM_PROVIDER", "anthropic").lower()
        
        if provider == "anthropic":
            response = await llm_service.anthropic.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=200,
                system=system_prompt,
                messages=[{"role": "user", "content": "Recommend movies based on my request."}]
            )
            return response.content[0].text
        else:
            response = await llm_service.openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": "Recommend movies based on my request."}
                ],
                max_tokens=200
            )
            return response.choices[0].message.content
            
    except Exception as e:
        logger.warning(f"LLM generation failed, using fallback: {e}")
        return None


@router.post("/recommend", response_model=ChatResponse)
async def chat_recommend(request: ChatRequest):
    """
    AI-powered conversational movie recommendation.
    Analyzes the user's message, finds relevant movies, and generates
    a natural language response. Falls back gracefully without LLM keys.
    """
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    # 1. Find relevant movies
    movies = await _fetch_movies_for_message(request.message)
    
    # 2. Try AI-generated reply, fallback to curated response
    ai_reply = await _generate_llm_reply(request.message, movies)
    
    if not ai_reply:
        # Smart fallback based on what we found
        if movies:
            movie_titles = " and ".join([f'"{m["title"]}"' for m in movies[:3]])
            ai_reply = f"{random.choice(FALLBACK_REPLIES)} I found {movie_titles} — all highly rated and matching your vibe. Give them a watch! 🎬"
        else:
            ai_reply = "I couldn't find exact matches, but here are some trending films you might enjoy. Try being more specific about genres, moods, or regions! 🌍"
    
    movie_suggestions = [MovieSuggestion(**m) for m in movies]
    
    return ChatResponse(reply=ai_reply, movies=movie_suggestions)
