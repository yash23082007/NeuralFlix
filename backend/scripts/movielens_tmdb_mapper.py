import pandas as pd
import os
import requests
import zipfile
import io
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models.sql_models import PostgresMovie

load_dotenv()

# MovieLens 25M is the industry standard for behavioral data.
MOVIELENS_URL = "https://files.grouplens.org/datasets/movielens/ml-25m.zip"
DATA_DIR = os.path.join(os.path.dirname(__file__), "../data/movielens")
DATABASE_URL = os.getenv("DATABASE_URL")

def download_movielens():
    """Downloads and extracts the MovieLens 25M dataset links."""
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
        
    links_path = os.path.join(DATA_DIR, "ml-25m/links.csv")
    if not os.path.exists(links_path):
        print("📥 Downloading MovieLens 25M links (Behavioral Data Heist)...")
        r = requests.get(MOVIELENS_URL)
        z = zipfile.ZipFile(io.BytesIO(r.content))
        # We only need the links.csv for mapping IDs
        z.extract("ml-25m/links.csv", path=DATA_DIR)
        print("✅ Links secured.")
    return links_path

def map_ids_to_db():
    """
    Maps MovieLens IDs to our Postgres/Supabase records using TMDB/IMDb bridges.
    This allows us to leverage 25M real user ratings for our neural engine.
    """
    if not DATABASE_URL:
        print("❌ DATABASE_URL missing.")
        return

    links_path = download_movielens()
    df_links = pd.read_csv(links_path)

    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    db = Session()

    print(f"📊 Mapping {len(df_links)} MovieLens records to Supabase...")

    # We update our PostgresMovie records with the ml_id for behavioral lookups
    # Note: links.csv has columns [movieId, imdbId, tmdbId]
    
    count = 0
    for _, row in df_links.iterrows():
        try:
            tmdb_id = int(row['tmdbId']) if not pd.isna(row['tmdbId']) else None
            imdb_id = f"tt{str(int(row['imdbId'])).zfill(7)}" if not pd.isna(row['imdbId']) else None
            ml_id = int(row['movieId'])

            if not tmdb_id and not imdb_id:
                continue

            # Find matching movie in our DB
            movie = None
            if tmdb_id:
                movie = db.query(PostgresMovie).filter(PostgresMovie.tmdb_id == tmdb_id).first()
            if not movie and imdb_id:
                movie = db.query(PostgresMovie).filter(PostgresMovie.imdb_id == imdb_id).first()

            if movie:
                # Store the MovieLens ID in a new column (I should add this to sql_models)
                # For now, let's assume we store it in a JSON metadata field or a new col
                # I'll update the model in the next step.
                movie.movielens_id = ml_id
                count += 1

            if count % 1000 == 0 and count > 0:
                db.commit()
                print(f"   [+] Mapped {count} movies...")

        except Exception as e:
            continue

    db.commit()
    print(f"✨ Successfully mapped {count} behavioral bridges.")
    db.close()

if __name__ == "__main__":
    # Ensure the model has the movielens_id column first
    map_ids_to_db()
