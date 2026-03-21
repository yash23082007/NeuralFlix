from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.ensemble import GradientBoostingRegressor
import faiss
from transformers import pipeline

import os
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend', '.env'))

app = FastAPI(title="NeuralFlix Advanced ML Service", version="2.0")

# --- PHASE 7 INITIALIZATION ---
print("Loading Semantic Search Engine. This might take a moment...")
# 1. Semantic Model
model = SentenceTransformer('all-MiniLM-L6-v2') 

# Connect to MongoDB to fetch real data
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = MongoClient(MONGO_URI)
db = client.get_database("neuralflix")
movies_collection = db.get_collection("movies")

print("Fetching movies from MongoDB for FAISS indexing...")
# Fetch at most 2000 movies to prevent excessive local CPU time during startup
raw_movies = list(movies_collection.find({"overview": {"$ne": "", "$exists": True}}, 
    {"_id": 1, "tmdb_id": 1, "title": 1, "overview": 1, "popularity_score": 1, "poster_url": 1, "rating": 1, "year": 1}).limit(3000))

if not raw_movies:
    print("WARNING: No movies found in DB. Falling back to dummy.")
    movies_db = [
        {"_id": "1", "title": "Interstellar", "overview": "Sci-fi epic about space travel and dying earth.", "popularity_score": 9.5},
        {"_id": "2", "title": "Inception", "overview": "A thief enters dreams to steal secrets.", "popularity_score": 8.8},
        {"_id": "3", "title": "The Notebook", "overview": "A passionate emotional romance story without spaceships.", "popularity_score": 7.5}
    ]
else:
    # Stringify _id since it's an ObjectId in mongo
    for m in raw_movies:
        m["_id"] = str(m["_id"])
    movies_db = raw_movies

print(f"Loaded {len(movies_db)} movies into ML memory. Computing vectors...")

# 2. FAISS Vector Database Setup
texts = [m.get("overview", "") for m in movies_db]
# Fill empty overviews
texts = [t if t else "No description available" for t in texts]

embeddings = model.encode(texts, show_progress_bar=True)
dimension = embeddings.shape[1]
index = faiss.IndexFlatL2(dimension)
index.add(np.array(embeddings).astype('float32'))
print("FAISS Index build complete!")

# 3. Ranking Model (Gradient Boosting) 
ranker = GradientBoostingRegressor()
dummy_X = np.array([[0.9, 9.5], [0.8, 8.8], [0.4, 7.5]])
dummy_y = np.array([1.0, 0.8, 0.1])
ranker.fit(dummy_X, dummy_y)

# 4. FREE Open-Source RAG Local LLM Generator
print("Loading Open-Source RAG Generator...")
rag_generator = pipeline("text2text-generation", model="google/flan-t5-small")

class SearchQuery(BaseModel):
    query: str


@app.get("/")
def health_check():
    return {"status": "ok", "service": "ML Microservice & Advanced Features Running"}

# 🔥 PHASE 7 (Option A) — Semantic Search
@app.post("/search/semantic")
def semantic_search(user_query: SearchQuery):
    """
    Use embeddings (sentence-transformers) and FAISS to search movies by meaning
    """
    query_vector = model.encode([user_query.query])
    # Search top 2 most similar vectors in FAISS
    distances, indices = index.search(np.array(query_vector).astype('float32'), 2)
    
    results = []
    for idx, dist in zip(indices[0], distances[0]):
        if idx != -1:
            match = movies_db[idx].copy()
            # Convert FAISS L2 distance to a pseudo-similarity score (0 to 1)
            match["semantic_score"] = float(1.0 / (1.0 + dist))
            results.append(match)
            
    return {"status": "success", "results": results}

# 🔥 PHASE 7 (Option C) — Ranking Model
@app.post("/recommend/rank")
def rank_recommendations(user_query: SearchQuery):
    """
    Re-Ranks semantic results using a Gradient Boosting model to optimize for clicks!
    """
    # 1. Get raw semantic results
    semantic_data = semantic_search(user_query)
    movies = semantic_data.get("results", [])
    
    if not movies:
         return {"results": []}
         
    # 2. Build feature matrix for the Ranker [Score, Popularity]
    X_pred = np.array([[m.get("semantic_score", 0), m.get("popularity_score", 5.0)] for m in movies])
    
    # 3. Predict user click probability
    predicted_scores = ranker.predict(X_pred)
    
    # Apply new scores and sort
    for m, score in zip(movies, predicted_scores):
        m["ranking_score"] = float(score)
        
    ranked_movies = sorted(movies, key=lambda x: x["ranking_score"], reverse=True)
    return {"status": "success", "ranked_results": ranked_movies}

# 🔥 PHASE 7 (Option B) — RAG System (100% FREE & LOCAL)
@app.post("/search/rag")
def rag_chat(user_query: SearchQuery):
    """
    Ask: 'Suggest sci-fi like Interstellar but emotional'
    Uses FAISS to retrieve context, then a FREE LOCAL LLM to generate an answer.
    """
    # 1. RETRIEVE: Get context from Semantic Search
    retrieved = semantic_search(user_query)
    context_text = " ".join([f"{m['title']} ({m['overview']})" for m in retrieved.get("results", [])])
    
    # 2. AUGMENT & GENERATE
    # Using flan-t5 locally means avoiding all paid OpenAI dependencies!
    prompt = f"Given this movie context: {context_text}. User asks: {user_query.query}. Suggest a movie:"
    
    try:
        response = rag_generator(prompt, max_length=100, num_return_sequences=1)
        generated_text = response[0]['generated_text']
    except Exception as e:
        generated_text = f"Error generating text locally: {e}"
    
    return {
        "status": "success",
        "bot_reply": generated_text,
        "retrieved_context": context_text
    }
