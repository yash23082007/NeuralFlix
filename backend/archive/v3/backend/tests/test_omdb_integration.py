"""
OMDb Integration Tests — tests/test_omdb_integration.py

Tests the rating_aggregator pipeline that combines TMDB + OMDb (IMDb/RT/Metacritic)
ratings into a unified multi-source rating object.

Uses mocked HTTP responses so tests run without API keys.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from utils.rating_aggregator import (
    _extract_rt_score,
    _extract_metacritic,
    _extract_imdb_rating,
    _extract_tmdb_rating,
    _compute_neuralflix_score,
    get_aggregated_ratings,
    get_rating_badges,
)


# ─── Sample OMDb Response ─────────────────────────────────
SAMPLE_OMDB_RESPONSE = {
    "Title": "Parasite",
    "Year": "2019",
    "imdbRating": "8.5",
    "imdbVotes": "850,234",
    "Metascore": "96",
    "Ratings": [
        {"Source": "Internet Movie Database", "Value": "8.5/10"},
        {"Source": "Rotten Tomatoes", "Value": "99%"},
        {"Source": "Metacritic", "Value": "96/100"},
    ],
    "Awards": "Won 4 Oscars. 312 wins & 277 nominations total",
    "BoxOffice": "$53,369,749",
    "Response": "True",
}

SAMPLE_TMDB_RESPONSE = {
    "id": 496243,
    "vote_average": 8.5,
    "vote_count": 16234,
    "imdb_id": "tt6751668",
}


# ─── Unit Tests: Rating Extraction ─────────────────────────

def test_extract_rt_score_fresh():
    result = _extract_rt_score(SAMPLE_OMDB_RESPONSE)
    assert result is not None
    assert result["score"] == 99
    assert result["label"] == "99%"
    assert result["sentiment"] == "fresh"
    assert result["source"] == "Rotten Tomatoes"


def test_extract_rt_score_rotten():
    omdb = {"Ratings": [{"Source": "Rotten Tomatoes", "Value": "45%"}]}
    result = _extract_rt_score(omdb)
    assert result is not None
    assert result["score"] == 45
    assert result["sentiment"] == "rotten"


def test_extract_rt_score_missing():
    assert _extract_rt_score(None) is None
    assert _extract_rt_score({"Ratings": []}) is None
    assert _extract_rt_score({}) is None


def test_extract_metacritic_favorable():
    result = _extract_metacritic(SAMPLE_OMDB_RESPONSE)
    assert result is not None
    assert result["score"] == 96
    assert result["sentiment"] == "favorable"


def test_extract_metacritic_mixed():
    omdb = {"Metascore": "55"}
    result = _extract_metacritic(omdb)
    assert result["sentiment"] == "mixed"


def test_extract_metacritic_unfavorable():
    omdb = {"Metascore": "30"}
    result = _extract_metacritic(omdb)
    assert result["sentiment"] == "unfavorable"


def test_extract_metacritic_na():
    assert _extract_metacritic({"Metascore": "N/A"}) is None
    assert _extract_metacritic(None) is None


def test_extract_imdb_rating():
    result = _extract_imdb_rating(SAMPLE_OMDB_RESPONSE)
    assert result is not None
    assert result["score"] == 8.5
    assert result["label"] == "8.5"
    assert result["votes"] == 850234
    assert result["source"] == "IMDb"


def test_extract_imdb_rating_na():
    assert _extract_imdb_rating({"imdbRating": "N/A"}) is None
    assert _extract_imdb_rating(None) is None


def test_extract_tmdb_rating():
    result = _extract_tmdb_rating(SAMPLE_TMDB_RESPONSE)
    assert result is not None
    assert result["score"] == 8.5
    assert result["votes"] == 16234
    assert result["source"] == "TMDB"


def test_extract_tmdb_rating_zero():
    assert _extract_tmdb_rating({"vote_average": 0}) is None


# ─── Unit Tests: Composite Score ───────────────────────────

def test_compute_neuralflix_score_all_sources():
    ratings = {
        "imdb": {"score": 8.5},      # → 85 * 0.35
        "tmdb": {"score": 8.5},      # → 85 * 0.25
        "rotten_tomatoes": {"score": 99},  # → 99 * 0.25
        "metacritic": {"score": 96},       # → 96 * 0.15
    }
    score = _compute_neuralflix_score(ratings)
    # (85*0.35 + 85*0.25 + 99*0.25 + 96*0.15) / 1.0
    expected = (29.75 + 21.25 + 24.75 + 14.4)
    assert abs(score - round(expected, 1)) < 0.2


def test_compute_neuralflix_score_partial():
    ratings = {"imdb": {"score": 7.0}}
    score = _compute_neuralflix_score(ratings)
    assert score == 70.0  # 7.0 * 10 = 70, single source, full weight


def test_compute_neuralflix_score_empty():
    assert _compute_neuralflix_score({}) == 0.0


# ─── Integration Tests: Full Pipeline ─────────────────────

@pytest.mark.asyncio
async def test_get_aggregated_ratings_with_mocked_apis():
    """Test the full aggregation pipeline with mocked API calls."""
    # Clear cache to ensure fresh fetch
    from utils.rating_aggregator import _rating_cache
    _rating_cache.clear()

    with patch("utils.rating_aggregator.fetch_movie_details", new_callable=AsyncMock) as mock_tmdb, \
         patch("utils.rating_aggregator.fetch_omdb_details_by_imdb_id", new_callable=AsyncMock) as mock_omdb:

        mock_tmdb.return_value = SAMPLE_TMDB_RESPONSE
        mock_omdb.return_value = SAMPLE_OMDB_RESPONSE

        result = await get_aggregated_ratings(tmdb_id=496243, imdb_id="tt6751668")

        # Verify structure
        assert "ratings" in result
        assert "composite_score" in result
        assert "composite_label" in result
        assert "total_sources" in result

        # Verify all 4 sources are present
        ratings = result["ratings"]
        assert "imdb" in ratings
        assert "tmdb" in ratings
        assert "rotten_tomatoes" in ratings
        assert "metacritic" in ratings
        assert result["total_sources"] == 4

        # Verify composite score is reasonable
        assert result["composite_score"] > 80

        # Verify metadata
        assert result["awards"] is not None
        assert "Oscar" in result["awards"]
        assert result["box_office"] == "$53,369,749"


@pytest.mark.asyncio
async def test_get_aggregated_ratings_omdb_unavailable():
    """Test graceful degradation when OMDb is unavailable."""
    from utils.rating_aggregator import _rating_cache
    _rating_cache.clear()

    with patch("utils.rating_aggregator.fetch_movie_details", new_callable=AsyncMock) as mock_tmdb, \
         patch("utils.rating_aggregator.fetch_omdb_details_by_imdb_id", new_callable=AsyncMock) as mock_omdb:

        mock_tmdb.return_value = SAMPLE_TMDB_RESPONSE
        mock_omdb.return_value = None  # OMDb unavailable

        result = await get_aggregated_ratings(tmdb_id=496243, imdb_id="tt6751668")

        # Should still return TMDB rating
        assert "tmdb" in result["ratings"]
        assert result["total_sources"] >= 1

        # Should not have OMDb-derived ratings
        assert "rotten_tomatoes" not in result["ratings"]
        assert "metacritic" not in result["ratings"]


@pytest.mark.asyncio
async def test_get_rating_badges():
    """Test the lightweight badge endpoint."""
    from utils.rating_aggregator import _rating_cache
    _rating_cache.clear()

    with patch("utils.rating_aggregator.fetch_movie_details", new_callable=AsyncMock) as mock_tmdb, \
         patch("utils.rating_aggregator.fetch_omdb_details_by_imdb_id", new_callable=AsyncMock) as mock_omdb:

        mock_tmdb.return_value = SAMPLE_TMDB_RESPONSE
        mock_omdb.return_value = SAMPLE_OMDB_RESPONSE

        badges = await get_rating_badges(tmdb_id=496243, imdb_id="tt6751668")

        assert "imdb" in badges
        assert badges["imdb"] == "8.5"
        assert "rt" in badges
        assert badges["rt"] == "99%"
        assert "mc" in badges
        assert badges["mc"] == "96"
        assert "neuralflix_score" in badges
