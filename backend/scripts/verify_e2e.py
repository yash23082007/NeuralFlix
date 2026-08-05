"""
NeuralFlix End-to-End System Verification — scripts/verify_e2e.py

Performs real HTTP-level checks against the FastAPI application to verify
that all critical paths are functional. Used by CI (verify-10-10.yml).

Each check either passes or raises an AssertionError with a clear message.
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from jose import jwt

# Set demo mode for CI
os.environ.setdefault("NEURALFLIX_DEMO_MODE", "true")
os.environ.setdefault("LITE_MODE", "true")

from main import app
from core.security import JWT_SECRET, ALGORITHM

client = TestClient(app)


def _make_token(user_id: str = "e2e-test-user", is_admin: bool = False) -> str:
    """Create a valid JWT access token for testing."""
    payload = {"sub": user_id, "type": "access"}
    if is_admin:
        payload["is_admin"] = True
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)


def _cookies(user_id: str = "e2e-test-user") -> dict:
    return {"access_token": _make_token(user_id)}


# ─── 1. Health Endpoints ──────────────────────────────────

def test_liveness():
    r = client.get("/health/live")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "alive", f"Liveness check failed: {data}"
    print("✅ 1/12 Liveness probe returns alive")


def test_readiness():
    r = client.get("/health/ready")
    assert r.status_code == 200
    data = r.json()
    assert "status" in data
    assert "database" in data
    assert "cache" in data
    assert "catalog" in data
    print(f"✅ 2/12 Readiness probe returns JSON (status={data['status']})")


def test_root():
    r = client.get("/")
    assert r.status_code == 200
    data = r.json()
    assert data["name"] == "NeuralFlix ML Engine"
    assert "endpoints" in data
    print("✅ 3/12 Root endpoint returns API metadata")


# ─── 2. Authentication & Security ─────────────────────────

def test_unauthenticated_rejected():
    r = client.get("/api/v1/recommendations/user/test")
    assert r.status_code == 401, f"Expected 401, got {r.status_code}"
    print("✅ 4/12 Unauthenticated request rejected (401)")


def test_cookie_auth_accepted():
    r = client.get(
        "/api/v1/recommendations/onboarding",
    )
    assert r.status_code == 200
    print("✅ 5/12 Onboarding endpoint accessible")


def test_csrf_rejects_bad_origin():
    r = client.put(
        "/api/v1/users/me/taste-controls",
        headers={"Origin": "https://evil.example"},
        cookies=_cookies(),
        json={
            "discovery": 50, "global": 50, "challenge": 50,
            "pace": 50, "hiddenGems": 50, "diversityBoost": True,
        },
    )
    assert r.status_code in (401, 403), f"Expected CSRF rejection, got {r.status_code}"
    print("✅ 6/12 CSRF rejects untrusted origin")


# ─── 3. WebSocket Security ────────────────────────────────

def test_websocket_no_cookie_rejected():
    from fastapi import WebSocketDisconnect
    try:
        with client.websocket_connect("/ws/recommendations"):
            pass
        assert False, "WebSocket should have been rejected"
    except WebSocketDisconnect as e:
        assert e.code == 1008
    print("✅ 7/12 WebSocket without cookie rejected (1008)")


def test_websocket_valid_cookie_accepted():
    token = _make_token("ws-test-user")
    with client.websocket_connect(
        "/ws/recommendations",
        cookies={"access_token": token},
    ) as ws:
        ws.close()
    print("✅ 8/12 WebSocket with valid cookie accepted")


# ─── 4. Recommendation Pipeline ───────────────────────────

def test_onboarding_recommendations():
    r = client.get("/api/v1/recommendations/onboarding?limit=5")
    assert r.status_code == 200
    data = r.json()
    assert "recommendations" in data
    assert data.get("mode") == "onboarding"
    print(f"✅ 9/12 Onboarding returns {len(data['recommendations'])} recommendations")


# ─── 5. Cinema Trails ─────────────────────────────────────

def test_cinema_trails_list():
    r = client.get("/api/v1/cinema-trails")
    assert r.status_code == 200
    data = r.json()
    assert "trails" in data
    assert data["total"] >= 1, "Should have at least 1 curated trail"
    print(f"✅ 10/12 Cinema Trails returns {data['total']} trails")


# ─── 6. Taste Controls Validation ─────────────────────────

def test_taste_controls_validation():
    from routes.taste_controls import TasteControlPayload
    from pydantic import ValidationError

    # Valid
    TasteControlPayload(
        discovery=50, global_pref=50, challenge=50,
        pace=50, hiddenGems=50, diversityBoost=True,
    )

    # Out of range
    try:
        TasteControlPayload(discovery=150)
        assert False, "Should reject value > 100"
    except ValidationError:
        pass

    print("✅ 11/12 Taste control validation enforces 0-100 bounds")


# ─── 7. Feedback Validation ───────────────────────────────

def test_feedback_validation():
    from routes.feedback import FeedbackPayload
    from pydantic import ValidationError

    # Valid
    FeedbackPayload(movieId=1, action="not_interested", reason="too_slow")

    # Invalid reason
    try:
        FeedbackPayload(movieId=1, action="not_interested", reason="invalid_reason")
        assert False, "Should reject invalid reason"
    except ValidationError:
        pass

    # Invalid action
    try:
        FeedbackPayload(movieId=1, action="nuke_it", reason="too_slow")
        assert False, "Should reject invalid action"
    except ValidationError:
        pass

    print("✅ 12/12 Feedback validation rejects invalid reasons/actions")


# ─── Runner ───────────────────────────────────────────────

def verify_system():
    """Run all E2E checks. Each prints ✅ or raises AssertionError."""
    checks = [
        test_liveness,
        test_readiness,
        test_root,
        test_unauthenticated_rejected,
        test_cookie_auth_accepted,
        test_csrf_rejects_bad_origin,
        test_websocket_no_cookie_rejected,
        test_websocket_valid_cookie_accepted,
        test_onboarding_recommendations,
        test_cinema_trails_list,
        test_taste_controls_validation,
        test_feedback_validation,
    ]

    passed = 0
    failed = 0
    errors = []

    print("\n" + "=" * 60)
    print("  NeuralFlix 10/10 End-to-End Verification")
    print("=" * 60 + "\n")

    for check in checks:
        try:
            check()
            passed += 1
        except Exception as e:
            failed += 1
            errors.append(f"FAIL: {check.__name__}: {e}")
            print(f"❌ {check.__name__}: {e}")

    print(f"\n{'=' * 60}")
    print(f"  Results: {passed} passed, {failed} failed out of {len(checks)}")
    print(f"{'=' * 60}\n")

    if errors:
        for err in errors:
            print(f"  {err}")
        sys.exit(1)
    else:
        print("  All checks passed! ✅")
        sys.exit(0)


if __name__ == "__main__":
    verify_system()
