from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
from typing import List, Dict

class ContentBasedEngine:
    def __init__(self, model_name: str = 'all-MiniLM-L6-v2'):
        # using a lightweight model for fast embeddings CPU/GPU
        self.model = SentenceTransformer(model_name)
        self.index = None  # FAISS index
        self.movie_ids = []

    def build_index(self, movies: List[Dict]):
        """Build FAISS index from movie metadata embeddings"""
        texts = []
        for m in movies:
            # Combine relevant metadata into a singular context string
            title = m.get('title', '')
            overview = m.get('overview', '')
            genres = ' '.join(m.get('genres', []))
            keywords = ' '.join(m.get('keywords', []))
            cast = ' '.join(m.get('cast', [])[:3])
            director = m.get('director', '')
            
            context_string = f"{title} {overview} {genres} {keywords} {cast} {director}"
            texts.append(context_string)

        print(f"Encoding {len(texts)} movies...")
        embeddings = self.model.encode(texts, batch_size=64, show_progress_bar=True)
        # Normalize for Inner Product (Cosine Similarity)
        embeddings = embeddings / np.linalg.norm(embeddings, axis=1, keepdims=True)
        
        # Build FAISS index for quick candidate retrieval 
        self.index = faiss.IndexFlatIP(embeddings.shape[1])
        self.index.add(embeddings.astype('float32'))
        self.movie_ids = [m['id'] for m in movies]
        print("FAISS Index build complete.")

    def get_similar(self, movie_id: int, top_k: int = 50) -> List[int]:
        if not self.index:
            raise ValueError("FAISS index not built yet.")
            
        try:
            idx = self.movie_ids.index(movie_id)
        except ValueError:
            return [] # Movie not found
        
        query = self.index.reconstruct(idx).reshape(1, -1)
        # return top_k + 1 since the first result is usually the exact movie
        distances, indices = self.index.search(query, top_k + 1)
        
        return [self.movie_ids[i] for i in indices[0] if i != idx][:top_k]

    def save_index(self, index_path: str, map_path: str):
        if self.index:
            faiss.write_index(self.index, index_path)
            import pickle
            with open(map_path, 'wb') as f:
                pickle.dump(self.movie_ids, f)

    def load_index(self, index_path: str, map_path: str):
        if os.path.exists(index_path) and os.path.exists(map_path):
            self.index = faiss.read_index(index_path)
            import pickle
            with open(map_path, 'rb') as f:
                self.movie_ids = pickle.load(f)
