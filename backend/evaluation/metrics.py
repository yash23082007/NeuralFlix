import math
from typing import List, Set


def recall_at_k(recommended: List[int], ground_truth: Set[int], k: int) -> float:
    """Calculate Recall@K."""
    if not ground_truth:
        return 0.0
    rec_k = set(recommended[:k])
    hits = len(rec_k.intersection(ground_truth))#include will be needed to metrics to 
    return hits / len(ground_truth)


def ndcg_at_k(recommended: List[int], ground_truth: Set[int], k: int) -> float:
    """Calculate NDCG@K."""
    if not ground_truth:
        return 0.0
    
    dcg = 0.0
    for i, item in enumerate(recommended[:k]):
        if item in ground_truth:
            dcg += 1.0 / math.log2(i + 2)
            
    idcg = sum(1.0 / math.log2(i + 2) for i in range(min(k, len(ground_truth))))
    
    if idcg == 0:
        return 0.0
    return dcg / idcg


def mrr(recommended: List[int], ground_truth: Set[int]) -> float:
    """Calculate Mean Reciprocal Rank."""
    if not ground_truth:
        return 0.0
        
    for i, item in enumerate(recommended):
        if item in ground_truth:
            return 1.0 / (i + 1)
    return 0.0


def catalog_coverage(all_recommended: Set[int], catalog_size: int) -> float:
    """Calculate the percentage of the catalog that gets recommended."""
    if catalog_size == 0:
        return 0.0
    return len(all_recommended) / catalog_size


def intra_list_diversity(recommended_movies: List[dict]) -> float:
    """
    Calculate Intra-List Diversity based on genre overlap.
    Higher score means more diverse genres within the recommendation list.
    """
    if len(recommended_movies) <= 1:
        return 0.0
        
    total_distance = 0.0
    pairs = 0
    
    for i in range(len(recommended_movies)):
        genres_i = set(recommended_movies[i].get("genres", []))
        for j in range(i + 1, len(recommended_movies)):
            genres_j = set(recommended_movies[j].get("genres", []))
            
            # Jaccard distance = 1 - Jaccard similarity
            union = len(genres_i.union(genres_j))
            if union > 0:
                intersection = len(genres_i.intersection(genres_j))
                distance = 1.0 - (intersection / union)
                total_distance += distance
            pairs += 1
            
    if pairs == 0:
        return 0.0
    return total_distance / pairs
