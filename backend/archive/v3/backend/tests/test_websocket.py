import pytest
from fastapi.testclient import TestClient
from fastapi import WebSocketDisconnect
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from core.security import JWT_SECRET, ALGORITHM
from jose import jwt

client = TestClient(app)

def test_websocket_without_cookie_is_rejected():
    with pytest.raises(WebSocketDisconnect) as excinfo:
        with client.websocket_connect("/ws/recommendations"):
            pass
    assert excinfo.value.code == 1008

def test_websocket_invalid_cookie_is_rejected():
    with pytest.raises(WebSocketDisconnect) as excinfo:
        with client.websocket_connect("/ws/recommendations", cookies={"access_token": "invalid"}):
            pass
    assert excinfo.value.code == 1008

def test_websocket_valid_cookie_succeeds():
    to_encode = {"sub": "test-user", "type": "access"}
    token = jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)
    
    with client.websocket_connect("/ws/recommendations", cookies={"access_token": token}) as websocket:
        # Just connecting and then closing is enough to prove it accepted the connection
        websocket.close()
