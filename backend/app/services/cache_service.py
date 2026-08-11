"""
NeuralFlix v4 — Cache Service

Optional Redis caching wrapper. Falls back to in-memory dict gracefully.
No endpoints should ever fail if Redis goes down.
"""

import json
from typing import Any, Optional

import structlog

from app.config import get_settings

log = structlog.get_logger()
settings = get_settings()

_redis_client = None
_in_memory_fallback: dict[str, Any] = {}


async def _get_redis():
    global _redis_client
    if not settings.redis_url:
        return None
        
    if _redis_client is None:
        try:
            import redis.asyncio as aioredis
            _redis_client = aioredis.from_url(
                settings.redis_url, 
                decode_responses=True,
                socket_connect_timeout=1
            )
            await _redis_client.ping()
        except Exception as e:
            log.warning("redis_connection_failed", error=str(e))
            _redis_client = False  # Mark as failed to avoid repeated connection attempts
            return None
            
    return _redis_client if _redis_client is not False else None


async def get_cache(key: str) -> Optional[Any]:
    """Get value from cache."""
    try:
        redis = await _get_redis()
        if redis:
            val = await redis.get(key)
            return json.loads(val) if val else None
    except Exception:
        pass
        
    # Fallback
    return _in_memory_fallback.get(key)


async def set_cache(key: str, value: Any, ttl_seconds: int = 3600) -> None:
    """Set value in cache."""
    try:
        redis = await _get_redis()
        if redis:
            await redis.setex(key, ttl_seconds, json.dumps(value))
            return
    except Exception:
        pass
        
    # Fallback (Note: in-memory ignores TTL for simplicity in this basic version)
    _in_memory_fallback[key] = value


async def delete_cache(key: str) -> None:
    """Delete value from cache."""
    try:
        redis = await _get_redis()
        if redis:
            await redis.delete(key)
            return
    except Exception:
        pass
        
    # Fallback
    _in_memory_fallback.pop(key, None)
