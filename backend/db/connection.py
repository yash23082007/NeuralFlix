import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from database import init_db, get_async_session as get_db, async_engine as engine, async_session_factory as AsyncSessionLocal

logger = logging.getLogger(__name__)

async def close_db():
    global engine
    if engine:
        await engine.dispose()
        engine = None
        logger.info("Database connection closed")
