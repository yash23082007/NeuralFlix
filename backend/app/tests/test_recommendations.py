import pytest
from httpx import AsyncClient
from unittest.mock import patch

@pytest.mark.asyncio
async def test_get_feed_unauthorized(client: AsyncClient):
    response = await client.get("/api/v1/recommendations/feed")
    assert response.status_code == 401

@pytest.mark.asyncio
@patch("app.routers.recommendations.get_recommendations_for_user")
async def test_get_feed(mock_get_recs, client: AsyncClient):
    mock_get_recs.return_value = [{"tmdb_id": 1, "title": "Test Rec", "rec_score": 85.0}]
    
    # We need to register and login first to get the token
    register_data = {
        "username": "rectest",
        "email": "rectest@example.com",
        "password": "testpassword123"
    }
    await client.post("/api/v1/auth/register", json=register_data)
    
    response = await client.get("/api/v1/recommendations/feed")
    assert response.status_code == 200
    assert "recommendations" in response.json()

@pytest.mark.asyncio
async def test_get_why(client: AsyncClient):
    register_data = {
        "username": "whytest",
        "email": "whytest@example.com",
        "password": "testpassword123"
    }
    await client.post("/api/v1/auth/register", json=register_data)
    
    # Query seeded movie 155 (The Dark Knight)
    response = await client.get("/api/v1/recommendations/155/why")
    assert response.status_code == 200
    data = response.json()
    assert "explanation" in data
    assert "reasons" in data
