# Recommendation serving path

## Current request path

1. Next.js sends browser API calls to same-origin `/api/v1/*`; Next rewrites them to FastAPI.
2. FastAPI reads catalog records from SQLAlchemy using the configured PostgreSQL or SQLite database.
3. Authenticated feed requests load the user's Taste Controls and call `get_recommendations_for_user`.
4. The deterministic scorer ranks candidates and creates explanations from the same score components.
5. User feedback and interaction endpoints persist actions. Recommendation improvement is opt-in and timestamped.

The serving path is not a trained ML pipeline. There is no production feature store, model registry lifecycle, offline-to-online artifact promotion, or collaborative filtering model active in requests.

## Current limits

- Recommendation, similar-title, search, and autocomplete paths contain full or broad catalog reads. This must change before a million-record latency target can be claimed.
- Ranking is deterministic, not learned. Explanations describe scorer components; they are not a causal explanation of a trained model.
- The app seeds 26 curated films for development. `media_type` supports `movie` and `tv`, and the series endpoint now selects only `tv`, but no TV/episode loader is wired in.
- The existing TMDB ingestion path is not the open-data ingestion route selected for the future catalog. Verify applicable data/API terms before commercial use.
- User interactions are counted only for opted-in users. No event export or training job consumes them yet.

## Scaling path before production ML

1. Select and document a catalog source and allowed SaaS use; keep stable source IDs, attribution, and license metadata.
2. Model titles, series, seasons, and episodes with stable relationships and source-specific identifiers.
3. Replace unbounded catalog scans with database-side filtering and indexed candidate retrieval; benchmark at target catalog size.
4. Define event schemas, retention/deletion behavior, consent boundaries, and idempotency before exporting events.
5. Build a reproducible offline training/evaluation pipeline, compare against the current deterministic baseline, and publish dataset/split/metric details.
6. Register immutable model artifacts and promote only after offline and online checks, with a rollback path.

Until those steps are complete, the deterministic scorer is the supported fallback and no model quality or million-item performance claim should be made.
