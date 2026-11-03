# Recommendation evaluation status

## Current status

There is no valid offline quality benchmark for the production recommendation path yet. `pipeline/evaluation/run_eval.py` uses three hard-coded synthetic users, hand-authored relevant items, and hand-written sort functions. Its outputs are not empirical model results and must not be used in product or investor claims. The earlier numeric table has been removed for that reason.

## Requirements for a reportable benchmark

- Name the dataset, version, license, allowed use, and exact preprocessing.
- Keep public research data separate from first-party app events and from SaaS production training.
- Use user- and time-aware train/validation/test splits; document cold-start handling and leakage checks.
- Evaluate the actual candidate generator and ranker, including the deterministic Taste Profile baseline.
- Report Recall@K, NDCG@K, MAP/MRR, catalog coverage, and intra-list diversity from generated predictions; include sample sizes and uncertainty.
- Save the command, dependency versions, config, data checksums, and output artifact with each report.

## First-party data

The app's ML overview exposes a real count of qualifying, consented app interactions toward the one-million collection target. Impression-only exposure and onboarding seed history are excluded. Consent is revocable, and events before the current opt-in timestamp are not included in the current eligible count. No production training pipeline currently consumes these events.

Run the existing scaffold only to inspect it, not to claim model performance:

```bash
cd backend
python -m pipeline.evaluation.run_eval
```

The scaffold should be replaced when a licensed evaluation dataset and a valid reproducible benchmark are ready.
