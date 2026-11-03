import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.movie import Movie

@pytest.mark.asyncio
async def test_submit_feedback(client: AsyncClient, db_session: AsyncSession):
    # Register and login
    register_data = {
        "username": "feedbacktest",
        "email": "feedbacktest@example.com",
        "password": "testpassword123"
    }
    await client.post("/api/v1/auth/register", json=register_data)

    # Feedback uses catalog primary keys, so create valid catalog records first.
    db_session.add_all([
        Movie(id=123, tmdb_id=123, title="Liked movie"),
        Movie(id=456, tmdb_id=456, title="Disliked movie"),
    ])
    await db_session.commit()
    
    # Submit feedback (using recommendations router)
    response = await client.post("/api/v1/recommendations/feedback?movie_id=123&action=like")
    assert response.status_code == 200
    assert response.json()["action"] == "like"
    
    # Submit feedback (using feedback router)
    response = await client.post("/api/v1/feedback?movie_id=456&action=dislike")
    assert response.status_code == 200
    assert response.json()["action"] == "dislike"
    
    # Submit bogus feedback action (should be 422 Unprocessable Entity)
    response = await client.post("/api/v1/recommendations/feedback?movie_id=123&action=bogus")
    assert response.status_code == 422
