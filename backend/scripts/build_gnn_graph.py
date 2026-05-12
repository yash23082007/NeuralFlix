import os
import sys
import logging
import argparse

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("BUILD_GNN_GRAPH")

import torch
import pickle
import numpy as np


def build_graph(
    ratings,
    user_map: dict,
    item_map: dict,
    edge_index_path: str = "ml/weights/gnn_edge_index.pt",
    mapping_path: str = "ml/weights/gnn_mappings.pkl",
):
    from ml.gnn_model import GNNRecommender

    rows, cols = [], []
    num_users = len(user_map)
    num_items = len(item_map)

    for u_idx, i_idx, rating in ratings:
        if rating >= 4.0:
            rows.append(u_idx)
            cols.append(num_users + i_idx)
            rows.append(num_users + i_idx)
            cols.append(u_idx)

    edge_index = torch.tensor([rows, cols], dtype=torch.long)
    os.makedirs(os.path.dirname(edge_index_path) or ".", exist_ok=True)
    torch.save(edge_index, edge_index_path)

    mappings = {"user_map": user_map, "item_map": item_map, "num_users": num_users, "num_items": num_items}
    with open(mapping_path, "wb") as f:
        pickle.dump(mappings, f)

    logger.info(f"Graph built: {len(rows)//2} edges, {num_users} users, {num_items} items")
    logger.info(f"Edge index saved to {edge_index_path}")
    logger.info(f"Mappings saved to {mapping_path}")

    recommender = GNNRecommender(num_users, num_items)
    torch.save(recommender.model.state_dict(), "ml/weights/gnn_v1.pt")
    logger.info("GNN model initialized and saved")

    return edge_index


def main():
    parser = argparse.ArgumentParser(description="Build user-movie graph from MovieLens")
    parser.add_argument("--data-dir", default="data/movielens/ml-25m")
    parser.add_argument("--edge-index-path", default="ml/weights/gnn_edge_index.pt")
    parser.add_argument("--mapping-path", default="ml/weights/gnn_mappings.pkl")
    parser.add_argument("--download", action="store_true")
    args = parser.parse_args()

    if args.download or not os.path.exists(args.data_dir):
        from data.dataset_loader import download_movielens
        args.data_dir = download_movielens("ml-25m", os.path.dirname(args.data_dir))

    from data.dataset_loader import load_ratings, load_movies, build_user_item_matrix

    logger.info("Loading MovieLens data...")
    ratings = load_ratings(args.data_dir)
    movies = load_movies(args.data_dir)

    user_map, item_map, interactions = build_user_item_matrix(ratings)
    build_graph(interactions, user_map, item_map, args.edge_index_path, args.mapping_path)


if __name__ == "__main__":
    main()
