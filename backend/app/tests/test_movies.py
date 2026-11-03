import pytest
from httpx import AsyncClient
from unittest.mock import patch
from app.models.movie import Movie

@pytest.mark.asyncio
@patch("app.routers.movies.search_movies")
async def test_search_movies(mock_search, client: AsyncClient):
    mock_search.return_value = {
        "results": [{"id": 123, "title": "Test Movie", "release_date": "2024-01-01"}],
        "total_results": 1
    }
    response = await client.get("/api/v1/movies/search/?query=Test")
    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert len(response.json()["results"]) == 1

@pytest.mark.asyncio
@patch("app.routers.movies.get_or_fetch_movie")
async def test_get_movie(mock_get_movie, client: AsyncClient):
    # Mocking the returned Movie object
    class MockMovie:
        tmdb_id = 123
        title = "Test Movie"
        year = 2024
        genres = ["Action"]
        imdb_id = None
        poster_url = None
        backdrop_url = None
        rating = None
        language = None
        cinema_region = None
        rec_score = None
        editorial_collections: list[str] = []
        overview = None
        tagline = None
        runtime = None
        release_date = None
        director = None
        cast_members: list[dict] = []
        trailer_key = None
        platforms: list[str] = []
        imdb_rating = None
        imdb_votes = None
        rt_rating = None
        metacritic = None
        awards = None
        
    mock_get_movie.return_value = MockMovie()
    response = await client.get("/api/v1/movies/123")
    assert response.status_code == 200
    assert response.json()["tmdb_id"] == 123
    assert response.json()["title"] == "Test Movie"


@pytest.mark.asyncio
async def test_series_endpoint_excludes_film_records(client: AsyncClient, db_session):
    db_session.add_all([
        Movie(tmdb_id=901, title="A Film", media_type="movie", runtime=180),
        Movie(tmdb_id=902, title="A Series", media_type="tv", runtime=42),
    ])
    await db_session.commit()

    series = await client.get("/api/v1/movies/series")
    assert series.status_code == 200
    assert [item["title"] for item in series.json()["results"]] == ["A Series"]

    films = await client.get("/api/v1/movies/filter?media_type=movie")
    assert films.status_code == 200
    assert "A Film" in [item["title"] for item in films.json()["results"]]
    assert "A Series" not in [item["title"] for item in films.json()["results"]]
