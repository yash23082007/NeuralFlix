# Recommendation and ML status

## What runs in the app

The active recommendation path is a CPU-safe hybrid scorer. It combines metadata/content, interaction affinity, recent-sequence fit, genre-neighbor similarity, keyword/quality signals, deterministic exploration, and diversity reranking, then returns per-item component explanations. Optional PyTorch, scikit-learn, and Transformers adapters are available in `backend/requirements-ml.txt` for offline NCF, SASRec, LightGCN, clustering, and sentiment training; no trained neural artifact is shipped by default.

The current candidate and search paths still load broad catalog slices into Python. They are suitable for the small curated development catalog, but have not been proven at million-item scale. Do not claim million-item latency or production throughput until retrieval is indexed, bounded, load-tested, and measured on the production database.

## First-party interaction target

`GET /api/v1/ml/overview` reports `consented_interactions` against a target of 1,000,000. The count includes app-recorded watch events and recommendation click/save/dismiss/watch responses from users who opted into recommendation improvement. It excludes impression-only exposure and onboarding watch-history seeds. Eligibility starts at the current consent timestamp and stops when consent is withdrawn. The value is a real count; it is not prefilled with synthetic data.

The opt-in can be changed in **Profile → Account Settings → Help improve recommendations** or through:

```http
GET /api/v1/users/me/training-consent
PUT /api/v1/users/me/training-consent
Content-Type: application/json

{"consent": true}
```

These events are currently collected and counted; this repository does not yet contain a production training/export job that consumes them. Consent is therefore not evidence that a model has been trained.

## Catalog and data limits

The development startup seeds a small curated catalog. The database now has a `media_type` field and the series route filters to TV records, but the curated seed is films only; the series list is empty until a licensed TV metadata importer populates it. There is no million-title catalog in the repository.

The current ingestion code still uses TMDB. Open-data ingestion, provenance, license attribution, duplicate resolution across sources, episode/series relationships, and a million-record import have not yet been implemented. MovieLens-style public ratings must remain isolated from live SaaS events and must not be deployed without confirming the dataset license permits the intended use.

## Evaluation policy

No offline recommendation metric is currently accepted as a model result. `pipeline/evaluation/run_eval.py` contains a tiny hard-coded synthetic example and hand-written ordering functions; it is a demo scaffold, not a valid benchmark. Use `pipeline.evaluation.report` with JSONL predictions from an authorized dataset for Recall@10, NDCG@10, coverage, and diversity. It must not be used to support quality claims until the data sample, split, and generated predictions are recorded.

See [recommendation-evaluation.md](recommendation-evaluation.md) for the status of evaluation work and [architecture/recommendation_pipeline.md](architecture/recommendation_pipeline.md) for the implemented serving path.
