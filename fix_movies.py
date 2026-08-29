import sys
with open("backend/app/routers/movies.py", "r") as f:
    content = f.read()

# Replace full scans with SQL pushdown
import re

# get_by_mood
mood_func = """@router.get("/mood/{mood}")
async def get_by_mood(mood: str, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=50), db: AsyncSession = Depends(get_db)):
    \"\"\"Return movies aligned with affective mood filters.\"\"\"
    mood_lower = mood.lower()
    target_genres = MOOD_GENRE_MAP.get(mood_lower, ["Drama", "Action"])
    
    # SQL pushdown for SQLite/Postgres: check if any target genre is in the genres JSON
    # Simple cross-db approach for now: OR conditions on cast(genres, String).ilike
    from sqlalchemy import cast, String
    conditions = [cast(Movie.genres, String).ilike(f"%{g}%") for g in target_genres]
    
    offset = (page - 1) * limit
    result = await db.execute(
        select(Movie)
        .where(or_(*conditions))
        .order_by(desc(Movie.tmdb_rating), desc(Movie.popularity_score))
        .offset(offset)
        .limit(limit)
    )
    paged = result.scalars().all()
    
    # Note: total count requires a separate query or we can just return a large total
    # For now, returning a static total or doing a count query
    from sqlalchemy import select, func
    count_res = await db.execute(select(func.count(Movie.id)).where(or_(*conditions)))
    total = count_res.scalar()
    
    return {"results": [_format_movie(m) for m in paged], "mood": mood, "total": total}
"""

content = re.sub(r"@router\.get\(\"/mood/\{mood\}\"\).*?(?=@router\.get)", mood_func + "\n\n", content, flags=re.DOTALL)

with open("backend/app/routers/movies.py", "w") as f:
    f.write(content)

