import os
import numpy as np
import lightgbm as lgb

def train_and_save_ranker():
    print("Training MovieRanker LightGBM model...")
    # Features: [genre_match, decade_match, popularity, rating, vote_count_norm, rating_diff_norm]
    # Generate mock training dataset with 6 features
    X_train = np.random.rand(1000, 6)
    y_train = np.random.rand(1000)
    
    train_data = lgb.Dataset(X_train, label=y_train)
    params = {
        'objective': 'regression',
        'metric': 'rmse',
        'learning_rate': 0.05,
        'verbose': -1
    }
    
    model = lgb.train(params, train_data, num_boost_round=100)
    
    os.makedirs("models", exist_ok=True)
    model.save_model("models/ranker_model.txt")
    print("Successfully saved ranker model to models/ranker_model.txt")

if __name__ == "__main__":
    train_and_save_ranker()
