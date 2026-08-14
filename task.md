# Phase 1 — Execution Tasks (COMPLETED)
- `[x]` 1. Delete `node_modules_old/`
- `[x]` 2. ESLint → error mode
- `[x]` 3. Fix all `any` types (userStore, onboarding)
- `[x]` 4. Fix all `_id` / legacy references across components
- `[x]` 5. Fix MovieCard buttons-inside-Link
- `[x]` 6. Create `lib/errors.ts`
- `[x]` 7. Update `lib/types.ts` with missing types
- `[x]` 8. Update `lib/api.ts` with v4 endpoints, timeout, retry
- `[x]` 9. Fix backend trending endpoint (live TMDB)
- `[x]` 10. Fix homepage `page.tsx` — remove force-dynamic, add cold-start fallback
- `[x]` 11. Remove deprecated `getAuthHeaders()` from auth.ts
- `[x]` 12. Fix onboarding build-breaking bugs
- `[x]` 13. Run lint + build verification

# Phase 2 — Frontend Restructuring (IN PROGRESS)
- `[/]` 1. Move components to proper directories
- `[ ]` 2. Split useApi.ts into useQuery hooks
- `[ ]` 3. Create missing UI components (TrailerModal, ColdStartGrid)
- `[ ]` 4. Create trails/ pages
- `[ ]` 5. Store refactor (uiStore, tasteStore)

# Phase 3 — Backend Hardening
- `[ ]` 1. Create core/ directory (security, errors, constants)
- `[ ]` 2. Create missing models & schemas
- `[ ]` 3. Create missing services
- `[ ]` 4. Scripts & Seed data

# Phase 4 — Documentation & CI
- `[ ]` 1. Move infrastructure files
- `[ ]` 2. Add workflows
- `[ ]` 3. Create docs & evaluation framework
