"""
NeuralFlix Mega Ingest: 1M+ Movie Pipeline (Global Edition)
=============================================================
Two-phase pipeline:
  Phase 1 — Download TMDB daily export → extract all movie IDs
  Phase 2 — ThreadPoolExecutor hydrate each ID with full metadata → MongoDB

Supports: checkpoint resume, adaptive rate limiting, dry-run mode.
Uses Requests and ThreadPoolExecutor for robust execution on Windows.

Usage:
  python mega_ingest.py                    # Full run
  python mega_ingest.py --dry-run          # Phase 1 only (download + count)
  python mega_ingest.py --limit 5000       # Hydrate first N movies only
  python mega_ingest.py --workers 20       # Adjust concurrency
"""

import os
import sys
import gzip
import json
import time
import requests
import logging
import argparse
import threading
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Set, List, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed

from pymongo import MongoClient, UpdateOne
from pymongo.errors import BulkWriteError
from dotenv import load_dotenv

# ─── Path Setup ────────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# ─── Configuration ─────────────────────────────────────────
TMDB_API_KEY = os.getenv("TMDB_API_KEY")
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CHECKPOINT_FILE = os.path.join(SCRIPT_DIR, "mega_ingest_checkpoint.json")
LOG_FILE = os.path.join(SCRIPT_DIR, "mega_ingest.log")
EXPORT_DIR = os.path.join(SCRIPT_DIR, "exports")

# TMDB rate limit: ~40 requests per 10 seconds.
RATE_LIMIT_DELAY = 10.0 / 40.0  # Approx time per request

BATCH_SIZE = 500          # MongoDB bulk write batch size
CHECKPOINT_INTERVAL = 5000  # Save progress every N movies
DEFAULT_WORKERS = 10      # Reduced default since requests block per thread

# ─── Logging ───────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("MEGA_INGEST")

class RateLimiter:
    """Thread-safe simple token-bucket-like rate limiter"""
    def __init__(self, delay: float = RATE_LIMIT_DELAY):
        self.delay = delay
        self.lock = threading.Lock()
        self.last_ts = time.monotonic()

    def acquire(self):
        with self.lock:
            now = time.monotonic()
            elapsed = now - self.last_ts
            if elapsed < self.delay:
                time.sleep(self.delay - elapsed)
            self.last_ts = time.monotonic()

class MegaIngestPipeline:
    """Downloads TMDB daily export and hydrates 1M+ movies into MongoDB using threads."""
    def __init__(self, workers: int = DEFAULT_WORKERS, limit: Optional[int] = None, dry_run: bool = False):
        self.workers = workers
        self.limit = limit
        self.dry_run = dry_run

        self.client = MongoClient(MONGO_URI)
        self.db = self.client.neuralflix
        self.movies_col = self.db.movies
        try:
            self.movies_col.create_index("tmdb_id", unique=True, sparse=True)
            self.movies_col.create_index("cinema_region")
            self.movies_col.create_index("language")
        except Exception:
            pass  # Index already exists

        self.checkpoint = self._load_checkpoint()
        self.rate_limiter = RateLimiter()
        self.stats = {
            "total_ids": 0,
            "skipped_existing": 0,
            "hydrated": 0,
            "errors": 0,
            "start_time": time.time(),
        }
        self.pending_batch: List[UpdateOne] = []
        self.batch_lock = threading.Lock()
        self.checkpoint_lock = threading.Lock()

    def _load_checkpoint(self) -> Dict[str, Any]:
        if os.path.exists(CHECKPOINT_FILE):
            try:
                with open(CHECKPOINT_FILE, "r") as f:
                    data = json.load(f)
                    logger.info(f"📂 Loaded checkpoint: {len(data.get('completed_ids', []))} movies already done")
                    return data
            except Exception:
                pass
        return {"completed_ids": [], "total_hydrated": 0, "phase": "init"}

    def _save_checkpoint(self):
        with self.checkpoint_lock:
            try:
                with open(CHECKPOINT_FILE, "w") as f:
                    json.dump(self.checkpoint, f)
            except Exception as e:
                logger.error(f"Failed to save checkpoint: {e}")

    # ─── Phase 1: Download TMDB Daily Export ────────────────
    def _get_export_url(self) -> str:
        now = datetime.now(timezone.utc)
        for delta in range(0, 4):
            d = now - timedelta(days=delta)
            date_str = d.strftime("%m_%d_%Y")
            url = f"http://files.tmdb.org/p/exports/movie_ids_{date_str}.json.gz"
            yield url, date_str

    def download_export(self) -> str:
        os.makedirs(EXPORT_DIR, exist_ok=True)
        for url, date_str in self._get_export_url():
            local_path = os.path.join(EXPORT_DIR, f"movie_ids_{date_str}.json.gz")
            if os.path.exists(local_path) and os.path.getsize(local_path) > 1000:
                logger.info(f"📦 Reusing cached export: {local_path}")
                return local_path
            
            logger.info(f"⬇️ Downloading TMDB export: {url}")
            try:
                resp = requests.get(url, stream=True)
                if resp.status_code == 200:
                    with open(local_path, "wb") as f:
                        for chunk in resp.iter_content(chunk_size=8192):
                            f.write(chunk)
                    logger.info(f"✅ Downloaded successfully → {local_path}")
                    return local_path
                else:
                    logger.warning(f"   ↳ {url} returned {resp.status_code}, trying earlier...")
            except Exception as e:
                logger.warning(f"   ↳ Download failed: {e}")
        
        raise RuntimeError("Could not download TMDB daily export")

    def parse_export(self, gz_path: str) -> List[int]:
        movie_ids = []
        with gzip.open(gz_path, "rt", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                    if obj.get("adult", False):
                        continue
                    if mid := obj.get("id"):
                        movie_ids.append(int(mid))
                except (json.JSONDecodeError, ValueError):
                    pass
        logger.info(f"📋 Parsed {len(movie_ids):,} non-adult movie IDs from export")
        return movie_ids

    # ─── Phase 2: Sync Hydration ───────────────────────────
    def _get_existing_ids(self) -> Set[int]:
        logger.info("🔍 Optimizing existing IDs query...")
        existing = set(self.movies_col.distinct("tmdb_id"))
        logger.info(f"   ↳ Found {len(existing):,} movies already in DB")
        return existing

    def _determine_region(self, country_iso: str, raw_lang: str) -> Optional[str]:
        if country_iso == "IN":
            return "indian"
        if country_iso == "KR":
            return "korean"
        if country_iso == "FR":
            return "french"
        if country_iso == "JP":
            return "japanese"
        if raw_lang == "es":
            return "spanish"
        if country_iso == "NG":
            return "nollywood"
        if country_iso == "IR":
            return "iranian"
        if raw_lang == "en" and country_iso in ["US", "GB", "CA", "AU"]:
            return "hollywood"
        return "global"

    def _transform(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        genres = [g.get("name", "Unknown") for g in raw.get("genres", [])]
        credits = raw.get("credits", {})
        director = None
        cast = []

        for crew in credits.get("crew", []):
            if crew.get("job") == "Director":
                director = crew.get("name")
                break

        for member in credits.get("cast", [])[:10]:
            cast.append({
                "name": member.get("name", ""),
                "character": member.get("character", ""),
                "profile_url": f"https://image.tmdb.org/t/p/w185{member['profile_path']}" if member.get("profile_path") else None
            })

        release_date = raw.get("release_date", "")
        year = None
        if release_date and len(release_date) >= 4:
            try:
                year = int(release_date[:4])
            except ValueError:
                pass
        
        prod_countries = [c.get("iso_3166_1") for c in raw.get("production_countries", [])]
        primary_country = prod_countries[0] if prod_countries else "US"
        raw_lang = raw.get("original_language", "")

        return {
            "tmdb_id": raw.get("id"),
            "title": raw.get("title") or raw.get("original_title") or "Unknown",
            "overview": raw.get("overview", ""),
            "release_date": release_date or None,
            "year": year,
            "language": raw_lang,
            "genres": genres,
            "rating": round(raw.get("vote_average", 0), 1),
            "votes": raw.get("vote_count", 0),
            "popularity_score": raw.get("popularity", 0),
            "poster_url": f"https://image.tmdb.org/t/p/w500{raw['poster_path']}" if raw.get("poster_path") else None,
            "backdrop_url": f"https://image.tmdb.org/t/p/w1280{raw['backdrop_path']}" if raw.get("backdrop_path") else None,
            "media_type": "movie",
            "runtime": raw.get("runtime"),
            "director": director,
            "cast": cast,
            "budget": raw.get("budget"),
            "revenue": raw.get("revenue"),
            "tagline": raw.get("tagline"),
            "imdb_id": raw.get("imdb_id"),
            "status": raw.get("status"),
            "production_countries": prod_countries,
            "spoken_languages": [l.get("english_name") for l in raw.get("spoken_languages", [])],
            "cinema_region": self._determine_region(primary_country, raw_lang)
        }

    def _fetch_movie(self, session: requests.Session, movie_id: int) -> Optional[Dict]:
        url = f"https://api.themoviedb.org/3/movie/{movie_id}"
        params = {"api_key": TMDB_API_KEY, "append_to_response": "credits", "language": "en-US"}

        for attempt in range(1, 5):
            self.rate_limiter.acquire()
            try:
                resp = session.get(url, params=params, timeout=10)
                if resp.status_code == 200:
                    return resp.json()
                elif resp.status_code == 429:
                    retry_after = int(resp.headers.get("Retry-After", 4))
                    time.sleep(retry_after)
                elif resp.status_code == 404:
                    return None
            except Exception as e:
                time.sleep(2 * attempt)
        
        with self.checkpoint_lock:
            self.stats["errors"] += 1
        return None

    def _flush_batch(self):
        with self.batch_lock:
            if not self.pending_batch: return
            batch = self.pending_batch[:]
            self.pending_batch = []

        if batch:
            try:
                result = self.movies_col.bulk_write(batch, ordered=False)
                with self.checkpoint_lock:
                    self.stats["hydrated"] += result.upserted_count + result.modified_count
            except BulkWriteError as bwe:
                details = bwe.details
                with self.checkpoint_lock:
                    self.stats["hydrated"] += details.get("nUpserted", 0) + details.get("nModified", 0)

    def process_movie(self, movie_id: int):
        with requests.Session() as session:
            raw = self._fetch_movie(session, movie_id)
            if raw:
                movie_doc = self._transform(raw)
                op = UpdateOne({"tmdb_id": movie_doc["tmdb_id"]}, {"$set": movie_doc}, upsert=True)
                with self.batch_lock:
                    self.pending_batch.append(op)
                    if len(self.pending_batch) >= BATCH_SIZE:
                        self._flush_batch()

        with self.checkpoint_lock:
            self.checkpoint["completed_ids"].append(movie_id)
            total = len(self.checkpoint["completed_ids"])
            if total % CHECKPOINT_INTERVAL == 0:
                self._save_checkpoint()
                elapsed = time.time() - self.stats["start_time"]
                rate = total / elapsed if elapsed > 0 else 0
                eta = (self.stats["total_ids"] - total) / (rate * 3600) if rate > 0 else 0
                logger.info(f"💾 Checkpoint: {total:,} / {self.stats['total_ids']:,} "
                            f"| Rate: {rate:.1f}/s | ETA: {eta:.1f}h")

    def run_hydration(self, movie_ids: List[int]):
        done_set = set(self.checkpoint.get("completed_ids", []))
        existing_db_ids = self._get_existing_ids()
        all_skip = done_set | existing_db_ids

        remaining = [mid for mid in movie_ids if mid not in all_skip]
        self.stats["skipped_existing"] = len(all_skip)
        
        if self.limit:
            remaining = remaining[:self.limit]
            
        self.stats["total_ids"] = len(remaining)
        logger.info(f"🚀 Hydration starting: {self.stats['total_ids']:,} movies to process")

        if not remaining:
            logger.info("✅ Nothing to hydrate")
            return

        self.stats["start_time"] = time.time()

        with ThreadPoolExecutor(max_workers=self.workers) as executor:
            futures = [executor.submit(self.process_movie, mid) for mid in remaining]
            for _ in as_completed(futures):
                pass

        self._flush_batch()
        self._save_checkpoint()

        elapsed = time.time() - self.stats["start_time"]
        logger.info(f"\n🏁 HYDRATION COMPLETE | Hydrated: {self.stats['hydrated']:,} | Errors: {self.stats['errors']:,} | Time: {elapsed/3600:.1f}h")

    def run(self):
        logger.info("=" * 60)
        logger.info("🎬 NeuralFlix Global Ingest Pipeline (Windows Stable)")
        logger.info("=" * 60)

        if not TMDB_API_KEY:
            logger.error("❌ TMDB_API_KEY not set!")
            return

        gz_path = self.download_export()
        movie_ids = self.parse_export(gz_path)

        if self.dry_run:
            logger.info(f"\n🔍 DRY RUN: Found {len(movie_ids):,} IDs")
            return

        self.run_hydration(movie_ids)
        logger.info(f"\n📊 Total movies in DB: {self.movies_col.count_documents({}):,}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--workers", type=int, default=DEFAULT_WORKERS)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    pipeline = MegaIngestPipeline(workers=args.workers, limit=args.limit, dry_run=args.dry_run)
    pipeline.run()
