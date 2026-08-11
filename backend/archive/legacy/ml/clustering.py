import os
import pickle
import numpy as np
import pandas as pd
import logging
from typing import List, Dict, Optional
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger("CLUSTERING_ENGINE")

KMEANS_MODEL_PATH = os.getenv("KMEANS_MODEL_PATH", "models/kmeans_model.pkl")
SCALER_PATH = os.getenv("SCALER_PATH", "models/user_scaler.pkl")

class UserClusteringEngine:
    def __init__(self, n_clusters: int = 10):
        self.n_clusters = n_clusters
        self.kmeans = None
        self.scaler = None
        self._loaded = False

    def train(self, user_features_df: pd.DataFrame):
        """
        Train KMeans on user feature vectors.
        Expected features: [avg_rating, watch_pace, genre_1_pref, genre_2_pref, ...]
        """
        logger.info(f"Training KMeans with {self.n_clusters} clusters on {len(user_features_df)} users")
        
        self.scaler = StandardScaler()
        scaled_features = self.scaler.fit_transform(user_features_df)
        
        self.kmeans = KMeans(n_clusters=self.n_clusters, random_state=42, n_init=10)
        self.kmeans.fit(scaled_features)
        
        # Save models
        os.makedirs("models", exist_ok=True)
        with open(KMEANS_MODEL_PATH, "wb") as f:
            pickle.dump(self.kmeans, f)
        with open(SCALER_PATH, "wb") as f:
            pickle.dump(self.scaler, f)
            
        self._loaded = True
        logger.info("Clustering models saved")

    def load(self):
        if self._loaded:
            return
        try:
            if os.path.exists(KMEANS_MODEL_PATH):
                with open(KMEANS_MODEL_PATH, "rb") as f:
                    self.kmeans = pickle.load(f)
                with open(SCALER_PATH, "rb") as f:
                    self.scaler = pickle.load(f)
                self._loaded = True
        except Exception as e:
            logger.error(f"Error loading clustering models: {e}")

    def predict_cluster(self, user_features: List[float]) -> int:
        self.load()
        if not self._loaded:
            return 0
        
        scaled = self.scaler.transform([user_features])
        return int(self.kmeans.predict(scaled)[0])

    def get_cluster_centroids(self):
        self.load()
        if not self._loaded:
            return None
        return self.kmeans.cluster_centers_

clustering_engine = UserClusteringEngine()
