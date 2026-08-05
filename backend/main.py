import os
import time
import asyncio
import uuid
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

log = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    startup_deadline = float(os.getenv("STARTUP_TASK_TIMEOUT_SECONDS", "2.0"))
    lite_mode = os.getenv("LITE_MODE", "true").lower() == "true"
    demo_mode = os.getenv("NEURALFLIX_DEMO_MODE", "true").lower() == "true"
    log.info("NeuralFlix ML Engine starting up", lite_mode=lite_mode, demo_mode=demo_mode)
    
    # 1. Establish Redis lazily and never block health endpoints on cache availability.
    app.state.redis = None
    if not demo_mode:
        try:
            from cache.redis_client import get_redis
            app.state.redis = await asyncio.wait_for(get_redis(), timeout=startup_deadline)
            if app.state.redis:
                log.info("Redis connection established")
        except Exception as e:
            log.warning("redis_unavailable_during_startup", error=str(e))
    
    # 2. Initialize database schema and seed sample catalog (sub-100ms)
    try:
        from database import init_db, auto_seed_if_empty
        await init_db()
        await auto_seed_if_empty()
        log.info("Database schema and catalog verified")
    except Exception as e:
        log.warning("db_init_warning", error=str(e))

    yield
    
    # Shutdown: Close Redis
    if app.state.redis:
        await app.state.redis.close()
        
    # Shutdown: Close TMDB SHARED_CLIENT
    try:
        from utils.tmdb_api import SHARED_CLIENT
        if SHARED_CLIENT and not SHARED_CLIENT.is_closed:
            await SHARED_CLIENT.aclose()
            log.info("TMDB HTTPX Shared Client closed")
    except Exception as e:
        log.warning("failed_to_close_tmdb_client", error=str(e))
        
    log.info("NeuralFlix ML Engine shutting down")


app = FastAPI(
    title="NeuralFlix ML Engine",
    description="Production-grade ML movie recommendation platform for global cinema.",
    version="3.0.0",
    lifespan=lifespan,
)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_id = str(uuid.uuid4())
    log.error("unhandled_exception", error=str(exc), error_id=error_id,
              path=request.url.path, method=request.method)
    return JSONResponse(
        status_code=500,
        content={"message": "Internal Server Error", "error_id": error_id},
    )


@app.middleware("http")
async def production_observability_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time

    log.info("request_processed", request_id=request_id,
             path=request.url.path, method=request.method,
             latency=f"{process_time:.4f}s", status_code=response.status_code)
    response.headers["X-Process-Time"] = str(process_time)
    response.headers["X-Request-ID"] = request_id
    return response


@app.middleware("http")
async def legacy_redirect(request: Request, call_next):
    path = request.url.path
    if path.startswith("/api/") and not path.startswith("/api/v1/") and not path.startswith("/api/v2/"):
        new_path = path.replace("/api/", "/api/v1/")
        query_string = request.url.query
        redirect_url = f"{new_path}?{query_string}" if query_string else new_path
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url=redirect_url)
    return await call_next(request)


CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001,https://neural-flix.vercel.app",
).split(",")
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://neural-flix.vercel.app",
    "https://neuralflix.onrender.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def verify_csrf_origin(request: Request, call_next):
    if request.method in ("POST", "PUT", "PATCH", "DELETE"):
        origin = request.headers.get("origin")
        if origin and origin not in ALLOWED_ORIGINS:
            return JSONResponse(status_code=403, content={"detail": "CSRF origin rejected"})
    return await call_next(request)

app.add_middleware(GZipMiddleware, minimum_size=1000)

# ─── Route Registration ──────────────────────────────────
from routes import auth, genres, imdb, ml, movies, recommendations, search, tracking, trakt, enhanced_data, users
HAS_ROUTES = True

# V2 Feedback route has been deprecated or moved.

# ─── New API Routes ───────────────────────────────────────
try:
    from api.routes.events import router as events_router
    app.include_router(events_router, prefix="/api/v1", tags=["Events"])
    log.info("Event routes loaded")
except ImportError as exc:
    log.warning("event_routes_not_loaded", error=str(exc))


# ─── WebSocket Endpoint ────────────────────────────────────
@app.websocket("/ws/recommendations")
async def websocket_recommendations(websocket: WebSocket):
    from api.websocket import get_websocket_user_id, handle_websocket
    user_id = await get_websocket_user_id(websocket)
    await handle_websocket(websocket, user_id)


# ─── Health Endpoints ─────────────────────────────────────
@app.get("/health/live")
async def health_live():
    return {
        "status": "alive",
        "service": "neuralflix-api",
        "version": "3.0.0"
    }

async def ping_database():
    try:
        from database import get_db
        async for session in get_db():
            from sqlalchemy import text
            await asyncio.wait_for(session.execute(text("SELECT 1")), timeout=1.0)
            return True
    except Exception:
        return False
    return False

async def ping_redis():
    try:
        if app.state.redis:
            await asyncio.wait_for(app.state.redis.ping(), timeout=1.0)
            return True
    except Exception:
        pass
    return False

async def catalog_is_available():
    return await ping_database()

@app.get("/health/ready")
async def health_ready():
    return {
        "status": "ready",
        "database": await ping_database(),
        "cache": await ping_redis(),
        "catalog": await catalog_is_available(),
        "recommendation_mode": "content-diversity-reranker-v1"
    }

@app.get("/v1/metrics/health")
async def health_check():
    return await health_ready()

@app.get("/health")
async def docker_health_check():
    return await health_ready()


@app.get("/")
def root():
    return {
        "name": "NeuralFlix ML Engine",
        "version": "3.0.0",
        "description": "Global cinema discovery and ML recommendation platform",
        "endpoints": {
            "health": "/v1/metrics/health",
            "movies": "/api/v1/movies",
            "search": "/api/v1/search",
            "recommendations": "/api/v1/recommendations",
            "events": "/api/v1/events",
            "websocket": "/ws/recommendations",
            "docs": "/docs",
        },
    }


# ─── API Route Registration ───────────────────────────────
if HAS_ROUTES:
    # Core discovery and catalog
    app.include_router(movies.router, prefix="/api/v1/movies", tags=["Movies"])
    app.include_router(search.router, prefix="/api/v1/search", tags=["Search"])
    
    # ML & Personalization
    app.include_router(recommendations.router, prefix="/api/v1/recommendations", tags=["Recommendations"])
    
    ENABLE_EXPERIMENTAL_ML = os.getenv("ENABLE_EXPERIMENTAL_ML", "false").lower() == "true"
    if ENABLE_EXPERIMENTAL_ML:
        app.include_router(ml.router, prefix="/api/v1/ml", tags=["ML Engine"])
    
    # Infrastructure & Engagement
    app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
    app.include_router(tracking.router, prefix="/api/v1/tracking", tags=["Tracking"])
    app.include_router(genres.router, prefix="/api/v1/genres", tags=["Genres"])
    
    # User Profiles & Onboarding
    app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
    
    # External Integrations
    app.include_router(imdb.router, prefix="/api/v1/imdb", tags=["IMDb"])
    app.include_router(trakt.router, prefix="/api/v1/trakt", tags=["Trakt"])
    
    # Enhanced Data Layer (Streaming, Ratings, Trakt Trending)
    app.include_router(enhanced_data.router, prefix="/api/v1/data", tags=["Enhanced Data"])

    # ─── New Feature Routes ─────────────────────────────────────
    try:
        from routes.taste_controls import router as taste_controls_router
        app.include_router(taste_controls_router, prefix="/api/v1/users", tags=["Taste Controls"])
    except ImportError as exc:
        log.warning("taste_controls_routes_not_loaded", error=str(exc))

    try:
        from routes.why_recommended import router as why_recommended_router
        app.include_router(why_recommended_router, prefix="/api/v1/recommendations", tags=["Why Recommended"])
    except ImportError as exc:
        log.warning("why_recommended_routes_not_loaded", error=str(exc))

    try:
        from routes.feedback import router as feedback_router
        app.include_router(feedback_router, prefix="/api/v1/recommendations", tags=["Feedback"])
    except ImportError as exc:
        log.warning("feedback_routes_not_loaded", error=str(exc))

    try:
        from routes.cinema_trails import router as cinema_trails_router
        app.include_router(cinema_trails_router, prefix="/api/v1/cinema-trails", tags=["Cinema Trails"])
    except ImportError as exc:
        log.warning("cinema_trails_routes_not_loaded", error=str(exc))

    try:
        from routes.discovery_passport import router as discovery_passport_router
        app.include_router(discovery_passport_router, prefix="/api/v1/users", tags=["Discovery Passport"])
    except ImportError as exc:
        log.warning("discovery_passport_routes_not_loaded", error=str(exc))


# ─── Seed Endpoint (manual trigger) ──────────────────────────
@app.post("/api/v1/seed")
async def seed_database():
    from database import auto_seed_if_empty
    try:
        await auto_seed_if_empty()
        return {"status": "seeded", "message": "Database seeded with sample movies"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
