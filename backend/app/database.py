"""
Movie Intelligence Platform — Database Engine and Session Factory

Supports SQLite (local dev) and PostgreSQL (Supabase production).
Uses SQLAlchemy 2.0 async engine with aiosqlite or asyncpg.
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy import event, text
from alembic import command
from alembic.config import Config
import asyncio
from pathlib import Path

from app.config import get_settings

settings = get_settings()

# ── Engine Configuration ──────────────────────────────────────
_connect_args = {}
if settings.is_sqlite:
    _connect_args = {"check_same_thread": False}

engine = create_async_engine(
    settings.async_database_url,
    echo=(settings.environment == "development"),
    connect_args=_connect_args,
    pool_pre_ping=True,
)

# ── Session Factory ───────────────────────────────────────────
async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ── Enable SQLite WAL mode + foreign keys ─────────────────────
if settings.is_sqlite:
    @event.listens_for(engine.sync_engine, "connect")
    def _set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


# ── Database Lifecycle ────────────────────────────────────────
async def init_db():
    """Apply local database migrations before the development server starts."""
    alembic_config = Config(str(Path(__file__).resolve().parent.parent / "alembic.ini"))
    await asyncio.to_thread(command.upgrade, alembic_config, "head")


async def get_db():
    """FastAPI dependency — yields an async database session."""
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def ping_database() -> bool:
    """Health check — can we reach the database?"""
    try:
        async with async_session() as session:
            await session.execute(text("SELECT 1"))
            return True
    except Exception:
        return False
