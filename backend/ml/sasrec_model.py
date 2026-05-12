import torch
import torch.nn as nn
from typing import List, Tuple

class SASRec(nn.Module):
    """
    Self-Attentive Sequential Recommendation (SASRec)
    Captures viewing order patterns to predict 'what to watch next'
    """
    def __init__(self, num_items: int, max_seq_len: int = 50, d_model: int = 128, num_heads: int = 4, num_layers: int = 2):
        super().__init__()
        self.max_seq_len = max_seq_len
        self.item_emb = nn.Embedding(num_items + 1, d_model, padding_idx=0)
        self.pos_emb = nn.Embedding(max_seq_len, d_model)
        
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model, 
            nhead=num_heads, 
            dim_feedforward=256, 
            dropout=0.1, 
            batch_first=True
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        self.output = nn.Linear(d_model, num_items + 1)

    def forward(self, item_seq: torch.Tensor) -> torch.Tensor:
        seq_len = item_seq.size(1)
        positions = torch.arange(seq_len, device=item_seq.device).unsqueeze(0)
        
        x = self.item_emb(item_seq) + self.pos_emb(positions)
        
        # Mask padding tokens
        mask = (item_seq == 0)
        
        # Apply transformer
        x = self.transformer(x, src_key_padding_mask=mask)
        
        # Last position == next item prediction
        return self.output(x[:, -1, :])
        
    def predict_next(self, watch_history: List[int], item_candidates: List[int]) -> List[Tuple[int, float]]:
        self.eval()
        with torch.no_grad():
            # Truncate or pad history
            recent_hist = watch_history[-self.max_seq_len:]
            if len(recent_hist) < self.max_seq_len:
                padded = [0] * (self.max_seq_len - len(recent_hist)) + recent_hist
            else:
                padded = recent_hist
                
            seq_tensor = torch.tensor([padded])
            logits = self.forward(seq_tensor).squeeze()
            scores = torch.softmax(logits, dim=0)
            
            scored_candidates = []
            for item in item_candidates:
                score = scores[item].item() if item < scores.size(0) else 0.0
                scored_candidates.append((item, score))
                
        return sorted(scored_candidates, key=lambda x: x[1], reverse=True)
