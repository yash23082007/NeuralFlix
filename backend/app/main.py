"""
NeuralFlix — FastAPI Application

Clean entrypoint. No ML imports. No scattered try/except router loading.
Boots in <2 seconds with SQLite, no external dependencies required.
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

    # Initialize database schema (create_all for dev, Alembic for prod)
    if not settings.is_production:
        from app.database import init_db
        await init_db()
        log.info("database_initialized", mode="create_all")

    yield

    log.info("neuralflix_shutdown")


# ── App ───────────────────────────────────────────────────────
app = FastAPI(
    title="NeuralFlix — Explainable Global Cinema Atlas",
    description=(
        "Explainable recommendation engine for world cinema. "
        "Content-based ranking with taste controls and diversity reranking."
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


# 4. CSRF Origin Validation (for state-changing requests)
@app.middleware("http")
async def csrf_origin_validation(request: Request, call_next):
    if request.method in ("POST", "PUT", "PATCH", "DELETE"):
        origin = request.headers.get("origin")
        if origin and origin not in settings.cors_origin_list:
            log.warning("csrf_rejected", origin=origin, path=request.url.path)
            return JSONResponse(
                status_code=403,
                content={"detail": "CSRF origin rejected"},
            )
    return await call_next(request)


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

app.include_router(health_router)
app.include_router(movies_router)
app.include_router(auth_router)
app.include_router(recs_router)
app.include_router(users_router)
app.include_router(trails_router)
app.include_router(availability_router)
app.include_router(feedback_router)
app.include_router(home_router)


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
