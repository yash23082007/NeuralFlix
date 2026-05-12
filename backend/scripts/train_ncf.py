import os
import sys
import time
import logging
import argparse

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("TRAIN_NCF")

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import numpy as np


class NCFDataset(Dataset):
    def __init__(self, samples):
        self.users = torch.tensor([s[0] for s in samples], dtype=torch.long)
        self.items = torch.tensor([s[1] for s in samples], dtype=torch.long)
        self.labels = torch.tensor([s[2] for s in samples], dtype=torch.float32)

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, idx):
        return self.users[idx], self.items[idx], self.labels[idx]


def train_ncf(
    num_users: int,
    num_items: int,
    train_samples,
    val_samples=None,
    embedding_dim: int = 64,
    layers: list = None,
    epochs: int = 30,
    batch_size: int = 1024,
    lr: float = 0.001,
    device: str = "cpu",
    model_path: str = None,
):
    if layers is None:
        layers = [128, 64, 32]

    from ml.ncf_model import NCFModel

    device = torch.device(device)
    model = NCFModel(num_users, num_items, embedding_dim, layers).to(device)
    optimizer = optim.Adam(model.parameters(), lr=lr)
    criterion = nn.BCELoss()

    train_loader = DataLoader(NCFDataset(train_samples), batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(NCFDataset(val_samples), batch_size=batch_size) if val_samples else None

    best_loss = float("inf")
    patience = 5
    patience_counter = 0

    for epoch in range(epochs):
        model.train()
        total_loss = 0.0
        start = time.time()

        for users, items, labels in train_loader:
            users, items, labels = users.to(device), items.to(device), labels.to(device)
            optimizer.zero_grad()
            preds = model(users, items)
            loss = criterion(preds, labels)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()

        avg_loss = total_loss / len(train_loader)

        val_loss = None
        if val_loader:
            model.eval()
            v_loss = 0.0
            with torch.no_grad():
                for users, items, labels in val_loader:
                    users, items, labels = users.to(device), items.to(device), labels.to(device)
                    preds = model(users, items)
                    v_loss += criterion(preds, labels).item()
            val_loss = v_loss / len(val_loader)

        elapsed = time.time() - start
        log_msg = f"Epoch {epoch+1:2d}/{epochs} | train_loss: {avg_loss:.4f}"
        if val_loss is not None:
            log_msg += f" | val_loss: {val_loss:.4f}"
        log_msg += f" | {elapsed:.1f}s"
        logger.info(log_msg)

        if val_loss is not None:
            if val_loss < best_loss:
                best_loss = val_loss
                patience_counter = 0
                if model_path:
                    torch.save(model.state_dict(), model_path)
                    logger.info(f"Model saved to {model_path}")
            else:
                patience_counter += 1
                if patience_counter >= patience:
                    logger.info(f"Early stopping at epoch {epoch+1}")
                    break

    if model_path and not os.path.exists(model_path):
        torch.save(model.state_dict(), model_path)
        logger.info(f"Final model saved to {model_path}")

    return model


def main():
    parser = argparse.ArgumentParser(description="Train NCF model on MovieLens")
    parser.add_argument("--data-dir", default="data/movielens/ml-25m")
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--batch-size", type=int, default=1024)
    parser.add_argument("--lr", type=float, default=0.001)
    parser.add_argument("--embed-dim", type=int, default=64)
    parser.add_argument("--device", default="cuda" if torch.cuda.is_available() else "cpu")
    parser.add_argument("--model-path", default="ml/weights/ncf_v1.pt")
    parser.add_argument("--download", action="store_true", help="Download MovieLens if missing")
    args = parser.parse_args()

    if args.download or not os.path.exists(args.data_dir):
        from data.dataset_loader import download_movielens
        args.data_dir = download_movielens("ml-25m", os.path.dirname(args.data_dir))

    from data.dataset_loader import load_ratings, load_movies, build_user_item_matrix, negative_sampling

    logger.info("Loading MovieLens data...")
    ratings = load_ratings(args.data_dir)
    movies = load_movies(args.data_dir)

    user_map, item_map, interactions = build_user_item_matrix(ratings)
    samples = negative_sampling(interactions, len(item_map), neg_ratio=4)

    split = int(len(samples) * 0.9)
    train_samples = samples[:split]
    val_samples = samples[split:]

    os.makedirs(os.path.dirname(args.model_path) or ".", exist_ok=True)

    logger.info(f"Users: {len(user_map)}, Items: {len(item_map)}")
    logger.info(f"Train: {len(train_samples)}, Val: {len(val_samples)}")

    train_ncf(
        num_users=len(user_map),
        num_items=len(item_map),
        train_samples=train_samples,
        val_samples=val_samples,
        embedding_dim=args.embed_dim,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        device=args.device,
        model_path=args.model_path,
    )


if __name__ == "__main__":
    main()
