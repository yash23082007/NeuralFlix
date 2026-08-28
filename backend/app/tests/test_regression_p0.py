import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_regression_p0_security(client: AsyncClient):
    # 1. Register and login
    register_data = {
        "username": "regression_test",
        "email": "regression@example.com",
        "password": "testpassword123"
    }
    await client.post("/api/v1/auth/register", json=register_data)
    
    # 2. PUT /users/me response schema excludes hashed_password
    update_data = {"name": "Updated Name"}
    response = await client.put("/api/v1/users/me", json=update_data)
    assert response.status_code == 200
    assert "hashed_password" not in response.json()
    assert response.json()["name"] == "Updated Name"

    # 3. IDOR test: /users/{user_id}/taste-controls no longer exists (404) or requires auth.
    client.cookies.clear()
    
    # Anonymous access to /me/taste-controls returns 401
    response = await client.put("/api/v1/users/me/taste-controls", json={"discovery": 10})
    assert response.status_code == 401

    # Old alias returns 404
    response = await client.put("/api/v1/users/regression_test/taste-controls", json={"discovery": 10})
    assert response.status_code == 404

