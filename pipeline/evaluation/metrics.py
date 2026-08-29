"""
NeuralFlix — Recommendation Metrics Suite

Evaluation metrics:
- Recall@K
- NDCG@K
- MAP@K
- Catalog Coverage
- Intra-List Diversity (ILD)
- Novelty
"""

import math
from typing import List, Set, Sequence, Dict, Any


def recall_at_k(recommended: Sequence[int], relevant: Set[int], k: int = 10) -> float:
    """Proportion of relevant items found in top-K recommendations."""
    if not relevant:
        return 0.0
    top_k = recommended[:k]
    return len(set(top_k) & relevant) / len(relevant)


def ndcg_at_k(recommended: Sequence[int], relevant: Set[int], k: int = 10) -> float:
    """Normalized Discounted Cumulative Gain at top-K."""
    if not relevant:
        return 0.0
    top_k = recommended[:k]
    dcg = sum(1.0 / math.log2(i + 2) for i, item in enumerate(top_k) if item in relevant)
    idcg = sum(1.0 / math.log2(i + 2) for i in range(min(k, len(relevant))))
    return dcg / idcg if idcg > 0 else 0.0


def map_at_k(recommended: Sequence[int], relevant: Set[int], k: int = 10) -> float:
    """Mean Average Precision at top-K."""
    if not relevant:
        return 0.0
    top_k = recommended[:k]
    hits = 0
    sum_precisions = 0.0
    for i, item in enumerate(top_k):
        if item in relevant:
            hits += 1
            sum_precisions += hits / (i + 1)
    return sum_precisions / min(len(relevant), k) if relevant else 0.0


def catalog_coverage(all_recommendations: List[Sequence[int]], catalog_size: int) -> float:
    """Percentage of catalog items recommended at least once across all users."""
    if not catalog_size:
        return 0.0
    unique_items = {item for row in all_recommendations for item in row}
    return len(unique_items) / catalog_size


def intra_list_diversity(
    recommended_genres: List[Set[str]],
) -> float:
    """
    Intra-List Diversity (ILD) based on average pairwise Jaccard distance between item genres.
    """
    if len(recommended_genres) < 2:
        return 0.0
    
    n = len(recommended_genres)
    total_dist = 0.0
    pairs = 0
    
    for i in range(n):
        for j in range(i + 1, n):
            g1, g2 = recommended_genres[i], recommended_genres[j]
            if not g1 and not g2:
                dist = 0.0
            else:
                jaccard = len(g1 & g2) / len(g1 | g2) if (g1 | g2) else 0.0
                dist = 1.0 - jaccard
            total_dist += dist
            pairs += 1
            
    return total_dist / pairs if pairs > 0 else 0.0
