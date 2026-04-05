import pandas as pd
import os
import sys
import gzip
import time
from pymongo import MongoClient, UpdateOne
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

DATA_DIR = os.getenv("IMDB_DATA_DIR", os.path.join(os.path.dirname(__file__), "../data/imdb"))
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://ktanayash_db_user:Yashvijay@cluster0.ksin90b.mongodb.net/")

def download_imdb_datasets():
    import requests
    urls = [
        "https://datasets.imdbws.com/title.basics.tsv.gz",
        "https://datasets.imdbws.com/title.ratings.tsv.gz"
    ]
    os.makedirs(DATA_DIR, exist_ok=True)
    for url in urls:
        filename = os.path.join(DATA_DIR, url.split("/")[-1])
        if not os.path.exists(filename):
            print(f"📥 Downloading {url}...")
            r = requests.get(url, stream=True)
            with open(filename, 'wb') as f:
                for chunk in r.iter_content(chunk_size=1024*1024):
                    if chunk: f.write(chunk)
    print("✅ All IMDb datasets secured in data/imdb/")

def run_fast_mongo_ingestion():
    client = MongoClient(MONGO_URI)
    db = client.neuralflix
    movies_col = db.movies

    print("🚀 Processing IMDb Basics & Ratings (Millions of titles)...")
    basics_path = os.path.join(DATA_DIR, "title.basics.tsv.gz")
    ratings_path = os.path.join(DATA_DIR, "title.ratings.tsv.gz")

    if not os.path.exists(basics_path) or not os.path.exists(ratings_path):
        print("❌ TSV files missing.")
        return

    print("📊 Loading TSV into memory...")
    # Read basics and filter for movies
    basics = pd.read_csv(basics_path, sep='\t', compression='gzip', low_memory=False)
    movies = basics[basics['titleType'] == 'movie'].copy()
    del basics # Free memory

    # Read ratings and merge
    ratings = pd.read_csv(ratings_path, sep='\t', compression='gzip')
    movies = movies.merge(ratings, on='tconst', how='left')
    del ratings # Free memory

    total = 0
    batch = []
    
    print(f"✅ Found {len(movies)} movies. Ingesting into MongoDB in bulk...")
    start_time = time.time()
    
    # We create a unique index on imdb_id to allow fast upserts
    movies_col.create_index("imdb_id", unique=True, sparse=True)
    
    for i, row in movies.iterrows():
        try:
            imdb_id = row['tconst']
            title = row['primaryTitle']
            year = row['startYear']
            year = int(year) if year != '\\N' else None
            
            genres = row['genres'].split(',') if row['genres'] != '\\N' else []
            rating = float(row['averageRating']) if not pd.isna(row['averageRating']) else 0.0
            votes = int(row['numVotes']) if not pd.isna(row['numVotes']) else 0
            
            doc = {
                "imdb_id": imdb_id,
                "title": title,
                "year": year,
                "genres": genres,
                "rating": rating,
                "votes": votes,
                "media_type": "movie"
            }
            
            batch.append(
                UpdateOne(
                    {"imdb_id": imdb_id},
                    {"$set": doc},
                    upsert=True
                )
            )

            if len(batch) >= 10000:
                movies_col.bulk_write(batch, ordered=False)
                total += len(batch)
                batch = []
                print(f"   [+] Upserted {total} movies into MongoDB...")

        except Exception as e:
            continue

    if batch:
        movies_col.bulk_write(batch, ordered=False)
        total += len(batch)

    elapsed = time.time() - start_time
    print(f"🚀 Mass Ingestion Complete: {total} records synced in {elapsed:.2f} seconds.")

if __name__ == "__main__":
    download_imdb_datasets()
    run_fast_mongo_ingestion()
