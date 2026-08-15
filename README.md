# NeuralFlix — The Explainable Global Cinema Atlas

> **A personal map of where your cinematic curiosity has been, where it could go next, and why each film belongs in your journey.**

---

## Overview

Most modern movie streaming and recommendation platforms treat discovery as an opaque black box: endless vertical carousels, algorithmic popularity loops, and fabricated "98% Match" confidence scores that trap viewers inside repetitive Hollywood echo chambers.

**NeuralFlix** is built on a fundamentally different philosophy: **Discovery should be intentional, explainable, and globally expansive.** 

NeuralFlix is not just a recommendation feed—it is a **Global Cinema Atlas**. It gives you explicit, transparent control over what you want to explore, unveils unexpected cultural bridges between international film traditions, and provides clear, evidence-based reasoning behind every suggested title.

---

## Key Features

### 1. The Taste Constellation
Instead of hidden algorithmic profiles, NeuralFlix puts you in direct command with a 5-axis parametric tuner:
- **Familiar ↔ Adventurous**: Controls how far recommendations stray from your established genre preferences.
- **Local ↔ Global**: Weights international cinema, regional narratives, and non-English storytelling.
- **Light ↔ Challenging**: Adjusts thematic intensity, narrative complexity, and arthouse weight.
- **Fast-Paced ↔ Slow-Burn**: Aligns with your current mood for narrative velocity and contemplative pacing.
- **Popular ↔ Hidden Gems**: Applies logarithmic popularity debiasing to surface overlooked masterpieces.

### 2. One Film, Three Paths
When you connect deeply with a film, NeuralFlix moves beyond generic "similar movies" by branching your discovery into three distinct pathways:
- **Path 1 — Similar Feeling**: Aesthetic and tonal resonance (quiet, reflective, high-octane, or melancholic).
- **Path 2 — Cultural Conversation**: Deeper immersion into the film's regional themes, historical context, and societal dynamics.
- **Path 3 — Global Bridge**: International cinematic twins from across the globe that share the same narrative spirit.

### 3. Curated Cinema Trails
Structured, step-by-step cinematic journeys across movements, directors, and eras. Each step highlights the exact thematic transition:
- *Hindi Parallel Cinema → Iranian Social Realism* (Masaan → Court → A Separation → Taste of Cherry)
- *French New Wave → Hong Kong Second Wave* (Breathless → Cleo from 5 to 7 → Days of Being Wild → In the Mood for Love)
- *Nordic Noir → Japanese Psychological Thrillers*
- *Italian Neorealism → Latin American Social Cinema*

### 4. Discovery Passport
An opt-in, privacy-first reflection of your cinematic horizons:
- **Territory & Language Breadth**: Explored world regions without gamified or patronizing language.
- **Auteur Horizon**: First-time director discoveries and emerging cinematic voices.
- **Comfort vs. Discovery Ratio**: Real-time balance between your comfort zone and exploratory leaps.
- **Data Sovereignty**: Complete one-click export and deletion of your viewing history and preferences.

### 5. Cultural Bridge Engine
Connects distinct international film industries through shared narrative DNA:
- Links Korean psychological thrillers with Nordic noir, French investigative crime, and Indian procedural masterworks through common structural elements: moral ambiguity, intense social pressure, and deliberate pacing.

### 6. Transparent Recommendation Attribution
NeuralFlix removes deceptive "AI confidence percentages" in favor of honest, deterministic match tiers:
- **Strong Match**: Directly aligns with your explicit multi-genre and pacing preferences.
- **Discovery Leap**: Expands into new international cinema while preserving emotional resonance.
- **Wildcard**: Intentionally selected from outside your usual patterns based on your adventurous discovery settings.
- **Evidence Sheet**: Every recommendation lists transparent evidence factors (genre overlap, director style, cultural bridge tag, catalog freshness).

### 7. Tonight Mode
A practical viewing filter built around real-world constraints:
- Available selection time (5 min vs. 15 min)
- Viewing duration (under 90 min, 120 min, 150+ min)
- Emotional energy level (Light, Engaging, Deep)
- Group context (Solo, Date night, Friends, Family)
- Subtitle readiness and regional streaming availability

### 8. Multi-Source Ratings & Streaming Telemetry
- **Aggregated Ratings Matrix**: Side-by-side composite telemetry combining IMDb, Rotten Tomatoes (Tomatometer & Audience), Metacritic, and TMDB.
- **Availability Freshness**: Clear indicators for Stream (Flatrate), Rent, and Buy options across major platforms.

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           NEURALFLIX PLATFORM                           │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
┌──────────────────────────────────┐        ┌──────────────────────────────────┐
│          FRONTEND NEXT           │        │         FASTAPI BACKEND          │
│  • Next.js 15 (App Router)       │        │  • FastAPI (Python 3.12+)        │
│  • TypeScript (Strict Mode)      │ ◄────► │  • Async SQLAlchemy 2.0          │
│  • Tailwind CSS & Framer Motion  │  HTTP  │  • Alembic Schema Migrations     │
│  • Zustand State Management      │        │  • Deterministic Reranker        │
│  • Next/Image Optimization       │        │  • TMDB & OMDb Integrations      │
└──────────────────────────────────┘        └──────────────────────────────────┘
```

### Frontend Stack
- **Framework**: Next.js 15 (App Router, Server Components & Client Hydration)
- **Language**: TypeScript with strict typing (no `@ts-nocheck`, 0 explicit `any`)
- **Styling**: Tailwind CSS with custom design tokens, dark mode, and glassmorphic elevations
- **Animations**: Framer Motion for micro-interactions and transitions
- **Icons**: Lucide React

### Backend Stack
- **Framework**: FastAPI (Async Python)
- **Database Layer**: SQLAlchemy 2.0 Async with Alembic migrations
- **Databases**: SQLite (Development) / PostgreSQL (Production)
- **Authentication**: Secure HTTP-only cookies and bcrypt password hashing
- **Testing**: Pytest with `httpx` async test client

---

## Project Structure

```text
movie-recommendation-system/
├── backend/
│   ├── alembic/                 # Database migrations
│   ├── app/
│   │   ├── models/              # SQLAlchemy database models
│   │   ├── routers/             # API route controllers
│   │   │   ├── auth.py          # Authentication & user sessions
│   │   │   ├── availability.py  # Streaming platform availability
│   │   │   ├── feedback.py      # Recommendation feedback
│   │   │   ├── health.py        # /health/live & /health/ready probes
│   │   │   ├── home.py          # Home discovery feed
│   │   │   ├── movies.py        # Search, details, ratings, mood
│   │   │   ├── recommendations.py # Feed & explanation endpoints
│   │   │   ├── trails.py        # Cinema trails router
│   │   │   └── users.py         # Watchlist & profile management
│   │   ├── schemas/             # Pydantic validation schemas
│   │   ├── services/            # Core business logic & integrations
│   │   │   ├── catalog_service.py
│   │   │   ├── cultural_bridge_service.py
│   │   │   ├── recommendation_service.py
│   │   │   ├── three_paths_service.py
│   │   │   └── tmdb_service.py
│   │   └── tests/               # Pytest suite
│   ├── requirements.txt
│   └── Dockerfile
│
└── frontend-next/
    ├── app/                     # Next.js App Router pages
    │   ├── cinema/[region]/     # Regional cinema hubs
    │   ├── discover/            # Filtered catalog explorer
    │   ├── movie/[id]/          # Movie detail & 3-paths view
    │   ├── onboarding/          # Taste calibration flow
    │   ├── profile/             # Discovery passport & taste DNA
    │   ├── recommendations/     # Taste Constellation & picks
    │   ├── search/              # Debounced faceted search
    │   ├── trails/              # Cinema Trails explorer
    │   └── watchlist/           # Saved movies
    ├── components/              # Modular UI components
    ├── hooks/                   # Custom React hooks
    ├── lib/                     # API client, auth & types
    └── package.json
```

---

## Getting Started

### Prerequisites
- Python 3.12+
- Node.js 22+
- Git

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Apply database migrations
alembic upgrade head

# Run unit and integration tests
pytest app/tests/ -v

# Start backend server on port 8000
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend-next

# Install dependencies
npm ci

# Run linting and type check
npm run lint

# Build for production
npm run build

# Start local development server on port 3000
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to explore NeuralFlix.

---

## Core API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health/live` | Liveness probe for deployment monitors |
| `GET` | `/health/ready` | Readiness probe (database & service status) |
| `GET` | `/api/v1/home` | Curated homepage feed with live TMDB fallback |
| `GET` | `/api/v1/movies/trending` | Trending international cinema titles |
| `GET` | `/api/v1/movies/search/?query={q}` | Debounced movie search |
| `GET` | `/api/v1/movies/{id}` | Detailed movie metadata & cast |
| `GET` | `/api/v1/movies/{id}/ratings` | Multi-source aggregated ratings |
| `GET` | `/api/v1/movies/{id}/streaming` | Streaming, rent, and buy providers |
| `GET` | `/api/v1/recommendations/feed` | Personalized picks driven by Taste Constellation |
| `GET` | `/api/v1/recommendations/{id}/why` | Transparent reasoning & evidence factors |
| `GET` | `/api/v1/trails` | Curated cinema exploration trails |
| `POST` | `/api/v1/auth/register` | User account registration |
| `POST` | `/api/v1/auth/login` | Session authentication |
| `GET` | `/docs` | Interactive Swagger API documentation |

---

## License

This project is licensed under the MIT License.
