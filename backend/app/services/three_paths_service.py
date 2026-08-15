"""
NeuralFlix — One Film, Three Paths Service

Transforms a single movie into three structured discovery pathways:
- Path 1: Similar Feeling (Aesthetic & Tonal resonance)
- Path 2: Cultural Conversation (Regional themes, history, society)
- Path 3: Global Bridge (International cinema twin)
"""

from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.movie import Movie
from app.services.cultural_bridge_service import find_cultural_bridges


async def generate_three_paths_for_movie(db: AsyncSession, tmdb_id: int) -> Dict[str, Any]:
    """Generate 3 curated discovery paths for a given movie."""
    # Find source movie
    res = await db.execute(select(Movie).where(Movie.tmdb_id == tmdb_id))
    source_movie = res.scalar_one_or_none()

    if not source_movie:
        # Fallback dummy representation if not in local DB
        title = "Featured Film"
        genres = ["Drama"]
        lang = "en"
        region = "Global"
    else:
        title = source_movie.title
        genres = source_movie.genres or ["Drama"]
        lang = source_movie.language or "en"
        region = source_movie.cinema_region or "Global"

    # Query all candidate movies in DB
    result = await db.execute(select(Movie).limit(200))
    all_movies = result.scalars().all()

    # Filter candidates excluding source
    candidates = [m for m in all_movies if m.tmdb_id != tmdb_id]

    # 1. Path 1: Similar Feeling (matching genres and rating tier, quiet/intimate or high energy)
    path1_movies = []
    genre_set = set(genres)
    for m in candidates:
        m_genres = set(m.genres or [])
        overlap = len(genre_set.intersection(m_genres))
        if overlap > 0:
            path1_movies.append(m)
    path1_movies.sort(key=lambda x: (x.tmdb_rating or 0), reverse=True)
    path1_selection = path1_movies[:3]

    # 2. Path 2: Cultural Conversation (same language/region, exploring socio-cultural dynamics)
    path2_movies = [m for m in candidates if (m.language == lang or m.cinema_region == region)]
    if len(path2_movies) < 3:
        # Pad with high-rated region films
        path2_movies = [m for m in candidates if m.cinema_region == region or m.language == lang or "Drama" in (m.genres or [])]
    path2_movies.sort(key=lambda x: (x.tmdb_rating or 0), reverse=True)
    path2_selection = path2_movies[:3]

    # 3. Path 3: Global Bridge (films from DIFFERENT regions with similar tone)
    path3_movies = [m for m in candidates if m.language != lang and m.cinema_region != region]
    if len(path3_movies) < 3:
        path3_movies = [m for m in candidates if m.language != lang]
    path3_movies.sort(key=lambda x: (x.tmdb_rating or 0), reverse=True)
    path3_selection = path3_movies[:3]

    # Get cultural bridge context
    bridges = find_cultural_bridges(region, lang, genres)
    primary_bridge = bridges[0] if bridges else None

    return {
        "source_movie": {
            "tmdb_id": tmdb_id,
            "title": title,
            "genres": genres,
            "language": lang,
            "region": region,
            "director": getattr(source_movie, "director", None) if source_movie else None,
            "poster_url": getattr(source_movie, "poster_url", None) if source_movie else None
        },
        "paths": [
            {
                "id": "path_similar_feeling",
                "type": "aesthetic_tone",
                "badge": "Path 1",
                "title": "Similar Feeling",
                "subtitle": "Aesthetic & Tonal Resonance",
                "description": f"Films that share the emotional tempo, atmospheric stillness, and character intimacy of {title}.",
                "icon": "HeartHandshake",
                "color": "#ec4899",
                "movies": [_serialize_movie(m) for m in path1_selection]
            },
            {
                "id": "path_cultural_conversation",
                "type": "thematic_societal",
                "badge": "Path 2",
                "title": "Cultural Conversation",
                "subtitle": f"Themes of {region or 'Regional'} Society & Life",
                "description": f"Films exploring loneliness, family heritage, urban transition, and social identity in the same cultural sphere.",
                "icon": "MessageSquareQuote",
                "color": "#8b5cf6",
                "movies": [_serialize_movie(m) for m in path2_selection]
            },
            {
                "id": "path_global_bridge",
                "type": "global_counterpart",
                "badge": "Path 3",
                "title": "Global Bridge",
                "subtitle": f"Atmospheric Twin in {primary_bridge['region'] if primary_bridge else 'World Cinema'}",
                "description": primary_bridge["explanation"] if primary_bridge else "International films that strike the same philosophical and emotional chord across different continents.",
                "shared_dna": primary_bridge["shared_dna"] if primary_bridge else ["Universal human themes", "Lyrical visual storytelling"],
                "icon": "Globe",
                "color": "#06b6d4",
                "movies": [_serialize_movie(m) for m in path3_selection]
            }
        ]
    }


def _serialize_movie(m: Movie) -> Dict[str, Any]:
    return {
        "tmdb_id": m.tmdb_id,
        "title": m.title,
        "year": m.year,
        "rating": m.tmdb_rating,
        "poster_url": m.poster_url,
        "backdrop_url": m.backdrop_url,
        "genres": m.genres or [],
        "language": m.language,
        "cinema_region": m.cinema_region,
        "director": m.director,
        "overview": (m.overview[:140] + "...") if m.overview and len(m.overview) > 140 else m.overview
    }
