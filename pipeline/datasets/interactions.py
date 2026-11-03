"""Portable interaction loading for reproducible recommendation experiments."""

from __future__ import annotations

import csv
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable


@dataclass(frozen=True)
class Interaction:
    user_id: str
    item_id: int
    timestamp: datetime
    value: float = 1.0


def load_interactions(path: str | Path) -> list[Interaction]:
    """Load CSV rows with user_id, item_id, timestamp and optional value."""
    rows: list[Interaction] = []
    with Path(path).open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            rows.append(
                Interaction(
                    user_id=str(row["user_id"]),
                    item_id=int(row["item_id"]),
                    timestamp=datetime.fromisoformat(row["timestamp"]),
                    value=float(row.get("value") or 1.0),
                )
            )
    return sorted(rows, key=lambda interaction: interaction.timestamp)


def temporal_leave_last_out(
    interactions: Iterable[Interaction],
) -> tuple[dict[str, list[Interaction]], dict[str, Interaction]]:
    grouped: dict[str, list[Interaction]] = {}
    for interaction in sorted(interactions, key=lambda value: value.timestamp):
        grouped.setdefault(interaction.user_id, []).append(interaction)
    train: dict[str, list[Interaction]] = {}
    test: dict[str, Interaction] = {}
    for user_id, rows in grouped.items():
        if len(rows) < 2:
            continue
        train[user_id] = rows[:-1]
        test[user_id] = rows[-1]
    return train, test
