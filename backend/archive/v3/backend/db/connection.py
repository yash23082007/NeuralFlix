import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from database import async_session_factory, async_engine

logger = logging.getLogger(__name__)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for async database sessions."""
    async with async_session_factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


async def close_db():
    global async_engine
    if async_engine:
        await async_engine.dispose()
        async_engine = None
        logger.info("Database connection closed")
