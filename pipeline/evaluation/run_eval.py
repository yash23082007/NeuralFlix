"""Run a small deterministic baseline evaluation.

Usage: python -m pipeline.evaluation.run_eval
The command is intentionally dataset-independent until MovieLens ingestion is configured.
"""
import json
from pathlib import Path
from .metrics import recall_at_k, ndcg_at_k

def run() -> dict:
    # Checked-in fixture makes the command reproducible in a clean clone.
    rows = [("u1", [1, 2, 3], {2}), ("u2", [4, 5, 6], {6})]
    metrics = {}
    for name, offset in [("popularity", 0), ("content", 1)]:
        recs = [[item for item in candidates[offset:]] for _, candidates, _ in rows]
        metrics[name] = {
            "recall@10": sum(recall_at_k(rec, rel) for rec, (_, _, rel) in zip(recs, rows)) / len(rows),
            "ndcg@10": sum(ndcg_at_k(rec, rel) for rec, (_, _, rel) in zip(recs, rows)) / len(rows),
        }
    return {"dataset": "checked-in-fixture-v1", "split": "deterministic-demo", "metrics": metrics}

if __name__ == "__main__":
    result = run()
    print(json.dumps(result, indent=2, sort_keys=True))
