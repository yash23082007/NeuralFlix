def generate_report(metrics: dict, output_path: str = "evaluation_report.md"):
    """Generate a markdown report of the evaluation metrics."""
    with open(output_path, "w") as f:
        f.write("# Recommendation Pipeline Evaluation\n\n")
        f.write("## Metrics\n\n")
        f.write("| Model | Recall@10 | NDCG@10 |\n")
        f.write("| :--- | :--- | :--- |\n")
        for model, m in metrics.items():
            f.write(f"| {model} | {m['recall']:.4f} | {m['ndcg']:.4f} |\n")
