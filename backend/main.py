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
    
    # 2. Initialize Database and Indexes
    from database import init_db
    try:
        await init_db()
    except Exception as e:
        log.warning("failed_to_initialize_db_indexes", error=str(e))
        
    # 3. Load ContentBasedEngine TF-IDF matrix
    from ml.content_based import content_engine, auto_build_if_missing
    try:
        await auto_build_if_missing()
        await asyncio.to_thread(content_engine.load)
        log.info("Content similarity index loaded")
    except Exception as e:
        log.warning("failed_to_load_content_index", error=str(e))
        
    # 4. Load NCF pre-trained weights if they exist
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
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001",
).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)

# ─── Route Registration ──────────────────────────────────
from routes import auth, genres, imdb, ml, movies, recommendations, search, tracking, trakt, enhanced_data, users
HAS_ROUTES = True

try:
    from routers.recommendations import router as feedback_router
except ImportError as exc:
    log.warning("feedback_router_not_loaded", error=str(exc))
    feedback_router = None

# ─── New API Routes ───────────────────────────────────────
try:
    from api.routes.events import router as events_router
    app.include_router(events_router, prefix="/api/v1", tags=["Events"])
    log.info("Event routes loaded")
except ImportError as exc:
    log.warning("event_routes_not_loaded", error=str(exc))


# ─── WebSocket Endpoint ────────────────────────────────────
@app.websocket("/ws/recommendations/{user_id}")
async def websocket_recommendations(websocket: WebSocket, user_id: int):
    from api.websocket import handle_websocket
    await handle_websocket(websocket, user_id)


# ─── Health Endpoints ─────────────────────────────────────
@app.get("/v1/metrics/health")
def health_check():
    return {"status": "healthy", "version": "3.0.0", "engine": "NeuralFlix ML Engine"}


@app.get("/health")
def docker_health_check():
    return health_check()


@app.get("/")
def root():
    return {
        "name": "NeuralFlix ML Engine",
        "version": "3.0.0",
        "description": "Global cinema discovery and ML recommendation platform",
        "endpoints": {
            "health": "/v1/metrics/health",
            "movies": "/api/movies",
            "search": "/api/search",
            "recommendations": "/api/recommendations",
            "ml": "/api/ml/overview",
            "events": "/api/v1/events",
            "websocket": "/ws/recommendations/{user_id}",
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

if feedback_router:
    # V2 Feedback system for real-time model tuning
    app.include_router(feedback_router, prefix="/api/v2/feedback", tags=["Feedback"])
