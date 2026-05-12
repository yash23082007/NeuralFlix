import lightgbm as lgb
import numpy as np
import logging

logger = logging.getLogger(__name__)


class MovieRanker:
    def __init__(self, model_path: str):
        self.model = None
        try:
            self.model = lgb.Booster(model_file=model_path)
        except Exception:
            pass

    def rank(self, candidates: list[dict], user_features: dict) -> list[dict]:
        feature_matrix = self._build_features(candidates, user_features)

        if feature_matrix.shape[0] == 0:
            return candidates

        if self.model:
            try:
                scores = self.model.predict(feature_matrix)
                ranked = sorted(zip(candidates, scores), key=lambda x: -x[1])
                return [c[0] for c in ranked]
            except Exception as exc:
                logger.warning(f"Ranker model prediction failed: {exc}")

        # Fallback scoring: blend popularity + rating + recency when no trained model
        for c in candidates:
            score = 0.0
            score += c.get("popularity_score", 0) * 0.4
            score += c.get("rating", 0) * 0.3
            score += c.get("rec_score", 0) * 0.3
            c["_rank_score"] = score

        return sorted(candidates, key=lambda x: x.get("_rank_score", 0), reverse=True)

    def _build_features(self, candidates: list[dict], user_features: dict) -> np.ndarray:
        if not candidates:
            return np.array([])

        preferred_genres = set(user_features.get("preferred_genres", []))
        preferred_decades = user_features.get("preferred_decades", [])
        avg_rating = user_features.get("avg_rating", 0.0)

        rows = []
        for m in candidates:
            genres = set(m.get("genres", []) or [])
            genre_match = len(genres & preferred_genres) / max(len(preferred_genres), 1)
            year = m.get("year")
            decade_match = 0.0
            if year and preferred_decades:
                m_decade = (year // 10) * 10
                decade_match = 1.0 if m_decade in preferred_decades else 0.0
            rating = m.get("rating", 0) or 0
            popularity = m.get("popularity_score", 0) or 0
            vote_count = m.get("votes", 0) or 0
            rating_diff = abs(rating - avg_rating) / 10.0
            rows.append([
                genre_match,
                decade_match,
                popularity,
                rating,
                min(vote_count / 10000, 1.0),
                1.0 - min(rating_diff, 1.0),
            ])

        return np.array(rows, dtype=np.float32)
