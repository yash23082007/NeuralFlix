import numpy as np
import os
import pickle
from typing import List, Optional

CONTENT_INDEX_PATH = os.getenv("CONTENT_INDEX_PATH", "models/content_index.faiss")
CONTENT_MAP_PATH = os.getenv("CONTENT_MAP_PATH", "models/movie_id_map.pkl")


class ContentBasedEngine:
    def __init__(self):
        self.model = None
        self.index = None
        self.movie_ids = []
        self._loaded = False

    def load(self):
        if self._loaded:
            return
        try:
            import faiss
            self.index = faiss.read_index(CONTENT_INDEX_PATH)
            with open(CONTENT_MAP_PATH, "rb") as f:
                self.movie_ids = pickle.load(f)
            self._loaded = True
        except Exception as e:
            print(f"Content index not found, run build_content_index.py: {e}")

    def build_index(self, movies: List[dict]):
        from sentence_transformers import SentenceTransformer
        import faiss

        self.model = SentenceTransformer("all-MiniLM-L6-v2")
        texts = []
        ids = []

        for m in movies:
            parts = [
                m.get("title", ""),
                m.get("overview", ""),
                " ".join(m.get("genres", [])),
                m.get("director", ""),
            ]
            cast = m.get("cast", [])
            if isinstance(cast, list):
                parts.append(" ".join(str(c) for c in cast[:3]))
            texts.append(" ".join(parts))
            ids.append(m.get("tmdb_id") or m.get("id"))

        embeddings = self.model.encode(texts, batch_size=64, show_progress_bar=True)
        embeddings = embeddings / np.linalg.norm(embeddings, axis=1, keepdims=True)

        self.index = faiss.IndexFlatIP(embeddings.shape[1])
        self.index.add(embeddings.astype("float32"))
        self.movie_ids = ids

        os.makedirs(os.path.dirname(CONTENT_INDEX_PATH) or ".", exist_ok=True)
        faiss.write_index(self.index, CONTENT_INDEX_PATH)
        with open(CONTENT_MAP_PATH, "wb") as f:
            pickle.dump(self.movie_ids, f)

        self._loaded = True

    def get_similar(self, movie_id: int, top_k: int = 50) -> List[int]:
        if not self._loaded:
            self.load()
        if self.index is None or movie_id not in self.movie_ids:
            return []
        idx = self.movie_ids.index(movie_id)
        query = self.index.reconstruct(idx).reshape(1, -1)
        distances, indices = self.index.search(query, top_k + 1)
        return [self.movie_ids[i] for i in indices[0] if i != idx][:top_k]

    def search_by_text(self, query: str, top_k: int = 20) -> List[dict]:
        if not self._loaded:
            self.load()
        if self.model is None or self.index is None:
            return []
        emb = self.model.encode([query])
        emb = emb / np.linalg.norm(emb, axis=1, keepdims=True)
        distances, indices = self.index.search(emb.astype("float32"), top_k)
        return [
            {"movie_id": self.movie_ids[i], "score": float(distances[0][j])}
            for j, i in enumerate(indices[0])
        ]


content_engine = ContentBasedEngine()
