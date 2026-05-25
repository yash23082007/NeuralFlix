import random
import math
from typing import Dict, List, Optional, Tuple
from collections import defaultdict


class ThompsonSamplingBandit:
    def __init__(self, epsilon: float = 0.15, alpha: float = 1.0, beta: float = 1.0):
        self.epsilon = epsilon
        self.alpha = alpha
        self.beta = beta
        self.successes: Dict[str, float] = defaultdict(float)
        self.trials: Dict[str, float] = defaultdict(float)

    def decide(self, user_id: str) -> str:
        if random.random() < self.epsilon:
            return "explore"
        return "exploit"

    def recommend_with_exploration(
        self,
        exploit_candidates: List[dict],
        explore_candidates: List[dict],
        top_k: int = 20,
    ) -> List[dict]:
        decision = self.decide(user_id="user")
        if decision == "explore" and explore_candidates:
            n_explore = max(1, int(top_k * self.epsilon))
            explore_picks = random.sample(
                explore_candidates, min(n_explore, len(explore_candidates))
            )
            exploit_picks = exploit_candidates[: top_k - n_explore]
            combined = explore_picks + exploit_picks
            random.shuffle(combined)
            return combined[:top_k]
        return exploit_candidates[:top_k]

    def update(self, item_id: str, reward: float):
        self.trials[item_id] += 1.0
        if reward > 0:
            self.successes[item_id] += reward

    def score_with_ucb(self, candidates: List[dict], total_trials: int) -> List[dict]:
        for c in candidates:
            cid = str(c.get("tmdb_id", c.get("id", "")))
            n = self.trials.get(cid, 0)
            s = self.successes.get(cid, 0)
            if n > 0:
                exploitation = s / n
                exploration = math.sqrt(2 * math.log(total_trials + 1) / (n + 1))
                c["_bandit_score"] = exploitation + exploration
            else:
                c["_bandit_score"] = 0.5
        return sorted(candidates, key=lambda x: x.get("_bandit_score", 0), reverse=True)


class EpsilonGreedyBandit:
    def __init__(self, epsilon: float = 0.1):
        self.epsilon = epsilon
        self.counts: Dict[str, int] = defaultdict(int)

    def recommend(self, candidates: List[dict]) -> List[dict]:
        if random.random() < self.epsilon:
            random.shuffle(candidates)
            return candidates
        return candidates

    def record_interaction(self, item_id: str):
        self.counts[item_id] += 1
