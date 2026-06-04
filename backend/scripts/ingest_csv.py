import os
import sys
import pandas as pd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

DATABASE_URL = os.getenv("DATABASE_URL")
CSV_PATH = os.getenv("TMDB_CSV_PATH")

if not DATABASE_URL or not CSV_PATH:
    print("Error: DATABASE_URL or TMDB_CSV_PATH missing in .env")
    sys.exit(1)

engine = create_engine(DATABASE_URL)

def process_chunk(chunk):
    df = pd.DataFrame()
    df['tmdb_id'] = chunk['id']
    df['imdb_id'] = chunk['imdb_id'].apply(lambda x: str(x) if pd.notnull(x) else None)
    df['title'] = chunk['title']
    df['overview'] = chunk['overview']
    df['tagline'] = chunk['tagline']
    df['genres'] = chunk['genres'].apply(lambda x: x.split(", ") if pd.notnull(x) else [])
    df['language'] = chunk['original_language']
    df['release_date'] = chunk['release_date']
    df['year'] = pd.to_datetime(chunk['release_date'], errors='coerce').dt.year
    df['year'] = df['year'].astype('Int64')
    df['runtime'] = chunk['runtime']
    df['popularity_score'] = chunk['popularity']
    df['tmdb_rating'] = chunk['vote_average']
    df['tmdb_votes'] = chunk['vote_count']
    df['budget'] = chunk['budget']
    
    df['poster_url'] = chunk['poster_path'].apply(
        lambda x: f"https://image.tmdb.org/t/p/w500{x}" if pd.notnull(x) else None
    )
    df['backdrop_url'] = chunk['backdrop_path'].apply(
        lambda x: f"https://image.tmdb.org/t/p/w1280{x}" if pd.notnull(x) else None
    )
    df['is_indian'] = df['language'].apply(lambda x: x in ['hi', 'ta', 'te', 'ml', 'kn', 'bn', 'mr'])
    df = df.dropna(subset=['tmdb_id', 'title'])
    return df

print(f"Loading and sorting dataset locally...")
# Read all, sort by popularity, keep top 10k
df_all = pd.read_csv(CSV_PATH, low_memory=False)
if 'popularity' in df_all.columns:
    df_all = df_all.sort_values('popularity', ascending=False)
df_10k = df_all.head(10000).copy()

processed_df = process_chunk(df_10k)

print(f"Clearing old database entries...")
with engine.connect() as conn:
    conn.execute(text("TRUNCATE TABLE movies CASCADE;"))
    conn.commit()

print(f"Inserting 10,000 movies into Render...")
processed_df.to_sql(
    'movies', 
    engine, 
    if_exists='append', 
    index=False,
    method='multi',
    chunksize=1000
)

print(f"Ingestion complete! Total movies processed: {len(processed_df)}")
