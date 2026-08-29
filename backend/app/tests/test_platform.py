import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_search_and_suggest(client: AsyncClient):
    # Test suggest autocomplete
    res = await client.get("/api/v1/search/suggest?q=Dark")
    assert res.status_code == 200
    assert "suggestions" in res.json()

    # Test natural language search
    res = await client.get("/api/v1/search?q=dark+sci-fi+under+2+hours")
    assert res.status_code == 200
    data = res.json()
    assert "results" in data
    assert "parsed_intent" in data
    assert data["parsed_intent"]["runtime_max"] == 120


@pytest.mark.asyncio
async def test_recommendations_why_explanation(client: AsyncClient):
    # Fetch why explanation for seeded movie 155
    res = await client.get("/api/v1/recommendations/155/why")
    assert res.status_code == 200
    data = res.json()
    assert "explanation" in data
    assert "reasons" in data
    assert "score" in data


@pytest.mark.asyncio
async def test_compare_movies(client: AsyncClient):
    res = await client.get("/api/v1/compare?a=155&b=27205")
    assert res.status_code == 200
    data = res.json()
    assert "movie_a" in data
    assert "movie_b" in data
    assert "predicted_preference" in data
    assert "score_delta" in data
    assert "insights" in data


@pytest.mark.asyncio
async def test_interactions_batch(client: AsyncClient, db_session):
    # Register user
    reg = {
        "username": "interactionuser",
        "email": "interaction@example.com",
        "password": "testpassword123"
    }
    await client.post("/api/v1/auth/register", json=reg)

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

    events = [
        {"movie_id": 155, "event": "impression", "position": 0, "context": "home_feed"},
        {"movie_id": 155, "event": "click", "position": 0, "context": "home_feed"},
        {"movie_id": 155, "event": "watch", "completed": True}
    ]
    res = await client.post("/api/v1/interactions", json=events)
    assert res.status_code == 200
    assert res.json()["accepted"] == 3


@pytest.mark.asyncio
async def test_user_onboarding(client: AsyncClient):
    reg = {
        "username": "onboarduser",
        "email": "onboard@example.com",
        "password": "testpassword123"
    }
    await client.post("/api/v1/auth/register", json=reg)

    payload = {
        "liked_movies": [155, 27205],
        "pref_genres": ["Action", "Sci-Fi"],
        "pref_languages": ["en", "ko"]
    }
    res = await client.post("/api/v1/users/onboard", json=payload)
    assert res.status_code == 200
    assert res.json()["status"] == "success"

    # Verify taste controls were calibrated
    tc = await client.get("/api/v1/users/me/taste-controls")
    assert tc.status_code == 200
    tc_data = tc.json()
    assert tc_data.get("global") == 75 or tc_data.get("global_taste") == 75


@pytest.mark.asyncio
async def test_admin_stats_protection(client: AsyncClient):
    # Non-admin user should get 403 Forbidden
    reg = {
        "username": "normaluser",
        "email": "normal@example.com",
        "password": "testpassword123"
    }
    await client.post("/api/v1/auth/register", json=reg)
    res = await client.get("/api/v1/admin/stats")
    assert res.status_code == 403
