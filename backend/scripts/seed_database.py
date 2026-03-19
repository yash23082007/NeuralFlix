"""
NeuralFlix Database Seeder
--------------------------
Seeds MongoDB with live data from TMDB API:
- Popular movies (English, Hindi, Japanese)
- Top-rated movies
- Now playing
- Anime/Animation
- Bollywood

Aims for ~3000-5000 high-quality, diverse records within 512MB budget.
"""
import sys
import os
import math
import time

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import movies_collection, users_collection, watch_history_collection, init_db
from utils.tmdb_api import (
    fetch_popular_movies,
    fetch_top_rated,
    fetch_trending,
    fetch_now_playing,
    fetch_by_genre,
    fetch_genre_list,
    get_poster_url,
    get_backdrop_url,
)
import random

# TMDB Genre IDs
GENRE_IDS = {
    "Action": 28,
    "Adventure": 12,
    "Animation": 16,
    "Comedy": 35,
    "Crime": 80,
    "Documentary": 99,
    "Drama": 18,
    "Family": 10751,
    "Fantasy": 14,
    "Horror": 27,
    "Romance": 10749,
    "Sci-Fi": 878,
    "Thriller": 53,
    "Mystery": 9648,
}

def calculate_popularity(rating: float, votes: int) -> float:
    if votes <= 0:
        return 0.0
    return round(rating * math.log10(votes), 2)

def normalize_tmdb_movie(movie: dict, genre_map: dict, language_override: str = None) -> dict:
    """Convert a raw TMDB movie response to our MongoDB document schema."""
    genre_names = [genre_map.get(gid, "") for gid in movie.get("genre_ids", []) if gid in genre_map]
    
    year = None
    release_date = movie.get("release_date", "")
    if release_date:
        try:
            year = int(release_date[:4])
        except Exception:
            pass

    votes = movie.get("vote_count", 0)
    rating = round(movie.get("vote_average", 0), 1)
    
    lang = language_override or movie.get("original_language", "en")
    
    return {
        "_id": str(movie.get("id")),
        "tmdb_id": movie.get("id"),
        "title": movie.get("title", "Unknown"),
        "overview": movie.get("overview", "")[:500],  # cap overview length
        "year": year,
        "release_date": release_date,
        "language": lang,
        "genres": [g for g in genre_names if g],
        "rating": rating,
        "votes": votes,
        "popularity_score": calculate_popularity(rating, votes),
        "poster_url": get_poster_url(movie.get("poster_path")),
        "backdrop_url": get_backdrop_url(movie.get("backdrop_path")),
        "platforms": [],  # Will be enriched live on detail page
        "tmdb_popularity": round(movie.get("popularity", 0), 2),
    }

def fetch_batch(fetch_fn, pages: int, genre_map: dict, **kwargs) -> list:
    """Fetch multiple pages from a TMDB function, parse each page."""
    results = []
    for page in range(1, pages + 1):
        try:
            data = fetch_fn(page=page, **kwargs)
            for movie in data:
                normalized = normalize_tmdb_movie(movie, genre_map)
                results.append(normalized)
            time.sleep(0.25)  # Rate limiting
        except Exception as e:
            print(f"  Warning: Failed to fetch page {page}: {e}")
    return results

def seed():
    print("=" * 60)
    print("  NeuralFlix Database Seeder")
    print("=" * 60)
    
    print("\n[1/6] Initializing database indexes...")
    init_db()
    
    print("[2/6] Fetching TMDB genre map...")
    genre_map = fetch_genre_list()
    if not genre_map:
        print("  ERROR: Could not fetch genre map. Check TMDB API key.")
        return
    print(f"  ✓ Found {len(genre_map)} genres")
    
    all_movies = {}  # keyed by tmdb_id to deduplicate
    
    print("\n[3/6] Fetching movies from TMDB...")
    
    # --- English Movies ---
    print("  → Popular English movies (pages 1-15)...")
    for page in range(1, 16):
        try:
            data = fetch_popular_movies(page=page, language="en-US")
            for m in data:
                if m["vote_count"] >= 50:
                    doc = normalize_tmdb_movie(m, genre_map, language_override="en")
                    all_movies[doc["tmdb_id"]] = doc
            time.sleep(0.2)
        except Exception as e:
            print(f"    Warning page {page}: {e}")
    print(f"  ✓ Total so far: {len(all_movies)}")

    print("  → Top-Rated English movies (pages 1-10)...")
    for page in range(1, 11):
        try:
            data = fetch_top_rated(page=page, language="en-US")
            for m in data:
                if m["vote_count"] >= 50:
                    doc = normalize_tmdb_movie(m, genre_map, language_override="en")
                    all_movies[doc["tmdb_id"]] = doc
            time.sleep(0.2)
        except Exception as e:
            print(f"    Warning page {page}: {e}")
    print(f"  ✓ Total so far: {len(all_movies)}")

    print("  → Weekly Trending...")
    try:
        data = fetch_trending("movie", "week")
        for m in data:
            doc = normalize_tmdb_movie(m, genre_map)
            all_movies[doc["tmdb_id"]] = doc
    except Exception as e:
        print(f"    Warning: {e}")
    print(f"  ✓ Total so far: {len(all_movies)}")

    # --- Genre-Specific (English) ---
    print("  → Genre-specific batches (Action, Sci-Fi, Horror, Thriller, Comedy, Romance)...")
    genre_fetch_list = ["Action", "Sci-Fi", "Horror", "Thriller", "Comedy", "Romance", "Crime", "Animation", "Adventure", "Drama", "Fantasy"]
    for genre_name in genre_fetch_list:
        gid = GENRE_IDS.get(genre_name)
        if not gid:
            continue
        for page in range(1, 4):
            try:
                data = fetch_by_genre(gid, language="en-US", page=page)
                for m in data:
                    if m.get("vote_count", 0) >= 50:
                        doc = normalize_tmdb_movie(m, genre_map, language_override="en")
                        all_movies[doc["tmdb_id"]] = doc
                time.sleep(0.2)
            except Exception as e:
                print(f"    Warning {genre_name} page {page}: {e}")
    print(f"  ✓ Total so far: {len(all_movies)}")

    # --- Bollywood (Hindi) ---
    print("  → Bollywood / Hindi movies (pages 1-10)...")
    for page in range(1, 11):
        try:
            data = fetch_popular_movies(page=page, language="hi-IN")
            for m in data:
                if m.get("vote_count", 0) >= 20:
                    doc = normalize_tmdb_movie(m, genre_map, language_override="hi")
                    all_movies[doc["tmdb_id"]] = doc
            time.sleep(0.2)
        except Exception as e:
            print(f"    Warning page {page}: {e}")
    print(f"  ✓ Total so far: {len(all_movies)}")

    # --- Anime / Japanese ---
    print("  → Anime / Japanese movies (pages 1-8)...")
    for page in range(1, 9):
        try:
            # Animation genre in Japanese
            data = fetch_by_genre(GENRE_IDS["Animation"], language="ja-JP", page=page)
            for m in data:
                if m.get("vote_count", 0) >= 10:
                    doc = normalize_tmdb_movie(m, genre_map, language_override="ja")
                    all_movies[doc["tmdb_id"]] = doc
            time.sleep(0.2)
        except Exception as e:
            print(f"    Warning page {page}: {e}")

    for page in range(1, 6):
        try:
            data = fetch_popular_movies(page=page, language="ja-JP")
            for m in data:
                if m.get("vote_count", 0) >= 10:
                    doc = normalize_tmdb_movie(m, genre_map, language_override="ja")
                    all_movies[doc["tmdb_id"]] = doc
            time.sleep(0.2)
        except Exception as e:
            print(f"    Warning page {page}: {e}")
    print(f"  ✓ Total collected: {len(all_movies)}")

    # --- Convert to list and sort by popularity ---
    documents = sorted(all_movies.values(), key=lambda x: x.get("popularity_score", 0), reverse=True)
    
    # Cap at 10,000 documents to stay well within 512MB
    documents = documents[:10000]
    
    print(f"\n[4/6] Inserting {len(documents)} movies into MongoDB...")
    movies_collection.drop()
    
    BATCH_SIZE = 500
    inserted_total = 0
    for i in range(0, len(documents), BATCH_SIZE):
        batch = documents[i:i + BATCH_SIZE]
        try:
            result = movies_collection.insert_many(batch, ordered=False)
            inserted_total += len(result.inserted_ids)
            print(f"  ✓ Inserted batch {i//BATCH_SIZE + 1}: {inserted_total}/{len(documents)}")
        except Exception as e:
            print(f"  Warning batch error: {e}")
    
    print(f"\n[5/6] Creating indexes...")
    init_db()

    print(f"\n[6/6] Seeding mock users for collaborative filtering...")
    users_collection.drop()
    watch_history_collection.drop()
    
    sample_movies = random.sample(documents, min(100, len(documents)))
    
    users = [
        {"_id": f"usr{i}", "name": f"User {i}", "favorite_genres": random.sample(list(GENRE_IDS.keys()), 3)}
        for i in range(1, 21)
    ]
    users_collection.insert_many(users)
    
    history = []
    for u in users:
        watched = random.sample(sample_movies, random.randint(5, 20))
        for m in watched:
            history.append({
                "user_id": u["_id"],
                "movie_id": m["_id"],
                "rating": round(random.uniform(3.0, 5.0), 1),
                "timestamp": time.time() - random.randint(0, 2000000)
            })
    watch_history_collection.insert_many(history)
    
    print(f"\n{'=' * 60}")
    print(f"  ✅ NeuralFlix seeding complete!")
    print(f"  📽  Movies inserted: {inserted_total}")
    print(f"  👥 Users: {len(users)}")
    print(f"  📋 Watch history records: {len(history)}")
    print(f"{'=' * 60}\n")

if __name__ == "__main__":
    seed()
