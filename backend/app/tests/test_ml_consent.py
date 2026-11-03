import pytest
from httpx import AsyncClient

from app.models.movie import Movie


@pytest.mark.asyncio
async def test_ml_overview_counts_only_opted_in_app_events(client: AsyncClient, db_session):
    await client.post("/api/v1/auth/register", json={
        "username": "consent_user",
        "email": "consent@example.com",
        "password": "testpassword123",
    })
    db_session.add(Movie(id=707, tmdb_id=707, title="Test title"))
    await db_session.commit()

    initial = (await client.get("/api/v1/ml/overview")).json()
    assert initial["consented_interactions"] == 0
    assert initial["average_rating"] is None
    assert initial["interaction_target"] == 1_000_000

    # Valid first-party activity is not eligible for training until the user opts in.
    await client.post("/api/v1/interactions", json=[{"movie_id": 707, "event": "watch"}])
    assert (await client.get("/api/v1/ml/overview")).json()["consented_interactions"] == 0

    consent = await client.put("/api/v1/users/me/training-consent", json={"consent": True})
    assert consent.status_code == 200
    await client.post("/api/v1/interactions", json=[{"movie_id": 707, "event": "watch"}])
    overview = (await client.get("/api/v1/ml/overview")).json()
    assert overview["training_consent_users"] == 1
    assert overview["consented_interactions"] == 1

    await client.put("/api/v1/users/me/training-consent", json={"consent": False})
    assert (await client.get("/api/v1/ml/overview")).json()["consented_interactions"] == 0
