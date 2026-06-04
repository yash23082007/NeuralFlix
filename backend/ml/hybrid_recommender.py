from typing import List, Dict, Tuple, Optional
from .content_based import ContentBasedEngine, content_engine
from .ncf_model import NCFModel
from .sasrec_model import SASRec
from .id_mapper import id_mapper
import torch
import os
import logging

logger = logging.getLogger("HYBRID_RECOMMENDER")

NUM_USERS = int(os.getenv("NCF_NUM_USERS", "200000"))
NUM_ITEMS = int(os.getenv("NCF_NUM_ITEMS", "950000"))

ncf_model: Optional[NCFModel] = None
sasrec_model: Optional[SASRec] = None
gnn_model = None

try:
    ncf_model = NCFModel(
        num_users=NUM_USERS,
        num_items=NUM_ITEMS,
        embedding_dim=64,
        layers=[256, 128, 64]
    )
    sasrec_model = SASRec(num_items=NUM_ITEMS, max_seq_len=100)
    logger.info(f"ML models initialized: {NUM_USERS} users, {NUM_ITEMS} items")
except Exception as e:
    logger.warning(f"ML models failed to initialize: {e}")

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
        
        # Build candidates pool to rank (do not slice the candidates list aggressively)
        if not candidates:
            candidates = all_candidate_ids if all_candidate_ids else []
        elif all_candidate_ids:
            # Pad candidates to ensure we have enough to rank
            candidates = list(set(candidates + all_candidate_ids))
            
        if not candidates:
            return []

        # 2. Score candidates with NCF
        try:
            if self.ncf:
                # Map candidates TMDB IDs to model indices
                candidate_indices = id_mapper.batch_to_idx(candidates)
                idx_to_tmdb_map = {id_mapper.to_idx(cid): cid for cid in candidates}
                
                ncf_scores = self.ncf.predict_for_user(user_id, candidate_indices)
                for idx, score in ncf_scores:
                    cid = idx_to_tmdb_map.get(idx)
                    if cid is not None:
                        scores[cid] = scores.get(cid, 0) + W_NCF * score
        except Exception as e:
            logger.warning(f"NCF prediction failed: {e}")
            
        # 3. Score candidates with Sequential Model (SASRec)
        try:
            if watch_history and self.seq:
                # Map watch history and candidates TMDB IDs to model indices
                watch_history_indices = id_mapper.batch_to_idx(watch_history)
                candidate_indices = id_mapper.batch_to_idx(candidates)
                idx_to_tmdb_map = {id_mapper.to_idx(cid): cid for cid in candidates}
                
                seq_scores = self.seq.predict_next(watch_history_indices, candidate_indices)
                for idx, score in seq_scores:
                    cid = idx_to_tmdb_map.get(idx)
                    if cid is not None:
                        scores[cid] = scores.get(cid, 0) + W_SEQ * score
        except Exception as e:
            logger.warning(f"Sequential prediction failed: {e}")

        # 4. Filter watched and sort
        filtered_scores = {k: v for k, v in scores.items() if k not in watch_history}
        sorted_recs = sorted(filtered_scores.items(), key=lambda x: x[1], reverse=True)[:top_k]
        
        return sorted_recs
