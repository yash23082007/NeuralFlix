import logging
from typing import List, Optional

logger = logging.getLogger(__name__)


class SentimentReranker:
    def __init__(self, model_name: str = "cardiffnlp/twitter-roberta-base-sentiment"):
        self.model = None
        self.model_name = model_name

    def _load_model(self):
        if self.model is not None:
            return
        try:
            from transformers import pipeline
            self.model = pipeline(
                "sentiment-analysis",
                model=self.model_name,
                max_length=512,
                truncation=True,
            )
        except Exception as exc:
            logger.warning(f"Sentiment model load failed: {exc}")
            self.model = None

    def _analyze(self, reviews: List[str]) -> float:
        self._load_model()
        if not self.model or not reviews:
            return 0.5
        try:
            results = self.model(reviews[:50], batch_size=16)
            positive = sum(
                1 for r in results
                if r.get("label", "").upper() in ("POSITIVE", "LABEL_1")
            )
            return positive / max(len(results), 1)
        except Exception as exc:
            logger.warning(f"Sentiment analysis failed: {exc}")
            return 0.5

    def rerank(
        self,
        candidates: List[dict],
        review_fn=None,
        boost_factor: float = 0.4,
    ) -> List[dict]:
        if not candidates:
            return []
        if review_fn is None:
            for c in candidates:
                c["_sentiment_boost"] = 0.0
            return sorted(candidates, key=lambda x: x.get("_sentiment_boost", 0), reverse=True)

        for c in candidates:
            cid = c.get("tmdb_id", c.get("id"))
            base_score = c.get("rec_score", c.get("popularity_score", 0))
            try:
                reviews = review_fn(cid)
                pos_ratio = self._analyze(reviews)
            except Exception:
                pos_ratio = 0.5
            boost = (pos_ratio - 0.5) * 2 * boost_factor
            c["_sentiment_boost"] = boost
            c["_reranked_score"] = base_score * (1.0 + boost)

        return sorted(candidates, key=lambda x: x.get("_reranked_score", 0), reverse=True)
