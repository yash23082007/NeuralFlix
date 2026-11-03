from dataclasses import dataclass

from app.recommender.hybrid import HybridRecommendationEngine


@dataclass
class MovieStub:
    id: int
    genres: list[str]
    keywords: list[str]
    tmdb_rating: float = 8.0
    popularity_score: float = 50.0


def test_hybrid_engine_returns_explanations_and_diverse_results():
    history = [MovieStub(1, ["Drama"], ["character"])]
    candidates = [
        MovieStub(2, ["Drama"], ["character"]),
        MovieStub(3, ["Comedy"], ["humor"]),
        MovieStub(4, ["Action"], ["hero"]),
    ]

    results = HybridRecommendationEngine().rank(
        user_id="user-1",
        candidates=candidates,
        history=history,
        limit=3,
    )

    assert [result.item_id for result in results] == [2, 3, 4]
    assert all(result.explanation.startswith("Recommended for") for result in results)
    assert all(set(result.components) == {
        "content",
        "collaborative",
        "sequential",
        "graph",
        "semantic",
        "bandit",
    } for result in results)


def test_hybrid_bandit_signal_is_process_stable():
    engine = HybridRecommendationEngine()
    first = engine._bandit("user-1", 42, {})
    second = engine._bandit("user-1", 42, {})
    assert first == second
