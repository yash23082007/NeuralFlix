import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_taste_controls(client: AsyncClient):
    # Register and login
    register_data = {
        "username": "tastetest",
        "email": "tastetest@example.com",
        "password": "testpassword123"
    }
    await client.post("/api/v1/auth/register", json=register_data)
    
    # Get initial taste controls
    response = await client.get("/api/v1/users/me/taste-controls")
    assert response.status_code == 200
    assert response.json()["discovery"] == 50  # default
    
    # Update taste controls
    update_data = {
        "discovery": 80,
        "global": 90,
        "challenge": 70,
        "pace": 30,
        "hiddenGems": 60,
        "diversityBoost": True
    }
    response = await client.put("/api/v1/users/me/taste-controls", json=update_data)
    assert response.status_code == 200
    
    # Verify update
    response = await client.get("/api/v1/users/me/taste-controls")
    assert response.status_code == 200
    assert response.json()["discovery"] == 80
    assert response.json()["global"] == 90
