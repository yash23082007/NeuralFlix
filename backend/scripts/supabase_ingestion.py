import sys
import os
import math
import time

# Ensure imports work when running as script
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.sql_models import Base, PostgresMovie
from utils.tmdb_api import fetch_popular_movies, fetch_movie_details, fetch_genre_list, get_poster_url, get_backdrop_url
from utils.omdb_api import fetch_omdb_details_by_imdb_id, fetch_omdb_details_by_title
from utils.imdb_api import fetch_imdb_title_details
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_DATABASE_URL", "postgresql://user:pass@localhost:5432/postgres")
engine = create_engine(SUPABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def init_db():
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Supabase PostgeSQL tables initialized.")
    except Exception as e:
        print(f"⚠️ Could not initialize DB (Ignore if running without valid Supabase URL): {e}")

def run_ingestion_pipeline(pages=1, languages=["en-US", "hi-IN", "es-ES", "ja-JP", "ko-KR"]):
    """
    Big Three Data Integration Pipeline.
    Runs weekly to harvest multi-language metadata, rating enrichments, and box office.
    """
    db = SessionLocal()
    genre_map = fetch_genre_list()

    total_ingested = 0
    print(f"🚀 Starting The Big Three Pipeline. Harvesting {pages} pages across {len(languages)} languages...")

    for lang in languages:
        for page in range(1, pages + 1):
            print(f"Fetching TMDB popularity for Language: {lang} | Page: {page}")
            movies = fetch_popular_movies(page=page, language=lang)

            for tmdb_m in movies:
                tmdb_id = tmdb_m.get("id")
                if not tmdb_id:
                    continue

                # 1. Look up fully detailed TMDB info (for cast, director, trailer, imdb_id)
                detail_data = fetch_movie_details(tmdb_id)
                if not detail_data:
                    continue
                
                imdb_id = detail_data.get("imdb_id")
                
                # Deduplication logic (PostgreSQL via SQLAlchemy)
                try:
                    exists = False
                    if imdb_id:
                        exists = db.query(PostgresMovie).filter(PostgresMovie.imdb_id == imdb_id).first()
                    else:
                        exists = db.query(PostgresMovie).filter(PostgresMovie.tmdb_id == tmdb_id).first()

                    if exists:
                        continue # Already fully ingested (in real pipeline, you could run an UPDATE merge here)
                except Exception:
                    # Ignore DB errors if testing locally without Supabase configured
                    pass

                # 2. Extract detailed TMDB people and media
                genres = [g["name"] for g in detail_data.get("genres", [])]
                
                cast = []
                credits = detail_data.get("credits", {})
                for actor in credits.get("cast", [])[:10]:
                    cast.append({
                        "name": actor.get("name"),
                        "character": actor.get("character"),
                        "profile_url": get_poster_url(actor.get("profile_path"), size="w185")
                    })

                director = None
                for crew in credits.get("crew", []):
                    if crew.get("job") == "Director":
                        director = crew.get("name")
                        break

                trailer_key = None
                for video in detail_data.get("videos", {}).get("results", []):
                    if video.get("type") == "Trailer" and video.get("site") == "YouTube":
                        trailer_key = video.get("key")
                        break

                providers_data = detail_data.get("watch/providers", {}).get("results", {})
                platforms = []
                for region in ["IN", "US", "GB"]:
                    if region in providers_data:
                        flatrate = providers_data[region].get("flatrate", [])
                        platforms = [p["provider_name"] for p in flatrate]
                        if platforms:
                            break

                tmdb_votes = detail_data.get("vote_count", 0)
                tmdb_rating = detail_data.get("vote_average", 0)
                popularity = round(tmdb_rating * math.log10(tmdb_votes + 1), 2) if tmdb_votes > 0 else 0
                title = detail_data.get("title")

                # 3. OMDB API Enrichment (Rotten Tomatoes, Box Office, Awards)
                omdb_data = fetch_omdb_details_by_imdb_id(imdb_id) if imdb_id else fetch_omdb_details_by_title(title)
                extra_box_office = omdb_data.get("BoxOffice") if omdb_data else None
                extra_awards = omdb_data.get("Awards") if omdb_data else None
                
                rt_rating = None
                if omdb_data and "Ratings" in omdb_data:
                    for r in omdb_data["Ratings"]:
                        if r.get("Source") == "Rotten Tomatoes":
                            rt_rating = r.get("Value", "").replace("%", "")
                            break

                # 4. IMDb API Enrichment (Exact Rating, Votes, Metacritic)
                imdb_dev_data = fetch_imdb_title_details(imdb_id) if imdb_id else None
                imdb_api_rating = None
                imdb_api_votes = None
                metacritic_score = None
                
                if imdb_dev_data:
                    imdb_api_rating = float(imdb_dev_data.get("rating", {}).get("aggregateRating", 0)) or None
                    try:
                        imdb_api_votes = int(imdb_dev_data.get("rating", {}).get("voteCount", 0)) or None
                    except ValueError:
                        pass
                    metacritic_score = str(imdb_dev_data.get("metacritic", {}).get("score", "")) or None
                else:
                    # Fallback to OMDB stats if imdbapi.dev failed
                    imdb_api_rating = float(omdb_data.get("imdbRating", 0)) if omdb_data and omdb_data.get("imdbRating") not in ["N/A", None] else None
                    try:
                        imdb_api_votes = int(omdb_data.get("imdbVotes", "0").replace(",", "")) if omdb_data and omdb_data.get("imdbVotes") not in ["N/A", None] else None
                    except ValueError:
                        pass

                # 5. Build Postgres ORM Object
                pg_movie = PostgresMovie(
                    tmdb_id=tmdb_id,
                    imdb_id=imdb_id,
                    title=title,
                    overview=detail_data.get("overview", ""),
                    tagline=detail_data.get("tagline", ""),
                    genres=genres,
                    language=detail_data.get("original_language", "en"),
                    release_date=detail_data.get("release_date"),
                    runtime=detail_data.get("runtime"),
                    platforms=platforms,
                    tmdb_rating=tmdb_rating,
                    tmdb_votes=tmdb_votes,
                    popularity_score=popularity,
                    imdb_rating=imdb_api_rating,
                    imdb_votes=imdb_api_votes,
                    rt_rating=rt_rating,
                    metacritic=metacritic_score,
                    box_office=extra_box_office,
                    awards=extra_awards,
                    poster_url=get_poster_url(detail_data.get("poster_path")),
                    backdrop_url=get_backdrop_url(detail_data.get("backdrop_path")),
                    trailer_key=trailer_key,
                    director=director,
                    cast_members=cast
                )
                
                try:
                    db.add(pg_movie)
                    db.commit()
                    print(f"   [+] Ingested: {title} (IMDb: {imdb_id})")
                    total_ingested += 1
                except Exception as e:
                    db.rollback()
                    # Silently fail if DB string is bad
                
                # Small delay to prevent API rate limiting from IMDb/TMDB
                time.sleep(0.1)

    try:
        db.close()
    except Exception:
        pass
    
    print(f"\n✅ Pipeline Complete! Successfully integrated {total_ingested} premium movies from TMDB + IMDb + OMDB into Supabase.")

if __name__ == "__main__":
    init_db()
    
    # Example execution: fetch 2 pages across multi-languages
    run_ingestion_pipeline(pages=2)
