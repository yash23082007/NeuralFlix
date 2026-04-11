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

# Routers
# These routes folders likely hold the existing logic, we'll keep them and merge the new ones
try:
    from routes import movies, recommendations as legacy_recommendations, genres, search, tracking, imdb, trakt, auth
except ImportError:
    pass

# We created this one newly during the scaffold phase
try:
    from routers.recommendations import router as recs_router
except ImportError:
    recs_router = None

log = structlog.get_logger()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize DB and ML context
    log.info("Application starting up...", event="startup")
    yield
    log.info("Application shutting down...", event="shutdown")

app = FastAPI(
    title="NeuralFlix Engine",
    description="Production-grade ML Movie Recommendation Platform",
    version="6.0.0",
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

@app.get('/v1/metrics/health')
def health_check():
    return {'status': 'healthy', 'version': '6.0.0'}

# Merge routers safely
if recs_router:
    app.include_router(recs_router, prefix='/v1', tags=["Neural Engine V2"])

try:
    app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
    app.include_router(movies.router, prefix="/api/movies", tags=["Movies"])
    app.include_router(legacy_recommendations.router, prefix="/api/recommendations", tags=["Legacy Recs"])
    app.include_router(genres.router, prefix="/api/genres", tags=["Genres"])
    app.include_router(search.router, prefix="/api/search", tags=["Search"])
    app.include_router(tracking.router, prefix="/api/tracking", tags=["Tracking"])
    app.include_router(imdb.router, prefix="/api/imdb", tags=["IMDb"])
    app.include_router(trakt.router, prefix="/api/trakt", tags=["Trakt"])
except NameError:
    pass

            "docs": "/docs"
        }
    }

