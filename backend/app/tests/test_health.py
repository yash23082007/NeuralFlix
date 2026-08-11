"""
NeuralFlix — Health Endpoint Tests

Verifies:
- /health/live always returns 200
- /health/ready returns database status
- / returns API directory
- /openapi.json returns valid spec
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_live(client: AsyncClient):
    """Liveness probe must always return 200."""
    response = await client.get("/health/live")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "alive"
    assert data["version"] == "4.0.0"
    assert data["service"] == "neuralflix-api"


@pytest.mark.asyncio
async def test_health_ready(client: AsyncClient):
    """Readiness probe must report database status."""
    response = await client.get("/health/ready")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "database" in data
    assert "recommendation_mode" in data
    assert data["recommendation_mode"] == "content-diversity-reranker-v1"


@pytest.mark.asyncio
async def test_root(client: AsyncClient):
    """Root endpoint returns API directory."""
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["version"] == "4.0.0"
    assert "endpoints" in data
    assert "health" in data["endpoints"]
    assert "docs" in data["endpoints"]


@pytest.mark.asyncio
async def test_openapi_spec(client: AsyncClient):
    """OpenAPI spec must be accessible."""
    response = await client.get("/openapi.json")
    assert response.status_code == 200
    data = response.json()
    assert data["info"]["title"] == "NeuralFlix — Explainable Global Cinema Atlas"
    assert data["info"]["version"] == "4.0.0"
    assert "/health/live" in data["paths"]
    assert "/health/ready" in data["paths"]


@pytest.mark.asyncio
async def test_health_combined(client: AsyncClient):
    """/health alias for Docker health checks."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "database" in data
