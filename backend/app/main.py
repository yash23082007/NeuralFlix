"""
Movie Intelligence Platform — FastAPI Application
Clean, resilient entrypoint with high-performance async database, rate limiting, and ML routes.
"""

import time
import uuid
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from app.config import get_settings
from app.services.tmdb_service import close_tmdb_client

log = structlog.get_logger()
settings = get_settings()

limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])


# ── Lifespan ──────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info(
        "neuralflix_starting",
        version="4.0.0",
        environment=settings.environment,
        database="sqlite" if settings.is_sqlite else "postgresql",
    )

    # Initialize database schema and seed curated catalog in development/test
    if not settings.is_production:
        from app.database import init_db, async_session
        from app.services.seed_service import seed_database
        await init_db()
        log.info("database_initialized", mode="create_all")

        async with async_session() as session:
            seed_results = await seed_database(session)
            log.info("database_seeded", **seed_results)

    yield

    await close_tmdb_client()
    log.info("neuralflix_shutdown")


# ── App ───────────────────────────────────────────────────────
app = FastAPI(
    title="Movie Intelligence Platform — Explainable Global Cinema Atlas",
    description=(
        "Explainable recommendation engine for world cinema. "
        "Content-based ranking with taste controls, diversity reranking, and deep collaborative filtering."
    ),
    version="4.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore


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
        content={"detail": "Internal Server Error", "error_id": error_id},
    )


# ── Middleware ────────────────────────────────────────────────

# 1. SlowAPI Rate Limiting
app.add_middleware(SlowAPIMiddleware)

# 2. CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. GZip
app.add_middleware(GZipMiddleware, minimum_size=1000)


# 4. Request ID + Latency Logging + Security Headers
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
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
    return response


# ── Route Registration ───────────────────────────────────────
from app.routers.health import router as health_router
from app.routers.movies import router as movies_router
from app.routers.auth import router as auth_router
from app.routers.recommendations import router as recs_router
from app.routers.users import router as users_router
from app.routers.trails import router as trails_router
from app.routers.feedback import router as feedback_router
from app.routers.home import router as home_router
from app.routers.search import router as search_router
from app.routers.ml import router as ml_router
from app.routers.interactions import router as interactions_router
from app.routers.compare import router as compare_router
from app.routers.admin import router as admin_router

app.include_router(health_router)
app.include_router(movies_router)
app.include_router(auth_router)
app.include_router(recs_router)
app.include_router(users_router)
app.include_router(trails_router)
app.include_router(feedback_router)
app.include_router(home_router)
app.include_router(search_router)
app.include_router(ml_router)
app.include_router(interactions_router)
app.include_router(compare_router)
app.include_router(admin_router)


# ── Root ──────────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "name": "Movie Intelligence Platform — Explainable Global Cinema Atlas",
        "version": "4.0.0",
        "description": "Explainable recommendation engine for world cinema",
        "endpoints": {
            "health": "/health/live",
            "ready": "/health/ready",
            "docs": "/docs",
            "openapi": "/openapi.json",
        },
    }
