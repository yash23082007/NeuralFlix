import logging
import time
import uuid
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import structlog

log = structlog.get_logger()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize DB and ML context
    log.info("Application starting up...", event="startup")
    yield
    log.info("Application shutting down...", event="shutdown")

app = FastAPI(
    title="NeuralFlix Engine",
    description="Production-grade ML Movie Recommendation Platform — Global Cinema Edition",
    version="3.0.0",
    lifespan=lifespan
)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_id = str(uuid.uuid4())
    log.error(f"Unhandled Exception: {exc}", error_id=error_id, path=request.url.path, method=request.method)
    return JSONResponse(
        status_code=500, 
        content={"message": "Internal Server Error", "error_id": error_id}
    )

@app.middleware("http")
async def production_observability_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    log.info(
        "request_processed",
        request_id=request_id,
        path=request.url.path,
        method=request.method,
        latency=f"{process_time:.4f}s",
        status_code=response.status_code
    )
    response.headers["X-Process-Time"] = str(process_time)
    response.headers["X-Request-ID"] = request_id
    return response

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Import Routers ───────────────────────────────────────────
# Legacy routes
try:
    from routes import movies, recommendations as legacy_recommendations, genres, search, tracking, imdb, trakt, auth
    HAS_LEGACY_ROUTES = True
except ImportError as e:
    log.warning(f"Legacy routes not fully loaded: {e}")
    HAS_LEGACY_ROUTES = False

# New V2 routers
try:
    from routers.recommendations import router as recs_router
    from routers.movies import router as movies_router
    from routers.regions import router as regions_router
    from routers.search import router as search_router
except ImportError as e:
    log.warning(f"V2 routers missing: {e}")
    recs_router = None
    movies_router = None
    regions_router = None
    search_router = None

# ─── Register Routes ──────────────────────────────────────────
@app.get('/v1/metrics/health')
def health_check():
    return {'status': 'healthy', 'version': '3.0.0', 'engine': 'NeuralFlix Global Cinema'}

@app.get('/')
def root():
    return {
        "name": "NeuralFlix Engine",
        "version": "3.0.0",
        "description": "Global Cinema Discovery & ML Recommendation Platform",
        "endpoints": {
            "health": "/v1/metrics/health",
            "movies": "/api/movies",
            "search": "/api/search",
            "recommendations": "/api/recommendations",
            "docs": "/docs"
        }
    }

if recs_router:
    app.include_router(recs_router, prefix='/api/v2', tags=["Neural Engine V2"])
if movies_router:
    app.include_router(movies_router, prefix='/api/v2', tags=["V2 Movies"])
if regions_router:
    app.include_router(regions_router, prefix='/api/v2', tags=["V2 Regions"])
if search_router:
    app.include_router(search_router, prefix='/api/v2', tags=["V2 Search"])

if HAS_LEGACY_ROUTES:
    app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
    app.include_router(movies.router, prefix="/api/movies", tags=["Movies"])
    app.include_router(legacy_recommendations.router, prefix="/api/recommendations", tags=["Legacy Recs"])
    app.include_router(genres.router, prefix="/api/genres", tags=["Genres"])
    app.include_router(search.router, prefix="/api/search", tags=["Search"])
    app.include_router(tracking.router, prefix="/api/tracking", tags=["Tracking"])
    app.include_router(imdb.router, prefix="/api/imdb", tags=["IMDb"])
    app.include_router(trakt.router, prefix="/api/trakt", tags=["Trakt"])
