import numpy as np
from sklearn.cluster import KMeans

_model = None

def _get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer('all-MiniLM-L6-v2')
    return _model

def ensure_diversity(recommendations: list, n_clusters: int = 5) -> list:
    """
    Ensure recommendations span multiple genre and content clusters, 
    preventing the 'filter bubble' effect.
    """
    if len(recommendations) < max(n_clusters, 2):
        return recommendations
        
    import os
    LITE_MODE = os.getenv("LITE_MODE", "false").lower() == "true"
    NEURALFLIX_DEMO_MODE = os.getenv("NEURALFLIX_DEMO_MODE", "false").lower() == "true"
    
    if LITE_MODE or NEURALFLIX_DEMO_MODE:
        # Fast genre-based interleaving/diversity without loading SentenceTransformer
        try:
            genre_pools = {}
            for m in recommendations:
                genres = m.get("genres", [])
                primary_genre = genres[0] if genres else "Other"
                genre_pools.setdefault(primary_genre, []).append(m)
            
            diverse_recs = []
            max_len = max(len(pool) for pool in genre_pools.values()) if genre_pools else 0
            for i in range(max_len):
                for genre in list(genre_pools.keys()):
                    if i < len(genre_pools[genre]):
                        diverse_recs.append(genre_pools[genre][i])
            return diverse_recs[:len(recommendations)]
        except Exception as e:
            import logging
            logging.getLogger("DIVERSITY").warning(f"Fast diversity sorting failed: {e}")
            return recommendations

    try:
        # Generate vectors based on title + genres
        texts = [
            f"{m.get('title', '')} {' '.join(m.get('genres', []))}"
            for m in recommendations
        ]
        
        embeddings = _get_model().encode(texts)
        
        # Cluster the recommendations into diverse groups
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        clusters = kmeans.fit_predict(embeddings)
        
        diverse_recs = []
        # Interleave results from each cluster
        cluster_pools = {i: [] for i in range(n_clusters)}
        for i, cluster_id in enumerate(clusters):
            cluster_pools[cluster_id].append(recommendations[i])
            
        max_len = max(len(pool) for pool in cluster_pools.values())
        
        for i in range(max_len):
            for cluster_id in range(n_clusters):
                if i < len(cluster_pools[cluster_id]):
                    diverse_recs.append(cluster_pools[cluster_id][i])
                    
        return diverse_recs[:len(recommendations)]
    except Exception as e:
        import logging
        logging.getLogger("DIVERSITY").warning(f"Diversity sorting failed: {e}")
        return recommendations
