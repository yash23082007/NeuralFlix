import pytest
from fastapi.testclient import TestClient
from datetime import timedelta
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from core.security import JWT_SECRET, ALGORITHM
from jose import jwt

client = TestClient(app)

@pytest.fixture
def valid_access_cookie():
    to_encode = {"sub": "test-user", "type": "access"}
    return jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)

def test_missing_cookie_rejected():
    response = client.get("/api/v1/recommendations/user/test-user")
    assert response.status_code == 401

def test_csrf_rejects_untrusted_origin(valid_access_cookie):
    response = client.put(
        "/api/v1/users/me/taste-controls",
        headers={"Origin": "https://evil.example"},
        cookies={"access_token": valid_access_cookie},
        json={
            "discovery": 50,
            "global": 50,
            "challenge": 50,
            "pace": 50,
            "hiddenGems": 50,
            "diversityBoost": True
        }
    )
    if response.status_code == 404:
        print("Response 404 Content:", response.text)
    # Validate that the API rejects it (CORS or CSRF).
    assert response.status_code in (401, 403)
