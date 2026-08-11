"""
NeuralFlix v4 — Database Engine and Session Factory

Supports SQLite (local dev) and PostgreSQL (Supabase production).
Uses SQLAlchemy 2.0 async engine with aiosqlite or asyncpg.
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy import event, text

from app.config import get_settings

settings = get_settings()

# ── Engine Configuration ──────────────────────────────────────
_connect_args = {}
if settings.is_sqlite:
    _connect_args = {"check_same_thread": False}

engine = create_async_engine(
    settings.database_url,
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
    """Create all tables. Used for local dev bootstrap only.
    Production uses Alembic migrations.
    """
    from app.models.base import Base
    # Import all models so Base.metadata knows about them
    import app.models.user  # noqa: F401
    import app.models.movie  # noqa: F401
    import app.models.watch_event  # noqa: F401
    import app.models.recommendation_feedback  # noqa: F401
    import app.models.taste_control  # noqa: F401
    import app.models.movie_availability  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


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
