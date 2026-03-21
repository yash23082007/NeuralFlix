import os
from sentence_transformers import SentenceTransformer
import numpy as np

# Load the lightweight, high-performance model from Hugging Face
# This is free, runs locally, and produces 384-dimensional vectors.
MODEL_NAME = "all-MiniLM-L6-v2"
model = None

def get_model():
    global model
    if model is None:
        print(f"🚀 Loading Neural Engine ({MODEL_NAME})...")
        model = SentenceTransformer(MODEL_NAME)
    return model

def generate_movie_embedding(movie_title: str, overview: str, tagline: str = "", genres: list = []) -> list:
    """
    Converts movie metadata into a single semantic vector.
    Concept: 'Overview + Tagline + Genres' = Semantic Meaning.
    """
    genre_str = ", ".join(genres) if genres else ""
    # Combine everything into a single rich text block for the neural model
    text_to_embed = f"{movie_title}. {tagline}. {overview}. Themes: {genre_str}"
    
    encoder = get_model()
    # Generate the embedding (numpy array) and convert to list for PGVector
    embedding = encoder.encode(text_to_embed)
    return embedding.tolist()

def generate_query_embedding(query: str) -> list:
    """
    Converts a natural language search query (e.g. 'lonely robot in space') into a vector.
    """
    encoder = get_model()
    embedding = encoder.encode(query)
    return embedding.tolist()
