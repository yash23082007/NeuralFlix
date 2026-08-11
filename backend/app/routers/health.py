"""
NeuralFlix — Health Endpoints

/health/live   — always 200, proves the process is running
/health/ready  — checks database, optional Redis, reports recommendation mode
"""

from fastapi import APIRouter

from app.config import get_settings
from app.database import ping_database

router = APIRouter(tags=["Health"])
settings = get_settings()


@router.get("/health/live")
async def health_live():
    """Liveness probe — the process is running."""
    return {
        "status": "alive",
        "service": "neuralflix-api",
        "version": "4.0.0",
    }


@router.get("/health/ready")
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
async def health_combined():
    """Docker / generic health check."""
    return await health_ready()


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
