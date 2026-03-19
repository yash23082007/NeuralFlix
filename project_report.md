# NeuralFlix - Project Report

## **Project Overview**
**Project Name:** NeuralFlix  
**Type:** AI-Powered Movie & Web Series Recommendation System (v2.0)  
**Architecture:** Client-Server model with a decoupled React frontend and FastAPI backend.

---

## **1. Backend Development (Python / FastAPI)**
A robust, asynchronous REST API has been built using FastAPI to serve movie data and AI-powered recommendations. 

**Core Technologies:** `Python`, `FastAPI`, `CORS Middleware`

**Implemented Modules & Structure:**
*   **API Routing:** Cleanly separated modular routers under `routes/`:
    *   `/api/movies` (Trending, Top Rated, Bollywood, Anime endpoints)
    *   `/api/recommendations/{movie_id}` (AI/Algorithmic content suggestions)
    *   `/api/genres` (Fetching content categorized by genre)
    *   `/api/search` (Search endpoints for movies/series)
*   **Utility & Integration (`utils/`):** 
    *   `tmdb_api.py`: Integration with TMDB API to fetch extensive movie, series, and trailer data.
    *   `recommendation_engine.py`: The core algorithm/engine driving the "Neural" recommendations.
*   **Database Management:**
    *   `database.py` and `models/schemas.py`: Schema definitions and database connection setups.
    *   `scripts/seed_database.py`: A script set up to populate your local database with initial movie/mock data.

---

## **2. Frontend Development (React / Vite)**
A high-performance Single Page Application (SPA) designed to browse movies and view recommendations interactively.

**Core Technologies:** `React 19`, `Vite`, `React Router v7`, `Tailwind CSS 4.x`, `Framer Motion` (animations), `Lucide React` (icons), `Axios` (API requests)

**Implemented UI Components & Pages:**
*   **Pages (`src/pages/`):**
    *   `Home.jsx`: The main landing page, likely housing the hero slider and multiple categorized rows.
    *   `MovieDetails.jsx`: Dynamic page displaying extended info, cast, trailers, and related recommendations for a specific title.
    *   `SearchResults.jsx`: Displays the outcome of user queries.
    *   `GenrePage.jsx` & `SeriesPage.jsx`: Filtered views for explicit categories.
*   **Reusable Components (`src/components/`):**
    *   **Layout:** `Navbar.jsx`, `Footer.jsx`
    *   **Display:** `HeroSlider.jsx` (featured content), `HorizontalRow.jsx` (scrollable content rows, e.g., Netflix style).
    *   **Interactive:** `MovieCard.jsx`, `TrailerModal.jsx` (for playing embedded trailers seamlessly).
    *   **UX/State:** `Loader.jsx`, `SkeletonCard.jsx` (loading skeleton states to improve perceived performance).
*   **Services Module (`src/services/api.js`):** Unified Axios setup to consume the FastAPI backend endpoints seamlessly.

---

## **3. Notable Features Implemented**
1.  **Cross-Origin Communication:** Properly configured POST/GET CORS policies in `main.py` allowing the Vite DEV server to talk to the FastAPI backend.
2.  **Modern UI/UX:** Leveraging Framer Motion for smooth transitions and Skeleton loading cards to make data-fetching feel instant.
3.  **Comprehensive Discoverability:** Users can search manually, browse by genre, view top-rated/trending segments, or rely on the recommendation engine.

---

## **4. Future Upgrade Roadmap (Advanced ML & Architecture)**

### **PHASE 1 — Advanced Machine Learning**
*   **Replace Basic Recommender with Hybrid System:**
    *   Implement Content-based filtering (using TF-IDF on movie descriptions).
    *   Integrate Collaborative filtering (using user interactions, clicks, watch history).
    *   *Tools:* `scikit-learn` (TF-IDF, cosine similarity), `surprise` (collaborative filtering).
*   **Add User Behavior Tracking (CRITICAL):**
    *   Track clicks, search queries, and watch history to drive personalized recommendations per user.
    *   Store telemetry and user data in PostgreSQL (e.g., via Supabase).

### **PHASE 2 — System Architecture & Microservices**
*   **Split Backend into Services:** Upgrade from a monolithic FastAPI setup to a scalable, decoupled architecture: `Frontend (React) -> API Service (FastAPI) -> ML Service (FastAPI) -> Database`.
*   **Add Background Jobs:** Implement background processing (using Python async tasks or Celery + Redis) to recompute recommendations, update embeddings, and clean data asynchronously.

### **PHASE 3 — Build Training & Data Pipeline**
*   **Create Training Pipeline Script (`train.py`):** Automate the ML lifecycle to load data, train the model, and save the artifact (`.pkl`). Schedule this using Cron jobs or GitHub Actions.
*   **Model Versioning:** Integrate tools like MLflow (running locally) to track model accuracy, versions, and parameters.

### **PHASE 4 — "Real-Time Feel" Caching Strategy**
*   **Implement Smart Caching:** Introduce caching mechanisms (like Redis) to update recommendations efficiently after user actions or set intervals, simulating real-time updates without the initial complexity of Kafka.

### **PHASE 5 — Monitoring & Observability**
*   **Add Logging:** Implement robust Python logging mechanisms. Track core metrics like API latency, server errors, and recommendation click-through rates.

### **PHASE 6 — Deployment & Containerization (Production Readiness)**
*   **Cloud Deployment:** Deploy the Frontend to Vercel, Backend to Render or Railway, and Database to Supabase (utilizing free tiers).
*   **Dockerize:** Create a `Dockerfile` and `docker-compose.yml` to containerize the application stack, ensuring parity between development and production environments.

### **PHASE 7 — Advanced Capstone Features**
Implementation of one major "game changer" feature:
*   **Option A (Semantic Search):** Use embeddings (`sentence-transformers`) to search movies by meaning rather than exact keywords.
*   **Option B (RAG System):** Implement Retrieval-Augmented Generation to handle complex conversational queries (e.g., *"Suggest sci-fi like Interstellar but emotional"*).
*   **Option C (Ranking Model):** Train a secondary model specifically to rank the generated recommendations for maximum user engagement.