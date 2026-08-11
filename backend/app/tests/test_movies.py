import pytest
from httpx import AsyncClient
from unittest.mock import patch

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
        editorial_collections = []
        overview = None
        tagline = None
        runtime = None
        release_date = None
        director = None
        cast_members = []
        trailer_key = None
        platforms = []
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
