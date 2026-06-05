import sys
import os
import json
import math
import asyncio
import random
import aiohttp
from dotenv import load_dotenv

# Safe console printing for Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="ignore")

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import movies_collection, users_collection, watch_history_collection, init_db, sync_engine
from db.models import Base, Movie

load_dotenv()

TMDB_API_KEY = os.getenv("TMDB_API_KEY")

# Distribution targets for 10K catalog
DISTRIBUTION = {
    "hollywood": {"lang": "en", "pages": 250}, # 5000 movies
    "bollywood": {"lang": "hi", "pages": 100}, # 2000 movies
    "korean":    {"lang": "ko", "pages": 50},  # 1000 movies
    "japanese":  {"lang": "ja", "pages": 50},  # 1000 movies
    "french":    {"lang": "fr", "pages": 25},  # 500 movies
    "spanish":   {"lang": "es", "pages": 25},  # 500 movies
}

async def fetch_page(session, lang, page):
    url = f"https://api.themoviedb.org/3/discover/movie"
    params = {
        "api_key": TMDB_API_KEY,
        "language": "en-US",
        "sort_by": "popularity.desc",
        "with_original_language": lang,
        "page": page,
        "include_adult": "false"
    }
    try:
        async with session.get(url, params=params, timeout=10) as resp:
            if resp.status == 200:
                data = await resp.json()
                return data.get("results", [])
    except Exception:
        pass
    return []

def get_cinema_region(lang):
    if lang == "hi":
        return "bollywood"
    elif lang == "te":
        return "tollywood"
    elif lang == "ta":
        return "kollywood"
    elif lang == "ml":
        return "mollywood"
    elif lang == "kn":
        return "sandalwood"
    elif lang == "ko":
        return "korean"
    elif lang == "ja":
        return "japanese"
    elif lang == "fr":
        return "french"
    elif lang == "es":
        return "spanish"
    elif lang == "en":
        return "hollywood"
    return "international"

async def seed_from_tmdb():
    print("🚀 Seeding from TMDB API...")
    
    total_fetched = 0
    movies_dict = {}

    async with aiohttp.ClientSession() as session:
        for region, config in DISTRIBUTION.items():
            print(f"🌍 Fetching {region.capitalize()} Cinema (Target: {config['pages'] * 20} movies)...")
            
            # Fetch in batches of 10 pages concurrently to respect rate limits
            for batch_start in range(1, config['pages'] + 1, 10):
                batch_end = min(batch_start + 10, config['pages'] + 1)
                
                tasks = [fetch_page(session, config['lang'], p) for p in range(batch_start, batch_end)]
                results = await asyncio.gather(*tasks)
                
                for page_results in results:
                    for m in page_results:
                        if not m.get("id") or m.get("id") in movies_dict:
                            continue
                        
                        genres = [str(gid) for gid in m.get("genre_ids", [])]
                        lang = m.get("original_language", "")
                        votes = m.get("vote_count", 0)
                        rating = m.get("vote_average", 0.0)
                        popularity_score = round(rating * math.log10(votes + 1), 2) if votes > 0 else 0.0
                        
                        movie_doc = {
                            "tmdb_id": m["id"],
                            "title": m.get("title", ""),
                            "overview": m.get("overview", ""),
                            "poster_url": f"https://image.tmdb.org/t/p/w500{m['poster_path']}" if m.get("poster_path") else None,
                            "backdrop_url": f"https://image.tmdb.org/t/p/w1280{m['backdrop_path']}" if m.get("backdrop_path") else None,
                            "year": int(m["release_date"][:4]) if m.get("release_date") and len(m["release_date"]) >= 4 else None,
                            "release_date": m.get("release_date"),
                            "rating": float(rating),
                            "popularity_score": popularity_score,
                            "language": lang,
                            "genres": genres,
                            "cinema_region": get_cinema_region(lang),
                            "is_indian": lang in ["hi", "te", "ta", "ml", "kn"],
                            "indian_industry": "bollywood" if lang == "hi" else (f"{lang}wood" if lang in ["te", "ta", "ml", "kn"] else None),
                            "platforms": ["Netflix", "Prime Video", "Disney+"]
                        }
                        movies_dict[m["id"]] = movie_doc
                        total_fetched += 1
                
                await asyncio.sleep(0.2)
                
    documents = sorted(movies_dict.values(), key=lambda x: x.get("popularity_score", 0), reverse=True)
    return documents[:10000]

def seed_from_kaggle():
    print("🚀 Seeding from local Kaggle TMDB dataset fallback...")
    import kagglehub
    import pandas as pd
    
    path = kagglehub.dataset_download("alanvourch/tmdb-movies-daily-updates")
    print(f"Dataset downloaded to: {path}")
    
    files = os.listdir(path)
    csv_files = [f for f in files if f.endswith('.csv')]
    if not csv_files:
        print("❌ ERROR: No CSV file found in downloaded dataset.")
        return []
        
    csv_files.sort()
    csv_file = os.path.join(path, csv_files[0])
    
    columns_to_read = [
        "id", "title", "overview", "tagline", "genres", "original_language",
        "release_date", "runtime", "vote_average", "vote_count", "popularity",
        "poster_path", "backdrop_path", "budget"
    ]
    
    df = pd.read_csv(csv_file, usecols=columns_to_read, low_memory=False)
    df["popularity"] = pd.to_numeric(df["popularity"], errors="coerce").fillna(0.0)
    df["vote_count"] = pd.to_numeric(df["vote_count"], errors="coerce").fillna(0).astype(int)
    df["vote_average"] = pd.to_numeric(df["vote_average"], errors="coerce").fillna(0.0)
    
    # Sort by popularity descending and keep top 12,000
    df = df.sort_values(by="popularity", ascending=False).head(12000)
    
    movies_list = []
    inserted_ids = set()
    
    for _, row in df.iterrows():
        if len(movies_list) >= 10000:
            break
            
        tmdb_id_raw = row.get("id")
        if pd.isna(tmdb_id_raw):
            continue
        tmdb_id = int(float(str(tmdb_id_raw).strip()))
        if tmdb_id in inserted_ids:
            continue
            
        genres_raw = row.get("genres")
        genres = []
        if pd.notna(genres_raw):
            if str(genres_raw).startswith("["):
                try:
                    genres = json.loads(str(genres_raw).replace("'", '"'))
                except Exception:
                    genres = [g.strip() for g in str(genres_raw).replace("[", "").replace("]", "").split(",")]
            else:
                genres = [g.strip() for g in str(genres_raw).split(",") if g.strip()]
                
        lang = str(row.get("original_language", "en")).strip()
        release_date = str(row.get("release_date")).strip() if pd.notna(row.get("release_date")) else ""
        year = None
        if release_date and len(release_date) >= 4:
            try:
                year = int(release_date[:4])
            except ValueError:
                pass
                
        votes = int(row["vote_count"])
        rating = float(row["vote_average"])
        popularity_score = round(rating * math.log10(votes + 1), 2) if votes > 0 else 0.0
        
        poster_path = row.get("poster_path")
        poster_url = f"https://image.tmdb.org/t/p/w500{poster_path}" if pd.notna(poster_path) else None
        
        backdrop_path = row.get("backdrop_path")
        backdrop_url = f"https://image.tmdb.org/t/p/original{backdrop_path}" if pd.notna(backdrop_path) else None
        
        movie_doc = {
            "tmdb_id": tmdb_id,
            "title": str(row.get("title", "Unknown")).strip(),
            "overview": str(row.get("overview")) if pd.notna(row.get("overview")) else "",
            "tagline": str(row.get("tagline")) if pd.notna(row.get("tagline")) else "",
            "genres": genres,
            "language": lang,
            "release_date": release_date,
            "year": year,
            "runtime": int(float(row.get("runtime"))) if pd.notna(row.get("runtime")) else None,
            "rating": rating,
            "popularity_score": popularity_score,
            "poster_url": poster_url,
            "backdrop_url": backdrop_url,
            "cinema_region": get_cinema_region(lang),
            "is_indian": lang in ["hi", "te", "ta", "ml", "kn"],
            "indian_industry": "bollywood" if lang == "hi" else (f"{lang}wood" if lang in ["te", "ta", "ml", "kn"] else None),
            "platforms": ["Netflix", "Prime Video", "Disney+"]
        }
        movies_list.append(movie_doc)
        inserted_ids.add(tmdb_id)
        
    return movies_list

async def seed_database():
    print("=" * 60)
    print("  NeuralFlix Database 10K Seeder (PostgreSQL/SQLite)")
    print("=" * 60)
    
    print("\n[1/4] Ensuring database schema and tables are created...")
    Base.metadata.create_all(bind=sync_engine)
    
    print("\n[2/4] Fetching movie data...")
    if TMDB_API_KEY and TMDB_API_KEY != "your_tmdb_key":
        documents = await seed_from_tmdb()
    else:
        documents = seed_from_kaggle()
        
    if not documents:
        print("❌ ERROR: No movie records fetched. Seeding failed.")
        return
        
    print(f"\n[3/4] Inserting {len(documents)} movies into the SQL database...")
    movies_collection.drop() # Truncate table first
    
    BATCH_SIZE = 500
    inserted_total = 0
    for i in range(0, len(documents), BATCH_SIZE):
        batch = documents[i:i + BATCH_SIZE]
        try:
            result = await movies_collection.insert_many(batch, ordered=False)
            inserted_total += len(result.inserted_ids)
            print(f"  [OK] Seeded batch {i//BATCH_SIZE + 1}: {inserted_total}/{len(documents)}")
        except Exception as e:
            print(f"  Warning: batch error: {e}")
            
    print(f"\n[4/4] Seeding users and ratings for recommendation engine collaborative filtering...")
    users_collection.drop()
    watch_history_collection.drop()
    
    sample_movies = random.sample(documents, min(100, len(documents)))
    users = [
        {"id": f"usr{i}", "email": f"user{i}@neuralflix.ai", "name": f"User {i}"}
        for i in range(1, 31)
    ]
    await users_collection.insert_many(users)
    
    history = []
    for u in users:
        watched = random.sample(sample_movies, random.randint(5, 20))
        for m in watched:
            history.append({
                "user_id": u["id"],
                "movie_id": m["tmdb_id"],
                "rating": round(random.uniform(3.0, 5.0), 1),
                "timestamp": int(random.uniform(1700000000, 1730000000))
            })
    await watch_history_collection.insert_many(history)
    
    print(f"\n{'=' * 60}")
    print(f"  [OK] Seeding complete!")
    print(f"  Total movies in database: {inserted_total}")
    print(f"  Seeded users: {len(users)}")
    print(f"  Seeded ratings: {len(history)}")
    print(f"{'=' * 60}\n")

if __name__ == "__main__":
    asyncio.run(seed_database())
