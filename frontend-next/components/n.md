NeuralFlix → Movie Intelligence Platform
The Final Build Document
Repo: github.com/yash23082007/NeuralFlix · Audit basis: HEAD 19b3741 (218 commits, audited 2026-08-27)
Companion document: 
NeuralFlix_Audit_Report.md
 (full evidence for every claim below)

What this document is: the complete CURRENT STATE → PROBLEMS → TARGET STATE plan, then phase-by-phase implementation orders with exact file paths, schemas, API contracts, and acceptance criteria. No vibe coding — every phase ends in verified, tested state.

The one-paragraph verdict: NeuralFlix already contains ~60% of the honest version of the target product — a deterministic explainable recommender, cookie auth, a real interaction data model, and five built-but-never-wired signature UI components — buried under a fictional ML narrative, a dead-on-arrival import bug, four critical security holes, and 11 frontend calls to endpoints that don't exist. The plan is therefore not a rewrite: it is (1) triage, (2) contract repair, (3) a real data platform on TMDB + MovieLens, (4) progressive ML on top of a truthful evaluation harness, and (5) deletion of everything fabricated.

PART I — CURRENT STATE
1. What exists today (verified, not assumed)
1.1 Architecture as-built
text

Next.js 15 / React 19 / TS5 frontend (Vercel)
    │  fetch with credentials:"include"  ←─ Cookie: nf_access_token (HttpOnly, JWT HS256)
    ▼
FastAPI v4 backend (Render)  ── 11 routers, 6 services, async SQLAlchemy 2.0
    │
    ├── SQLite (dev, WAL mode) / PostgreSQL (prod, via asyncpg) — single `movies` table + 8 user tables
    ├── Deterministic "Taste Constellation" scorer (~50 lines, 3 of 5 axes actually used)
    ├── 26-movie hand-written seed catalog (`app/seed/catalog_data.py`)
    ├── TMDB client (details/search, on-demand fetch-and-persist)
    ├── Redis cache w/ in-memory fallback (graceful degradation ✅)
    └── archive/legacy/ — ~180 dead files: the actual PyTorch stack (NCF, SASRec, LightGCN,
        bandits, Qdrant, Celery, Trakt/OMDb/Watchmode) from "v3". Zero imports from active code.
1.2 The asset inventory (what's genuinely good)
Asset	Location	Why it matters
Deterministic explainable scorer	app/services/recommendation_service.py	The target product's V0 ranker. Transparent, user-steerable, per-feature attributable.
Interaction data model	app/models/recommendation_feedback.py	RecommendationFeedback, WatchlistItem, Rating, RecommendationImpression (with ranking_version, position, shown_at/clicked_at/saved_at/dismissed_at) — exactly the event schema the target ML loop needs. Already migrated. Already tested.
Taste Constellation UI	components/recommendation/TasteConstellation.tsx	The signature feature. Fully built, zero imports anywhere. Orphaned.
Why Recommended / Why Not This	components/recommendation/WhyRecommendedSheet.tsx, WhyNotThisDialog.tsx	The XAI UX. Built, orphaned.
Smart Search Bar	components/SearchBar.tsx	Built, orphaned.
Auth foundation	app/routers/auth.py, app/dependencies.py	bcrypt + HttpOnly cookie + get_current_user/get_current_user_optional — correct shape, needs the fixes in Part III.
Async foundation	app/database.py, app/main.py	async SQLAlchemy 2.0, WAL+FK pragmas, structlog, request IDs, gzip, graceful Redis fallback, health endpoints.
Test suite	app/tests/ (16 tests)	Green-shaped; passes after one-line fix; correct conftest pattern.
docs/non-goals.md	docs/	Genuinely excellent privacy/ethics charter (no shadow profiles, no fake availability claims, no gamified culture). Keep verbatim — this is the product constitution.
Movies/catalog UX	MovieRow, MovieCard, home/discover/region pages	Working server-rendered browsing over local DB.
1.3 The liability inventory (condensed from the audit)
P0 (app is broken/insecure today):

NameError: Any in app/routers/movies.py → backend cannot import; CI red on HEAD (verified live).
PUT /users/me returns raw ORM User → hashed_password in the JSON response.
IDOR: GET/PUT /users/{user_id}/taste-controls anonymous read/write for any user; GET /{user_id}/profile public.
POST /recommendations/feedback takes current_user_id as a query param → identity spoofing on a write.
docker-compose.yml sets SECRET_KEY but app reads JWT_SECRET → containerized prod runs on the public hardcoded dev secret.
Structural:

11+ frontend→backend phantom contracts (auth/refresh, auth/google, events/*, tracking/*, recommendations/onboarding, users/{id}/history|stats|favorites|ratings, movies/stats, all /api/v1/data/*).
Middleware checks cookie access_token vs actual nf_access_token; admin gate tests an is_admin JWT claim the backend never issues.
No rate limiting (slowapi in requirements, never imported). No password policy. No refresh endpoint.
All scoring/browsing endpoints do select(Movie) full scans in Python loops; lazy="selectin" everywhere.
Fabricated layers: /ml/overview model cards ("NCF — Active"), template /why endpoint with hardcoded freshness, mock admin stats, unsubstantiated eval JSON + user-study doc.
Committed artifacts: *.db-shm/-wal, neuralflix_api.log; ghost compose services (celery, prometheus, pgvector, grafana); two contradictory .env.examples; stale render.yaml flags.
Repo-root junk: check_ci.py, test_implementation.py (reference dead v3 paths).
PART II — KEEP / REFACTOR / REMOVE
2. Keep as-is (do not touch the logic)
Item	Action
app/services/recommendation_service.py scorer core	Keep; extend in Phase 5 (attributions + missing axes).
app/models/* (all 8 models incl. RecommendationImpression)	Keep verbatim — this is the event backbone.
app/database.py, app/dependencies.py (after fixes), app/main.py middleware stack	Keep.
docs/non-goals.md	Keep verbatim. Adopt as repo constitution; README links to it.
app/tests/conftest.py pattern + all 16 tests	Keep; extend coverage per Phase 0.
MovieRow, MovieCard, RowSkeleton, Footer, Navbar, ThemeProvider/Toggle, ScrollReveal, CommandPalette, Providers	Keep.
app/services/cache_service.py (add TTL to in-memory fallback — small refactor)	Keep pattern.
TasteConstellation, WhyRecommendedSheet, WhyNotThisDialog, SearchBar	Keep and wire — Phase 3/4. These are the differentiators, already paid for.
3. Refactor (keep the file, fix the body)
File	Refactor
app/routers/users.py	Delete /{user_id} route aliases; require auth; Pydantic bodies; response_model everywhere.
app/routers/recommendations.py	Auth via dependency (not query param); implement mood; fix exclusion semantics; return score components for XAI.
app/routers/movies.py	Add Any import (P0); push genre/mood/language filters into SQL; honor pagination; make /availability honest or delete.
app/routers/home.py, ml.py	Home: fine after SQL pushdown. ml.py: replace fake model cards with real pipeline telemetry (see §9.6).
app/services/catalog_service.py	Guard TMDB persist behind settings.allow_tmdb_write_through; singleflight dedupe.
app/services/tmdb_service.py	Module-level pooled AsyncClient; respect 429; stop retrying 401/404.
frontend-next/middleware.ts	Cookie name nf_access_token; delete the fake admin JWT decode (admin moves server-side).
frontend-next/lib/auth.ts	Keep authFetch/checkAuth; delete refresh flow until backend implements it (Phase 4).
frontend-next/lib/api.ts	Generated OpenAPI client replaces hand-written paths (Phase 2).
docker-compose.yml, backend/Dockerfile, render.yaml, both .env.examples	Rewritten in Phase 1 (§14).
README.md	Rewritten to describe the real product (Phase 6).
4. Remove / archive (deletion is the strategy)
Item	Action
backend/archive/legacy/ (~180 files)	Delete from repo. Tag the last commit containing it as v3-legacy-archive first. It confuses every consumer (compose, render.yaml, ml/overview, frontend data lib all half-reference it). Git history preserves it forever.
neuralflix_v4.db-shm, neuralflix_v4.db-wal, backend/neuralflix_api.log	git rm --cached; extend .gitignore with *.db-shm, *.db-wal, *.db-*.
check_ci.py, test_implementation.py (repo root)	Delete.
Fake telemetry: /ml/overview model cards, hardcoded ageHours: 1, admin mock stats	Delete or replace with honest equivalents (Phase 5/6).
backend/reports/evaluation-2026-06-01.json, docs/user-study.md	Delete numbers that cannot be reproduced. Replaced by real harness output (Phase 5) — only if you can rerun the study later may the doc return, with methodology artifacts.
Root vercel.json	Delete (keep frontend-next/vercel.json).
Unused deps	Backend: none after audit (slowapi gets used in Phase 3). Frontend: axios, @base-ui/react, shadcn CLI dep, react-hook-form/zod (until forms need them), cmdk if CommandPalette uses it — verify per-import before removal.
Google/GitHub login buttons	Remove from login page until backend OAuth exists (Phase 7 optional). Shipping dead buttons is worse than no buttons.
PART III — TARGET STATE
5. Target architecture
text

                        ┌──────────────────────────────────────────────┐
                        │        Next.js 15 frontend (Vercel)          │
                        │  typed API client generated from OpenAPI     │
                        └───────────────┬──────────────────────────────┘
                                        │ HTTPS, HttpOnly cookie
                        ┌───────────────▼──────────────────────────────┐
                        │           FastAPI backend (Render)           │
                        │  routers → services → repositories → models  │
                        │  ├── recommendation/  (pipeline, §9)         │
                        │  ├── search/          (hybrid, §8)           │
                        │  ├── ingestion/       (workers, §7)          │
                        │  └── core: auth, rate-limit, observability   │
                        └───────┬───────────────────┬──────────────────┘
                                │                   │
                 ┌──────────────▼─────┐   ┌─────────▼──────────┐
                 │ PostgreSQL (Neon)  │   │ Redis (Upstash)    │
                 │ + pgvector         │   │ cache, rate limits │
                 │ relational + FTS   │   │ job queue (RQ)     │
                 │ + trigram indexes  │   └────────────────────┘
                 └──────────────▲─────┘
                                │
                     ┌──────────┴───────────┐
                     │  Ingestion workers   │  (GitHub Actions cron →
                     │  TMDB sync           │   Render worker / RQ jobs)
                     │  MovieLens bootstrap │
                     │  feature/embedding   │
                     │  eval harness        │
                     └──────────┬───────────┘
                                │
              TMDB API ── MovieLens 32M ── IMDb datasets (license-checked)
Decisions (with reasons):

One database (Postgres), not five. FTS + pg_trgm + pgvector cover lexical, fuzzy, and semantic search at this scale. A dedicated search engine is explicitly a later decision made from EXPLAIN ANALYZE evidence, not fashion.
Jobs as RQ workers + GitHub Actions cron, not Celery+beat+broker sprawl. Celery returns only if job volume ever justifies it.
Monorepo, keep current layout (backend/ + frontend-next/), add pipeline/ for offline ML. Renaming folders buys nothing and breaks CI/deploy paths.
The deterministic scorer is never deleted. It is the fallback tier (§9.7) and the explanation engine forever.
6. Target database schema
Staged normalization: Phase 1 fixes interaction integrity; Phase 3 adds the normalized movie graph as ingestion matures. JSON stays where queries don't need joins — pragmatic, not dogmatic.

Phase 1 (interaction core — fix what exists)
SQL

-- movies: keep single-table + JSON for now (26→~2k rows in Phase 2).
-- Additions:
ALTER TABLE movies ADD COLUMN IF NOT EXISTS release_year INT GENERATED ALWAYS AS (year) STORED; -- placeholder; real generated cols added in migration as needed
CREATE INDEX IF NOT EXISTS idx_movies_runtime ON movies(runtime);
CREATE INDEX IF NOT EXISTS idx_movies_genres_json ON movies USING gin(genres);

-- users: enforce integrity
ALTER TABLE users ADD CONSTRAINT chk_email_format CHECK (position('@' in email) > 1);

-- taste_controls: values are 0-100, PERIOD
ALTER TABLE taste_controls ADD CONSTRAINT chk_slider_discovery CHECK (discovery BETWEEN 0 AND 100);
-- ... same for global_taste, challenge, pace, hidden_gems

-- recommendation_feedback: make the enum real
ALTER TABLE recommendation_feedback ADD CONSTRAINT chk_feedback_type
  CHECK (feedback_type IN ('too_slow','too_dark','wrong_language','not_my_genre',
                           'already_watched','not_available','hide_similar','like','dislike','watchlist'));
CREATE UNIQUE INDEX uq_feedback_user_movie ON recommendation_feedback(user_id, movie_id);

-- impressions: the ML loop's primary table (model already matches this)
CREATE INDEX idx_impressions_user_time ON recommendation_impressions(user_id, shown_at DESC);
CREATE INDEX idx_impressions_ranking   ON recommendation_impressions(ranking_version);
Phase 3 (normalized movie data platform — created by ingestion migrations)
SQL

CREATE TABLE people (
    id          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tmdb_person_id INT UNIQUE,
    name        TEXT NOT NULL,
    known_for   TEXT,                       -- 'Acting','Directing',...
    profile_url TEXT
);

CREATE TABLE movie_cast (
    movie_id  INT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    person_id INT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    character_name TEXT,
    cast_order INT,
    PRIMARY KEY (movie_id, person_id)
);
CREATE INDEX idx_cast_person ON movie_cast(person_id);

CREATE TABLE movie_crew (
    movie_id  INT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    person_id INT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    job       TEXT NOT NULL,                -- 'Director','Writer','Composer',...
    PRIMARY KEY (movie_id, person_id, job)
);
CREATE INDEX idx_crew_person_job ON movie_crew(person_id, job);

CREATE TABLE keywords (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tmdb_keyword_id INT UNIQUE,
    name TEXT NOT NULL UNIQUE
);
CREATE TABLE movie_keywords (
    movie_id INT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    keyword_id INT NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
    PRIMARY KEY (movie_id, keyword_id)
);
CREATE INDEX idx_movie_keywords_kw ON movie_keywords(keyword_id);

CREATE TABLE watch_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    movie_id INT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    watched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completion FLOAT,                       -- 0.0-1.0, self-reported or None
    source TEXT                            -- 'cinema_release','streaming','rewatch'
);
CREATE INDEX idx_watch_user_time ON watch_events(user_id, watched_at DESC);

CREATE TABLE search_queries (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    raw_query TEXT NOT NULL,
    parsed_intent JSONB,
    result_count INT,
    clicked_movie_id INT REFERENCES movies(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE model_versions (
    id TEXT PRIMARY KEY,                    -- 'content-tfidf-v1', 'hybrid-v2', ...
    trained_at TIMESTAMPTZ,
    train_window TEXT,                      -- '2000-01-01..2024-06-30'
    metrics JSONB,                          -- {"recall@10": ..., "ndcg@10": ...}
    artifact_uri TEXT,                      -- local path / S3-compatible
    is_active BOOLEAN DEFAULT FALSE
);

CREATE TABLE ingestion_checkpoints (
    job_name TEXT PRIMARY KEY,              -- 'tmdb_popular_sync','movielens_import'
    last_page INT, last_synced_at TIMESTAMPTZ,
    last_key TEXT, status TEXT, updated_at TIMESTAMPTZ DEFAULT now()
);
Later (only when needed)
movie_embeddings (movie_id PK, embedding vector(384), model_version) — pgvector, Phase 6.
user_taste_profiles (user_id PK, genre_vec JSONB, tone_vec JSONB, updated_at) — materialized taste, Phase 5.
Partition recommendation_impressions by month when >10M rows (not before).
Entity resolution rule (from day one): movies.tmdb_id is the canonical external join key. IMDb linkage via movies.imdb_id; MovieLens linkage via links.csv.imdbId → imdb_id. One movie_external_ids mapping table is added only when a third source (OMDb) actually returns.

7. Data ingestion strategy
7.1 Sources & legal posture (per master prompt — non-negotiable)
Source	Use	Constraints honored
TMDB API	metadata, cast/crew, keywords, posters, popularity, trending	Free non-commercial w/ attribution; client-side token bucket ~20 req/s (documented limit ~40), honor Retry-After on 429, exponential backoff, attribution page in footer. Never scrape IMDb.
MovieLens 32M	offline CF training + evaluation only	License: non-commercial research use. Never presented as app users. Bootstrap/eval dataset.
IMDb datasets (TSV)	enrichment: title.ratings, title.akas (alt titles for search), title.principals	Daily dumps are licensed for non-commercial use with conditions — fetch datasets.imdbws.com, store provenance, no page scraping, no republishing raw dumps.
7.2 Incremental sync (no "download everything")
Python

# pipeline/sync/tmdb_sync.py  (worker; RQ job or GH Action)
STAGES = [
  "popular",      # discover sort=popularity.desc, pages 1..50  (~1000 films, fresh)
  "top_rated",    # discover sort=vote_average.desc,vote_count.gte=1000, pages 1..50
  "trending_day", # /trending/movie/day — refresh rolling window
  "by_region",    # discover with with_origin_language per REGION_LANGUAGE_MAP (reuse it!)
  "details_fill", # append_to_response=credits,videos,keywords for ids above
  "movielens_join"# links.csv imdbIds → /find/{imdb_id} → details for top-N rated classics
]
# Checkpoint after every page into ingestion_checkpoints(job_name, last_page,...)
# Idempotent upsert ON CONFLICT (tmdb_id) DO UPDATE
# Dedup rule: skip if (title_normalized, year) already exists under a different tmdb_id
#   unless runtime differs by >15 min (remake heuristic) — logs candidates for review
Scale target: ~3,000–5,000 movies (popular + top-rated + regional + MovieLens top titles). This is enough for real CF eval against MovieLens overlap, real hidden-gem mining, and stays inside every free tier. Expansion is a checkpoint-resumable config change, not a redesign.

7.3 Offline pipeline (runs anywhere: laptop / GH Action / free notebook)
text

extract → normalize → validate (pydantic) → dedupe → load →
index (FTS + trigram) → features (TF-IDF matrix) → embeddings (MiniLM, Phase 6) →
train/eval (temporal split) → register model_versions → activate
8. Search architecture
8.1 Query parser (backend/app/search/query_parser.py)
text

"dark sci-fi under 2 hours"        →  {genres:[Science Fiction], tone:dark, runtime_max:120}
"funny movies under 100 minutes"   →  {tone:funny, runtime_max:100}
"korean thrillers from the 2010s"  →  {region:korean, genres:[Thriller], year_min:2010, year_max:2019}
"something like Interstellar but shorter"
                                   →  {seed_title:"Interstellar", similar:true, runtime_max: target-20}
Implementation: rule-based v1 — genre synonym table, tone lexicon (dark/funny/cozy/intense → keyword & genre sets), unit parser (under N minutes|hours, from the YYYYs). Deterministic, testable, no LLM dependency. Extend with embeddings only if parser recall measurably stalls.

8.2 Retrieval & fusion
Layer	Tech	Notes
Lexical	Postgres FTS (tsvector over title+overview+cast names)	websearch_to_tsquery, ranked ts_rank_cd
Fuzzy titles	pg_trgm GIN on title	typo tolerance ("interstaller")
Filters	genre/language/year/runtime/region	SQL WHERE, uses GIN/jsonb + btree indexes from §6
Semantic (Phase 6)	pgvector, MiniLM-L6-v2 embeddings of overview+keywords+genres	cosine top-50
Fusion	Reciprocal Rank Fusion: score = Σ 1/(60+rank_i)	simple, training-free, robust
Behavioral ranking	results re-ordered by current deterministic scorer for signed-in users	ties search into taste
Targets: p95 < 300 ms warm (all Postgres-local, no external calls in the hot path). Search queries logged to search_queries (raw + parsed + clicked) → search_success_rate = queries with ≥1 click.

9. Recommendation architecture (the product core)
9.1 Pipeline (request path vs offline path)
text

REQUEST PATH (<150ms budget)
  GET /recommendations?mode=...&sliders=...
    → load candidate pool (precomputed materialized candidates + live SQL slices)
    → hard filters (watched / excluded / region+language constraints)
    → rank: active model (or deterministic scorer) with user sliders as weights
    → diversify (MMR with genre/tone penalty)
    → attach explanations (score components → templates; NEVER fabricated)
    → log impression rows (batch insert)
    → return

OFFLINE PATH (worker)
  interaction ingest → feature build → train/eval (temporal split) →
  model_versions register → activate → invalidate candidate caches
9.2 Candidate generators (each is a small, testable module)
#	Generator	Source (today → target)
A	Content similarity	genre/director/keyword overlap (exists) → TF-IDF + embeddings (Phase 4/6)
B	Collaborative filtering	none → implicit-ALS on MovieLens∩catalog + app interactions (Phase 5)
C	Popularity/trending	exists (popularity_score) → rolling TMDB trending
D	Hidden gems	new: gem_score = bayes_rating × log1p_qual_votes⁻¹_factor × (1 − norm_popularity) × age_freshness (Phase 5)
E	Taste-vector match	new: user profile vector × movie attribute vector cosine (Phase 5)
F	Genre/attribute filter match	exists (mood/genre maps)
G	Exploration	new: ε-greedy sample from outside user's top-2 genres (Phase 5)
H	Similar users	later; only with real user volume (>1k actives)
9.3 Ranking model progression (honest versioning)
Version	Model	Trained on	Ships when
v0 (today)	Deterministic Taste Constellation scorer	user sliders	now — it's the fallback tier forever
v1	v0 + feature attributions + discovery/challenge/diversity_boost actually implemented	—	Phase 4
v2	Content-based: TF-IDF (overview+keywords) cosine + attribute vector	catalog	Phase 4
v3	Hybrid: v2 + CF (implicit ALS) blended via slider-weighted z-scores	MovieLens 32M (train) + app interactions (blend weight)	Phase 5
v4	Learning-to-rank: LightGBM lambdarank on impression labels (click/save/dismiss)	app impressions only, needs ≥50k labeled pairs	Phase 7 (data-gated, not time-gated)
v5	Embedding personalization (user vec = weighted avg of loved-movie vecs)	pgvector	Phase 7
Weights are never hardcoded magic numbers: every blend weight lives in model_versions.metrics / a versioned config, and v4 replaces hand weights with learned ones.

9.4 Modes (one endpoint, explicit mode enum)
GET /api/v1/recommendations?mode=for_you|because_you_liked:{movie_id}|hidden_gems|deep_cuts|tonight|similar_but_different|outside_bubble|next_favorite

tonight = runtime ≤ min(120, median_runtimes+30) ∧ tone match ∧ (availability when real data exists).
outside_bubble = generator G (exploration) + diversity ceiling on user's top genres.
Every mode is a composition of §9.2 generators + §9.3 ranker, not new scoring code.
9.5 Explanations (grounded, the hard rule)
The deterministic scorer returns per-component deltas (it's additive — trivially attributable):

JSON

{
  "match": 0.87,
  "components": [
    {"feature": "pace_match",        "delta": +15, "because": "you prefer slow-burn and this is a Drama"},
    {"feature": "hidden_gems",       "delta": +13, "because": "low popularity (18/100) with strong rating (8.1)"},
    {"feature": "global_taste",      "delta": +20, "because": "Korean cinema, outside your usual Hollywood"},
    {"feature": "baseline_quality",  "delta": +16, "because": "TMDB 8.0"}
  ],
  "explanation": "Slow-burn Korean drama, rated 8.1 but seen by few — matches your hidden-gem and global-cinema settings."
}
Rules: an explanation string may only be generated from a non-zero component; if no component exceeds threshold, show "Recommended because you asked for exploration" (and log it). This kills the fabricated-/why pattern permanently.

9.6 Replace fake telemetry with real telemetry
/ml/overview becomes truthful: active model_versions row, real catalog size, generator health, impression counts, CTR by position, coverage. Model cards list only shipped models with their real eval metrics. The pipeline diagram describes the actual v0–v5 ladder. Honest telemetry is itself a portfolio differentiator.

9.7 Fallback hierarchy (graceful degradation)
text

personalized hybrid (active model)
 → content-based (TF-IDF/attribute)
 → deterministic scorer v0 (always available)
 → hidden gems editorial
 → trending
 → global popular
Each tier is a pure function of DB + config; no tier can 500 because another failed. Response includes served_by so the UI (and you) always know which tier fired.

10. API strategy
Versioned /api/v1 (already in place — keep). The contract table below is the single source of truth; the TS client is generated from the OpenAPI schema so drift becomes a build error, not a runtime 404.

Endpoint	Verbs	Auth	Phase
/auth/register /auth/login /auth/logout /auth/me	POST/GET	cookie	0 (fix)
/auth/refresh	POST	refresh cookie	4
/users/me (GET/PUT, response_model)	GET/PUT	required	0 (fix)
/users/me/taste-controls	GET/PUT	required	0 (fix)
/users/me/profile (real per-user DNA)	GET	required	5
/users/me/watchlist	GET/POST/DELETE	required	3
/users/me/history /users/me/stats	GET	required	3
/movies /movies/{id}	GET	public	1
/movies/{id}/availability	GET	public	6 (real data or 404 — stub deleted)
`/movies/trending	toprated	region/{r}	genre/{g}
/search?q=&filters	GET	public	4
/search/suggest?q=	GET	public	4
/recommendations (mode=, sliders)	GET	optional	4
/recommendations/similar/{movie_id}	GET	public	4
/interactions (event batch)	POST	required	3
/ratings /watchlist	POST/DELETE	required	3
/feedback (single impl, enum action)	POST	required	0 (dedupe)
/compare?a=&b=	GET	optional	8
/ml/overview (truthful)	GET	public	5
/admin/stats /admin/sync/trigger	GET/POST	require_admin	7
/health/live /health/ready	GET	public	0 (keep)
Rules: no identity in query strings, ever. Pydantic request/response models on every route (no raw dict, no bare ORM returns). Errors follow {detail, error_id} (exists — keep).

11. Security architecture
Tier 0 — ship-blocking (Phase 0, all verified in audit):

Any import fix; add uvicorn smoke-boot step to CI so this class of bug can never merge again.
response_model=UserResponse on every user-returning route (hash leak closed).
Delete /{user_id} taste-control/profile aliases; user_id == current_user.id enforced server-side.
Feedback identity from Depends(get_current_user_optional); action = Literal enum.
Compose: JWT_SECRET (not SECRET_KEY); ENVIRONMENT=production, COOKIE_SECURE=true, CORS_ORIGINS pinned.
Tier 1 — hardening (Phases 1–4):

Startup guard: production boot refuses if jwt_secret is the default or cookie_secure is false.
Rate limiting via slowapi (already a dependency): /auth/* 5/min/IP, search 30/min, writes 60/min; nginx limit_req stays as layer 2.
Passwords: min 8 chars + zxcvbn-lite check; bcrypt 72-byte guard; login errors uniform ("Incorrect email or password" — already correct).
JWT: short-lived access (15 min) + implement /auth/refresh with rotating refresh cookie (30d, Path=/api/v1/auth), jti + iat claims, revocation list in Redis. python-jose → PyJWT (jose is unmaintained; CVE history).
Admin: real require_admin dependency reading is_admin from DB (never from token claims alone); admin routes under /api/v1/admin/*; middleware stops parsing JWTs entirely (UX guard uses /auth/me).
CSRF: keep SameSite=Lax; if cross-site cookie flow ever needed, add double-submit token + Origin check (documented in SECURITY.md).
Input: body size limits (1 MB), Pydantic everywhere, SQL injection safe (SQLAlchemy only — verify no raw f-string SQL).
Headers: Vercel config adds CSP, HSTS, X-Frame-Options:DENY, X-Content-Type-Options, Referrer-Policy.
12. Frontend architecture
Keep the stack (Next.js 15 App Router, React 19, Tailwind, zustand, react-query — all fine). Changes:

API client generated from backend OpenAPI (openapi-typescript + openapi-fetch) → lib/api-generated.ts. Hand-written lib/api.ts shrinks to re-exports. Phantom endpoints become type errors.
Wire the orphans (already built — highest ROI in the whole plan):
TasteConstellation → recommendations page + profile (replaces its ad-hoc sliders).
WhyRecommendedSheet → every movie card "Why?" affordance; consumes §9.5 components.
WhyNotThisDialog → card menu; posts enum feedback to /feedback.
SearchBar → navbar; debounced /search/suggest.
Auth unification: one API base (NEXT_PUBLIC_API_URL only — delete the hardcoded neuralflix.onrender.com fallbacks); authFetch everywhere; refresh flow lands in Phase 4 with the backend endpoint.
Pages rebuilt around the product loop (master prompt §21–31): landing (intent-first hero + examples), onboarding (pick 5–10 loved movies → seed profile → Taste DNA reveal), dashboard (personalized rows, not just trending), search (URL-param shareable state), movie detail ("Why you might like this" block = §9.5), taste profile (Taste DNA from real interaction data with "inferred, evolving" framing), watchlist intelligence ("what to watch tonight from your list" = mode=tonight scoped to watchlist), compare (Phase 8).
Performance/a11y baseline: route-level code splitting (default), next/image with TMDB remotePatterns (exists), skeletons (exists), virtualized long grids via @tanstack/react-virtual (already a dep), reduced-motion respect, keyboard nav, contrast pass, alt text on posters.
Delete: mock admin stats screen (rebuilt Phase 7 on real /admin/stats), Google/GitHub buttons (until OAuth ships), KeepAlive (replaced by Render cron pinger hitting /health/live).
13. ML & evaluation architecture (the credibility engine)
text

pipeline/
├── datasets/        movielens_download.py, imdb_tsv_download.py, tmdb_snapshot.py
├── features/        movie_features.py (tfidf, attribute vectors), user_features.py
├── training/        train_content.py, train_cf.py (implicit ALS), train_ltr.py (LightGBM)
├── evaluation/      splits.py (TEMPORAL), metrics.py (Recall@K, NDCG@K, MAP@K,
│                    coverage, novelty, diversity/ILD, serendipity), run_eval.py
└── registry/        register_model.py → model_versions
Non-negotiable evaluation rules (these erase the audit's fabrication findings):

Temporal split: train < T_val < T_test, documented per run in model_versions.train_window.
Every reported number is regenerable by python -m pipeline.evaluation.run_eval --model X and committed with the command + dataset versions in docs/ML.md.
Baselines always shown: random, popularity, content, hybrid — the master prompt's table, for real this time.
No user-level metric claims until the app has real users; MovieLens results labeled "offline benchmark, MovieLens users" — never "our users".
14. Deployment & free-resource architecture
Concern	Choice	Free-tier reality (verify limits before relying on them)
Frontend	Vercel hobby	fine; keep bom1 region preference
Backend	Render free web service	spins down; acceptable — cold start handled by UI skeleton + status toast (component exists: ServerStatusToast)
Postgres	Neon free (or Supabase)	~0.5 GB → fits the 3–5k-movie catalog + a year of events
Redis	Upstash free	cache + rate limits + RQ broker
Cron/ingestion	GitHub Actions schedule:	TMDB sync daily, MovieLens refresh monthly; workers run as GH Action steps hitting Neon/Upstash directly
ML training	local laptop / free Colab	artifacts registered into model_versions
Images	TMDB CDN direct, next/image	attribution required — footer credit
docker-compose (local dev, rewritten Phase 1): frontend + api + postgres + redis + worker only. No celery beat, no prometheus/grafana/pgvector-until-Phase-6, healthcheck via python -c (no curl in slim image), Grafana deleted (observability = structured logs + /ml/overview until scale demands more). Non-root Dockerfile user, multi-stage build, .dockerignore (keeps DB files/logs out of images).

CI/CD (GitHub Actions, one workflow): ruff + mypy → backend pytest (with uvicorn boot smoke test) → frontend tsc --noEmit + eslint + next build → OpenAPI drift check (regenerate client, git diff --exit-code) → deploy hooks. Branch protection: CI green required. Actions bumped to v4.

Local dev bar: docker compose up → app on :3000, API :8000, seeded catalog, one demo user. ≤5 minutes from clone to clicking.

PART IV — EXACT IMPLEMENTATION ORDER
Estimates assume focused evenings/weekends. Every phase ends green in CI with the acceptance criteria met — no phase starts until the previous one's criteria pass.

Phase 0 — Triage & Honesty (1–2 days) 🔴
Goal: the repo runs, tells the truth, and can't regress.

Fix from typing import Any, List, Optional in app/routers/movies.py.
Security P0s (audit §12.1): response_model on user routes; delete /{user_id} aliases; feedback identity via dependency + enum; compose JWT_SECRET fix; startup production guard.
git rm --cached DB/log artifacts; extend .gitignore.
Delete: archive/legacy/ (after tagging v3-legacy-archive), check_ci.py, test_implementation.py, fake eval JSON, user-study.md, mock admin stats, dead OAuth buttons, root vercel.json, KeepAlive.
README rewrite (§17) — describes the deterministic engine honestly; docs/non-goals.md linked as constitution.
CI: Actions→v4, add uvicorn smoke boot, branch protection on.
Tests: add regression tests for every P0 above (IDOR returns 401/403, response schema excludes hashed_password, feedback rejects bogus action).
Accept: CI green on push; docker compose up serves the app; curl /users/me never contains a hash; anonymous taste-control write returns 401.

Phase 1 — Foundation Repairs (3–5 days)
Postgres migrations (§6 Phase-1 DDL) via Alembic; create_all dev-only.
SQL pushdown for genre/mood/region/home endpoints; drop selectin → lazy="raise" on hot paths; fix seed loop (single IN query); pooled httpx client; in-memory cache TTL.
Rate limiting (slowapi) + password policy + PyJWT swap.
Rewrite compose/Dockerfile/env examples (§14). Single .env.example generated from Settings.
Frontend: unified API base, nf_access_token middleware fix (or middleware deletion pending server guard), remove phantom calls that Phase 3+ won't resurrect (events lib stays for Phase 3).
Accept: p95 home/search/movies < 100 ms locally with 26 rows and with a 5k-row test fixture; auth rate-limited; compose boots clean with zero ghost services.

Phase 2 — Data Platform (1–2 weeks)
pipeline/ skeleton; TMDB incremental sync (§7.2) with checkpoints + idempotent upserts + dedupe log.
Migrations for people, movie_cast, movie_crew, keywords, movie_keywords, watch_events, search_queries, model_versions, ingestion_checkpoints.
Ingest to ~3,000 movies (popular/top-rated/regional/MovieLens-top join). Backfill TMDB movies' cinema_region from original_language + origin_country (fixes the "global taste never fires" bug).
FTS + trigram indexes; attribution footer.
Generate the OpenAPI TS client; rewrite lib/api.ts on top of it; delete phantom functions.
Accept: sync resumable from checkpoint (kill mid-run, rerun, zero duplicates); catalog ≥3k with real keywords/cast; search finds "interstaller" typo and "korean thriller" cast/crew queries; client has zero references to non-existent routes (CI-enforced).

Phase 3 — Interaction Loop (1 week)
Real endpoints: watchlist CRUD (persist via WatchlistItem), ratings, history, stats, POST /interactions batch.
Wire event tracking: card impressions, detail opens, trailer clicks, watchlist adds, search clicks → RecommendationImpression + watch_events + search_queries.
Wire orphaned UI: SearchBar, WhyNotThisDialog (enum feedback), TasteConstellation (persist to taste-controls, live rerank).
Onboarding flow: pick 5–10 loved movies → seed initial profile vector → Taste DNA reveal page.
Accept: a new user can go signup → onboard → see their DNA → get recommendations that visibly change with slider moves; every recommendation row writes an impression; profile page shows real (possibly sparse) stats — never mock numbers.

Phase 4 — ML v1/v2 + Search (1–2 weeks)
Scorer v1: implement discovery, challenge, diversity_boost; per-component attribution output (§9.5); /why endpoint returns real components.
Content recommender v2: TF-IDF over overview+keywords (offline job → similarity artifacts); /recommendations/similar/{id} upgraded from genre-overlap to content vectors.
Modes: for_you, hidden_gems, tonight, outside_bubble (§9.4) over the generator framework.
Search: query parser (§8.1) + FTS/trigram retrieval + RRF fusion + /search/suggest; results taste-ordered for signed-in users.
Offline eval harness (§13): temporal split, baseline table (random/popularity/content), metrics JSON committed with run command. Delete-or-regenerate rule enforced.
Accept: docs/ML.md shows a real baseline table reproducible by one command; recommendations explain themselves from actual deltas; search handles "dark sci-fi under 2 hours"; sliders all demonstrably change output.

Phase 5 — CF + Hybrid (1–2 weeks)
Implicit ALS on MovieLens 32M (temporal split); map to catalog via imdb/tmdb links.
Hybrid blend v3: z-scored content + CF + quality, weights versioned; cold-start = onboarding profile → content path (documented).
User Taste DNA from real interactions (genre/tone/runtime/era vectors); /users/me/profile replaced with the real thing; "taste evolution" computed from time-windowed vectors.
Truthful /ml/overview + model cards from model_versions.
Hidden-gem engine (§9.2 D) with the proper score, not rating>7 ∧ pop<X.
Accept: eval table shows hybrid > content > popularity on Recall@10/NDCG@10 with dataset provenance; cold-start users get onboarding-seeded recs; zero fabricated numbers anywhere in the UI.

Phase 6 — Semantic Layer (1 week, optional-but-recommended)
MiniLM embeddings for catalog (overview+keywords); movie_embeddings pgvector table; similarity + semantic search via fusion.
similar_but_different mode (attribute-held-constant, others-varied).
Compare page data endpoint (/compare): predicted preference = hybrid score delta with explanation.
Accept: "movies like Interstellar but shorter, less depressing" returns sensible ranked results with explanations; compare page shows predicted-preference winner with component reasons.

Phase 7 — Production Polish (1 week)
/auth/refresh + rotation + revocation; re-add frontend refresh flow (it's already written — performRefresh()).
Admin: require_admin, /admin/stats real metrics, manual sync/eval triggers.
LTR gate check: if impressions ≥50k labeled pairs → train LightGBM lambdarank v4; else record the gate decision in ML.md (data-gated, honest).
Observability pass: latency histograms per endpoint + external-call timings in logs; error budget alerts via GH Action on CI flakiness.
Load test (locust) on search + recommendations; fix what falls over; document numbers.
Accept: full auth rotation works across two tabs; admin dashboard shows only real data; load-test report committed; runbook updated to match reality.

Phase 8 — Signature UX Completion (1–2 weeks)
Dashboard personalization rows ("Because you liked…", "Hidden gems for you", "Outside your comfort zone") — all served by modes from §9.4.
Watchlist intelligence (mode=tonight scoped to watchlist).
Discovery graph visualization (Phase 6 embeddings → nearest-neighbor edges; ship as opt-in heavy page).
Mobile-first audit of every page; a11y pass (keyboard, contrast, reduced motion, alt text).
Feedback moments ("Was this useful?") throttled to ~1/session → impression labels (feeds Phase 7 LTR).
Accept: Lighthouse ≥90 perf/a11y on home, search, movie detail; the demo loop "search → discover → interact → recommendations visibly improve" works end-to-end in a clean browser profile.

PART V — GUARDRAILS
17. The honesty rules (repo law, enforced by CI where possible)
No number without a generator. Any metric in UI/docs must be traceable to pipeline/evaluation/run_eval output or a live DB aggregate. (Review checklist + grep-able rule: no hardcoded totalUsers, ageHours, model "Active" strings.)
No explanation without attribution. /why strings only from non-zero score components.
No identity via query string. Dependencies only.
No endpoint without a Pydantic response model (OpenAPI client CI-diff makes violations fail builds).
No mock fallback that renders as real data. Empty states say "no data"; skeletons say loading; fallbacks say which tier served (served_by).
No external calls in user-request hot paths except cache-miss metadata reads with strict timeouts.
Non-goals.md remains binding — no shadow profiles, no fabricated availability, no gamified culture.
18. What NOT to do (carried from the master prompt + audit scars)
Don't scrape IMDb. Don't put API keys in frontend code. Don't train on MovieLens and call those users "ours." Don't run model inference per request when precomputation works. Don't add a database per feature. Don't ship deep learning to look impressive — ship it when the eval table says it wins. Don't random-split temporal data. Don't hardcode weights without a version column. Don't let the README out-dream the diff — the README may only claim what CI can prove.

19. Definition of done (product level)
A stranger can, in under 3 minutes: sign up → pick 5 movies they love → see their Taste DNA → get explained recommendations → move a slider and watch the reasoning change → say "why?" and get a true answer → save to watchlist → get told what to watch tonight. Every screen they saw was backed by data that exists, models that are versioned, and metrics that regenerate. That — not the NCF badge — is the portfolio piece.

Cross-references: security evidence → 
NeuralFlix_Audit_Report.md
 §3–5 · full file inventory → §2–4 above · endpoint audit trail → audit §7. All audit claims were verified by execution (test run, CI API check, import crash reproduction) on 2026-08-27.