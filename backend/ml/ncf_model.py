import torch
import torch.nn as nn
from typing import List, Tuple, Optional


class UserTower(nn.Module):
    def __init__(self, num_users: int, embedding_dim: int = 64):
        super().__init__()
        self.embedding = nn.Embedding(num_users, embedding_dim)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.embedding(x)


class MovieTower(nn.Module):
    def __init__(self, num_movies: int, semantic_dim: int = 384, embedding_dim: int = 64):
        super().__init__()
        self.embedding = nn.Embedding(num_movies, embedding_dim)
        self.semantic_proj = nn.Linear(semantic_dim, embedding_dim)

    def forward(self, x: torch.Tensor, semantic: torch.Tensor) -> torch.Tensor:
        return self.embedding(x) + self.semantic_proj(semantic)


class TwoTowerNCF(nn.Module):
    def __init__(self, user_tower: UserTower, movie_tower: MovieTower):
        super().__init__()
        self.user_tower = user_tower
        self.movie_tower = movie_tower
        self.predict = nn.Linear(128, 1)

    def forward(self, user_ids: torch.Tensor, movie_ids: torch.Tensor, semantic_vectors: torch.Tensor) -> torch.Tensor:
        u = self.user_tower(user_ids)
        m = self.movie_tower(movie_ids, semantic_vectors)
        return torch.sigmoid(self.predict(torch.cat([u, m], dim=-1))).squeeze()


class NCFModel(nn.Module):
    """
    Neural Collaborative Filtering.
    Learns latent user/item embeddings via neural networks based on 2017 NeurIPS paper.
    """
    def __init__(self, num_users: int, num_items: int, embedding_dim: int = 64, layers: List[int] = [128, 64, 32]):
        super().__init__()
        
        # GMF branch (Generalized Matrix Factorization - dot product)
        self.user_gmf_emb = nn.Embedding(num_users, embedding_dim)
        self.item_gmf_emb = nn.Embedding(num_items, embedding_dim)
        
        # MLP branch (Multi-Layer Perceptron)
        self.user_mlp_emb = nn.Embedding(num_users, embedding_dim)
        self.item_mlp_emb = nn.Embedding(num_items, embedding_dim)
        
        mlp_layers = []
        input_size = embedding_dim * 2
        for layer_size in layers:
            mlp_layers.extend([
                nn.Linear(input_size, layer_size), 
                nn.ReLU(), 
                nn.Dropout(0.2)
            ])
            input_size = layer_size
            
        self.mlp = nn.Sequential(*mlp_layers)
        
        # Final prediction layer combining GMF and MLP outputs
        self.predict = nn.Linear(embedding_dim + layers[-1], 1)
        self.sigmoid = nn.Sigmoid()

    def forward(self, user_ids: torch.Tensor, item_ids: torch.Tensor) -> torch.Tensor:
        # GMF path
        user_gmf = self.user_gmf_emb(user_ids)
        item_gmf = self.item_gmf_emb(item_ids)
        gmf_out = user_gmf * item_gmf
        
        # MLP path
        user_mlp = self.user_mlp_emb(user_ids)
        item_mlp = self.item_mlp_emb(item_ids)
        mlp_in = torch.cat([user_mlp, item_mlp], dim=-1)
        mlp_out = self.mlp(mlp_in)
        
        # Combine
        combined = torch.cat([gmf_out, mlp_out], dim=-1)
        logits = self.predict(combined)
        return self.sigmoid(logits).squeeze()
    
    def predict_for_user(self, user_id: int, item_candidates: List[int]) -> List[Tuple[int, float]]:
        self.eval()
        with torch.no_grad():
            u_tensor = torch.tensor([user_id] * len(item_candidates))
            i_tensor = torch.tensor(item_candidates)
            scores = self.forward(u_tensor, i_tensor).numpy()
            
        scored = list(zip(item_candidates, scores))
        return sorted(scored, key=lambda x: x[1], reverse=True)
