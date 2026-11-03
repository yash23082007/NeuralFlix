"""Evaluate real prediction records without fabricating a benchmark.

Input is JSONL with one row per user:
{"user_id": "...", "recommended": [1, 2], "relevant": [3], "genres": [["Drama"], ["Comedy"]]}
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from .metrics import catalog_coverage, intra_list_diversity, ndcg_at_k, recall_at_k


def evaluate_records(records: list[dict[str, Any]], catalog_size: int, k: int = 10) -> dict[str, Any]:
    recalls = [
        recall_at_k(row["recommended"], set(row["relevant"]), k)
        for row in records
        if row.get("relevant")
    ]
    ndcgs = [
        ndcg_at_k(row["recommended"], set(row["relevant"]), k)
        for row in records
        if row.get("relevant")
    ]
    genre_lists = [
        [set(genres) for genres in row.get("genres", [])[:k]]
        for row in records
    ]
    diversities = [intra_list_diversity(genres) for genres in genre_lists if len(genres) > 1]
    return {
        "users": len(records),
        "catalog_size": catalog_size,
        "k": k,
        "Recall@10": round(sum(recalls) / len(recalls), 6) if recalls else 0.0,
        "NDCG@10": round(sum(ndcgs) / len(ndcgs), 6) if ndcgs else 0.0,
        "Catalog Coverage": round(
            catalog_coverage([row["recommended"][:k] for row in records], catalog_size), 6
        ),
        "Intra-list Diversity": round(sum(diversities) / len(diversities), 6) if diversities else 0.0,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("predictions", type=Path)
    parser.add_argument("--catalog-size", type=int, required=True)
    args = parser.parse_args()
    records = [
        json.loads(line)
        for line in args.predictions.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    print(json.dumps(evaluate_records(records, args.catalog_size), indent=2))


if __name__ == "__main__":
    main()
