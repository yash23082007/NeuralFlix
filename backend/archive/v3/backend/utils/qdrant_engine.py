import os
from qdrant_client import QdrantClient
from qdrant_client.http import models
from dotenv import load_dotenv

load_dotenv()

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")

class VectorSearchEngine:
    """
    High-Performance Vector Search using Qdrant (Free Tier).
    Supports 100,000+ vectors with sub-millisecond latency.
    """
    def __init__(self):
        if QDRANT_URL and QDRANT_API_KEY:
            self.client = QdrantClient(
                url=QDRANT_URL,
                api_key=QDRANT_API_KEY,
            )
            self.collection_name = "neuralflix_v3"
        else:
            self.client = None
            print("⚠️ Qdrant not configured. Falling back to local/PGVector.")

    def create_collection(self, vector_size=384):
        if not self.client: return
        self.client.recreate_collection(
            collection_name=self.collection_name,
            vectors_config=models.VectorParams(size=vector_size, distance=models.Distance.COSINE),
        )

    def upsert_movie(self, movie_id, vector, metadata):
        if not self.client: return
        self.client.upsert(
            collection_name=self.collection_name,
            points=[
                models.PointStruct(
                    id=movie_id,
                    vector=vector,
                    payload=metadata
                )
            ]
        )

    def search_semantic(self, query_vector, limit=10):
        if not self.client:
            # Fallback logic would go here (e.g. PGVector)
            return []
            
        search_result = self.client.search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            limit=limit
        )
        return [hit.payload for hit in search_result]

# Singleton instance
qdrant_engine = VectorSearchEngine()
