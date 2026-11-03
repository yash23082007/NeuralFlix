# Local development and deployment runbook

## Stack

- Frontend: Next.js 15, React 19, TypeScript.
- API: FastAPI, async SQLAlchemy, Alembic.
- Database: PostgreSQL for deployment; SQLite is supported for local development and tests.
- Redis: Compose starts Redis, but application cache integration currently degrades to a non-Redis path when Redis is unavailable.
- Recommendation serving: CPU-safe hybrid scorer with optional offline ML adapters. No trained neural artifact is deployed by default.

## Local setup

### Docker Compose

Install Docker Desktop, copy `.env.example` to `.env`, replace `JWT_SECRET` with a long random value, then run:

```bash
docker compose up --build
```

The API container applies Alembic migrations before starting Uvicorn. The frontend is available at `http://localhost:3000`, the API docs at `http://localhost:8000/docs`, and readiness at `http://localhost:8000/health/ready`.

To stop the services, run `docker compose down`. Add `-v` only when you intentionally want to remove the local database and Redis volumes.

### Manual development

Backend (PowerShell):

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:DATABASE_URL = "sqlite+aiosqlite:///./neuralflix_v4.db"
$env:ENVIRONMENT = "development"
$env:JWT_SECRET = "local-development-secret-change-before-deploy"
python -m uvicorn app.main:app --reload --port 8000
```

Development startup creates the local schema and inserts the curated sample catalog. Production startup uses Alembic migrations through the Docker command and does not run development seeding.

Frontend (second terminal):

```powershell
cd frontend-next
npm ci
$env:API_INTERNAL_URL = "http://localhost:8000"
npm run dev
```

## Environment configuration

See `.env.example` for the Compose variables. At minimum, deployment requires a strong `JWT_SECRET`, a PostgreSQL `DATABASE_URL`, and secure cookies over HTTPS. External metadata credentials are required only for the integrations that use them. Keep secrets in the deployment secret manager; never commit `.env` files.

`API_INTERNAL_URL` is used by Next.js server rewrites. In Compose it must resolve to the API service name (`http://api:8000`); in a manual local run, use `http://localhost:8000`. Browser calls use same-origin `/api/v1/*` paths.

### Render database linkage

The Render API service must use the connection string for the Render PostgreSQL
database linked to that service. In the Render dashboard, open the API service's
Environment settings and set `DATABASE_URL` from the database's **Internal
Database URL** (or sync the Blueprint `fromDatabase` value); do not use the
Compose hostname `db`, a deleted database hostname, or a stale external URL.
The API and database must be in the same Render region. After saving the
variable, deploy the latest commit and confirm the logs show Alembic completing
before Uvicorn starts.

Verify the configured connection before testing application routes:

```text
GET https://<render-service>.onrender.com/health/live
GET https://<render-service>.onrender.com/health/ready
GET https://<render-service>.onrender.com/api/v1/home
```

`health/live` can succeed while the database is unavailable; `health/ready`
must report `"database": true` before frontend catalog and search flows can work.

## Migrations and release checks

Before release:

1. Review the Alembic upgrade and downgrade against a disposable PostgreSQL database.
2. Run `python -m pytest backend/app/tests -q` from the repository root (or `python -m pytest app/tests -q` from `backend`).
3. Run `npm ci`, `npm run build`, and `npm run lint` from `frontend-next`; address errors and review warnings.
4. Build and start the Compose stack, then verify `/health/live`, `/health/ready`, `/api/v1/home`, registration/login, recommendation feed, search, watchlist, and consent flows.
5. Confirm backups, migration rollback procedure, cookie security, CORS origins, secret rotation, rate limits, logs, and alerting in the target environment.

The repository has not been deployed or load-tested at a million-title scale. A passing local test suite is not a production sign-off. Docker Compose was not available in the previous local verification environment; execute the Compose checks on a host with Docker before release.

## Health and troubleshooting

- `GET /health/live`: process liveness.
- `GET /health/ready`: database readiness and cache status. Redis can report unavailable without making the API unready.
- `GET /api/v1/ml/overview`: live catalog and consent-eligible interaction counts. This is telemetry, not a model evaluation report.
- If the frontend returns an API error, check `API_INTERNAL_URL` in the Next server environment and API logs.
- If login cookies are missing in production, verify HTTPS and `COOKIE_SECURE=true`; do not disable secure cookies to work around an HTTP deployment.
- If metadata enrichment does not work, verify the configured provider credentials and applicable data/API terms.

## Data safety

Do not use `docker compose down -v` against any environment with data you need. Back up production PostgreSQL before schema changes. Test migrations on a restored copy before production. Never seed synthetic user events to satisfy the one-million interaction target.
