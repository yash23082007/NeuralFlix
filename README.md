<div align="center">
  <img src="https://raw.githubusercontent.com/yash23082007/NeuralFlix/main/frontend-next/public/favicon.ico" alt="NeuralFlix Logo" width="120" height="120" />
  
  # NeuralFlix 🎬
  **The Premium Hybrid ML Recommendation & Cinematic Discovery Platform**

  [![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
  [![Next.js 15](https://img.shields.io/badge/Frontend-Next.js%2015-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
  [![Tailwind CSS v4](https://img.shields.io/badge/Styling-Tailwind%20v4-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
  [![PyTorch](https://img.shields.io/badge/ML-PyTorch-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)](https://pytorch.org/)
  [![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
  [![Deployed on Vercel](https://img.shields.io/badge/Deployed-Vercel-black?style=for-the-badge&logo=vercel)](https://neural-flix.vercel.app/)
  [![Deployed on Render](https://img.shields.io/badge/Deployed-Render-46E3B7?style=for-the-badge&logo=render)](https://neuralflix.onrender.com)
</div>

<br />

> **NeuralFlix** is a state-of-the-art cinematic discovery engine designed to bridge the gap between regional global cinema and mainstream Hollywood blockbusters. It combines a stunning **"Liquid Glass"** visual interface with a high-performance **PyTorch Hybrid Recommendation Engine** to deliver hyper-personalized movie feeds in real-time.

---

## 🌐 Live Demo & Deployment

| Platform | Link | Status |
| :--- | :--- | :--- |
| **Frontend UI** | [https://neural-flix.vercel.app/](https://neural-flix.vercel.app/) | 🟢 Live (Vercel) |
| **Backend API** | [https://neuralflix.onrender.com/health](https://neuralflix.onrender.com/health) | 🟢 Live (Render) |

> ⚠️ **Cloud Performance Note:** To maintain blazing fast inference speeds on Free Tier cloud infrastructure (512MB RAM), the deep learning models (NCF & SASRec) have been tightly optimized. The active vector matrices are computed on-the-fly, intelligently constrained to a curated **10,000 movie catalog**, enabling enterprise-grade ML pipelines on zero-cost hardware.

---

## ✨ Premium Features

### 🎨 Immersive User Interface (Liquid Glass Design)
- **3D WebGL Canvas**: Dynamic ambient particles, 3D card tilting, and pulsing interactive recommendation orbs built natively with Three.js.
- **Interactive World Map**: A beautiful vector map for geographical cinema exploration (e.g., jump from Korean Thrillers to Bollywood Dramas in a click).
- **Mood Discovery Engine**: Real-time sliders map human emotions (*Melancholic, Adrenaline, Mind-Bending*) directly into 384-dimensional dense semantic vectors.

### 🧠 Advanced Hybrid ML Engine
- **Neural Collaborative Filtering (NCF)**: Dual-stream PyTorch network utilizing Generalized Matrix Factorization (GMF) and Multi-Layer Perceptrons (MLP).
- **Sequential Transformers (SASRec)**: Self-attention sequence modeling dynamically updates recommendations based on real-time navigation paths.
- **On-The-Fly Semantic Search**: Computes high-dimensional cosine similarity vectors in sub-milliseconds without hoarding instance memory.

---

## 🏗️ System Architecture

```mermaid
graph TD
    User([Client / Browser]) -->|HTTPS| Vercel[Next.js 15 Frontend on Vercel]
    Vercel -->|REST API / WebSockets| Render[FastAPI Backend on Render]
    
    subgraph "Machine Learning Engine"
        Render --> CBF[Content-Based TF-IDF]
        Render --> NCF[NCF Deep Learning Model]
        Render --> SAS[SASRec Sequential Transformer]
    end

    subgraph "Data Storage"
        Render <--> PG[(PostgreSQL Database)]
        Render <--> Redis[(Redis Cache)]
    end
```

---

## 🔌 API Reference Guide

The backend exposes a highly optimized REST API featuring live model tuning and websocket tracking.

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/v1/auth/register` | `POST` | Securely register a new user profile. |
| `/api/v1/movies` | `GET` | Retrieve paginated cinematic catalog with dynamic filtering. |
| `/api/v1/recommendations/personalized` | `GET` | Core feed blending Collaborative Filtering & Semantic models. |
| `/api/v1/search/mood` | `GET` | Converts emotional slider values into target semantic vectors. |
| `/ws/recommendations/{id}` | `WS` | Open WebSocket for real-time tracking and live feed updates. |
| `/v1/metrics/health` | `GET` | Advanced observability telemetry and system diagnostic dump. |

---

## 🚀 Local Installation & Setup

### 1. Prerequisites
- **Node.js v20+**
- **Python 3.11+**
- **PostgreSQL** (Local or Cloud)

### 2. Environment Configuration
Create a `.env` file in the root directory based on the `.env.example`:

```bash
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/neuralflix
SECRET_KEY=your_secure_jwt_secret
TMDB_API_KEY=your_tmdb_developer_key
```

### 3. Start the Backend (FastAPI)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### 4. Start the Frontend (Next.js)
```bash
cd frontend-next
npm install
npm run dev
```
Navigate to `http://localhost:3000` to experience NeuralFlix locally!

---

## 📈 Observability & Diagnostics
Built-in `Structlog` and custom Middleware measure strict API latencies. Current optimized targets aim for **< 200ms** latency even during complex PyTorch tensor inferences.

## 📄 License & Attributions
* **License**: MIT License.
* **Metadata & APIs**: TMDB, Watchmode, Trakt.tv.
* *Engineered for the love of global cinema. 🎬*
