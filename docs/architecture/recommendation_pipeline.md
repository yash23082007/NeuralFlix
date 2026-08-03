# NeuralFlix Recommendation Architecture

NeuralFlix is built to provide **transparent, user-controlled recommendations** without hidden algorithmic gamification.

## Philosophy

A 10/10 movie recommendation system should not be a "black box" of PyTorch models that maximize engagement at the cost of the user's explicit intent.

Instead, we believe in:
- **Explicit User Control**: Users define what they want via Taste Controls.
- **Traceable Reasoning**: Every recommendation includes a structured reason.
- **Deterministic Outcomes**: The production ML pipeline is a deterministic reranker.
- **Explainable Metrics**: Evaluation focuses on diversity, coverage, and recall over engagement.

## Architecture

### 1. Data Retrieval
We query candidates from MongoDB based on user watch history and basic genre/language filters.

### 2. Candidate Generation (Base)
A Content-Based TF-IDF engine provides a baseline similarity score for the candidates against the user's history. 

### 3. Taste Constellation Reranker
The core production pipeline is `taste_reranker.py`. It takes the base score and reranks it using explicit user constraints:
- `discovery`: Boosts items outside the comfort zone.
- `global_pref`: Penalizes local/familiar items if the user wants global cinema.
- `challenge`: Boosts complex genres (drama, documentary, etc).
- `pace`: Adjusts score based on inferred pacing (runtime + action/thriller vs drama/romance).
- `hiddenGems`: Inverts the popularity penalty for users looking for obscure films.

### 4. Diversity Boost
If enabled, the reranker injects highly-rated international/foreign language films into the top K candidates to deliberately break filter bubbles.

### 5. Why Recommended Engine
Before delivery, candidates pass through `why_recommended.py`, which generates a JSON array of specific, traceable evidence for why the movie scored high.

### Experimental (PyTorch)
Deep Learning models (NCF, SASRec) exist in the codebase but are isolated behind feature flags (`ENABLE_EXPERIMENTAL_ML=true`). They are strictly used for offline evaluation and experimentation, not for default production traffic.

## Evaluation
We evaluate the pipeline strictly against:
- Recall@K
- NDCG@K
- Mean Reciprocal Rank (MRR)
- Catalog Coverage
- Intra-List Diversity (ILD)

We do not use gamified click-through-rate (CTR) or watch-time optimization metrics to judge core recommendation quality.
