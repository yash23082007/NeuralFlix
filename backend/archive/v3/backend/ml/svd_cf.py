import os
import pickle
import logging
import pandas as pd
from typing import List, Dict, Tuple, Optional
from surprise import SVD, Dataset, Reader
from surprise.model_selection import train_test_split

logger = logging.getLogger("SVD_ENGINE")

SVD_MODEL_PATH = os.getenv("SVD_MODEL_PATH", "models/svd_model.pkl")

class SVDCollaborativeEngine:
    def __init__(self):
        self.model = None
        self._loaded = False

    def train(self, ratings_df: pd.DataFrame):
        """
        Train SVD model on user ratings.
        Expected columns: ['userId', 'movieId', 'rating']
        """
        logger.info(f"Training SVD model on {len(ratings_df)} ratings")
        
        reader = Reader(rating_scale=(1, 5))
        data = Dataset.load_from_df(ratings_df[['userId', 'movieId', 'rating']], reader)
        trainset = data.build_full_trainset()
        
        self.model = SVD(
            n_factors=150,
            n_epochs=30,
            lr_all=0.005,
            reg_all=0.02,
            biased=True,
            random_state=42
        )
        
        self.model.fit(trainset)
        
        # Save model
        os.makedirs("models", exist_ok=True)
        with open(SVD_MODEL_PATH, "wb") as f:
            pickle.dump(self.model, f)
            
        self._loaded = True
        logger.info("SVD model trained and saved")

    def load(self):
        """Load the pre-trained SVD model."""
        if self._loaded:
            return
        try:
            if os.path.exists(SVD_MODEL_PATH):
                with open(SVD_MODEL_PATH, "rb") as f:
                    self.model = pickle.load(f)
                self._loaded = True
            else:
                logger.warning("SVD model file not found")
        except Exception as e:
            logger.error(f"Error loading SVD model: {e}")

    def predict_for_user(self, user_id: str, movie_ids: List[int]) -> List[Tuple[int, float]]:
        """Predict ratings for a list of movies for a specific user."""
        self.load()
        if not self._loaded or not self.model:
            return []
            
        predictions = []
        for movie_id in movie_ids:
            pred = self.model.predict(str(user_id), str(movie_id))
            predictions.append((movie_id, pred.est))
            
        # Sort by predicted rating
        return sorted(predictions, key=lambda x: x[1], reverse=True)

svd_engine = SVDCollaborativeEngine()
