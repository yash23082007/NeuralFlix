import asyncio
import os
import aiohttp
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from tqdm.asyncio import tqdm

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
TMDB_API_KEY = os.getenv("TMDB_API_KEY")
DB_NAME = "neuralflix"

if not TMDB_API_KEY:
    print("❌ ERROR: TMDB_API_KEY is not set in environment.")
    exit(1)

# Distribution targets for 10K catalog
DISTRIBUTION = {
    "hollywood": {"lang": "en", "pages": 250}, # 20 * 250 = 5000 movies
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
    async with session.get(url, params=params) as resp:
        if resp.status == 200:
            data = await resp.json()
            return data.get("results", [])
        return []

async def seed_database():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    collection = db.movies

    print("🚀 Connecting to MongoDB...")
    
    # Create index to prevent duplicates
    await collection.create_index("tmdb_id", unique=True)
    
    total_fetched = 0
    total_inserted = 0

    async with aiohttp.ClientSession() as session:
        for region, config in DISTRIBUTION.items():
            print(f"\n🌍 Seeding {region.capitalize()} Cinema (Target: {config['pages'] * 20} movies)")
            
            # Fetch in batches of 10 pages concurrently to respect rate limits
            for batch_start in range(1, config['pages'] + 1, 10):
                batch_end = min(batch_start + 10, config['pages'] + 1)
                
                tasks = [fetch_page(session, config['lang'], p) for p in range(batch_start, batch_end)]
                results = await asyncio.gather(*tasks)
                
                movies_to_insert = []
                for page_results in results:
                    for m in page_results:
                        if not m.get("id"): continue
                        
                        genres = [str(g) for g in m.get("genre_ids", [])] # Can be mapped to strings if needed
                        
                        movie_doc = {
                            "tmdb_id": m["id"],
                            "title": m.get("title", ""),
                            "overview": m.get("overview", ""),
                            "poster_url": f"https://image.tmdb.org/t/p/w500{m['poster_path']}" if m.get("poster_path") else None,
                            "backdrop_url": f"https://image.tmdb.org/t/p/w1280{m['backdrop_path']}" if m.get("backdrop_path") else None,
                            "year": int(m["release_date"][:4]) if m.get("release_date") else None,
                            "rating": float(m.get("vote_average", 0.0)),
                            "popularity": float(m.get("popularity", 0.0)),
                            "language": m.get("original_language", ""),
                            "genres": genres,
                            "features": []
                        }
                        movies_to_insert.append(movie_doc)
                
                total_fetched += len(movies_to_insert)
                
                if movies_to_insert:
                    try:
                        # Insert Many with ordered=False to ignore duplicate tmdb_id errors silently
                        res = await collection.insert_many(movies_to_insert, ordered=False)
                        inserted = len(res.inserted_ids)
                        total_inserted += inserted
                    except Exception as e:
                        # Will catch BulkWriteError for duplicates
                        pass
                
                await asyncio.sleep(0.5) # Basic rate limiting

    print(f"\n✅ Seeding Complete!")
    print(f"📊 Total Fetched: {total_fetched}")
    print(f"💾 Newly Inserted: {total_inserted}")
    
    # Update ml_overview metadata
    await db.app_metadata.update_one(
        {"_id": "ml_overview"},
        {"$set": {
            "catalog_size": await collection.count_documents({}),
            "last_updated": "now"
        }},
        upsert=True
    )

if __name__ == "__main__":
    asyncio.run(seed_database())
