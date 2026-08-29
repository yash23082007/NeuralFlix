# ?? Movie Intelligence Platform: Movie Intelligence Platform

<div align="center">

![Movie Intelligence Platform Banner](https://raw.githubusercontent.com/yash6/movie-recommendation-system/main/docs/assets/banner.png)

[![Python 3.11+](https://img.shields.io/badge/python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**An honest, deterministic, and fully explainable movie recommendation platform.**

</div>

---

## ?? The Philosophy

Movie Intelligence Platform is built on a foundation of transparency and user agency. Instead of opaque, uncalibrated black-box models that optimize for engagement, Movie Intelligence Platform relies on a **Deterministic Explainable Scorer** (our V0 Ranker).

Our constitution is explicitly defined in [docs/non-goals.md](docs/non-goals.md). We do not use shadow profiles, we do not make fake availability claims, and we do not gamify user culture.

---

## ?? Core Architecture

- **Backend**: FastAPI v4 running on async SQLAlchemy 2.0 with PostgreSQL/SQLite.
- **Frontend**: Next.js 15, React 19, and Tailwind CSS.
- **Engine**: The "Taste Profile" deterministic scorer provides transparent, user-steerable, and per-feature attributable movie recommendations.
- **Data Model**: A robust interaction schema (`RecommendationFeedback`, `WatchlistItem`, `Rating`, `RecommendationImpression`) that tracks real user events (views, clicks, saves, dismissals).

### Taste Profile Deterministic Scorer
A transparent, multi-axis deterministic scorer that adjusts recommendations in real-time based on your explicit preferences. It provides detailed, exact mathematical breakdowns of why a movie was recommended.

---

## ?? Getting Started

### 1. Quick Start with Docker Compose

```bash
git clone https://github.com/yash6/movie-recommendation-system.git
cd movie-recommendation-system

# Build and start the minimal stack (Backend, Frontend, PostgreSQL, Redis)
docker-compose up --build
```
The application will be accessible at:
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **FastAPI Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

### 2. Manual Local Setup

#### A. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head      # Run migrations
uvicorn app.main:app --reload --port 8000
```

#### B. Frontend Setup
```bash
cd frontend-next
npm install
npm run dev
```

---

## ?? REST API Documentation

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET`  | `/api/v1/recommendations/feed` | Returns personalized Top-K recommendations computed via the deterministic engine. |
| `GET`  | `/api/v1/recommendations/{id}/why` | Returns explainable AI attributions and exact matching factors. |
| `GET`  | `/api/v1/users/me/profile` | Returns the sequenced Taste Profile profile based on real interactions. |
| `PUT`  | `/api/v1/users/me/taste-controls` | Updates the Taste Profile preferences in real-time. |
| `POST` | `/api/v1/recommendations/feedback` | Ingests explicit user feedback ("like", "dislike", "watchlist"). |

---

## ?? License & Attribution

Distributed under the **MIT License**. See `LICENSE` for more information.

Developed with ?? as a transparent and user-first movie intelligence platform.
