import os
import pickle
import numpy as np
import pandas as pd
import logging
from typing import List, Dict, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger("CBF_ENGINE")

CONTENT_MATRIX_PATH = os.getenv("CONTENT_MATRIX_PATH", "models/content_matrix.pkl")
TFIDF_MODEL_PATH = os.getenv("TFIDF_MODEL_PATH", "models/tfidf_model.pkl")

class ContentBasedEngine:
    def __init__(self):
        self.tfidf = None
        self.movie_ids = []
        self._loaded = False

    def _create_soup(self, movies: List[Dict]) -> List[str]:
        """Create a metadata 'soup' for vectorization."""
        soups = []
        for m in movies:
            genres = " ".join(m.get("genres", []))
            overview = m.get("overview", "")
            director = m.get("director", "")
            cast = " ".join([str(c) for c in m.get("cast", [])[:5]])
            tagline = m.get("tagline", "")
            
            soup = f"{genres} {overview} {director} {cast} {tagline}"
            soups.append(soup.lower())
        return soups

    def build_index(self, movies: List[Dict]):
        """Train TF-IDF on movie metadata soups and compute similarity matrix."""
        logger.info(f"Building content index for {len(movies)} movies")
        
        soups = self._create_soup(movies)
        self.movie_ids = [m.get("tmdb_id") for m in movies]
        self.id_to_index = {movie_id: i for i, movie_id in enumerate(self.movie_ids)}
        
        self.tfidf = TfidfVectorizer(
            max_features=5000,
            ngram_range=(1, 2),
            sublinear_tf=True,
            stop_words='english'
        )
        
        tfidf_matrix = self.tfidf.fit_transform(soups)
        self.tfidf_matrix = tfidf_matrix
        
        # Save models
        os.makedirs("models", exist_ok=True)
        with open(CONTENT_MATRIX_PATH, "wb") as f:
            pickle.dump((self.movie_ids, tfidf_matrix), f)
        with open(TFIDF_MODEL_PATH, "wb") as f:
            pickle.dump(self.tfidf, f)
            
        self._loaded = True
        logger.info("Content index built and saved")

    def load(self):
        """Load precomputed matrices and TF-IDF model."""
        if self._loaded:
            return
        try:
            with open(CONTENT_MATRIX_PATH, "rb") as f:
                loaded = pickle.load(f)
                if len(loaded) == 3:
                    _, self.movie_ids, self.tfidf_matrix = loaded
                elif len(loaded) == 2:
                    self.movie_ids, self.tfidf_matrix = loaded
                else:
                    self.movie_ids = loaded
                    self.tfidf_matrix = None
            self.id_to_index = {movie_id: i for i, movie_id in enumerate(self.movie_ids)}
            with open(TFIDF_MODEL_PATH, "rb") as f:
                self.tfidf = pickle.load(f)
            self._loaded = True
        except Exception as e:
            logger.warning(f"Could not load content index: {e}")

    def get_similar(self, tmdb_id: int, top_k: int = 50) -> List[int]:
        """Find similar movies by TMDB ID using the similarity matrix."""
        self.load()
        if not self._loaded or not hasattr(self, 'id_to_index') or tmdb_id not in self.id_to_index:
            return []
        
        idx = self.id_to_index[tmdb_id]
        if self.tfidf_matrix is None:
            return []
        
        # Compute similarity on the fly to save RAM
        movie_vec = self.tfidf_matrix[idx]
        sim_scores_array = cosine_similarity(movie_vec, self.tfidf_matrix).flatten()
        sim_scores = list(enumerate(sim_scores_array))
        # Sort by similarity
        sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
        # Exclude the movie itself and take top_k
        sim_scores = sim_scores[1:top_k+1]
        
        return [self.movie_ids[i[0]] for i in sim_scores]

    def search_by_text(self, query: str, top_k: int = 20) -> List[Dict]:
        """Search for movies using raw text query against the TF-IDF index."""
        self.load()
        if not self._loaded or not self.tfidf or not hasattr(self, 'tfidf_matrix') or self.tfidf_matrix is None:
            return []
            
        query_vec = self.tfidf.transform([query.lower()])
        sim_scores = cosine_similarity(query_vec, self.tfidf_matrix).flatten()
        sorted_indices = np.argsort(sim_scores)[::-1]
        
        results = []
        for idx in sorted_indices[:top_k]:
            if sim_scores[idx] <= 0:
                continue
            results.append({
                "tmdb_id": self.movie_ids[idx],
                "score": float(sim_scores[idx])
            })
        return results

content_engine = ContentBasedEngine()

async def auto_build_if_missing():
    """Build TF-IDF content index from database if pickle doesn't exist."""
    if content_engine._loaded:
        return
    if os.path.exists(CONTENT_MATRIX_PATH):
        import asyncio
        await asyncio.to_thread(content_engine.load)
        return
    
    logger.info("Content index missing — building from database...")
    from database import movies_collection
    
    try:
        movies = []
        cursor = movies_collection.find({"overview": {"$ne": ""}})
        cursor.sort("popularity_score", -1).limit(5000)
        
        async for doc in cursor:
            movies.append({
                "tmdb_id": doc.get("tmdb_id"),
                "title": doc.get("title"),
                "overview": doc.get("overview", ""),
                "genres": doc.get("genres") or [],
                "director": doc.get("director", ""),
                "cast": doc.get("cast") or [],
                "tagline": doc.get("tagline", "")
            })
            
        if movies:
            import asyncio
            await asyncio.to_thread(content_engine.build_index, movies)
            logger.info(f"Content index built for {len(movies)} movies")
    except Exception as e:
        logger.error(f"Failed to auto-build content index: {e}")
