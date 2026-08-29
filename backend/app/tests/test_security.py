import pytest
from httpx import AsyncClient
from app.config import get_settings

@pytest.mark.asyncio
async def test_refresh_token_as_access_token_rejected(client: AsyncClient):
    test_user = {"email": "testref2@example.com", "password": "Password123!", "username": "testref2"}
    # Register and get tokens
    response = await client.post("/api/v1/auth/register", json=test_user)
    assert response.status_code == 200
    
    # Get cookies
    access_token = response.cookies.get("nf_access_token")
    refresh_token = response.cookies.get("nf_refresh_token")
    assert refresh_token is not None

    # Try to access /api/v1/auth/me using refresh token in cookie
    response = await client.get(
        "/api/v1/auth/me",
        cookies={"nf_access_token": refresh_token}
    )
    assert response.status_code == 401

    # Try to access /api/v1/auth/me using refresh token in Bearer header
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {refresh_token}"}
    )
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_old_refresh_token_revoked(client: AsyncClient):
    # Register
    user = {"email": "revoketest@example.com", "password": "Password123!", "username": "revoketest"}
    response = await client.post("/api/v1/auth/register", json=user)
    assert response.status_code == 200
    
    refresh_token_1 = response.cookies.get("nf_refresh_token")
    
    # Refresh to get a new token
    response2 = await client.post(
        "/api/v1/auth/refresh",
        cookies={"nf_refresh_token": refresh_token_1}
    )
    assert response2.status_code == 200
    refresh_token_2 = response2.cookies.get("nf_refresh_token")
    assert refresh_token_1 != refresh_token_2

    # Try to refresh again with the FIRST token
    response3 = await client.post(
        "/api/v1/auth/refresh",
        cookies={"nf_refresh_token": refresh_token_1}
    )
    assert response3.status_code == 401

@pytest.mark.asyncio
async def test_password_length_limit(client: AsyncClient):
    # 100-char password login
    long_pass = "a" * 100
    user = {"email": "longpwd@example.com", "password": long_pass, "username": "longpwd"}
    
    # Should 422 or 401, not 500
    response = await client.post("/api/v1/auth/register", json=user)
    assert response.status_code in [401, 422]

    login_response = await client.post("/api/v1/auth/login", json={"email": "longpwd@example.com", "password": long_pass})
    assert login_response.status_code in [401, 422]

@pytest.mark.asyncio
async def test_rate_limit_login(client: AsyncClient):
    # Login limit is 5/minute, we do 6
    for i in range(5):
        await client.post("/api/v1/auth/login", json={"email": "nonexistent@test.com", "password": "123"})
    
    # The 6th should be 429
    response = await client.post("/api/v1/auth/login", json={"email": "nonexistent@test.com", "password": "123"})
    assert response.status_code == 429

@pytest.mark.asyncio
async def test_tmdb_write_through_guard(client: AsyncClient):
    settings = get_settings()
    # Ensure the guard is off
    settings.allow_tmdb_write_through = False
    
    unknown_tmdb_id = 99999999
    response = await client.get(f"/api/v1/movies/{unknown_tmdb_id}")
    assert response.status_code == 404
    
    # Verify it was not persisted
    from sqlalchemy.ext.asyncio import AsyncSession
    from app.database import async_session
    from app.models.movie import Movie
    from sqlalchemy import select

    async with async_session() as db:
        result = await db.execute(select(Movie).where(Movie.tmdb_id == unknown_tmdb_id))
        movie = result.scalar_one_or_none()
        assert movie is None

@pytest.mark.asyncio
async def test_security_headers(client: AsyncClient):
    # Default headers should be present
    response = await client.get("/api/v1/health/live")
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"
    
    # Production headers
    settings = get_settings()
    original_env = settings.environment
    settings.environment = "production"
    
    prod_response = await client.get("/api/v1/health/live")
    assert prod_response.headers.get("Strict-Transport-Security") == "max-age=31536000; includeSubDomains"
    assert prod_response.headers.get("Content-Security-Policy") == "default-src 'none'; frame-ancestors 'none'"
    
    settings.environment = original_env
