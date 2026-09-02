"""
Movie Intelligence Platform — Application Configuration

Uses pydantic-settings to load from environment variables and .env files.
All configuration is centralized here — no scattered os.getenv() calls.
"""

from functools import lru_cache
from typing import Optional

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file="app/.env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Environment ──────────────────────────────────────────

    environment: str = "development"  # development | production | test

    # ── Database ─────────────────────────────────────────────
    # SQLite for local dev, Supabase PostgreSQL for production
    database_url: str = "sqlite+aiosqlite:///./neuralflix_v4.db"

    # ── External APIs ────────────────────────────────────────
    tmdb_api_key: str = ""
    tmdb_read_access_token: str = ""

    # ── Auth / Security ──────────────────────────────────────
    jwt_secret: str = "neuralflix-v4-dev-secret-change-in-prod"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 hours
    refresh_token_expire_days: int = 30
    cookie_secure: bool = False  # True in production (HTTPS)
    cookie_domain: Optional[str] = None
    cookie_samesite: str = "lax"  # lax for same-site, none for cross-site

    # ── CORS ─────────────────────────────────────────────────
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    @model_validator(mode="after")
    def validate_production_security(self):
        if self.is_production and self.jwt_secret == "neuralflix-v4-dev-secret-change-in-prod":
            raise ValueError("JWT_SECRET must be set to a non-default value in production")
        if self.is_production and not self.cookie_secure:
            raise ValueError("COOKIE_SECURE must be true in production")
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    # ── Recommendation Engine ────────────────────────────────
    ranker_id: str = "taste-constellation-v1"

    # ── Feature Flags ────────────────────────────────────────
    allow_tmdb_write_through: bool = False

    # ── Cache ────────────────────────────────────────────────
    redis_url: str = ""  # Optional — cache_service falls back to in-memory if empty

    # ── Server ───────────────────────────────────────────────
    host: str = "0.0.0.0"
    port: int = 8000

    @property
    def async_database_url(self) -> str:
        url = self.database_url.strip()
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        elif url.startswith("sqlite://") and not url.startswith("sqlite+aiosqlite://"):
            url = url.replace("sqlite://", "sqlite+aiosqlite://", 1)
        return url

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def is_sqlite(self) -> bool:
        return "sqlite" in self.database_url.lower()


@lru_cache
def get_settings() -> Settings:
    return Settings()
