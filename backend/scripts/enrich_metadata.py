import os
import sys
import time
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models.sql_models import PostgresMovie
from utils.tmdb_api import fetch_by_external_id, fetch_movie_details, get_poster_url, get_backdrop_url
from utils.omdb_api import fetch_omdb_details_by_imdb_id
from utils.vector_engine import generate_movie_embedding

load_dotenv()

SUPABASE_URL = os.getenv("DATABASE_URL")

def enrich_cinematic_data(limit=100):
    """
    The 'Metadata Heist' Phase 2.
    Takes core IMDb IDs, maps them to TMDB for visuals, and generates AI embeddings.
    """
    if not SUPABASE_URL:
        print("❌ Error: SUPABASE_DATABASE_URL not found.")
        return

    engine = create_engine(SUPABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    # Find records with no visuals/tmdb mappings
    movies_to_enrich = db.query(PostgresMovie).filter(
        PostgresMovie.tmdb_id == 0
    ).limit(limit).all()

    print(f"🎬 Found {len(movies_to_enrich)} movies to enrich with Visuals & Neural Advantage.")

    for m in movies_to_enrich:
        try:
            print(f"Enriching: {m.title} ({m.imdb_id})...")
            
            # 1. Map IMDb -> TMDB
            tmdb_basics = fetch_by_external_id(m.imdb_id)
            if not tmdb_basics:
                print(f"   [!] No TMDB match for {m.title}. Skipping.")
                continue
            
            tmdb_id = tmdb_basics.get("id")
            m.tmdb_id = tmdb_id

            # 2. Fetch Full TMDB Enrichment (Visuals + Tagline + Overview)
            detail_data = fetch_movie_details(tmdb_id)
            if detail_data:
                m.overview = detail_data.get("overview", "")
                m.tagline = detail_data.get("tagline", "")
                m.poster_url = get_poster_url(detail_data.get("poster_path"))
                m.backdrop_url = get_backdrop_url(detail_data.get("backdrop_path"))
                m.runtime = detail_data.get("runtime")
                m.tmdb_rating = detail_data.get("vote_average", 0)
                m.tmdb_votes = detail_data.get("vote_count", 0)

                # Extracts Trailer (Visuals Strategy)
                videos = detail_data.get("videos", {}).get("results", [])
                for v in videos:
                    if v.get("type") == "Trailer" and v.get("site") == "YouTube":
                        m.trailer_key = v.get("key")
                        break

            # 3. Fetch OMDB Enrichment (Rotten Tomatoes / Awards)
            omdb_data = fetch_omdb_details_by_imdb_id(m.imdb_id)
            if omdb_data:
                m.rt_rating = next((r.get("Value") for r in omdb_data.get("Ratings", []) if r.get("Source") == "Rotten Tomatoes"), None)
                m.metacritic = omdb_data.get("Metascore")
                m.awards = omdb_data.get("Awards")
                m.box_office = omdb_data.get("BoxOffice")

            # 4. THE NEURAL ADVANTAGE: Generate Semantic Embedding
            # We must have at least an overview to make a meaningful vector.
            if m.overview:
                print(f"   [🧠] Generating Neural Vector for '{m.title}'...")
                m.embedding = generate_movie_embedding(
                    movie_title=m.title,
                    overview=m.overview,
                    tagline=m.tagline or "",
                    genres=m.genres or []
                )

            db.commit()
            print(f"   [✅] Fully Enriched & Vectorized.")
            
            # Rate limiting safety
            time.sleep(0.5)

        except Exception as e:
            db.rollback()
            print(f"   [❌] Failed enrich: {e}")
            continue

    db.close()
    print("✨ Phase 2 Enrichment Complete.")

if __name__ == "__main__":
    # Start with 50 for testing
    enrich_cinematic_data(limit=50)
