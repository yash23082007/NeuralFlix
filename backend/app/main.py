"""
NeuralFlix — FastAPI Application
Clean, resilient entrypoint with high-performance async database and ML routes.
"""

import time
import uuid
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings

log = structlog.get_logger()
settings = get_settings()


# ── Lifespan ──────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info(
        "neuralflix_starting",
        version="4.0.0",
        environment=settings.environment,
        database="sqlite" if settings.is_sqlite else "postgresql",
    )

    # Initialize database schema and seed curated catalog
    if not settings.is_production:
        from app.database import init_db, async_session
        from app.services.seed_service import seed_database
        await init_db()
        log.info("database_initialized", mode="create_all")
        
        async with async_session() as session:
            seed_results = await seed_database(session)
            log.info("database_seeded", **seed_results)

    yield

    log.info("neuralflix_shutdown")


# ── App ───────────────────────────────────────────────────────
app = FastAPI(
    title="NeuralFlix — Explainable Global Cinema Atlas",
    description=(
        "Explainable recommendation engine for world cinema. "
        "Content-based ranking with taste controls, diversity reranking, and deep collaborative filtering."
    ),
    version="4.0.0",
    lifespan=lifespan,
)


# ── Global Exception Handler ─────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_id = str(uuid.uuid4())
    log.error(
        "unhandled_exception",
        error=str(exc),
        error_id=error_id,
        path=request.url.path,
        method=request.method,
    )
    return JSONResponse(
        status_code=500,
        content={"message": "Internal Server Error", "error_id": error_id},
    )


# ── Middleware ────────────────────────────────────────────────

# 1. CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. GZip
app.add_middleware(GZipMiddleware, minimum_size=1000)


# 3. Request ID + Latency Logging
@app.middleware("http")
async def observability_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())
    start = time.time()
    response = await call_next(request)
    latency = time.time() - start

    log.info(
        "request",
        request_id=request_id,
        path=request.url.path,
        method=request.method,
        status=response.status_code,
        latency=f"{latency:.4f}s",
    )
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = f"{latency:.4f}"
    return response


# ── Route Registration ───────────────────────────────────────
from app.routers.health import router as health_router
from app.routers.movies import router as movies_router
from app.routers.auth import router as auth_router
from app.routers.recommendations import router as recs_router
from app.routers.users import router as users_router
from app.routers.trails import router as trails_router
from app.routers.availability import router as availability_router
from app.routers.feedback import router as feedback_router
from app.routers.home import router as home_router
from app.routers.search import router as search_router
from app.routers.ml import router as ml_router

app.include_router(health_router)
app.include_router(movies_router)
app.include_router(auth_router)
app.include_router(recs_router)
app.include_router(users_router)
app.include_router(trails_router)
app.include_router(availability_router)
app.include_router(feedback_router)
app.include_router(home_router)
app.include_router(search_router)
app.include_router(ml_router)


# ── Root ──────────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "name": "NeuralFlix — Explainable Global Cinema Atlas",
        "version": "4.0.0",
        "description": "Explainable recommendation engine for world cinema",
        "endpoints": {
            "health": "/health/live",
            "ready": "/health/ready",
            "docs": "/docs",
            "openapi": "/openapi.json",
        },
    }
