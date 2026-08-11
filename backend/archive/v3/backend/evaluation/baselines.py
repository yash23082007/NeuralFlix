from typing import List, Dict

class PopularityBaseline:
    """Recommends the most popular items to everyone."""
    def __init__(self):
        self.popular_items = []
        
    def fit(self, interactions: List[dict]):
        counts = {}
        for interaction in interactions:
            mid = int(interaction.get("movie_id", 0))
            if mid:
                counts[mid] = counts.get(mid, 0) + 1
        self.popular_items = sorted(counts.items(), key=lambda x: x[1], reverse=True)
        
    def recommend(self, user_id: str, watch_history: List[int], top_k: int = 10) -> List[int]:
        recs = []
        watched = set(watch_history)
        for mid, _ in self.popular_items:
            if mid not in watched:
                recs.append(mid)
                if len(recs) >= top_k:
                    break
        return recs


class GlobalTasteBaseline:
    """Recommends based on global average taste controls."""
    def __init__(self, recommender):
        self.recommender = recommender
        # Use default controls
        self.taste = {
            "discovery": 50,
            "global": 50,
            "challenge": 50,
            "pace": 50,
            "hiddenGems": 50,
            "diversityBoost": True
        }
        
    def recommend(self, user_id: str, watch_history: List[int], top_k: int = 10) -> List[int]:
        # This is a mock for the pipeline structure
        return self.recommender.recommend(user_id, watch_history, top_k=top_k)
