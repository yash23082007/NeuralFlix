import json
import os
from functools import wraps
import redis.asyncio as redis

# Using environment variable for Redis, defaulting to local redis if not set
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# Global Redis client instance
redis_client = None

async def init_redis():
    global redis_client
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    return redis_client

async def close_redis():
    global redis_client
    if redis_client:
        await redis_client.close()

def cached(ttl: int, key_prefix: str):
    """
    Async decorator that caches the result of a function in Redis.
    Uses the function arguments to build a unique cache key.
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            if not redis_client:
                # If Redis is not initialized, run without cache
                return await func(*args, **kwargs)
                
            # Create a unique cache key from args and kwargs
            args_str = ':'.join(str(a) for a in args)
            kwargs_str = ':'.join(f"{k}={v}" for k, v in kwargs.items())
            cache_key = f"{key_prefix}:{args_str}:{kwargs_str}".strip(':')
            
            try:
                result = await redis_client.get(cache_key)
                if result:
                    return json.loads(result)
            except Exception as e:
                print(f"Redis get error: {e}")
                
            # Compute the actual function result
            result = await func(*args, **kwargs)
            
            try:
                if result is not None:
                    await redis_client.setex(cache_key, ttl, json.dumps(result))
            except Exception as e:
                print(f"Redis set error: {e}")
                
            return result
        return wrapper
    return decorator