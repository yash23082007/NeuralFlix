import pandas as pd
import os
import sys
import gzip
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models.sql_models import Base, PostgresMovie

load_dotenv()

# IMDb provides these for FREE at https://datasets.imdbws.com/
# Users should download them to backend/data/ for this heist to work.
DATA_DIR = os.getenv("IMDB_DATA_DIR", os.path.join(os.path.dirname(__file__), "../data/imdb"))
SUPABASE_URL = os.getenv("DATABASE_URL")

def download_imdb_datasets():
    """
    Optional helper to automate the 'Heist' by downloading TSVs from IMDb.
    """
    import requests
    urls = [
        "https://datasets.imdbws.com/title.basics.tsv.gz",
        "https://datasets.imdbws.com/title.ratings.tsv.gz",
        "https://datasets.imdbws.com/title.principals.tsv.gz"
    ]
    os.makedirs(DATA_DIR, exist_ok=True)
    for url in urls:
        filename = os.path.join(DATA_DIR, url.split("/")[-1])
        if not os.path.exists(filename):
            print(f"📥 Stealing {url}...")
            r = requests.get(url, stream=True)
            with open(filename, 'wb') as f:
                for chunk in r.iter_content(chunk_size=1024*1024):
                    if chunk: f.write(chunk)
    print("✅ Heist Complete: All IMDb datasets secured.")

def run_imdb_heist_ingestion():
    """
    Massively ingests IMDb TSVs into Supabase.
    This is the 'Source of Truth' for million+ movie metadata.
    """
    if not SUPABASE_URL:
        print("❌ Error: SUPABASE_DATABASE_URL not found.")
        return

    engine = create_engine(SUPABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    # 1. Load Basics and Ratings
    print("🚀 Processing IMDb Basics & Ratings (Millions of titles)...")
    basics_path = os.path.join(DATA_DIR, "title.basics.tsv.gz")
    ratings_path = os.path.join(DATA_DIR, "title.ratings.tsv.gz")

    if not os.path.exists(basics_path) or not os.path.exists(ratings_path):
        print("❌ IMDb TSV files missing in data/imdb/ folder. Run download first.")
        return

    # Filter for movies only to keep DB clean and fast
    basics = pd.read_csv(basics_path, sep='\t', compression='gzip', low_memory=False)
    movies = basics[basics['titleType'] == 'movie'].copy()
    del basics # Free memory

    ratings = pd.read_csv(ratings_path, sep='\t', compression='gzip')
    movies = movies.merge(ratings, on='tconst', how='left')
    del ratings # Free memory

    # 2. Iterate and Hydrate
    total = 0
    batch = []
    
    print(f"Found {len(movies)} movies. Ingesting core data...")

    for i, row in movies.iterrows():
        try:
            imdb_id = row['tconst']
            title = row['primaryTitle']
            year = row['startYear'] if row['startYear'] != '\\N' else None
            genres = row['genres'].split(',') if row['genres'] != '\\N' else []
            rating = float(row['averageRating']) if not pd.isna(row['averageRating']) else 0.0
            votes = int(row['numVotes']) if not pd.isna(row['numVotes']) else 0
            
            # We don't have TMDB_ID yet, so we'll need a secondary script 
            # or map it during the 'Visuals' enrichment phase.
            pg_movie = PostgresMovie(
                imdb_id=imdb_id,
                tmdb_id=0, # Temporary placeholder
                title=title,
                release_date=f"{year}-01-01" if year else None,
                genres=genres,
                imdb_rating=rating,
                imdb_votes=votes
            )
            batch.append(pg_movie)

            if len(batch) >= 1000:
                db.bulk_save_objects(batch)
                db.commit()
                total += len(batch)
                print(f"   [+] Ingested {total} Core Records...")
                batch = []

        except Exception as e:
            continue

    if batch:
        db.bulk_save_objects(batch)
        db.commit()
        total += len(batch)

    print(f"✅ Core Heist Successful: {total} IMDb records hydrated.")
    db.close()

if __name__ == "__main__":
    download_imdb_datasets()
    run_imdb_heist_ingestion()
