import os
import sys
import argparse
import logging
from pymongo import MongoClient
from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from typing import List, Dict

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from models.sql_models import Base, PostgresMovie, HAS_PGVECTOR
from utils.vector_engine import generate_movie_embedding, get_model

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger("MLEMBEDDING_PIPELINE")

load_dotenv(os.path.join(backend_dir, '.env'))
MONGO_URI = os.getenv("MONGO_URI")
SUPABASE_URL = os.getenv("DATABASE_URL")

class EmbeddingPipeline:
    def __init__(self):
        if not HAS_PGVECTOR:
            logger.error("❌ Vector Engine or SQL models missing! Did you enable pgvector?")
            sys.exit(1)
        
        # Init Mongo
        self.mongo_client = MongoClient(MONGO_URI)
        self.movies_col = self.mongo_client.neuralflix.movies
        
        # Init Postgres
        if not SUPABASE_URL:
            logger.error("❌ DATABASE_URL missing.")
            sys.exit(1)
            
        self.pg_engine = create_engine(SUPABASE_URL, pool_pre_ping=True, pool_size=10)
        Base.metadata.create_all(self.pg_engine) # Ensure table exists
        self.SessionLocal = sessionmaker(bind=self.pg_engine)
        
        # Pre-load Neural Model
        logger.info("Initializing HuggingFace Sentence-BERT (all-MiniLM-L6-v2)...")
        get_model()
        logger.info("✅ Core initialized! PGVector is ready.")

    def run_pipeline(self, limit: int = 0, batch_size: int = 100):
        # Fetch movies with overviews
        query = {"overview": {"$exists": True, "$ne": ""}, "poster_url": {"$exists": True}}
        cursor = self.movies_col.find(query).limit(limit) if limit > 0 else self.movies_col.find(query)
        total_count = self.movies_col.count_documents(query) if limit == 0 else limit
        
        logger.info(f"🚀 Targeting {total_count} movies for Vector Encoding.")
        
        batch = []
        processed = 0
        inserted_or_updated = 0
        
        db = self.SessionLocal()
        
        for doc in cursor:
            tmdb_id = doc.get('tmdb_id')
            if not tmdb_id: 
                continue
            
            # Use imdb_id from Mongo if available
            imdb_id = doc.get('imdb_id')
                
            # Data cleansing
            title = doc.get('title', 'Unknown')
            overview = doc.get('overview', '')
            tagline = doc.get('tagline', '')
            genres = doc.get('genres', [])
            rating = doc.get('rating')
            poster = doc.get('poster_url')
            
            # Encode -> 384 dimensions
            vec = generate_movie_embedding(title, overview, tagline, genres)
            
            payload = {
                "tmdb_id": tmdb_id,
                "imdb_id": imdb_id if imdb_id else None,
                "title": title[:499],  # safety bounds
                "overview": overview,
                "tagline": tagline,
                "genres": genres,
                "tmdb_rating": float(rating) if rating else None,
                "poster_url": poster,
                "embedding": vec
            }
            batch.append(payload)
            processed += 1
            
            if len(batch) >= batch_size:
                inserted_or_updated += self._upsert_batch(db, batch)
                batch = []
                logger.info(f"   [+] Encoded and Synced {processed}/{total_count} movies to pgvector...")
                
        # Flush remainder
        if batch:
            inserted_or_updated += self._upsert_batch(db, batch)
            
        db.close()
        logger.info(f"🎉 Pipeline Complete. Total Neural Rows Upserted: {inserted_or_updated}")

    def _upsert_batch(self, db, batch_data: List[Dict]) -> int:
        stmt = insert(PostgresMovie).values(batch_data)
        
        # Maps what to update if conflict on tmdb_id
        update_dict = {
            c.name: c
            for c in stmt.excluded
            if not c.primary_key
        }
        
        on_conflict_stmt = stmt.on_conflict_do_update(
            index_elements=['tmdb_id'],
            set_=update_dict
        )
        
        try:
            db.execute(on_conflict_stmt)
            db.commit()
            return len(batch_data)
        except Exception as e:
            logger.error(f"Batch Upsert failed: {e}")
            db.rollback()
            return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="NeuralFlix PGVector Encodings Pipeline")
    parser.add_argument("--limit", type=int, default=0, help="Limit number of rows to encode")
    parser.add_argument("--batch", type=int, default=100, help="DB batch size")
    args = parser.parse_args()
    
    pipeline = EmbeddingPipeline()
    pipeline.run_pipeline(limit=args.limit, batch_size=args.batch)
