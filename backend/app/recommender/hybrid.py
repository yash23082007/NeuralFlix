"""A small, reproducible hybrid ranker for the online recommendation path.

The engine deliberately has no import-time dependency on heavyweight ML packages.
Optional training adapters can provide learned scores, while this ranker remains
usable for local development and cold-start users.
"""

from __future__ import annotations

from dataclasses import dataclass
import hashlib
from math import exp, log
from typing import Any, Iterable, Mapping, Sequence


@dataclass(frozen=True)
class HybridWeights:
    content: float = 0.30
    collaborative: float = 0.25
    sequential: float = 0.15
    graph: float = 0.10
    semantic: float = 0.10
    bandit: float = 0.10


@dataclass(frozen=True)
class HybridCandidate:
    item_id: int
    score: float
    components: Mapping[str, float]
    explanation: str


def _sigmoid(value: float) -> float:
    return 1.0 / (1.0 + exp(-max(-20.0, min(20.0, value))))


def _jaccard(left: set[str], right: set[str]) -> float:
    union = left | right
    return len(left & right) / len(union) if union else 0.0


class HybridRecommendationEngine:
    """Combine content, interaction, sequence, graph and exploration signals."""

    def __init__(
        self,
        weights: HybridWeights | None = None,
        *,
        learned_scores: Mapping[int, float] | None = None,
        seed: int = 17,
    ) -> None:
        self.weights = weights or HybridWeights()
        self.learned_scores = learned_scores or {}
        self.seed = seed

    def rank(
        self,
        *,
        user_id: str,
        candidates: Sequence[Any],
        history: Sequence[Any] = (),
        feedback: Mapping[int, float] | None = None,
        limit: int = 20,
    ) -> list[HybridCandidate]:
        history_items = list(history)
        history_ids = {self._item_id(item) for item in history_items}
        history_genres = {
            genre
            for item in history_items
            for genre in (getattr(item, "genres", None) or [])
        }
        feedback = feedback or {}
        scored: list[HybridCandidate] = []

        for index, movie in enumerate(candidates):
            item_id = self._item_id(movie)
            genres = set(getattr(movie, "genres", None) or [])
            content = _jaccard(history_genres, genres) if history_genres else self._quality(movie)
            collaborative = self._collaborative(item_id, feedback)
            sequential = self._sequential(item_id, history_ids, index)
            graph = self._graph(movie, history_items)
            semantic = self._semantic(movie, history_genres)
            bandit = self._bandit(user_id, item_id, feedback)
            components = {
                "content": round(content, 4),
                "collaborative": round(collaborative, 4),
                "sequential": round(sequential, 4),
                "graph": round(graph, 4),
                "semantic": round(semantic, 4),
                "bandit": round(bandit, 4),
            }
            score = sum(getattr(self.weights, name) * value for name, value in components.items())
            score += self.learned_scores.get(item_id, 0.0)
            scored.append(
                HybridCandidate(
                    item_id=item_id,
                    score=round(score, 6),
                    components=components,
                    explanation=self.explain(components),
                )
            )

        scored.sort(key=lambda result: (-result.score, result.item_id))
        return self._diversify(scored, candidates, limit)

    @staticmethod
    def _item_id(item: Any) -> int:
        return int(getattr(item, "id", getattr(item, "tmdb_id", item)))

    @staticmethod
    def _quality(movie: Any) -> float:
        rating = float(getattr(movie, "tmdb_rating", 0.0) or 0.0)
        popularity = float(getattr(movie, "popularity_score", 0.0) or 0.0)
        return min(1.0, (rating / 10.0) * 0.7 + (min(popularity, 100.0) / 100.0) * 0.3)

    @staticmethod
    def _collaborative(item_id: int, feedback: Mapping[int, float]) -> float:
        return _sigmoid(float(feedback.get(item_id, 0.0))) if feedback else 0.5

    @staticmethod
    def _sequential(item_id: int, history_ids: set[int], index: int) -> float:
        if item_id in history_ids:
            return 0.0
        return 1.0 / (1.0 + index * 0.05)

    def _graph(self, movie: Any, history: Sequence[Any]) -> float:
        movie_genres = set(getattr(movie, "genres", None) or [])
        if not history:
            return 0.5
        return max(
            (_jaccard(movie_genres, set(getattr(item, "genres", None) or [])) for item in history),
            default=0.0,
        )

    def _semantic(self, movie: Any, history_genres: set[str]) -> float:
        keywords = set(getattr(movie, "keywords", None) or [])
        if not keywords or not history_genres:
            return self._quality(movie)
        return min(1.0, 0.5 * _jaccard(keywords, history_genres) + 0.5 * self._quality(movie))

    @staticmethod
    def _bandit(user_id: str, item_id: int, feedback: Mapping[int, float]) -> float:
        prior_success = 1.0 + max(0.0, float(feedback.get(item_id, 0.0)))
        prior_failure = 1.0 + max(0.0, -float(feedback.get(item_id, 0.0)))
        # Deterministic posterior mean keeps requests reproducible; an online
        # sampler can replace this value without changing the response shape.
        digest = hashlib.sha256(f"{user_id}:{item_id}".encode("utf-8")).digest()
        salt = (int.from_bytes(digest[:2], "big") / 0xFFFF) * 0.02
        return (prior_success / (prior_success + prior_failure)) + salt

    @staticmethod
    def explain(components: Mapping[str, float]) -> str:
        labels = {
            "content": "genre/content match",
            "collaborative": "interaction affinity",
            "sequential": "recent-sequence fit",
            "graph": "neighbor similarity",
            "semantic": "keyword/quality match",
            "bandit": "exploration bonus",
        }
        strongest = sorted(components.items(), key=lambda pair: pair[1], reverse=True)[:2]
        return "Recommended for " + " and ".join(labels[name] for name, _ in strongest) + "."

    @staticmethod
    def _diversify(
        ranked: Sequence[HybridCandidate],
        candidates: Sequence[Any],
        limit: int,
    ) -> list[HybridCandidate]:
        by_id = {HybridRecommendationEngine._item_id(movie): movie for movie in candidates}
        selected: list[HybridCandidate] = []
        genres_seen: set[str] = set()
        remaining = list(ranked)
        while remaining and len(selected) < limit:
            best = max(
                remaining,
                key=lambda candidate: (
                    candidate.score
                    + 0.08 * len(set(getattr(by_id[candidate.item_id], "genres", None) or []) - genres_seen),
                    -candidate.item_id,
                ),
            )
            remaining.remove(best)
            selected.append(best)
            genres_seen.update(getattr(by_id[best.item_id], "genres", None) or [])
        return selected
