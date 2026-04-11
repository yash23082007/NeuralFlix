"""
NeuralFlix Production ETL: Bulk TMDB Ingestion
==============================================
Idempotent, checkpointable, and validated ingestion of movie metadata.
"""

import os
import sys
import time
import json
import logging
import argparse
from typing import List, Dict, Any, Tuple
import requests
from pymongo import MongoClient, UpdateOne
from pymongo.errors import BulkWriteError
from dotenv import load_dotenv

# Path setup
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# --- Configuration ---
TMDB_API_KEY = os.getenv("TMDB_API_KEY")
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
PROGRESS_FILE = os.path.join(os.path.dirname(__file__), "ingest_checkpoint.json")
LOG_FILE = os.path.join(os.path.dirname(__file__), "etl_bulk_ingest.log")

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.FileHandler(LOG_FILE), logging.StreamHandler()]
)
logger = logging.getLogger("ETL_BULK")

LANGUAGES = ["en", "hi", "ta", "te", "ml", "kn", "ja", "ko", "es", "fr"]

# --- ETL Logic ---

class BulkIngestETL:
    def __init__(self, start_year: int, end_year: int):
        self.start_year = start_year
        self.end_year = end_year
        self.client = MongoClient(MONGO_URI)
        self.db = self.client.neuralflix
        self.movies_col = self.db.movies
        self.movies_col.create_index("tmdb_id", unique=True)
        self.session = requests.Session()
        self.progress = self._load_checkpoint()

    def _load_checkpoint(self) -> Dict[str, Any]:
        if os.path.exists(PROGRESS_FILE):
            with open(PROGRESS_FILE, "r") as f:
                return json.load(f)
        return {"completed": [], "total_docs": 0}

    def _save_checkpoint(self):
        with open(PROGRESS_FILE, "w") as f:
            json.dump(self.progress, f, indent=2)

    def fetch_genre_map(self) -> Dict[int, str]:
        url = "https://api.themoviedb.org/3/genre/movie/list"
        resp = self.session.get(url, params={"api_key": TMDB_API_KEY, "language": "en"})
        data = resp.json()
        return {g["id"]: g["name"] for g in data.get("genres", [])}

    def validate_movie(self, movie: Dict[str, Any]) -> bool:
        """Formal check before insertion."""
        required = ["tmdb_id", "title"]
        for field in required:
            if not movie.get(field):
                return False
        return True

    def transform(self, raw: Dict[str, Any], genre_map: Dict[int, str]) -> Dict[str, Any]:
        """Normalize raw API response to production DTO."""
        gids = raw.get("genre_ids", [])
        return {
            "tmdb_id": raw.get("id"),
            "title": raw.get("title") or raw.get("name"),
            "overview": raw.get("overview", ""),
            "release_date": raw.get("release_date"),
            "year": int(raw["release_date"][:4]) if raw.get("release_date") else None,
            "language": raw.get("original_language"),
            "genres": [genre_map.get(gid, "Unknown") for gid in gids],
            "rating": round(raw.get("vote_average", 0), 1),
            "votes": raw.get("vote_count", 0),
            "popularity_score": raw.get("popularity", 0),
            "poster_url": f"https://image.tmdb.org/t/p/w500{raw.get('poster_path')}" if raw.get("poster_path") else None,
            "media_type": "movie"
        }

    def run(self):
        logger.info(f"🚀 Starting ETL for years {self.start_year}-{self.end_year}")
        genre_map = self.fetch_genre_map()
        
        for year in range(self.end_year, self.start_year - 1, -1):
            for lang in LANGUAGES:
                checkpoint_key = f"{year}-{lang}"
                if checkpoint_key in self.progress["completed"]:
                    logger.info(f"⏩ Skipping {checkpoint_key} (Completed)")
                    continue

                logger.info(f"📂 Processing {checkpoint_key}...")
                self._process_year_lang(year, lang, genre_map)
                
                self.progress["completed"].append(checkpoint_key)
                self._save_checkpoint()

    def _process_year_lang(self, year: int, lang: str, genre_map: Dict[int, str]):
        """Fetch and upsert all pages for a criteria."""
        page = 1
        total_pages = 1
        
        while page <= total_pages and page <= 500:
            url = "https://api.themoviedb.org/3/discover/movie"
            params = {
                "api_key": TMDB_API_KEY,
                "primary_release_year": year,
                "with_original_language": lang,
                "sort_by": "popularity.desc",
                "page": page
            }
            
            try:
                resp = self.session.get(url, params=params, timeout=15)
                if resp.status_code == 429:
                    logger.warning("⏳ Rate limited. Sleeping 10s...")
                    time.sleep(10)
                    continue
                
                data = resp.json()
                total_pages = data.get("total_pages", 0)
                results = data.get("results", [])
                
                batch = []
                for r in results:
                    movie = self.transform(r, genre_map)
                    if self.validate_movie(movie):
                        batch.append(
                            UpdateOne({"tmdb_id": movie["tmdb_id"]}, {"$set": movie}, upsert=True)
                        )
                
                if batch:
                    try:
                        res = self.movies_col.bulk_write(batch, ordered=False)
                        self.progress["total_docs"] += res.upserted_count + res.modified_count
                    except BulkWriteError as bwe:
                        pass
                
                logger.info(f"   [+] Page {page}/{total_pages} processed. Total DB docs: {self.progress['total_docs']}")
                page += 1
                time.sleep(0.25) # Respectful throttle
                
            except Exception as e:
                logger.error(f"Error on page {page}: {e}")
                time.sleep(5)
                continue

def main():
    parser = argparse.ArgumentParser(description="NeuralFlix Bulk ETL")
    parser.add_argument("--start-year", type=int, default=1900)
    parser.add_argument("--end-year", type=int, default=2026)
    args = parser.parse_args()
    
    etl = BulkIngestETL(args.start_year, args.end_year)
    etl.run()

if __name__ == "__main__":
    main()

