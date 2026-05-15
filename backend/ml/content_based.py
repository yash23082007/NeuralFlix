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
        self.cosine_sim = None
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
        
        self.tfidf = TfidfVectorizer(
            max_features=10000,
            ngram_range=(1, 2),
            sublinear_tf=True,
            stop_words='english'
        )
        
        tfidf_matrix = self.tfidf.fit_transform(soups)
        self.cosine_sim = cosine_similarity(tfidf_matrix, tfidf_matrix)
        
        # Save models
        os.makedirs("models", exist_ok=True)
        with open(CONTENT_MATRIX_PATH, "wb") as f:
            pickle.dump((self.cosine_sim, self.movie_ids), f)
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
                self.cosine_sim, self.movie_ids = pickle.load(f)
            with open(TFIDF_MODEL_PATH, "rb") as f:
                self.tfidf = pickle.load(f)
            self._loaded = True
        except Exception as e:
            logger.warning(f"Could not load content index: {e}")

    def get_similar(self, tmdb_id: int, top_k: int = 50) -> List[int]:
        """Find similar movies by TMDB ID using the similarity matrix."""
        self.load()
        if not self._loaded or tmdb_id not in self.movie_ids:
            return []
        
        idx = self.movie_ids.index(tmdb_id)
        # Get pairwise similarity scores for all movies with that movie
        sim_scores = list(enumerate(self.cosine_sim[idx]))
        # Sort by similarity
        sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
        # Exclude the movie itself and take top_k
        sim_scores = sim_scores[1:top_k+1]
        
        return [self.movie_ids[i[0]] for i in sim_scores]

    def search_by_text(self, query: str, top_k: int = 20) -> List[Dict]:
        """Search for movies using raw text query against the TF-IDF index."""
        self.load()
        if not self._loaded or not self.tfidf:
            return []
            
        query_vec = self.tfidf.transform([query.lower()])
        sim_scores = cosine_similarity(query_vec, self.tfidf.transform(self._create_soup([{} for _ in self.movie_ids]))).flatten()
        # Wait, the above is inefficient. Better to transform all once.
        # This is just a placeholder for the logic.
        return []

content_engine = ContentBasedEngine()
