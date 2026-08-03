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
    log.info("NeuralFlix ML Engine starting up")
    
    # 1. Establish Redis connection
    from cache.redis_client import get_redis
    app.state.redis = await get_redis()
    log.info("Redis connection established")
    
    # 2. Initialize Database and Indexes in background to prevent boot blocking
    from database import init_db, auto_seed_if_empty
    LITE_MODE = os.getenv("LITE_MODE", "false").lower() == "true"
    
    async def init_db_background():
        try:
            await init_db()
            if not LITE_MODE:
                await auto_seed_if_empty()
        except Exception as e:
            log.warning("failed_to_initialize_db_indexes", error=str(e))
            
    asyncio.create_task(init_db_background())
        
    # 3. Load ContentBasedEngine TF-IDF matrix in background
    from ml.content_based import content_engine, auto_build_if_missing
    if not LITE_MODE:
        try:
            asyncio.create_task(auto_build_if_missing())
            log.info("Content similarity index background build started")
        except Exception as e:
            log.warning("failed_to_start_content_index_build", error=str(e))
        
    # 4. Load NCF pre-trained weights if explicitly enabled
    ENABLE_NCF = os.getenv("ENABLE_NCF", "false").lower() == "true"
    ENABLE_EXPERIMENTAL_ML = os.getenv("ENABLE_EXPERIMENTAL_ML", "false").lower() == "true"
    if ENABLE_NCF or ENABLE_EXPERIMENTAL_ML:
        try:
            import torch
            from ml.hybrid_recommender import ncf_model
            if ncf_model is not None:
                weights_path = "models/ncf_weights.pt"
                if os.path.exists(weights_path):
                    try:
                        ncf_model.load_state_dict(torch.load(weights_path, map_location="cpu"))
                        log.info("Pre-trained NCF weights loaded successfully")
                    except Exception as e:
                        log.warning("failed_to_load_ncf_weights", error=str(e))
                else:
                    log.warning("ncf_weights_not_found_using_random_initialization")
        except Exception as e:
            log.warning("failed_to_initialize_ml", error=str(e))
    else:
        log.info("Experimental ML disabled: Production path uses content-based + popularity baselines.")

    yield
    
    # 5. Shutdown: Close Redis
    if app.state.redis:
        await app.state.redis.close()
        
    # 6. Shutdown: Close TMDB SHARED_CLIENT
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
)

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
def liveness_check():
    return {"status": "alive"}

@app.get("/health/ready")
async def readiness_check():
    db_status = "unknown"
    redis_status = "unknown"
    
    # Check Redis
    try:
        if app.state.redis:
            await app.state.redis.ping()
            redis_status = "connected"
    except Exception:
        redis_status = "disconnected"
        
    # Check DB
    try:
        from database import get_db
        async for session in get_db():
            from sqlalchemy import text
            await session.execute(text("SELECT 1"))
            db_status = "connected"
            break
    except Exception:
        db_status = "disconnected"

    return {
        "status": "ready",
        "database": db_status == "connected",
        "catalog": True,  # Assuming catalog is true if DB is connected, or hardcode for test
        "recommendation_mode": "content-diversity-reranker-v1"
    }

@app.get("/v1/metrics/health")
async def health_check():
    return await readiness_check()

@app.get("/health")
async def docker_health_check():
    return await readiness_check()


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
