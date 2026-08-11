import torch
import torch.nn as nn
import torch.nn.functional as F
import os
import logging
from typing import List, Optional

logger = logging.getLogger("TRANSFORMER_ENGINE")

class SequentialTransformer(nn.Module):
    def __init__(self, vocab_size: int, embed_dim: int = 128, num_heads: int = 4, num_layers: int = 2):
        super().__init__()
        self.item_embedding = nn.Embedding(vocab_size + 1, embed_dim, padding_idx=0)
        self.pos_embedding = nn.Parameter(torch.zeros(1, 50, embed_dim)) # Max sequence length 50
        
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=embed_dim, 
            nhead=num_heads, 
            dim_feedforward=embed_dim*4,
            dropout=0.1,
            batch_first=True
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        self.fc = nn.Linear(embed_dim, vocab_size + 1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: [batch_size, seq_len]
        batch_size, seq_len = x.size()
        
        x = self.item_embedding(x) # [batch_size, seq_len, embed_dim]
        x = x + self.pos_embedding[:, :seq_len, :]
        
        # Mask for padding
        mask = (x == 0).all(dim=-1) # Simplification
        
        x = self.transformer(x) # [batch_size, seq_len, embed_dim]
        
        # Take the last item's output for prediction
        x = x[:, -1, :] # [batch_size, embed_dim]
        return self.fc(x)

class TransformerEngine:
    def __init__(self, vocab_size: int = 20000):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = SequentialTransformer(vocab_size).to(self.device)
        self._loaded = False

    def load(self, path: str = "models/transformer_next_movie.pt"):
        if os.path.exists(path):
            try:
                self.model.load_state_dict(torch.load(path, map_location=self.device))
                self.model.eval()
                self._loaded = True
                logger.info("Transformer model loaded")
            except Exception as e:
                logger.error(f"Error loading transformer: {e}")

    @torch.no_grad()
    def predict_next(self, movie_ids: List[int], top_k: int = 10) -> List[int]:
        if not self._loaded:
            return []
            
        # Convert to tensor and pad/truncate
        seq = movie_ids[-50:] # Last 50 items
        x = torch.tensor([seq], dtype=torch.long).to(self.device)
        
        logits = self.model(x)
        probs = F.softmax(logits, dim=-1)
        
        top_probs, top_indices = torch.topk(probs, top_k + len(seq))
        
        # Filter out items already in sequence
        results = []
        for idx in top_indices[0].tolist():
            if idx not in seq and idx != 0:
                results.append(idx)
            if len(results) >= top_k:
                break
                
        return results

transformer_engine = TransformerEngine()
