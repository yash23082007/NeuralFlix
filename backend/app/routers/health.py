"""
NeuralFlix — Health & Diagnostics Endpoints
Supports /health/live, /health/ready, /health, /api/health, /api/info.
"""

from fastapi import APIRouter
from app.config import get_settings
from app.database import ping_database

router = APIRouter(tags=["Health"])
settings = get_settings()


@router.get("/health/live")
@router.get("/api/health/live")
async def health_live():
    """Liveness probe — the process is running."""
    return {
        "status": "alive",
        "service": "neuralflix-api",
        "version": "4.0.0",
    }


@router.get("/health/ready")
@router.get("/api/health/ready")
async def health_ready():
    """Readiness probe — can we serve traffic?"""
    db_ok = await ping_database()
    redis_ok = await _ping_redis()

    return {
        "status": "ready" if db_ok else "degraded",
        "database": db_ok,
        "cache": redis_ok,
        "recommendation_mode": settings.ranking_version,
        "environment": settings.environment,
    }


@router.get("/health")
@router.get("/api/health")
async def health_combined():
    """Docker / generic health check."""
    return await health_ready()


@router.get("/api/info")
async def api_info():
    """API info endpoint."""
    return {
        "name": "NeuralFlix — Explainable Global Cinema Atlas",
        "version": "4.0.0",
        "status": "healthy"
    }


async def _ping_redis() -> bool:
    """Attempt Redis ping — returns False if unavailable."""
    if not settings.redis_url:
        return False
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(settings.redis_url, socket_connect_timeout=1)
        await r.ping()
        await r.aclose()
        return True
    except Exception:
        return False
