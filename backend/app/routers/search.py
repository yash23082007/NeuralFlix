"""
Movie Intelligence Platform — Search Router
Hybrid search with natural language query parsing, structured filters, and suggestion autocomplete.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.dependencies import get_current_user_optional
from app.models.user import User
from app.models.movie import Movie
from app.models.taste_control import TasteControl
from app.models.graph import SearchQuery
from app.search.query_parser import parse_search_query
from app.routers.movies import _format_movie
from app.services.recommendation_service import calculate_score_breakdown

router = APIRouter(prefix="/api/v1/search", tags=["Search"])


@router.get("")
@router.get("/movies")
async def search_movies_endpoint(
    q: Optional[str] = Query(None),
    query: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    Search catalog with natural language intent extraction, fuzzy keyword matching,
    and personalized re-ranking for authenticated users.
    """
    search_term = (q or query or "").strip()
    if not search_term:
        res = await db.execute(select(Movie).order_by(desc(Movie.popularity_score)).limit(limit))
        movies = res.scalars().all()
        
        # Log empty search
        query_obj = SearchQuery(
            user_id=current_user.id if current_user else None,
            raw_query="",
            parsed_intent=None,
            result_count=len(movies)
        )
        db.add(query_obj)
        await db.commit()
        await db.refresh(query_obj)
        
        return {"results": [_format_movie(m) for m in movies], "total": len(movies), "page": page, "parsed_intent": None, "query_id": query_obj.id}

    parsed = parse_search_query(search_term)
    
    # Fetch candidates
    result = await db.execute(select(Movie))
    all_movies = result.scalars().all()

    target_genres = set(parsed["genres"])
    target_region = parsed["region"]
    runtime_max = parsed["runtime_max"]
    year_min = parsed["year_min"]
    year_max = parsed["year_max"]
    clean_q = parsed["clean_query"].lower()

    # Load taste profile if user logged in
    taste = TasteControl(user_id="default")
    if current_user:
        t_res = await db.execute(select(TasteControl).where(TasteControl.user_id == current_user.id))
        taste = t_res.scalar_one_or_none() or taste

    scored = []
    for m in all_movies:
        match_score = 0.0
        m_title = (m.title or "").lower()
        m_overview = (m.overview or "").lower()
        m_director = (m.director or "").lower()
        m_cast = [c.lower() for c in (m.cast_members or [])]
        m_genres = set(m.genres or [])
        m_region = (m.cinema_region or "").lower()
        m_keywords = [k.lower() for k in (m.keywords or [])]

        # 1. Text match
        if clean_q:
            if clean_q in m_title:
                match_score += 40.0
            elif any(clean_q in w for w in m_title.split()):
                match_score += 25.0
            if clean_q in m_director:
                match_score += 30.0
            if any(clean_q in c for c in m_cast):
                match_score += 20.0
            if clean_q in m_overview:
                match_score += 10.0
            if any(clean_q in k for k in m_keywords):
                match_score += 15.0

        # 2. Genre match from query parser
        if target_genres:
            overlap = len(target_genres & m_genres)
            if overlap > 0:
                match_score += overlap * 25.0
            else:
                match_score -= 15.0

        # 3. Region constraint
        if target_region:
            if target_region in m_region or target_region in (m.language or "").lower():
                match_score += 30.0
            else:
                match_score -= 20.0

        # 4. Runtime constraint
        if runtime_max:
            if m.runtime and m.runtime <= runtime_max:
                match_score += 20.0
            elif m.runtime and m.runtime > runtime_max:
                match_score -= 100.0

        # 5. Year / Decade constraint
        if year_min and year_max:
            if m.year and year_min <= m.year <= year_max:
                match_score += 25.0
            else:
                match_score -= 100.0

        # Include if positive match or if general search term matched
        if match_score > 0 or (not clean_q and (target_genres or target_region or runtime_max)):
            taste_bd = calculate_score_breakdown(m, taste)
            total_rank = match_score + (taste_bd["score"] * 0.3)
            
            f_movie = _format_movie(m)
            f_movie["rec_score"] = round(min(total_rank / 100.0, 0.99), 2)
            f_movie["explanation"] = f"Matches search for '{search_term}': {taste_bd['explanation']}"
            scored.append((f_movie, total_rank))

    # Sort by match_score DESC, popularity DESC, tmdb_rating DESC
    scored.sort(key=lambda x: (x[1], x[0].get("popularity_score") or 0.0, x[0].get("tmdb_rating") or 0.0), reverse=True)
    offset = (page - 1) * limit
    paged = [item[0] for item in scored[offset : offset + limit]]
    
    # Log search
    query_obj = SearchQuery(
        user_id=current_user.id if current_user else None,
        raw_query=search_term,
        parsed_intent=parsed,
        result_count=len(scored)
    )
    db.add(query_obj)
    await db.commit()
    await db.refresh(query_obj)

    return {
        "query_id": query_obj.id,
        "results": paged,
        "total": len(scored),
        "page": page,
        "parsed_intent": parsed,
        "served_by": "hybrid-search-parser-v1"
    }


@router.get("/suggest")
async def search_suggestions(
    q: str = Query(..., min_length=1),
    limit: int = Query(6, ge=1, le=10),
    db: AsyncSession = Depends(get_db)
):
    """Fast autocomplete suggestions for the SearchBar component."""
    clean_q = q.strip().lower()
    result = await db.execute(select(Movie))
    all_movies = result.scalars().all()

    matches = []
    for m in all_movies:
        title = m.title or ""
        if clean_q in title.lower():
            matches.append({
                "tmdb_id": m.tmdb_id or m.id,
                "id": m.id,
                "title": title,
                "year": m.year,
                "genres": m.genres or [],
                "poster_url": m.poster_url,
                "rating": m.tmdb_rating,
                "cinema_region": m.cinema_region
            })
    
    matches.sort(key=lambda x: x.get("rating") or 0.0, reverse=True)
    return {"suggestions": matches[:limit]}


@router.post("/click")
async def search_click(
    movie_id: int = Query(...),
    query_id: Optional[int] = Query(None),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """Log a click from a search result."""
    from app.models.graph import SearchQuery
    if query_id:
        stmt = select(SearchQuery).where(SearchQuery.id == query_id)
        res = await db.execute(stmt)
        sq = res.scalar_one_or_none()
        if sq:
            sq.clicked_movie_id = movie_id
            await db.commit()
            return {"status": "success", "query_id": query_id, "movie_id": movie_id}
            
    # Fallback if no specific query_id is provided: find most recent search query for user
    if current_user:
        stmt = select(SearchQuery).where(SearchQuery.user_id == current_user.id).order_by(SearchQuery.created_at.desc()).limit(1)
        res = await db.execute(stmt)
        sq = res.scalar_one_or_none()
        if sq:
            sq.clicked_movie_id = movie_id
            await db.commit()
            return {"status": "success", "query_id": sq.id, "movie_id": movie_id}
            
    return {"status": "ignored", "reason": "No query_id and no logged in user"}
