import json
import functools
from fastapi import Request

def cache_response(expire: int = 600):
    """
    Decorator to cache FastAPI responses in Redis.
    expire: Time in seconds (default 10 mins)
    """
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Try to find 'request' in args or kwargs
            request: Request = kwargs.get("request")
            if not request:
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break
            
            if not request:
                return await func(*args, **kwargs)

            cache = getattr(request.app.state, "redis", None)
            if not cache:
                return await func(*args, **kwargs)

            # Generate cache key based on URL and query params
            cache_key = f"route:{request.url.path}:{request.url.query}"
            
            try:
                cached_data = await cache.get(cache_key)
                if cached_data:
                    return json.loads(cached_data)
            except Exception:
                pass

            # Execute the function
            result = await func(*args, **kwargs)

            # Store in cache
            try:
                if result:
                    await cache.setex(cache_key, expire, json.dumps(result, default=str))
            except Exception:
                pass
            
            return result
        return wrapper
    return decorator
