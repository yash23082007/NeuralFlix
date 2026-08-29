# Movie Intelligence Platform — Non-Goals

Movie Intelligence Platform does not:

- **Infer mood from private data** — We do not use camera, microphone, biometric sensors, or hidden behavior signals to guess emotional state.

- **Use camera, microphone, or hidden behavior signals** — No screen recording, keystroke logging, mouse movement tracking, or ambient listening is performed.

- **Serve random neural model predictions** — The default production recommendation path runs without PyTorch. Experimental ML models (NCF, SASRec, GNN) are gated behind explicit feature flags and require documented evaluation reports before activation.

- **Claim real-time streaming availability without a timestamp/source** — Every platform availability entry includes `checkedAt`, `source`, and `ageHours`. Stale data (>72 hours) is visually marked.

- **Claim recommendations are objectively correct** — Recommendations are ranked by a deterministic, explainable reranker. Every recommendation includes structured reasons. Users can inspect why a movie was suggested and provide corrective feedback.

- **Use user data beyond documented personalization controls** — We collect only the data necessary for the features the user has explicitly opted into:
  - Taste constellation slider values (user-set)
  - Watch history (if discovery passport is opted in)
  - Explicit feedback ("Why Not This" reasons)
  - Genre and language preferences (set during onboarding)
  
  We do not:
  - Build shadow profiles from browsing behavior
  - Sell or share user data with third parties
  - Use negative feedback for unrelated ad targeting
  - Track users across sessions without opt-in

- **Generate cultural explanations automatically** — Cinema Trails transition reasons are editorially curated, not auto-generated. We do not claim AI-generated cultural commentary is authoritative.

- **Gamify cultural exploration** — The Discovery Passport shows statistics (languages explored, countries, directors), but does not assign points, badges, or achievements to cultures or countries.

- **Guarantee streaming availability** — Platform availability data comes from third-party sources (Watchmode, TMDB) and may be outdated. We show freshness indicators so users can assess reliability.
