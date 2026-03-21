import torch
import torch.nn as nn
import torch.optim as optim

class UserTower(nn.Module):
    """
    Tower A: Learns dense representations of user preferences.
    Input: User ID + User Interaction history features.
    """
    def __init__(self, num_users, embedding_dim=64):
        super(UserTower, self).__init__()
        self.user_embedding = nn.Embedding(num_users, embedding_dim)
        self.fc_layers = nn.Sequential(
            nn.Linear(embedding_dim, 128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, embedding_dim)
        )

    def forward(self, user_ids):
        embedded = self.user_embedding(user_ids)
        return self.fc_layers(embedded)

class MovieTower(nn.Module):
    """
    Tower B: Learns dense representations of movie content/metadata.
    Input: Movie ID + Pre-computed Semantic Vector (from sentence-transformers).
    """
    def __init__(self, num_movies, semantic_dim=384, embedding_dim=64):
        super(MovieTower, self).__init__()
        self.movie_embedding = nn.Embedding(num_movies, embedding_dim)
        # We project the 384-dim semantic vector into the same latent space as the user
        self.semantic_projection = nn.Linear(semantic_dim, embedding_dim)
        
        self.fc_layers = nn.Sequential(
            nn.Linear(embedding_dim * 2, 128),
            nn.ReLU(),
            nn.Linear(128, embedding_dim)
        )

    def forward(self, movie_ids, semantic_vectors):
        embedded_id = self.movie_embedding(movie_id_tensor)
        projected_semantic = self.semantic_projection(semantic_vectors)
        combined = torch.cat([embedded_id, projected_semantic], dim=-1)
        return self.fc_layers(combined)

class TwoTowerNCF(nn.Module):
    """
    Neural Collaborative Filtering (NCF) with Two-Tower Architecture.
    Predicts the probability of a user liking a movie via dot product of towers.
    """
    def __init__(self, user_tower, movie_tower):
        super(TwoTowerNCF, self).__init__()
        self.user_tower = user_tower
        self.movie_tower = movie_tower

    def forward(self, user_ids, movie_ids, semantic_vectors):
        user_vec = self.user_tower(user_ids)
        movie_vec = self.movie_tower(movie_ids, semantic_vectors)
        # Dot product similarity (score)
        score = torch.sum(user_vec * movie_vec, dim=-1)
        return torch.sigmoid(score)

# 🚀 COBALT EXPORT (Colab Snippet)
# This code is designed to be run on a T4 GPU and exported as .pt
def train_and_export():
    """
    Snippet for the user to paste into Google Colab.
    Trains on MovieLens 25M and exports weights.
    """
    # ... Training loop logic would go here ...
    # model = TwoTowerNCF(...)
    # torch.save(model.state_dict(), 'neuralflix_ncf_weights.pt')
    pass
