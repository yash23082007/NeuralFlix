from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from routes import movies, recommendations, genres, search, tracking, imdb, trakt, auth
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging
import time
import uuid

# Monitoring & Logging
logging.basicConfig(
    filename='neuralflix_api.log',
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("API_MONITOR")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize ML models to memory, connect to DB pools etc.
    logger.info("Application starting up... Initializing ML context.")
    yield
    # Shutdown: Clean up resources
    logger.info("Application shutting down... Cleaning up ML context.")

app = FastAPI(
    title="NeuralFlix API",
    description="ML-powered Movie & Web Series Recommendation System",
    version="3.0.0",
    lifespan=lifespan
)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global Error handling {request.method} {request.url.path}: {exc}")
    # In production, avoid leaking internal implementation details
    return JSONResponse(status_code=500, content={"message": "Internal Server Error. Our engineers have been notified."})

# Custom Middleware to track latency and Request IDs
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    request_id = str(uuid.uuid4())
    start_time = time.time()
    
    # In a real microservice, we'd add request_id to contextvars for structured logging
    # Here, we log it directly
    response = await call_next(request)
    
    process_time = time.time() - start_time
    logger.info(f"[req_id:{request_id}] Path: {request.url.path} | Method: {request.method} | Latency: {process_time:.4f}s | Status: {response.status_code}")
    response.headers["X-Process-Time"] = str(process_time)
    response.headers["X-Request-ID"] = request_id
    return response

# Configure CORS safely
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(movies.router, prefix="/api/movies", tags=["Movies"])
app.include_router(recommendations.router, prefix="/api/recommendations", tags=["Recommendations"])
app.include_router(genres.router, prefix="/api/genres", tags=["Genres"])
app.include_router(search.router, prefix="/api/search", tags=["Search"])
app.include_router(tracking.router, prefix="/api/tracking", tags=["Tracking"])
app.include_router(imdb.router, prefix="/api/imdb", tags=["IMDb API"])
app.include_router(trakt.router, prefix="/api/trakt", tags=["Trakt Integration"])

@app.get("/")
def root():
    return {
        "app": "NeuralFlix",
        "version": "3.0",
        "message": "ML-powered Movie & Web Series Recommendation API",
        "endpoints": {
            "movies": "/api/movies",
            "trending": "/api/movies/trending",
            "top_rated": "/api/movies/toprated",
            "now_playing": "/api/movies/nowplaying",
            "indian": "/api/movies/indian",
            "anime": "/api/movies/anime",
            "series": "/api/movies/series",
            "genres": "/api/genres",
            "search": "/api/search?q=inception",
            "recommendations": "/api/recommendations/{movie_id}",
            "docs": "/docs"
        }
    }
