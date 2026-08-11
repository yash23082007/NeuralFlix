import os
import sys
import time
import logging
import argparse

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("TRAIN_SASREC")

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import numpy as np
from collections import defaultdict


class SASRecDataset(Dataset):
    def __init__(self, sequences, num_items, max_seq_len=50):
        self.num_items = num_items
        self.max_seq_len = max_seq_len
        self.samples = []
        for seq in sequences.values():
            if len(seq) < 2:
                continue
            for i in range(1, len(seq)):
                inp = seq[:i]
                lbl = seq[i]
                if len(inp) > max_seq_len:
                    inp = inp[-max_seq_len:]
                padded = [0] * (max_seq_len - len(inp)) + inp
                self.samples.append((padded, lbl))

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        seq, label = self.samples[idx]
        return torch.tensor(seq, dtype=torch.long), torch.tensor(label, dtype=torch.long)


def train_sasrec(
    num_items: int,
    sequences: dict,
    val_sequences: dict = None,
    max_seq_len: int = 50,
    d_model: int = 128,
    num_heads: int = 4,
    num_layers: int = 2,
    epochs: int = 20,
    batch_size: int = 256,
    lr: float = 0.001,
    device: str = "cpu",
    model_path: str = None,
):
    from ml.sasrec_model import SASRec

    device = torch.device(device)
    model = SASRec(num_items, max_seq_len, d_model, num_heads, num_layers).to(device)
    optimizer = optim.Adam(model.parameters(), lr=lr)
    criterion = nn.CrossEntropyLoss(ignore_index=0)

    train_dataset = SASRecDataset(sequences, num_items, max_seq_len)
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)

    val_loader = None
    if val_sequences:
        val_dataset = SASRecDataset(val_sequences, num_items, max_seq_len)
        val_loader = DataLoader(val_dataset, batch_size=batch_size)

    logger.info(f"Train samples: {len(train_dataset)}")
    best_loss = float("inf")

    for epoch in range(epochs):
        model.train()
        total_loss = 0.0
        start = time.time()

        for batch_seqs, batch_labels in train_loader:
            batch_seqs, batch_labels = batch_seqs.to(device), batch_labels.to(device)
            optimizer.zero_grad()
            logits = model(batch_seqs)
            loss = criterion(logits, batch_labels)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            total_loss += loss.item()

        avg_loss = total_loss / len(train_loader)

        val_loss = None
        if val_loader:
            model.eval()
            v_loss = 0.0
            with torch.no_grad():
                for batch_seqs, batch_labels in val_loader:
                    batch_seqs, batch_labels = batch_seqs.to(device), batch_labels.to(device)
                    logits = model(batch_seqs)
                    v_loss += criterion(logits, batch_labels).item()
            val_loss = v_loss / len(val_loader)

        elapsed = time.time() - start
        log_msg = f"Epoch {epoch+1:2d}/{epochs} | train_loss: {avg_loss:.4f}"
        if val_loss is not None:
            log_msg += f" | val_loss: {val_loss:.4f}"
        log_msg += f" | {elapsed:.1f}s"
        logger.info(log_msg)

        if val_loss is not None and val_loss < best_loss:
            best_loss = val_loss
            if model_path:
                torch.save(model.state_dict(), model_path)
                logger.info(f"Model saved to {model_path}")

    if model_path and not os.path.exists(model_path):
        torch.save(model.state_dict(), model_path)

    return model


def main():
    parser = argparse.ArgumentParser(description="Train SASRec model on MovieLens")
    parser.add_argument("--data-dir", default="data/movielens/ml-25m")
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--batch-size", type=int, default=256)
    parser.add_argument("--lr", type=float, default=0.001)
    parser.add_argument("--d-model", type=int, default=128)
    parser.add_argument("--num-heads", type=int, default=4)
    parser.add_argument("--num-layers", type=int, default=2)
    parser.add_argument("--max-seq-len", type=int, default=50)
    parser.add_argument("--device", default="cuda" if torch.cuda.is_available() else "cpu")
    parser.add_argument("--model-path", default="ml/weights/sasrec_v1.pt")
    parser.add_argument("--download", action="store_true")
    args = parser.parse_args()

    if args.download or not os.path.exists(args.data_dir):
        from data.dataset_loader import download_movielens
        args.data_dir = download_movielens("ml-25m", os.path.dirname(args.data_dir))

    from data.dataset_loader import load_ratings, load_movies, build_user_item_matrix, build_sequences

    logger.info("Loading MovieLens data...")
    ratings = load_ratings(args.data_dir)
    movies = load_movies(args.data_dir)

    user_map, item_map, interactions = build_user_item_matrix(ratings)
    sequences = build_sequences(ratings, user_map, item_map, args.max_seq_len)

    user_ids = list(sequences.keys())
    split = int(len(user_ids) * 0.9)
    train_users = set(user_ids[:split])
    val_users = set(user_ids[split:])

    train_seqs = {u: s for u, s in sequences.items() if u in train_users}
    val_seqs = {u: s for u, s in sequences.items() if u in val_users}

    os.makedirs(os.path.dirname(args.model_path) or ".", exist_ok=True)

    logger.info(f"Items: {len(item_map)}, Train users: {len(train_seqs)}, Val users: {len(val_seqs)}")

    train_sasrec(
        num_items=len(item_map),
        sequences=train_seqs,
        val_sequences=val_seqs,
        max_seq_len=args.max_seq_len,
        d_model=args.d_model,
        num_heads=args.num_heads,
        num_layers=args.num_layers,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        device=args.device,
        model_path=args.model_path,
    )


if __name__ == "__main__":
    main()
