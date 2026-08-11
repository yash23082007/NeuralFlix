import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_register_and_login(client: AsyncClient):
    # Test register
    register_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpassword123",
        "name": "Test User"
    }
    response = await client.post("/api/v1/auth/register", json=register_data)
    assert response.status_code == 200
    assert response.json()["username"] == "testuser"
    assert "nf_access_token" in response.cookies

    # Test login
    login_data = {
        "email": "test@example.com",
        "password": "testpassword123"
    }
    response = await client.post("/api/v1/auth/login", json=login_data)
    assert response.status_code == 200
    assert response.json()["username"] == "testuser"
    assert "nf_access_token" in response.cookies
    
    # Test me
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 200
    assert response.json()["email"] == "test@example.com"
