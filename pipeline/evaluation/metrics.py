from __future__ import annotations

def recall_at_k(recommended: list[int], relevant: set[int], k: int = 10) -> float:
    if not relevant:
        return 0.0
    return len(set(recommended[:k]) & relevant) / len(relevant)

def ndcg_at_k(recommended: list[int], relevant: set[int], k: int = 10) -> float:
    import math
    gains = sum(1 / math.log2(i + 2) for i, item in enumerate(recommended[:k]) if item in relevant)
    ideal = sum(1 / math.log2(i + 2) for i in range(min(k, len(relevant))))
    return gains / ideal if ideal else 0.0

def catalog_coverage(recommendations: list[list[int]], catalog_size: int) -> float:
    return len({item for row in recommendations for item in row}) / catalog_size if catalog_size else 0.0
