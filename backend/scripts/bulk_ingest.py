"""
NeuralFlix Bulk Movie Ingestion Script
=======================================
Uses TMDB Discover API to fetch 500K+ movies by iterating across:
  - Year ranges (1900–2026)
  - All TMDB genres
  - Multiple languages (en, hi, ja, ko, fr, de, es, it, etc.)

Uses MongoDB bulk upsert for deduplication by tmdb_id.

Usage:
  python scripts/bulk_ingest.py
  python scripts/bulk_ingest.py --start-year 2020 --end-year 2026
  python scripts/bulk_ingest.py --resume

Rate limits: TMDB allows ~40 requests per 10 seconds.
"""

import os
import sys
import time
import math
import json
import argparse
import requests
from datetime import datetime
from dotenv import load_dotenv
from pymongo import MongoClient, UpdateOne
from pymongo.errors import BulkWriteError

# Add parent dir to path so we can import project modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# --- Config ---
TMDB_API_KEY = os.getenv("TMDB_API_KEY")
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
OMDB_API_KEY = os.getenv("OMDB_API_KEY", "")

TMDB_BASE = "https://api.themoviedb.org/3"
IMAGE_BASE = "https://image.tmdb.org/t/p"

# TMDB Rate Limiting: 40 requests per 10 seconds
REQUEST_DELAY = 0.27  # ~3.7 requests/sec (safe margin)

# Batch size for MongoDB bulk writes
BATCH_SIZE = 500

# Progress tracking file
PROGRESS_FILE = os.path.join(os.path.dirname(__file__), "ingest_progress.json")

# Languages to crawl
LANGUAGES = [
    "en", "hi", "ta", "te", "ml", "kn", "ja", "ko", "fr", "de", 
    "es", "it", "pt", "ru", "zh", "ar", "tr", "pl", "nl", "sv",
    "th", "id", "vi", "da", "fi", "no", "cs", "ro", "hu", "el",
    "uk", "bn", "mr", "gu", "pa",
]

# --- MongoDB Setup ---
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
db = client.neuralflix
movies_col = db.movies

# Ensure unique index
movies_col.create_index("tmdb_id", unique=True, sparse=True)


def tmdb_get(endpoint: str, params: dict = None) -> dict:
    """Make a rate-limited request to TMDB API."""
    url = f"{TMDB_BASE}{endpoint}"
    p = {"api_key": TMDB_API_KEY}
    if params:
        p.update(params)
    
    for attempt in range(3):
        try:
            resp = requests.get(url, params=p, timeout=15)
            if resp.status_code == 200:
                return resp.json()
            elif resp.status_code == 429:
                # Rate limited — wait and retry
                retry_after = int(resp.headers.get("Retry-After", 5))
                print(f"  ⏳ Rate limited. Waiting {retry_after}s...")
                time.sleep(retry_after)
                continue
            else:
                return {}
        except requests.exceptions.RequestException as e:
            if attempt < 2:
                time.sleep(2)
                continue
            return {}
    return {}


def normalize_movie(movie: dict, genre_map: dict) -> dict:
    """Normalize a TMDB movie object for MongoDB storage."""
    genre_ids = movie.get("genre_ids", [])
    genre_names = [genre_map.get(gid, "") for gid in genre_ids if gid in genre_map]
    
    date_field = movie.get("release_date") or movie.get("first_air_date")
    year = None
    if date_field:
        try:
            year = int(date_field[:4])
        except (ValueError, IndexError):
            pass
    
    votes = movie.get("vote_count", 0)
    rating = movie.get("vote_average", 0)
    popularity = round(rating * math.log10(votes + 1), 2) if votes > 0 else 0
    
    title = movie.get("title") or movie.get("name", "Unknown")
    poster_path = movie.get("poster_path")
    backdrop_path = movie.get("backdrop_path")
    
    return {
        "tmdb_id": movie.get("id"),
        "title": title,
        "overview": movie.get("overview", ""),
        "year": year,
        "release_date": date_field,
        "language": movie.get("original_language", ""),
        "genres": genre_names,
        "rating": round(rating, 1),
        "votes": votes,
        "popularity_score": popularity,
        "poster_url": f"{IMAGE_BASE}/w500{poster_path}" if poster_path else None,
        "backdrop_url": f"{IMAGE_BASE}/original{backdrop_path}" if backdrop_path else None,
        "platforms": [],
        "media_type": "movie",
    }


def bulk_upsert(movies: list):
    """Bulk upsert movies into MongoDB using tmdb_id as the dedup key."""
    if not movies:
        return 0
    
    operations = []
    for m in movies:
        if not m.get("tmdb_id"):
            continue
        operations.append(
            UpdateOne(
                {"tmdb_id": m["tmdb_id"]},
                {"$set": m},
                upsert=True
            )
        )
    
    if not operations:
        return 0
    
    try:
        result = movies_col.bulk_write(operations, ordered=False)
        return result.upserted_count + result.modified_count
    except BulkWriteError as e:
        # Some dupes — that's fine
        return e.details.get("nUpserted", 0) + e.details.get("nModified", 0)


def load_progress() -> dict:
    """Load progress from file for resume capability."""
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, "r") as f:
            return json.load(f)
    return {"total_ingested": 0, "completed_combos": []}


def save_progress(progress: dict):
    """Save progress to file."""
    with open(PROGRESS_FILE, "w") as f:
        json.dump(progress, f, indent=2)


def get_genre_map() -> dict:
    """Fetch TMDB genre ID → name mapping."""
    data = tmdb_get("/genre/movie/list", {"language": "en"})
    time.sleep(REQUEST_DELAY)
    return {g["id"]: g["name"] for g in data.get("genres", [])}


def discover_movies(year: int, language: str, genre_map: dict, page: int = 1) -> tuple:
    """
    Fetch a page of movies from TMDB Discover API.
    Returns (movies_list, total_pages).
    """
    params = {
        "primary_release_year": year,
        "with_original_language": language,
        "sort_by": "popularity.desc",
        "page": page,
        "include_adult": "false",
        "include_video": "false",
    }
    
    data = tmdb_get("/discover/movie", params)
    time.sleep(REQUEST_DELAY)
    
    total_pages = min(data.get("total_pages", 0), 500)  # TMDB caps at 500
    results = data.get("results", [])
    
    movies = [normalize_movie(m, genre_map) for m in results if m.get("id")]
    return movies, total_pages


def ingest_year_language(year: int, lang: str, genre_map: dict) -> int:
    """Ingest all movies for a given year + language combination."""
    # Fetch page 1 to get total pages
    movies, total_pages = discover_movies(year, lang, genre_map, page=1)
    
    if not movies:
        return 0
    
    all_movies = list(movies)
    
    # Fetch remaining pages (up to 500)
    max_pages = min(total_pages, 500)
    
    for page in range(2, max_pages + 1):
        page_movies, _ = discover_movies(year, lang, genre_map, page=page)
        if not page_movies:
            break
        all_movies.extend(page_movies)
        
        # Bulk write every BATCH_SIZE movies
        if len(all_movies) >= BATCH_SIZE:
            count = bulk_upsert(all_movies)
            all_movies = []
    
    # Write remaining
    count = bulk_upsert(all_movies)
    
    return max_pages  # Return pages processed


def main():
    parser = argparse.ArgumentParser(description="Bulk ingest movies from TMDB")
    parser.add_argument("--start-year", type=int, default=1900)
    parser.add_argument("--end-year", type=int, default=2026)
    parser.add_argument("--resume", action="store_true", help="Resume from last checkpoint")
    args = parser.parse_args()
    
    if not TMDB_API_KEY:
        print("❌ TMDB_API_KEY not set in .env!")
        sys.exit(1)
    
    print("=" * 60)
    print("🎬 NeuralFlix Bulk Movie Ingestion")
    print(f"   TMDB Discover API → MongoDB")
    print(f"   Years: {args.start_year} – {args.end_year}")
    print(f"   Languages: {len(LANGUAGES)}")
    print(f"   Estimated max: {(args.end_year - args.start_year + 1) * len(LANGUAGES) * 10000:,} movies")
    print("=" * 60)
    
    # Load progress
    progress = load_progress() if args.resume else {"total_ingested": 0, "completed_combos": []}
    completed = set(tuple(c) for c in progress.get("completed_combos", []))
    
    # Get genre map
    genre_map = get_genre_map()
    print(f"✅ Loaded {len(genre_map)} TMDB genres")
    
    initial_count = movies_col.count_documents({})
    print(f"📊 Current movies in DB: {initial_count:,}")
    print()
    
    start_time = time.time()
    total_combos = (args.end_year - args.start_year + 1) * len(LANGUAGES)
    processed = 0
    
    try:
        for year in range(args.end_year, args.start_year - 1, -1):  # Recent first
            for lang in LANGUAGES:
                combo_key = (year, lang)
                
                if combo_key in completed:
                    processed += 1
                    continue
                
                pages = ingest_year_language(year, lang, genre_map)
                
                if pages > 0:
                    current_count = movies_col.count_documents({})
                    elapsed = time.time() - start_time
                    rate = (current_count - initial_count) / elapsed * 3600 if elapsed > 0 else 0
                    
                    print(
                        f"  [{processed+1}/{total_combos}] "
                        f"{year}/{lang}: {pages} pages | "
                        f"DB: {current_count:,} | "
                        f"Rate: {rate:,.0f}/hr"
                    )
                
                # Save progress
                completed.add(combo_key)
                processed += 1
                
                if processed % 50 == 0:
                    progress["completed_combos"] = [list(c) for c in completed]
                    progress["total_ingested"] = movies_col.count_documents({})
                    save_progress(progress)
    
    except KeyboardInterrupt:
        print("\n\n⚠️ Interrupted! Saving progress...")
    
    # Final save
    final_count = movies_col.count_documents({})
    elapsed = time.time() - start_time
    
    progress["completed_combos"] = [list(c) for c in completed]
    progress["total_ingested"] = final_count
    save_progress(progress)
    
    print()
    print("=" * 60)
    print(f"✅ Ingestion Complete")
    print(f"   Total movies in DB: {final_count:,}")
    print(f"   New movies added: {final_count - initial_count:,}")
    print(f"   Time elapsed: {elapsed/60:.1f} minutes")
    print(f"   Progress saved to: {PROGRESS_FILE}")
    print("=" * 60)


if __name__ == "__main__":
    main()
