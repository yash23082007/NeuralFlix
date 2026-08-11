"""
NeuralFlix v4 — Application Configuration

Uses pydantic-settings to load from environment variables and .env files.
All configuration is centralized here — no scattered os.getenv() calls.
"""

from functools import lru_cache
from typing import Optional

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
    omdb_api_key: str = ""
    watchmode_api_key: str = ""  # deferred to later phase

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

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    # ── Redis (Optional) ─────────────────────────────────────
    redis_url: Optional[str] = None

    # ── Recommendation Engine ────────────────────────────────
    ranking_version: str = "content-diversity-reranker-v1"

    # ── Feature Flags ────────────────────────────────────────
    lite_mode: bool = True
    enable_experimental_ml: bool = False
    demo_mode: bool = False

    # ── Server ───────────────────────────────────────────────
    host: str = "0.0.0.0"
    port: int = 8000

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def is_sqlite(self) -> bool:
        return "sqlite" in self.database_url


@lru_cache
def get_settings() -> Settings:
    return Settings()
