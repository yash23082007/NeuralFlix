import torch
import torch.nn as nn
import numpy as np
from typing import List, Tuple, Optional


class LightGCNLayer(nn.Module):
    def __init__(self):
        super().__init__()

    def forward(self, x: torch.Tensor, edge_index: torch.Tensor) -> torch.Tensor:
        row, col = edge_index
        deg = torch.zeros(x.size(0), device=x.device)
        deg.scatter_add_(0, row, torch.ones_like(row, dtype=torch.float))
        deg_inv_sqrt = deg.pow(-0.5)
        deg_inv_sqrt[deg_inv_sqrt == float("inf")] = 0
        norm = deg_inv_sqrt[row] * deg_inv_sqrt[col]
        adj = torch.sparse_coo_tensor(edge_index, norm, (x.size(0), x.size(0)))
        return torch.sparse.mm(adj, x)


class LightGCN(nn.Module):
    def __init__(self, num_nodes: int, embedding_dim: int = 64, num_layers: int = 3):
        super().__init__()
        self.num_nodes = num_nodes
        self.embedding = nn.Embedding(num_nodes, embedding_dim)
        self.layers = nn.ModuleList([LightGCNLayer() for _ in range(num_layers)])
        nn.init.normal_(self.embedding.weight, std=0.1)

    def forward(self, edge_index: torch.Tensor) -> torch.Tensor:
        x = self.embedding.weight
        final = x / (len(self.layers) + 1)
        for layer in self.layers:
            x = layer(x, edge_index)
            final = final + x / (len(self.layers) + 1)
        return final

    def get_embedding(self, edge_index: torch.Tensor) -> torch.Tensor:
        return self.forward(edge_index)


class GNNRecommender:
    def __init__(self, num_users: int, num_items: int, embedding_dim: int = 64, num_layers: int = 3):
        self.num_users = num_users
        self.num_items = num_items
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = LightGCN(num_users + num_items, embedding_dim, num_layers).to(self.device)
        self.model.eval()

    @torch.no_grad()
    def get_recommendations(self, user_id: int, edge_index: Optional[torch.Tensor] = None, top_k: int = 20) -> List[int]:
        if edge_index is None:
            return []
        edge_index = edge_index.to(self.device)
        embeddings = self.model.get_embedding(edge_index)
        user_emb = embeddings[user_id].unsqueeze(0)
        item_embs = embeddings[self.num_users:]
        scores = torch.matmul(user_emb, item_embs.T).squeeze()
        top_items = scores.topk(min(top_k, len(scores))).indices.tolist()
        return top_items

    @torch.no_grad()
    def predict_score(self, user_id: int, item_id: int, edge_index: torch.Tensor) -> float:
        edge_index = edge_index.to(self.device)
        embeddings = self.model.get_embedding(edge_index)
        user_emb = embeddings[user_id]
        item_emb = embeddings[self.num_users + item_id]
        return float(torch.dot(user_emb, item_emb).cpu())

    def build_edge_index(self, interactions: List[Tuple[int, int]]) -> torch.Tensor:
        rows, cols = [], []
        for u, i in interactions:
            rows.append(u)
            cols.append(self.num_users + i)
            rows.append(self.num_users + i)
            cols.append(u)
        return torch.tensor([rows, cols], dtype=torch.long)
