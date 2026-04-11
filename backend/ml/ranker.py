import lightgbm as lgb
import numpy as np

class MovieRanker:
    def __init__(self, model_path: str):
        try:
            self.model = lgb.Booster(model_file=model_path)
        except Exception:
            self.model = None # Fallback if model not trained yet

    def rank(self, candidates: list[dict], user_features: dict) -> list[dict]:
        if not self.model:
            return candidates # Return as-is if no model

        feature_matrix = self._build_features(candidates, user_features)
        
        if feature_matrix.shape[0] == 0:
            return candidates
            
        scores = self.model.predict(feature_matrix)
        
        # Sort candidates by predicted score
        ranked_candidates = sorted(zip(candidates, scores), key=lambda x: -x[1])
        return [c[0] for c in ranked_candidates]

    def _build_features(self, candidates, user_features):
        # Mock feature generation based on genre_match, popularity_score, etc
        if not candidates:
            return np.array([])
        return np.random.rand(len(candidates), 10) 
