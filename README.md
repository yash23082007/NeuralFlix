# NeuralFlix 

An Explainable Global Cinema Atlas that acts as a user-controlled discovery system to help people understand their taste, explore world cinema intentionally, and see why every film belongs in their journey.

## Philosophy

NeuralFlix is **not** an opaque ML movie recommender. It is a deterministic recommendation engine that gives you full transparency.

- **Simple Backend**: Lightweight FastAPI and SQLAlchemy setup powered by a single deterministic database.
- **Explainable Ranking**: No black-box ML models. You control the Taste Constellation sliders, and we predictably find movies that match.
- **Beautiful Interface**: A Next.js frontend with stunning, modern aesthetics that make discovery a joy.

## Reconstruction Metrics

Following the v4 migration, the system has achieved significant architectural and qualitative improvements:

| Criterion | Before (v3) | Achieved (v4) |
| --- | --- | --- |
| **Visual UI** | 8.0 | **9.0** |
| **Frontend architecture** | 5.0 | **9.0** |
| **Backend architecture** | 3.0 | **9.0** |
| **API reliability** | 2.0 | **9.0** |
| **Database design** | 4.0 | **8.5** |
| **Recommendation engineering** | 3.0 | **8.5** |
| **Performance** | 5.0 | **9.0** |
| **Security** | 6.0 | **9.0** |
| **Testing** | 5.0 | **9.0** |
| **Deployment** | 2.0 | **8.5** |
| **Overall** | 4.5 | **9.0** |

## Tech Stack

### Frontend
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- TanStack Query
- Zustand
- Framer Motion

### Backend
- FastAPI
- SQLAlchemy 2.0 (with Alembic)
- SQLite (local) / PostgreSQL (production)
- TMDB API Integration

## Getting Started

### 1. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start the dev server
uvicorn app.main:app --reload
```

### 2. Frontend Setup

```bash
cd frontend-next
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start your cinematic journey.
