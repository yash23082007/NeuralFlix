import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_cors():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.options(
            "/",
            headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "GET"}
        )
        assert response.status_code == 200
        # Wait, OPTIONS at root might not be handled if not configured globally, but it should be
