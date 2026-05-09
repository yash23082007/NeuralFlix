import os
import sys
import pandas as pd
from pymongo import MongoClient, UpdateOne
from dotenv import load_dotenv

load_dotenv()

TMDB_CSV_PATH = os.getenv("TMDB_CSV_PATH", "")
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")

def parse_genres(genre_str):
    if pd.isna(genre_str): return []
    try:
        return [g.strip() for g in str(genre_str).split(",")]
    except:
        return []

def ingest_ratio_movies(target_total=1500):
    if not TMDB_CSV_PATH or not os.path.exists(TMDB_CSV_PATH):
        print(f"Error: TMDB CSV not found at {TMDB_CSV_PATH}. Update .env with TMDB_CSV_PATH.")
        return

    target_indian = target_total // 3
    target_hollywood = target_total - target_indian

    print(f"Target Quota: {target_indian} Indian Movies | {target_hollywood} Hollywood Movies")

    client = MongoClient(MONGO_URI)
    db = client.neuralflix
    movies_col = db.movies
    
    # Optional: Clear existing collection or just rely on upserts.
    # We will rely on upsert via tmdb_id

    inserted_indian = 0
    inserted_hollywood = 0

    chunksize = 10000
    for chunk in pd.read_csv(TMDB_CSV_PATH, chunksize=chunksize, dtype=str):
        if inserted_indian >= target_indian and inserted_hollywood >= target_hollywood:
            break

        operations = []
        for _, row in chunk.iterrows():
            if inserted_indian >= target_indian and inserted_hollywood >= target_hollywood:
                break
            
            try:
                tmdb_id = row.get('id')
                if pd.isna(tmdb_id): continue
                tmdb_id = int(float(str(tmdb_id).strip()))
                title = str(row.get('title')).strip()
                if not title or pd.isna(title): continue

                lang = str(row.get('original_language', '')).lower()
                country = str(row.get('production_countries', ''))
                
                is_indian_movie = (lang in ['hi', 'te', 'ta', 'ml', 'kn']) or ('IN' in country)
                is_hollywood = (lang == 'en') and ('US' in country or 'GB' in country)

                category = None
                if is_indian_movie and inserted_indian < target_indian:
                    category = "indian"
                    inserted_indian += 1
                elif is_hollywood and inserted_hollywood < target_hollywood:
                    category = "hollywood"
                    inserted_hollywood += 1
                else:
                    continue

                movie_doc = {
                    "tmdb_id": tmdb_id,
                    "title": title,
                    "overview": str(row.get('overview')) if not pd.isna(row.get('overview')) else "",
                    "genres": parse_genres(row.get('genres')),
                    "language": lang,
                    "rating": float(row.get('vote_average', 0)) if not pd.isna(row.get('vote_average')) else 0.0,
                    "votes": int(float(row.get('vote_count', 0))) if not pd.isna(row.get('vote_count')) else 0,
                    "poster_url": f"https://image.tmdb.org/t/p/w500{row.get('poster_path')}" if not pd.isna(row.get('poster_path')) else None,
                    "backdrop_url": f"https://image.tmdb.org/t/p/w1280{row.get('backdrop_path')}" if not pd.isna(row.get('backdrop_path')) else None,
                    "cinema_region": "bollywood" if category == "indian" else "hollywood"
                }
                
                operations.append(UpdateOne({"tmdb_id": tmdb_id}, {"$set": movie_doc}, upsert=True))
            except Exception as e:
                continue

        if operations:
            try:
                movies_col.bulk_write(operations, ordered=False)
                print(f"Batch inserted. Total Indian: {inserted_indian}/{target_indian} | Hollywood: {inserted_hollywood}/{target_hollywood}")
            except Exception as e:
                print(f"Bulk write error: {e}")

    client.close()
    print("Strict Ratio Data Ingestion Complete!")

if __name__ == "__main__":
    ingest_ratio_movies()
