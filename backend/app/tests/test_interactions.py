import pytest
from httpx import AsyncClient
from sqlalchemy import select
from app.models.recommendation_feedback import RecommendationImpression

@pytest.mark.asyncio
async def test_interactions_upsert_and_validation(client: AsyncClient, db_session):
    # Register and login
    register_data = {
        "username": "interactions_user",
        "email": "interact@example.com",
        "password": "testpassword123"
    }
    await client.post("/api/v1/auth/register", json=register_data)

    # Insert a dummy movie first
    from app.models.movie import Movie
    movie = Movie(
        id=155, 
        tmdb_id=155, 
        title="The Dark Knight",
        overview="Batman",
        year=2008
    )
    db_session.add(movie)
    await db_session.commit()

    valid_movie_id = 155
    invalid_movie_id = 99999999

    # 1. Test impression
    events = [
        {"movie_id": valid_movie_id, "event": "impression", "context": "home_feed"}
    ]
    resp1 = await client.post("/api/v1/interactions", json=events)
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert data1["accepted"] == 1
    assert data1["rejected_invalid_movie"] == 0

    # Count impressions
    res = await db_session.execute(select(RecommendationImpression))
    impressions_before = res.scalars().all()
    assert len(impressions_before) == 1
    assert impressions_before[0].clicked_at is None

    # 2. Test click (should update the existing row, not create a new one)
    events = [
        {"movie_id": valid_movie_id, "event": "click", "context": "home_feed"}
    ]
    resp2 = await client.post("/api/v1/interactions", json=events)
    assert resp2.status_code == 200

    res = await db_session.execute(select(RecommendationImpression))
    impressions_after = res.scalars().all()
    assert len(impressions_after) == 1
    assert impressions_after[0].clicked_at is not None

    # 3. Test invalid movie ID validation
    events = [
        {"movie_id": valid_movie_id, "event": "save", "context": "home_feed"},
        {"movie_id": invalid_movie_id, "event": "impression", "context": "home_feed"}
    ]
    resp3 = await client.post("/api/v1/interactions", json=events)
    assert resp3.status_code == 200
    data3 = resp3.json()
    assert data3["accepted"] == 1
    assert data3["rejected_invalid_movie"] == 1
