<div align="center">
  <img src="https://raw.githubusercontent.com/yash23082007/NeuralFlix/main/frontend-next/public/favicon.ico" alt="NeuralFlix Logo" width="120" height="120" />
  
  # NeuralFlix 🎬
  **Explainable Global Cinema Discovery Platform**

  [![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
  [![Next.js 15](https://img.shields.io/badge/Frontend-Next.js%2015-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
  [![Tailwind CSS v4](https://img.shields.io/badge/Styling-Tailwind%20v4-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
  [![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
  [![Deployed on Vercel](https://img.shields.io/badge/Deployed-Vercel-black?style=for-the-badge&logo=vercel)](https://neural-flix.vercel.app/)
  [![Deployed on Render](https://img.shields.io/badge/Deployed-Render-46E3B7?style=for-the-badge&logo=render)](https://neuralflix.onrender.com)
</div>

<br />

> **NeuralFlix** helps users discover global cinema through transparent, user-controlled recommendations.
>
> Users can tune familiar/adventurous, local/global, light/challenging, fast/slow-burn, and popular/hidden-gem preferences. Every recommendation includes explicit reasons and freshness metadata.

---

## 🌐 Live Demo & Deployment

| Platform | Link | Status |
| :--- | :--- | :--- |
| **Frontend UI** | [https://neural-flix.vercel.app/](https://neural-flix.vercel.app/) | 🟢 Live (Vercel) |
| **Backend API** | [https://neuralflix.onrender.com/health](https://neuralflix.onrender.com/health) | 🟢 Live (Render) |

---

## ✨ Core Features

### 🔐 Security
- **HttpOnly cookie authentication** — no JWT in localStorage or client-written cookies
- **Server-side admin authorization** — no frontend-only admin checks
- **Authenticated WebSocket** — identity derived from server-verified cookie, not URL parameter
- **Explicit CORS** — no wildcard origins

### 🎯 Taste Constellation (User Controls)
- **Five dual-axis sliders**: Familiar↔Adventurous, Local↔Global, Light↔Challenging, Fast↔Slow-burn, Popular↔Hidden gems
- **Diversity boost** toggle for broadening recommendations
- **Explicit control** — preferences are never inferred without disclosure

### 💡 Explainable Recommendations
- **"Why This"** — every recommendation includes structured, inspectable reasons (genre overlap, language match, diversity boost, etc.)
- **"Why Not This"** — users can dismiss recommendations with explicit feedback (already watched, too slow, wrong language, etc.)
- **Ranking transparency** — ranking version and catalog freshness metadata included

### 🗺️ Cinema Trails
- **Curated discovery journeys** across global cinema (e.g., Hindi parallel cinema → Iranian social realism)
- **Transition reasons** explain the thematic connection between consecutive films

### 📊 Discovery Passport
- **Private discovery history** — languages explored, countries, new directors, hidden gems
- **Comfort/discovery ratio** — honest breakdown without gamification
- **Privacy controls** — opt-in tracking, export, delete

### 📡 Availability Freshness
- **Timestamped streaming availability** — every platform entry includes `checkedAt` and source
- **Freshness indicators** — fresh (<24h), aging (24–72h), stale (>72h), unknown

### 📈 Recommendation Evaluation
- **Time-aware evaluation** — temporal train/test split (never random shuffle for sequential data)
- **Baselines** — popularity, genre overlap, content similarity
- **Diversity metrics** — genre, language, country diversity alongside relevance (Recall@10, NDCG@10, MRR)

---

## 🏗️ System Architecture

```mermaid
graph TD
    User([Client / Browser]) -->|HTTPS + HttpOnly Cookies| Vercel[Next.js 15 Frontend on Vercel]
    Vercel -->|REST API / WebSockets| Render[FastAPI Backend on Render]
    
    subgraph "Recommendation Engine (Production)"
        Render --> CBF[Content-Based TF-IDF]
        Render --> TR[Taste-Control Reranker]
        Render --> DIV[Diversity Filter]
    end

    subgraph "Experimental ML (Feature-Gated)"
        Render -.->|ENABLE_NCF| NCF[NCF Deep Learning]
        Render -.->|ENABLE_SASREC| SAS[SASRec Sequential]
        Render -.->|ENABLE_GNN| GNN[Graph Neural Network]
        Render -.->|ENABLE_BANDIT| BAN[Thompson Sampling Bandit]
    end

    subgraph "Data Storage"
        Render <--> PG[(PostgreSQL Database)]
        Render <--> Redis[(Redis Cache)]
        Render <--> SQLite[(SQLite Fallback)]
    end
```

### Production vs Experimental

| Component | Status | Requires PyTorch | Feature Flag |
| :--- | :---: | :---: | :--- |
| Content-Based TF-IDF | ✅ Production | No | Always on |
| Taste-Control Reranker | ✅ Production | No | Always on |
| Popularity Baseline | ✅ Production | No | Always on |
| Diversity Filter | ✅ Production | No | Always on |
| NCF (Neural Collaborative Filtering) | 🧪 Experimental | Yes | `ENABLE_NCF` |
| SASRec (Sequential Transformer) | 🧪 Experimental | Yes | `ENABLE_SASREC` |
| GNN (Graph Neural Network) | 🧪 Experimental | Yes | `ENABLE_GNN` |
| Thompson Sampling Bandit | 🧪 Experimental | No | `ENABLE_BANDIT` |
| Qdrant/FAISS Vector Search | 🧪 Experimental | No | `ENABLE_VECTOR_SEARCH` |
| BERT Sentiment Reranker | 🧪 Experimental | Yes | `ENABLE_EXPERIMENTAL_ML` |

> ⚠️ **Default production path runs without PyTorch.** Experimental models require explicit opt-in via environment flags and documented evaluation reports.

---

## 🔌 API Reference Guide

| Endpoint | Method | Auth | Description |
| :--- | :---: | :---: | :--- |
| `/api/v1/auth/register` | `POST` | — | Register a new user |
| `/api/v1/auth/login` | `POST` | — | Login (sets HttpOnly cookies) |
| `/api/v1/auth/me` | `GET` | 🔒 | Get current user profile |
| `/api/v1/movies` | `GET` | — | Paginated catalog with filtering |
| `/api/v1/recommendations/user/{id}` | `GET` | 🔒 | Personalized recommendations |
| `/api/v1/recommendations/{movie_id}/why` | `GET` | 🔒 | Structured recommendation reasons |
| `/api/v1/recommendations/feedback` | `POST` | 🔒 | Submit "Why Not This" feedback |
| `/api/v1/users/me/taste-controls` | `PUT` | 🔒 | Update taste constellation sliders |
| `/api/v1/cinema-trails` | `GET` | — | List curated cinema trails |
| `/api/v1/users/me/discovery-passport` | `GET` | 🔒 | Private discovery statistics |
| `/ws/recommendations` | `WS` | 🔒 | Real-time recommendations (cookie auth) |
| `/v1/metrics/health` | `GET` | — | System health check |

---

## 🚀 Local Installation & Setup

### 1. Prerequisites
- **Node.js v22+**
- **Python 3.11+**
- **PostgreSQL** (Optional, falls back to SQLite natively)

### 2. Environment Configuration
Create a `.env` file in the `backend` folder based on `.env.example`:

```bash
# Required
JWT_SECRET=your_secure_jwt_secret
TMDB_API_KEY=your_tmdb_developer_key

# Database (optional — falls back to SQLite)
DATABASE_URL=postgresql://user:password@localhost:5432/neuralflix

# Auth cookies
COOKIE_SECURE=false        # true in production
COOKIE_SAMESITE=lax        # none in production (cross-origin)

# Feature flags (all default to false)
ENABLE_EXPERIMENTAL_ML=false
ENABLE_NCF=false
ENABLE_SASREC=false
ENABLE_GNN=false
ENABLE_BANDIT=false
ENABLE_VECTOR_SEARCH=false

# Demo mode (skips PostgreSQL/Redis)
NEURALFLIX_DEMO_MODE=true
```

### 3. Start the Backend (FastAPI)
```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### 4. Create Admin User (one-time)
```bash
cd backend
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=your_secure_password python scripts/create_admin.py
```

### 5. Start the Frontend (Next.js)
```bash
cd frontend-next
npm install
npm run dev
```

Navigate to `http://localhost:3000` to experience NeuralFlix locally!

---

## 📖 Documentation

| Document | Description |
| :--- | :--- |
| [Architecture](docs/architecture.md) | System overview, component diagram, data flow |
| [Auth & Security](docs/auth-security.md) | Cookie-based auth design, CORS, token lifecycle |
| [WebSocket Security](docs/websocket-security.md) | WebSocket authentication protocol |
| [Recommendation Evaluation](docs/recommendation-evaluation.md) | Metrics, baselines, methodology |
| [Model Card](docs/model-card.md) | Each model's purpose, training data, limitations |
| [Data Freshness](docs/data-freshness.md) | Availability sources, staleness policy |
| [Privacy Model](docs/privacy-model.md) | Data collection, user controls, opt-in/opt-out |
| [Deployment Runbook](docs/deployment-runbook.md) | Environment setup, secrets, deployment checklist |
| [Limitations](docs/limitations.md) | Known limitations, honest capability assessment |
| [Non-Goals](docs/non-goals.md) | What NeuralFlix explicitly does not do |

---

## 📈 Observability & Diagnostics

Built-in `Structlog` and custom middleware measure strict API latencies. Current optimized targets aim for **< 200ms** latency.

```bash
# Run evaluation pipeline
cd backend && python -m evaluation.evaluate

# Run end-to-end verification
cd backend && python scripts/verify_e2e.py
```

## 📄 License & Attributions
* **License**: MIT License.
* **Metadata & APIs**: TMDB, Trakt.tv, Watchmode.
* *Engineered for the love of global cinema. 🎬*
