# NeuralFlix

## AI-Powered Movie & Web Series Recommendation System

NeuralFlix is a modern, high-performance web application that provides AI-powered movie and web series recommendations. The project follows a client-server architecture with a **React (Vite) frontend** and a **Python (FastAPI) backend**.

## Features
- **AI Recommendations:** Smart engine to suggest related movies and series.
- **Rich Media Discovery:** Browse trending, top-rated, and genre-specific content.
- **Extensive Search:** Fast and responsive search functionality.
- **Modern UI:** Built with Tailwind CSS, featuring smooth animations via Framer Motion.
- **Seamless Integrations:** Fetches current data using the TMDB API.
- **Fast Backend:** Served over lightning-fast, asynchronous FastAPI routes.

## Tech Stack
### Frontend
- **React 19** with **Vite**
- **Tailwind CSS 4** for styling
- **React Router v7** for single-page routing
- **Framer Motion** for animations
- **Axios** for API requests
- **Lucide React** for modern iconography

### Backend
- **Python** environment
- **FastAPI** framework
- **CORS Middleware** configuration
- **TMDB API** integrations
- Custom Recommendation Engine

## Getting Started

### Backend Setup
1. Navigate into the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment (optional but recommended).
3. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the development server:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend Setup
1. Navigate into the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install the node modules:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```

## API Documentation
Once the backend is running, FastAPI provides interactive API documentation automatically. You can view the swagger UI by navigating to `http://localhost:8000/docs` in your browser.