from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from routes import movies, recommendations, genres, search, tracking
import logging
import time

# PHASE 5: Monitoring & Logging
logging.basicConfig(
    filename='neuralflix_api.log',
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("API_MONITOR")

app = FastAPI(
    title="NeuralFlix API",
    description="AI-powered Movie & Web Series Recommendation System",
    version="2.0.0"
)

# Custom Middleware to track latency
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    logger.info(f"Path: {request.url.path} | Method: {request.method} | Latency: {process_time:.4f}s | Status: {response.status_code}")
    response.headers["X-Process-Time"] = str(process_time)
    return response

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(movies.router, prefix="/api/movies", tags=["Movies"])
app.include_router(recommendations.router, prefix="/api/recommendations", tags=["Recommendations"])
app.include_router(genres.router, prefix="/api/genres", tags=["Genres"])
app.include_router(search.router, prefix="/api/search", tags=["Search"])
app.include_router(tracking.router, prefix="/api/tracking", tags=["Tracking (User Behavior)"])

@app.get("/")
def root():
    return {
        "app": "NeuralFlix",
        "version": "2.0",
        "message": "AI-powered Movie & Web Series Recommendation API",
        "endpoints": {
            "movies": "/api/movies",
            "trending": "/api/movies/trending",
            "top_rated": "/api/movies/toprated",
            "bollywood": "/api/movies/bollywood",
            "anime": "/api/movies/anime",
            "genres": "/api/genres",
            "search": "/api/search?q=inception",
            "recommendations": "/api/recommendations/{movie_id}",
            "docs": "/docs"
        }
    }
