from typing import Dict, List, Tuple
from collections import defaultdict


def temporal_train_test_split(
    interactions: List[dict], 
    min_interactions: int = 5,
    test_ratio: float = 0.2
) -> Tuple[Dict[str, List[int]], Dict[str, List[int]]]:
    """
    Perform a time-aware train/test split.
    Groups interactions by user, sorts by timestamp, and takes the last N items for testing.
    Never random shuffles, as that violates the causality of sequential recommendations.
    
    Returns:
        train_data: Dict[user_id, List[movie_id]]
        test_data: Dict[user_id, List[movie_id]]
    """
    user_interactions = defaultdict(list)
    
    for interaction in interactions:
        uid = str(interaction.get("user_id"))
        mid = int(interaction.get("movie_id", 0))
        ts = interaction.get("timestamp", "")
        if uid and mid and ts:
            user_interactions[uid].append((ts, mid))
            
    train_data = defaultdict(list)
    test_data = defaultdict(list)
    
    for uid, history in user_interactions.items():
        if len(history) < min_interactions:
            # Skip users with too few interactions to evaluate
            continue
            
        # Sort by timestamp
        history.sort(key=lambda x: x[0])
        movie_ids = [mid for _, mid in history]
        
        # Split temporally
        split_idx = int(len(movie_ids) * (1 - test_ratio))
        # Ensure at least 1 item in test if possible
        if split_idx == len(movie_ids):
            split_idx = len(movie_ids) - 1
            
        train_data[uid] = movie_ids[:split_idx]
        test_data[uid] = movie_ids[split_idx:]
        
    return dict(train_data), dict(test_data)
