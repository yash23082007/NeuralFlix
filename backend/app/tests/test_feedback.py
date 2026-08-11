import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_submit_feedback(client: AsyncClient):
    # Register and login
    register_data = {
        "username": "feedbacktest",
        "email": "feedbacktest@example.com",
        "password": "testpassword123"
    }
    await client.post("/api/v1/auth/register", json=register_data)
    
    # Submit feedback (using recommendations router)
    response = await client.post("/api/v1/recommendations/feedback?movie_id=123&action=like")
    assert response.status_code == 200
    assert response.json()["action"] == "like"
    
    # Submit feedback (using feedback router)
    response = await client.post("/api/v1/feedback?movie_id=456&action=dislike")
    assert response.status_code == 200
    assert response.json()["action"] == "dislike"
