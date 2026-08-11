import mlflow
import mlflow.lightgbm
import lightgbm as lgb
import numpy as np
from sklearn.metrics import ndcg_score

def train_lightgbm(X_train: np.ndarray, y_train: np.ndarray):
    """
    Mock training script for candidate ranking.
    Features should represent: user_embeddings + candidate_features (genre matches, TMDB pop, OMDB ratings).
    Rows: [user_movie_interaction]. Targets: Watch % or explicit rating.
    """
    train_data = lgb.Dataset(X_train, label=y_train)
    
    params = {
        'objective': 'regression',
        'metric': 'ndcg',
        'n_estimators': 500, 
        'learning_rate': 0.05
    }
    
    model = lgb.train(params, train_data)
    return model

def evaluate_ndcg(model, X_test, y_test):
    """
    Normalized Discounted Cumulative Gain (nDCG@10)
    Quantifies how ideal our LightGBM sorting is compared to actual user watches.
    """
    if len(y_test) < 2: return 0.0
    preds = model.predict(X_test)
    # ndcg requires 2D arrays: [samples, targets]
    return ndcg_score([y_test], [preds], k=10)

if __name__ == "__main__":
    mlflow.set_tracking_uri("sqlite:///mlflow.db")
    
    print("Mocking training datasets...")
    X_train = np.random.rand(1000, 10)
    y_train = np.random.randint(1, 6, 1000)
    
    X_test = np.random.rand(200, 10)
    y_test = np.random.randint(1, 6, 200)

    print("Executing MLFlow Sync Run -> ranker_v2")
    with mlflow.start_run(run_name="ranker_v2"):
        mlflow.log_params({"n_estimators": 500, "learning_rate": 0.05})
        
        model = train_lightgbm(X_train, y_train)
        
        ndcg_val = evaluate_ndcg(model, X_test, y_test)
        mlflow.log_metric("ndcg@10", ndcg_val)
        
        # Save model weights contextually alongside metrics dashboard
        mlflow.lightgbm.log_model(model, "ranker")
        
        print(f"Logged Test nDCG@10 Baseline -> {ndcg_val:.4f}")