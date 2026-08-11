import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_get_availability(client: AsyncClient):
    response = await client.get("/api/v1/movies/123/availability")
    assert response.status_code == 200
    assert response.json()["movie_id"] == 123
    assert "platforms" in response.json()
