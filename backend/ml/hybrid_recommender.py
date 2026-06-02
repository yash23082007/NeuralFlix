from typing import List, Dict, Tuple, Optional
from .content_based import ContentBasedEngine, content_engine
from .ncf_model import NCFModel
from .sasrec_model import SASRec
import torch

# Singleton instances used across the application
ncf_model: Optional[NCFModel] = None
sasrec_model: Optional[SASRec] = None
gnn_model = None

try:
    # Reduced size for development environment
    ncf_model = NCFModel(num_users=1000, num_items=5000)
    sasrec_model = SASRec(num_items=5000)
except Exception:
    pass

class HybridRecommender:
    def __init__(self, content_engine: ContentBasedEngine, ncf_model: NCFModel, seq_model: SASRec, gnn_model=None):
        self.content = content_engine
        self.ncf = ncf_model
        self.seq = seq_model
        self.gnn = gnn_model

    def recommend(self, user_id: int, watch_history: List[int], all_candidate_ids: Optional[List[int]] = None, top_k: int = 20) -> List[Tuple[int, float]]:
        """
        Produce top-k recommendations blending Content-Based, NCF, and Sequential models.
        Returns a list of (movie_id, score) tuples.
        """
        # Weights (tunable via configuration or A/B testing)
        W_CONTENT = 0.70
        W_NCF = 0.15
        W_SEQ = 0.15

        scores: Dict[int, float] = {}
        
        # 1. Content-based Candidate Retrieval
        candidates = []
        if watch_history:
            try:
                # get similar for the last watched movie
                similar = self.content.get_similar(watch_history[-1], top_k=100)
                candidates.extend(similar)
                for rank, movie_id in enumerate(similar):
                    scores[movie_id] = scores.get(movie_id, 0) + W_CONTENT * (1 / (rank + 1))
            except Exception:
                pass
        
        # Build candidates pool to rank
        if not candidates:
            candidates = all_candidate_ids[:200] if all_candidate_ids else []
        elif all_candidate_ids:
            # Pad candidates to ensure we have enough to rank
            candidates = list(set(candidates + all_candidate_ids[:100]))
            
        if not candidates:
            return []

        # 2. Score candidates with NCF
        try:
            if self.ncf:
                ncf_scores = self.ncf.predict_for_user(user_id, candidates)
                for movie_id, score in ncf_scores:
                    scores[movie_id] = scores.get(movie_id, 0) + W_NCF * score
        except Exception:
            pass
            
        # 3. Score candidates with Sequential Model
        try:
            if watch_history and self.seq:
                seq_scores = self.seq.predict_next(watch_history, candidates)
                for movie_id, score in seq_scores:
                    scores[movie_id] = scores.get(movie_id, 0) + W_SEQ * score
        except Exception:
            pass

        # 4. Filter watched and sort
        filtered_scores = {k: v for k, v in scores.items() if k not in watch_history}
        sorted_recs = sorted(filtered_scores.items(), key=lambda x: x[1], reverse=True)[:top_k]
        
        return sorted_recs
