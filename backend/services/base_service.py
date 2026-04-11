import logging
import asyncio
from typing import Callable, Any, TypeVar
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import httpx

T = TypeVar("T")
logger = logging.getLogger("BASE_SERVICE")

class BaseService:
    """Provides shared resilience patterns for all services."""

    @staticmethod
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.RequestError, httpx.HTTPStatusError)),
        reraise=True
    )
    async def call_external_api(
        func: Callable[..., Any], 
        *args, 
        **kwargs
    ) -> Any:
        """Standardized wrapper for resilient external API calls."""
        try:
            if asyncio.iscoroutinefunction(func):
                return await func(*args, **kwargs)
            return func(*args, **kwargs)
        except Exception as e:
            logger.error(f"External API call failed: {e}")
            raise
