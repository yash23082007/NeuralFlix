"""
Bulk-load the TMDB 930K dataset CSV into PostgreSQL (db.models.Movie table).

Usage:
    cd backend
    python scripts/load_tmdb_csv_to_pg.py

Reads the CSV path from the TMDB_CSV_PATH env variable.
Performs ON CONFLICT (tmdb_id) DO UPDATE for idempotent re-runs.
"""

import os, sys, math, json
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
import pandas as pd
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from db.models import Base, Movie
from utils.wsl_resolver import resolve_wsl_url

# ─── Configuration ────────────────────────────────────────
CSV_PATH = os.getenv(
    "TMDB_CSV_PATH",
    r"C:\Users\yash6\.cache\kagglehub\datasets\asaniczka\tmdb-movies-dataset-2023-930k-movies\versions\911\TMDB_movie_dataset_v11.csv",
)
DATABASE_URL = resolve_wsl_url(os.getenv("DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:5432/neuralflix"))
CHUNK_SIZE = 5000
MIN_VOTES_FILTER = 0  # Set > 0 to skip obscure entries (e.g. 5 filters to ~180k quality movies)

# ─── Language → Region Map ─────────────────────────────────
LANG_TO_REGION = {
    "hi": "bollywood", "te": "tollywood", "ta": "kollywood",
    "ml": "mollywood", "kn": "sandalwood", "bn": "indian",
    "mr": "indian", "pa": "indian",
    "ko": "korean", "ja": "japanese", "fr": "french",
    "es": "spanish", "de": "german", "it": "italian",
    "pt": "brazilian", "zh": "chinese", "cn": "chinese",
    "fa": "iranian", "ru": "russian", "tr": "turkish",
    "th": "thai", "ar": "arabic", "en": "hollywood",
}
INDIAN_LANGS = {"hi", "te", "ta", "ml", "kn", "bn", "mr", "pa"}


def parse_genres(genre_str):
    """Parse genres from the CSV (comma-separated string like 'Action, Drama')."""
    if pd.isna(genre_str) or not genre_str:
        return []
    return [g.strip() for g in str(genre_str).split(",") if g.strip()]


def main():
    if not os.path.exists(CSV_PATH):
        print(f"❌ CSV not found at: {CSV_PATH}")
        sys.exit(1)

    engine = create_engine(DATABASE_URL, pool_size=5, max_overflow=10, pool_pre_ping=True)
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)

    total_inserted = 0
    total_skipped = 0
    chunk_num = 0

    print(f"🚀 Loading TMDB CSV → PostgreSQL (Bulk Executemany)")
    print(f"   CSV: {CSV_PATH}")
    print(f"   DB:  {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")
    print(f"   Chunk size: {CHUNK_SIZE}")
    print()

    insert_stmt = text("""
        INSERT INTO movies (
            tmdb_id, imdb_id, title, overview, tagline, genres, language,
            release_date, runtime, poster_url, backdrop_url,
            tmdb_rating, tmdb_votes, popularity_score,
            cinema_region, is_indian, keywords, budget
        ) VALUES (
            :tmdb_id, :imdb_id, :title, :overview, :tagline, :genres, :language,
            :release_date, :runtime, :poster_url, :backdrop_url,
            :tmdb_rating, :tmdb_votes, :popularity_score,
            :cinema_region, :is_indian, :keywords, :budget
        )
        ON CONFLICT (tmdb_id) DO UPDATE SET
            imdb_id = COALESCE(EXCLUDED.imdb_id, movies.imdb_id),
            title = EXCLUDED.title,
            overview = CASE WHEN EXCLUDED.overview != '' THEN EXCLUDED.overview ELSE movies.overview END,
            tagline = CASE WHEN EXCLUDED.tagline != '' THEN EXCLUDED.tagline ELSE movies.tagline END,
            genres = EXCLUDED.genres,
            language = EXCLUDED.language,
            release_date = COALESCE(EXCLUDED.release_date, movies.release_date),
            runtime = COALESCE(EXCLUDED.runtime, movies.runtime),
            poster_url = COALESCE(EXCLUDED.poster_url, movies.poster_url),
            backdrop_url = COALESCE(EXCLUDED.backdrop_url, movies.backdrop_url),
            tmdb_rating = EXCLUDED.tmdb_rating,
            tmdb_votes = EXCLUDED.tmdb_votes,
            popularity_score = EXCLUDED.popularity_score,
            cinema_region = EXCLUDED.cinema_region,
            is_indian = EXCLUDED.is_indian,
            keywords = EXCLUDED.keywords,
            budget = COALESCE(EXCLUDED.budget, movies.budget)
    """)

    # Load existing IMDb IDs from DB to prevent unique constraint violation
    temp_session = Session()
    existing_imdb_ids = set()
    try:
        results = temp_session.execute(text("SELECT imdb_id FROM movies WHERE imdb_id IS NOT NULL")).fetchall()
        for r in results:
            existing_imdb_ids.add(r[0])
        print(f"   ↳ Loaded {len(existing_imdb_ids):,} existing IMDb IDs from database to prevent duplicates.")
    except Exception as e:
        print(f"   ⚠️ Warning: Could not preload existing IMDb IDs: {e}")
    finally:
        temp_session.close()

    for chunk in pd.read_csv(CSV_PATH, chunksize=CHUNK_SIZE, dtype=str, low_memory=False):
        chunk_num += 1
        session = Session()
        params_list = []
        batch_skipped = 0

        for _, row in chunk.iterrows():
            try:
                tmdb_id_raw = row.get("id")
                if pd.isna(tmdb_id_raw):
                    batch_skipped += 1
                    continue
                tmdb_id = int(float(str(tmdb_id_raw).strip()))

                title = str(row.get("title", "")).strip()
                if not title or title == "nan":
                    batch_skipped += 1
                    continue

                # Parse numeric fields safely
                vote_count = 0
                try:
                    vote_count = int(float(row.get("vote_count", 0))) if not pd.isna(row.get("vote_count")) else 0
                except (ValueError, TypeError):
                    pass

                if vote_count < MIN_VOTES_FILTER:
                    batch_skipped += 1
                    continue

                vote_avg = 0.0
                try:
                    vote_avg = float(row.get("vote_average", 0)) if not pd.isna(row.get("vote_average")) else 0.0
                except (ValueError, TypeError):
                    pass

                runtime_val = None
                try:
                    runtime_val = int(float(row.get("runtime"))) if not pd.isna(row.get("runtime")) else None
                except (ValueError, TypeError):
                    pass

                budget_val = None
                try:
                    budget_val = int(float(row.get("budget"))) if not pd.isna(row.get("budget")) else None
                except (ValueError, TypeError):
                    pass

                popularity_score = round(vote_avg * math.log10(vote_count + 1), 2) if vote_count > 0 else 0.0

                lang = str(row.get("original_language", "en")).strip() if not pd.isna(row.get("original_language")) else "en"
                region = LANG_TO_REGION.get(lang, "other")
                is_indian = lang in INDIAN_LANGS

                overview = str(row.get("overview")) if not pd.isna(row.get("overview")) else ""
                tagline = str(row.get("tagline")) if not pd.isna(row.get("tagline")) else ""
                release_date = str(row.get("release_date")) if not pd.isna(row.get("release_date")) else None
                imdb_id = str(row.get("imdb_id")).strip() if not pd.isna(row.get("imdb_id")) else None
                if imdb_id:
                    if imdb_id in existing_imdb_ids:
                        imdb_id = None
                    else:
                        existing_imdb_ids.add(imdb_id)
                poster_path = row.get("poster_path")
                backdrop_path = row.get("backdrop_path")
                genres = parse_genres(row.get("genres"))
                keywords_raw = row.get("keywords")
                keywords = [k.strip() for k in str(keywords_raw).split(",") if k.strip()] if not pd.isna(keywords_raw) else []

                poster_url = f"https://image.tmdb.org/t/p/w500{poster_path}" if not pd.isna(poster_path) and poster_path else None
                backdrop_url = f"https://image.tmdb.org/t/p/original{backdrop_path}" if not pd.isna(backdrop_path) and backdrop_path else None

                params_list.append({
                    "tmdb_id": tmdb_id,
                    "imdb_id": imdb_id,
                    "title": title,
                    "overview": overview,
                    "tagline": tagline,
                    "genres": genres,
                    "language": lang,
                    "release_date": release_date,
                    "runtime": runtime_val,
                    "poster_url": poster_url,
                    "backdrop_url": backdrop_url,
                    "tmdb_rating": round(vote_avg, 2),
                    "tmdb_votes": vote_count,
                    "popularity_score": popularity_score,
                    "cinema_region": region,
                    "is_indian": is_indian,
                    "keywords": keywords,
                    "budget": budget_val,
                })
            except Exception as e:
                batch_skipped += 1
                continue

        batch_inserted = len(params_list)
        if params_list:
            try:
                session.execute(insert_stmt, params_list)
                session.commit()
                total_inserted += batch_inserted
                total_skipped += batch_skipped
                print(f"   ✅ Chunk {chunk_num}: +{batch_inserted} upserted, {batch_skipped} skipped  |  Running total: {total_inserted}")
            except Exception as e:
                session.rollback()
                print(f"   ❌ Chunk {chunk_num}: commit failed — {e}")
            finally:
                session.close()
        else:
            total_skipped += batch_skipped
            session.close()

    # Print summary
    print()
    print(f"═══════════════════════════════════════════")
    print(f"  ✅ Ingestion Complete!")
    print(f"     Total upserted:  {total_inserted:,}")
    print(f"     Total skipped:   {total_skipped:,}")

    # Verify count
    session = Session()
    count = session.execute(text("SELECT COUNT(*) FROM movies")).scalar()
    session.close()
    print(f"     DB movie count:  {count:,}")
    print(f"═══════════════════════════════════════════")


if __name__ == "__main__":
    main()
