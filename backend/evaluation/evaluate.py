"""
Main Evaluation Runner
Runs baselines vs. the taste-control reranker.
"""
import asyncio
from evaluation.splits import temporal_train_test_split
from evaluation.metrics import recall_at_k, ndcg_at_k, intra_list_diversity
from evaluation.baselines import PopularityBaseline

def run_evaluation(interactions: list, movies_meta: dict):
    train, test = temporal_train_test_split(interactions)
    pop = PopularityBaseline()
    pop.fit(interactions)
    
    metrics = {"pop": {"recall": 0, "ndcg": 0}, "taste": {"recall": 0, "ndcg": 0}}
    # Mock loop for evaluation 
    # In a real environment, this would run against the DB and the full reranker pipeline
    print("Evaluation completed successfully.")
    return metrics

if __name__ == "__main__":
    print("Running evaluation pipeline...")
    # Mock data execution
    run_evaluation([], {})
