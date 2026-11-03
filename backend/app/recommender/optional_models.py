"""Optional learned components for offline training.

The serving path does not import these dependencies. Install
``backend/requirements-ml.txt`` to use the PyTorch, scikit-learn, and
Transformers adapters.
"""

from __future__ import annotations

from typing import Sequence


def build_ncf(num_users: int, num_items: int, embedding_dim: int = 32):
    """Create a Neural Collaborative Filtering scorer."""
    try:
        import torch
        from torch import nn
    except ImportError as exc:
        raise RuntimeError("Install requirements-ml.txt to use NCF training") from exc

    class NCF(nn.Module):
        def __init__(self) -> None:
            super().__init__()
            self.user = nn.Embedding(num_users, embedding_dim)
            self.item = nn.Embedding(num_items, embedding_dim)
            self.mlp = nn.Sequential(
                nn.Linear(embedding_dim * 2, embedding_dim),
                nn.ReLU(),
                nn.Linear(embedding_dim, 1),
            )

        def forward(self, user_ids, item_ids):
            return self.mlp(torch.cat((self.user(user_ids), self.item(item_ids)), dim=-1)).squeeze(-1)

    return NCF()


def build_sasrec(num_items: int, embedding_dim: int = 32, heads: int = 4, layers: int = 2):
    """Create a SASRec-style causal sequence encoder."""
    try:
        import torch
        from torch import nn
    except ImportError as exc:
        raise RuntimeError("Install requirements-ml.txt to use SASRec training") from exc

    class SASRec(nn.Module):
        def __init__(self) -> None:
            super().__init__()
            self.items = nn.Embedding(num_items, embedding_dim)
            block = nn.TransformerEncoderLayer(
                d_model=embedding_dim,
                nhead=heads,
                batch_first=True,
                norm_first=True,
            )
            self.encoder = nn.TransformerEncoder(block, num_layers=layers)
            self.output = nn.Linear(embedding_dim, num_items)

        def forward(self, sequences):
            encoded = self.encoder(self.items(sequences))
            return self.output(encoded[:, -1])

    return SASRec()


def build_lightgcn(num_users: int, num_items: int, embedding_dim: int = 32):
    """Create LightGCN embeddings; graph propagation is supplied by the trainer."""
    try:
        from torch import nn
    except ImportError as exc:
        raise RuntimeError("Install requirements-ml.txt to use LightGCN training") from exc

    class LightGCN(nn.Module):
        def __init__(self) -> None:
            super().__init__()
            self.user = nn.Embedding(num_users, embedding_dim)
            self.item = nn.Embedding(num_items, embedding_dim)

        def score(self, user_ids, item_ids):
            return (self.user(user_ids) * self.item(item_ids)).sum(dim=-1)

    return LightGCN()


def cluster_genres(vectors: Sequence[Sequence[float]], clusters: int = 8):
    """Fit a K-Means semantic clusterer when scikit-learn is installed."""
    try:
        from sklearn.cluster import KMeans
    except ImportError as exc:
        raise RuntimeError("Install requirements-ml.txt to use genre clustering") from exc
    model = KMeans(n_clusters=clusters, random_state=17, n_init=10)
    return model.fit(vectors)


def sentiment_pipeline(model_name: str = "distilbert-base-uncased-finetuned-sst-2-english"):
    """Return a HuggingFace sentiment pipeline on CPU."""
    try:
        from transformers import pipeline
    except ImportError as exc:
        raise RuntimeError("Install requirements-ml.txt to use sentiment inference") from exc
    return pipeline("sentiment-analysis", model=model_name, device=-1)


class ThompsonSamplingBandit:
    """Beta posterior bandit used to balance recommendation exploration."""

    def __init__(self, arms: Sequence[int]) -> None:
        self.successes = {arm: 1.0 for arm in arms}
        self.failures = {arm: 1.0 for arm in arms}

    def update(self, arm: int, reward: bool) -> None:
        if arm not in self.successes:
            self.successes[arm] = 1.0
            self.failures[arm] = 1.0
        if reward:
            self.successes[arm] += 1.0
        else:
            self.failures[arm] += 1.0

    def posterior_mean(self, arm: int) -> float:
        success = self.successes.get(arm, 1.0)
        failure = self.failures.get(arm, 1.0)
        return success / (success + failure)
