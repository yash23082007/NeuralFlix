"""
NeuralFlix — Temporal Dataset Splitter
Strict rule: Train < T_val < T_test to prevent future data leakage.
"""

from typing import List, Tuple, Any, Dict


def temporal_split(
    interactions: List[Dict[str, Any]],
    timestamp_key: str = "timestamp",
    train_ratio: float = 0.7,
    val_ratio: float = 0.15,
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Split interaction events chronologically into train, validation, and test sets.
    """
    if not interactions:
        return [], [], []

    sorted_events = sorted(interactions, key=lambda x: x.get(timestamp_key, 0))
    n = len(sorted_events)
    train_idx = int(n * train_ratio)
    val_idx = int(n * (train_ratio + val_ratio))

    train = sorted_events[:train_idx]
    val = sorted_events[train_idx:val_idx]
    test = sorted_events[val_idx:]

    return train, val, test
