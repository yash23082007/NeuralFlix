import os
import asyncio
from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models as rest_models
from sentence_transformers import SentenceTransformer
import structlog

log = structlog.get_logger()

# Async client for performance
qdrant_client = AsyncQdrantClient(
    url=os.getenv("QDRANT_URL", "http://qdrant:6333"),
    api_key=os.getenv("QDRANT_API_KEY", None)
)

# Text embedder for queries
try:
    embedder = SentenceTransformer('all-MiniLM-L6-v2')
except Exception as e:
    log.error("failed_to_load_embedder", error=str(e))
    embedder = None

class QdrantRetrievalService:
    def __init__(self, collection_name: str = "movies"):
        self.collection = collection_name
        self.client = qdrant_client

    async def search_by_vector(self, query_vector: list[float], limit: int = 50) -> list[dict]:
        """Raw vector semantic search."""
        try:
            results = await self.client.search(
                collection_name=self.collection,
                query_vector=query_vector,
                limit=limit,
                with_payload=True
            )
            return [{"id": r.id, "score": r.score, **r.payload} for r in results]
        except Exception as e:
            log.error("qdrant_search_error", error=str(e))
            return []

    async def search_by_text(self, text: str, limit: int = 50, genre_filters: list[str] = None) -> list[dict]:
        """Convert natural language to vector and search."""
        if not embedder:
            return []
            
        vector = embedder.encode(text).tolist()
        
        # Optional metadata filtering
        filter_conf = None
        if genre_filters:
            filter_conf = rest_models.Filter(
                must=[
                    rest_models.FieldCondition(
                        key="genres",
                        match=rest_models.MatchAny(any=genre_filters)
                    )
                ]
            )

        try:
            results = await self.client.search(
                collection_name=self.collection,
                query_vector=vector,
                query_filter=filter_conf,
                limit=limit,
                with_payload=True
            )
            return [{"id": r.id, "score": r.score, **r.payload} for r in results]
        except Exception as e:
            log.error("qdrant_text_search_error", error=str(e))
            return []

    async def get_similar_items(self, item_id: str, limit: int = 20) -> list[dict]:
        """Recommend items similar to a known item id."""
        try:
            # First fetch the item's vector
            records = await self.client.retrieve(
                collection_name=self.collection,
                ids=[item_id],
                with_vectors=True
            )
            if not records or not records[0].vector:
                return []
                
            query_vector = records[0].vector

            # Search excluding the item itself
            results = await self.client.search(
                collection_name=self.collection,
                query_vector=query_vector,
                query_filter=rest_models.Filter(
                    must_not=[rest_models.HasIdCondition(has_id=[item_id])]
                ),
                limit=limit,
                with_payload=True
            )
            return [{"id": r.id, "score": r.score, **r.payload} for r in results]
        except Exception as e:
            log.error("qdrant_similar_items_error", error=str(e))
            return []

qdrant_service = QdrantRetrievalService()
