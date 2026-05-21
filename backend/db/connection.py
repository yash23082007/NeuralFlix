import os
import logging
from typing import Optional, AsyncGenerator

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    os.getenv(
        "SUPABASE_URL",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/neuralflix",
    ),
)

engine = None
AsyncSessionLocal = None
_init_attempted = False


async def init_db():
    global engine, AsyncSessionLocal, _init_attempted
    if _init_attempted:
        return
    _init_attempted = True

    try:
        from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
        from sqlalchemy.orm import sessionmaker

        engine = create_async_engine(DATABASE_URL, echo=False, pool_size=10, max_overflow=20)
        AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

        async with engine.begin() as conn:
            from db.models import Base
            await conn.run_sync(Base.metadata.create_all)

        logger.info("Database connection established and tables created")
    except Exception as exc:
        logger.warning(f"Database initialization failed: {exc}")
        engine = None
        AsyncSessionLocal = None


async def get_db() -> AsyncGenerator:
    if AsyncSessionLocal is None:
        await init_db()

    if AsyncSessionLocal is None:
        raise RuntimeError("Database not available")

    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def close_db():
    global engine
    if engine:
        await engine.dispose()
        engine = None
        logger.info("Database connection closed")
