"""
Movie Intelligence Platform — Resumable TMDB Data Platform Ingestion Pipeline

Stages:
1. popular: discover sort=popularity.desc
2. top_rated: discover sort=vote_average.desc
3. by_region: discover with regional language filters
4. details_fill: fetch credits, keywords, and normalize into graph tables

Run via: python -m pipeline.datasets.tmdb_sync --stage popular --max-pages 5
"""

import argparse
import asyncio
from datetime import datetime, timezone
import json
import sys
from pathlib import Path



from sqlalchemy import select
from app.database import async_session, init_db
from app.models.movie import Movie
from app.models.graph import Person, MovieCast, MovieCrew, Keyword, MovieKeyword, IngestionCheckpoint
from app.services.tmdb_service import discover_movies, fetch_movie_details, parse_tmdb_movie


async def sync_stage(stage: str = "popular", max_pages: int = 2) -> int:
    await init_db()
    inserted = 0
    
    stage_params = {
        "popular": {"sort_by": "popularity.desc"},
        "top_rated": {"sort_by": "vote_average.desc", "extra_params": {"vote_count.gte": "1000"}},
        "korean": {"sort_by": "popularity.desc", "extra_params": {"with_original_language": "ko"}},
        "indian": {"sort_by": "popularity.desc", "extra_params": {"with_original_language": "hi"}},
        "japanese": {"sort_by": "popularity.desc", "extra_params": {"with_original_language": "ja"}},
        "french": {"sort_by": "popularity.desc", "extra_params": {"with_original_language": "fr"}},
    }
    
    config = stage_params.get(stage, {"sort_by": "popularity.desc"})
    job_name = f"tmdb_sync_{stage}"

    async with async_session() as db:
        # Check database checkpoint
        chk = await db.get(IngestionCheckpoint, job_name)
        start_page = chk.last_page if chk else 1
        
        for page in range(start_page, start_page + max_pages):
            print(f"[{stage}] Syncing page {page}...")
            listing = await discover_movies(
                page=page,
                sort_by=config["sort_by"],
                extra_params=config.get("extra_params")
            )
            
            items = listing.get("results", [])
            if not items:
                break
                
            for item in items:
                tmdb_id = item.get("id")
                if not tmdb_id:
                    continue
                    
                exists = await db.scalar(select(Movie.id).where(Movie.tmdb_id == tmdb_id))
                if exists:
                    continue
                    
                details = await fetch_movie_details(tmdb_id)
                if not details:
                    continue
                    
                movie_dict = parse_tmdb_movie(details)
                movie = Movie(**movie_dict)
                db.add(movie)
                await db.flush()  # get movie.id
                
                # Normalize Credits & Cast
                if "credits" in details:
                    # Cast
                    for cast_item in details["credits"].get("cast", [])[:8]:
                        p_name = cast_item.get("name")
                        p_id = cast_item.get("id")
                        if not p_name:
                            continue
                        person = await db.scalar(select(Person).where(Person.tmdb_person_id == p_id))
                        if not person:
                            person = Person(
                                tmdb_person_id=p_id,
                                name=p_name,
                                known_for=cast_item.get("known_for_department", "Acting"),
                                profile_url=f"https://image.tmdb.org/t/p/w185{cast_item.get('profile_path')}" if cast_item.get("profile_path") else None
                            )
                            db.add(person)
                            await db.flush()
                        db.add(MovieCast(
                            movie_id=movie.id,
                            person_id=person.id,
                            character_name=cast_item.get("character"),
                            cast_order=cast_item.get("order", 0)
                        ))
                    
                    # Crew / Director
                    for crew_item in details["credits"].get("crew", []):
                        if crew_item.get("job") in ["Director", "Writer", "Composer"]:
                            p_name = crew_item.get("name")
                            p_id = crew_item.get("id")
                            if not p_name:
                                continue
                            person = await db.scalar(select(Person).where(Person.tmdb_person_id == p_id))
                            if not person:
                                person = Person(
                                    tmdb_person_id=p_id,
                                    name=p_name,
                                    known_for=crew_item.get("department"),
                                    profile_url=f"https://image.tmdb.org/t/p/w185{crew_item.get('profile_path')}" if crew_item.get("profile_path") else None
                                )
                                db.add(person)
                                await db.flush()
                            db.add(MovieCrew(
                                movie_id=movie.id,
                                person_id=person.id,
                                job=crew_item.get("job")
                            ))
                            
                # Normalize Keywords
                if "keywords" in details:
                    for kw_item in details["keywords"].get("keywords", []):
                        kw_name = kw_item.get("name", "").strip().lower()
                        kw_id = kw_item.get("id")
                        if not kw_name:
                            continue
                        keyword = await db.scalar(select(Keyword).where(Keyword.name == kw_name))
                        if not keyword:
                            keyword = Keyword(tmdb_keyword_id=kw_id, name=kw_name)
                            db.add(keyword)
                            await db.flush()
                        db.add(MovieKeyword(movie_id=movie.id, keyword_id=keyword.id))
                        
                inserted += 1

            # Update checkpoint
            if not chk:
                chk = IngestionCheckpoint(
                    job_name=job_name,
                    last_page=page + 1,
                    status="running",
                    last_synced_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc)
                )
                db.add(chk)
            else:
                chk.last_page = page + 1
                chk.last_synced_at = datetime.now(timezone.utc)
                chk.updated_at = datetime.now(timezone.utc)

            await db.commit()

    return inserted


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="TMDB Catalog Ingestion Worker")
    parser.add_argument("--stage", type=str, default="popular", choices=["popular", "top_rated", "korean", "indian", "japanese", "french"])
    parser.add_argument("--max-pages", type=int, default=1)
    args = parser.parse_args()
    
    count = asyncio.run(sync_stage(stage=args.stage, max_pages=args.max_pages))
    print(f"Successfully processed {count} movies for stage [{args.stage}].")
