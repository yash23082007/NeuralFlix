# NeuralFlix

NeuralFlix is a movie discovery and recommendation web app built with Next.js, React, FastAPI, and SQLAlchemy. It focuses on user-controlled preferences and explanations that can be traced to deterministic ranking features.

> **Project status:** Local development app with a 26-film curated seed catalog. The active ranker is deterministic. A million-title catalog, TV/episode ingestion, learned recommender, and production load validation are not implemented yet. See [Recommendation and ML status](docs/ML.md).

## Features

- Home, discovery, genre, mood, region, and catalog search experiences.
- Authenticated recommendation feed with Taste Controls and feature-based explanations.
- Watch history, watchlist, ratings, feedback, and cinema trails.
- Optional, revocable consent for recommendation improvement. Only post-opt-in app interactions are counted toward the one-million interaction target; the target is not seeded.
- FastAPI health checks and API documentation.

## Architecture

- **Frontend:** Next.js 15, React 19, TypeScript.
- **Backend:** FastAPI, Pydantic, SQLAlchemy 2 async.
- **Database:** PostgreSQL in Compose/deployment; SQLite for local development and tests.
- **Migrations:** Alembic, run automatically by the backend container before Uvicorn.
- **Ranking:** Explainable CPU-safe hybrid scorer with optional PyTorch/scikit-learn/Transformers training adapters. No trained neural artifact is active by default.
- **API path:** Browser requests use same-origin `/api/v1/*` and Next.js rewrites to FastAPI.

## Run locally

### Docker Compose

Install Docker Desktop, copy `.env.example` to `.env`, set a unique `JWT_SECRET`, then:

```bash
docker compose up --build
```

- App: <http://localhost:3000>
- API docs: <http://localhost:8000/docs>
- API liveness: <http://localhost:8000/health/live>
- API readiness: <http://localhost:8000/health/ready>

See [the deployment runbook](docs/deployment-runbook.md) for local manual setup, environment configuration, and release checks.

## Verify changes

```bash
cd backend
python -m pytest app/tests -q
```

```bash
cd frontend-next
npm ci
npm run lint
npm run build
```

The frontend currently emits existing lint warnings. Review and address them before treating lint as a clean release gate. The Docker Compose stack should also be started and verified on a host with Docker before deployment.

## API highlights

| Capability | Endpoint |
|---|---|
| Home catalog rows | `GET /api/v1/home` |
| Search | `GET /api/v1/search?q=...` |
| Personalized feed | `GET /api/v1/recommendations/feed` |
| Recommendation explanation | `GET /api/v1/recommendations/{tmdb_id}/why` |
| Watch history and list | `GET /api/v1/users/me/history`, `GET /api/v1/users/me/watchlist` |
| Interaction batch | `POST /api/v1/interactions` |
| Training consent | `GET/PUT /api/v1/users/me/training-consent` |
| Data/model telemetry | `GET /api/v1/ml/overview` |

## Data and model integrity

Catalog metadata in the existing importer comes from TMDB. Verify provider terms and attribution requirements before SaaS use. The currently seeded catalog contains films only; a media type field now prevents films from being mislabeled as TV, but TV and episode ingestion still needs to be built. Public research ratings must remain isolated from first-party app data unless their license explicitly allows the planned use.

Evaluation documentation intentionally reports no model-quality score because the existing evaluation runner is synthetic and is not a valid benchmark. See [evaluation status](docs/recommendation-evaluation.md) and [pipeline architecture](docs/architecture/recommendation_pipeline.md).

Optional ML components can be installed for offline experiments:

```bash
cd backend
pip install -r requirements-ml.txt
```

Do not report benchmark or user-study numbers until they are generated from authorized data and recorded with the evaluation report.

## License

See [LICENSE](LICENSE) for the project license. Third-party metadata and artwork retain their provider terms and are not relicensed by this repository.
