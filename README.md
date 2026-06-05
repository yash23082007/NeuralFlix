<div align="center">
  <img src="https://raw.githubusercontent.com/yash23082007/NeuralFlix/main/frontend-next/public/favicon.ico" alt="NeuralFlix Logo" width="120" height="120" />
  
  # NeuralFlix
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

> **NeuralFlix** is a state-of-the-art cinematic discovery engine that bridges regional global cinema with mainstream Hollywood blockbusters. It combines a stunning **glassmorphism** visual interface with a high-performance **PyTorch Hybrid Recommendation Engine** delivering hyper-personalized movie feeds in real-time.

---

## Live Demo & Deployment

| Platform | Link | Status |
| :--- | :--- | :--- |
| **Frontend UI** | [https://neural-flix.vercel.app/](https://neural-flix.vercel.app/) | Live (Vercel) |
| **Backend API** | [https://neuralflix.onrender.com/health](https://neuralflix.onrender.com/health) | Live (Render) |

> **Note:** The deep learning models (NCF & SASRec) are optimized for 512MB RAM free-tier cloud infrastructure, using a curated 10,000 movie catalog for rapid inference.

---

## Features

### User Interface (Glassmorphism Design)
- **3D WebGL Canvas**: Dynamic ambient particles, 3D card tilting, interactive recommendation orbs with Three.js
- **Taste DNA**: Canvas radar chart visualizing your genre preferences
- **Neural Match Score**: Animated circular progress indicator for recommendation confidence
- **Mood Discovery**: Real-time sliders mapping emotions to semantic vectors
- **Search with Autocomplete**: Debounced search with recent searches stored in localStorage

### ML Engine
- **Neural Collaborative Filtering (NCF)**: Dual-stream PyTorch network (GMF + MLP)
- **Sequential Transformers (SASRec)**: Self-attention sequence modeling for session-based recs
- **LightGCN**: Graph neural network with 3-layer message passing
- **Content-Based Filtering**: FAISS-powered similarity search with sentence-transformers
- **Cold Start**: Tiered onboarding (cold_start/warming/active) with scored candidates
- **Exploration Bandit**: Thompson sampling + epsilon-greedy for explore/exploit balance
- **Sentiment Reranker**: BERT-based re-scoring of recommendations

## Architecture

```mermaid
graph TD
    User([Browser]) -->|HTTPS| Vercel[Next.js 15 on Vercel]
    Vercel -->|REST / WS| Render[FastAPI on Render]
    
    subgraph "ML Pipeline"
        Render --> CBF[Content-Based FAISS]
        Render --> NCF[NCF Neural Network]
        Render --> SAS[SASRec Transformer]
        Render --> GNN[LightGCN]
    end

    subgraph "Storage"
        Render <--> PG[(PostgreSQL)]
        Render <--> Redis[(Redis Cache)]
    end
```

## API Reference

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/v1/auth/register` | POST | Register a new user |
| `/api/v1/movies` | GET | Paginated catalog with filtering |
| `/api/v1/recommendations/personalized` | GET | Hybrid ML recommendation feed |
| `/api/v1/search/mood` | GET | Emotional slider to semantic vectors |
| `/api/v1/events/watch` | POST | Log watch events in real-time |
| `/api/v1/events/rate` | POST | Log rating events |
| `/ws/recommendations/{id}` | WS | Real-time recs via WebSocket |
| `/v1/metrics/health` | GET | System health check |

---

## Local Installation & Setup

### Prerequisites
- Node.js v20+
- Python 3.11+
- PostgreSQL (local or cloud) - optional, demo mode uses SQLite

### Backend Setup
```bash
cd backend
python -m venv venv
# Windows: .\venv\Scripts\activate
# Linux/Mac: source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### Frontend Setup
```bash
cd frontend-next
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use NeuralFlix locally.

> **Demo Mode:** Set `NEURALFLIX_DEMO_MODE=true` to skip PostgreSQL/Redis requirements. The app uses SQLite with in-memory query translation.

---

## Observability & Diagnostics
- Structlog structured logging with request IDs
- Prometheus metrics endpoint for monitoring
- Prometheus + Grafana in Docker Compose for observability

## License & Attributions
- **License**: MIT License
- **Metadata**: TMDB, OMDB, Trakt.tv, Watchmode
- **Dataset**: MovieLens 25M for model training
