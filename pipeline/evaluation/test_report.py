from pipeline.evaluation.report import evaluate_records


def test_evaluate_records_reports_required_metrics():
    result = evaluate_records(
        [
            {
                "user_id": "u1",
                "recommended": [1, 2, 3],
                "relevant": [3],
                "genres": [["Drama"], ["Comedy"], ["Action"]],
            }
        ],
        catalog_size=4,
    )

    assert result["users"] == 1
    assert result["Recall@10"] == 1.0
    assert result["NDCG@10"] > 0
    assert result["Catalog Coverage"] == 0.75
