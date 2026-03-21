import torch
import os
from ml.ncf_model import TwoTowerNCF, UserTower, MovieTower
from dotenv import load_dotenv

load_dotenv()

# Configuration for Phase 10 Neural Handover
MODEL_WEIGHTS_PATH = os.getenv("NCF_MODEL_PATH", "backend/ml/weights/neuralflix_ncf_v1.pt")
EMBEDDING_DIM = 64
SEMANTIC_DIM = 384

class NCFInferenceEngine:
    """
    The Brain of NeuralFlix: Loads the Two-Tower NCF model 
    and ranks candidates in real-time.
    """
    def __init__(self, num_users=100000, num_movies=100000):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # Initialize Towers
        user_tower = UserTower(num_users, EMBEDDING_DIM)
        movie_tower = MovieTower(num_movies, SEMANTIC_DIM, EMBEDDING_DIM)
        
        self.model = TwoTowerNCF(user_tower, movie_tower).to(self.device)
        
        if os.path.exists(MODEL_WEIGHTS_PATH):
            print(f"🧠 Loading Neural Weights from {MODEL_WEIGHTS_PATH}...")
            self.model.load_state_dict(torch.load(MODEL_WEIGHTS_PATH, map_location=self.device))
        else:
            print("⚠️ Weights not found. Using cold-start initialization.")
        
        self.model.eval()

    @torch.no_grad()
    def rank_candidates(self, user_id, candidate_ids, semantic_vectors):
        """
        Takes a list of candidate movie IDs and their semantic vectors, 
        and returns them ranked by the NCF model.
        """
        user_tensor = torch.tensor([user_id] * len(candidate_ids)).to(self.device)
        movie_tensor = torch.tensor(candidate_ids).to(self.device)
        semantic_tensor = torch.tensor(semantic_vectors).to(self.device)

        # Forward pass through the neural network
        scores = self.model(user_tensor, movie_tensor, semantic_tensor)
        
        # Zip scores with IDs and rank
        results = list(zip(candidate_ids, scores.tolist()))
        results.sort(key=lambda x: x[1], reverse=True)
        
        return results

# Singleton inference instance
neural_brain = NCFInferenceEngine()
