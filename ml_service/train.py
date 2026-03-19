import mlflow
import mlflow.sklearn
from sklearn.feature_extraction.text import TfidfVectorizer
import pandas as pd
import datetime
import os

# PHASE 3: Build Training + Data Pipeline
# This file is meant to be run via a cron job or GitHub Actions CI/CD to routinely retrain the recommender core

def train_pipeline():
    # 1. Setup MLflow Local Versioning
    mlflow.set_tracking_uri("sqlite:///mlruns.db")
    mlflow.set_experiment("neuralflix_tfidf_model")
    
    with mlflow.start_run():
        print(f"🚀 [{datetime.datetime.now()}] Starting Scheduled Training Pipeline...")
        
        # 2. Extract Data (Simulated Fetch from Supabase/Postgres Data Warehouse here)
        # In real scenario, pulling `df = pd.read_sql('SELECT overview, tagline FROM movies', db_url)`
        df = pd.DataFrame({
            "id": ["1", "2", "3"],
            "title": ["Inception", "Interstellar", "Shrek"],
            "combined_features": [
                "Action Sci-Fi Dream inside a dream thief", 
                "Adventure Sci-Fi Space travel time dilation saving humanity",
                "Comedy Animation ogre donkey swamp fairytale"
            ]
        })
        
        # 3. Transform & Train
        print("Training Core Components...")
        tfidf = TfidfVectorizer(stop_words='english', max_features=5000)
        tfidf_matrix = tfidf.fit_transform(df['combined_features'])
        
        # 4. Log Metrics and Version Models (FREE MLFLOW)
        vocab_size = len(tfidf.vocabulary_)
        mlflow.log_param("vocab_size", vocab_size)
        mlflow.log_metric("dataset_rows", len(df))
        
        # Save model locally 
        mlflow.sklearn.log_model(tfidf, "tfidf_vectorizer_model")
        print(f"✅ Model successfully trained! Vocabulary mapped: {vocab_size} words.")
        print("🏷️ Model versioning synced with MLflow Tracking.")

if __name__ == "__main__":
    train_pipeline()