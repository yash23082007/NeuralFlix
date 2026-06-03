import json
import os
from functools import wraps
from typing import Any, Callable, Optional

from utils.wsl_resolver import resolve_wsl_url

REDIS_URL = resolve_wsl_url(os.getenv("REDIS_URL", "redis://redis:6379/0"))
if REDIS_URL:
    os.environ["REDIS_URL"] = REDIS_URL
_redis_client = None


async def get_redis():
    global _redis_client
    if _redis_client is None:
        try:
            import redis.asyncio as aioredis
            # Set connection timeouts to prevent hanging when Redis is unreachable
            _redis_client = aioredis.from_url(
                REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=0.5,
                socket_timeout=0.5
            )
        except Exception:
            return None
    return _redis_client

# Caching Strategy from Architecture Guide (in seconds)
CACHE_LAYERS = {
    "user_recommendations": 3600,      # 1 hour TTL
    "movie_metadata": 86400,           # 24 hours
    "similarity_matrix": 604800,       # 7 days
    "trending_movies": 900,            # 15 minutes
    "genre_top_lists": 3600,           # 1 hour
}


def cached(ttl: int = 300, key_prefix: str = ""):
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                redis = await get_redis()
                if redis is None:
                    return await func(*args, **kwargs)

                cache_key_parts = [key_prefix, func.__name__]
                cache_key_parts.extend(str(a) for a in args)
                cache_key_parts.extend(f"{k}:{v}" for k, v in sorted(kwargs.items()))
                cache_key = ":".join(cache_key_parts)

                cached_val = await redis.get(cache_key)
                if cached_val is not None:
                    return json.loads(cached_val)

                result = await func(*args, **kwargs)
                if result is not None:
                    await redis.setex(cache_key, ttl, json.dumps(result, default=str))
                return result
            except Exception:
                return await func(*args, **kwargs)
        return wrapper
    return decorator


async def invalidate_cache(pattern: str):
    redis = await get_redis()
    if redis is None:
        return
    try:
        keys = await redis.keys(pattern)
        if keys:
            await redis.delete(*keys)
    except Exception:
        pass


async def get_cached_or_set(key: str, ttl: int, fetch_fn: Callable, *args, **kwargs) -> Any:
    redis = await get_redis()
    if redis:
        try:
            cached = await redis.get(key)
            if cached:
                return json.loads(cached)
        except Exception:
            pass
    result = await fetch_fn(*args, **kwargs)
    if redis and result is not None:
        try:
            await redis.setex(key, ttl, json.dumps(result, default=str))
        except Exception:
            pass
    return result
