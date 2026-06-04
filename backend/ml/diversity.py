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
    if len(recommendations) < n_clusters:
        return recommendations
        
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
