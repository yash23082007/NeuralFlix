import pytest
from unittest.mock import MagicMock
import asyncio

def test_websocket_missing_token():
    """Verify WebSocket rejects connection if cookie token is missing."""
    from fastapi import WebSocket, WebSocketException
    
    ws = MagicMock(spec=WebSocket)
    ws.cookies = {}
    
    from api.websocket import get_websocket_user_id
    
    with pytest.raises(WebSocketException) as excinfo:
        asyncio.run(get_websocket_user_id(ws))
    assert excinfo.value.code == 1008
    
def test_websocket_invalid_token():
    """Verify WebSocket rejects connection if token is invalid/tampered."""
    from fastapi import WebSocket, WebSocketException
    
    ws = MagicMock(spec=WebSocket)
    ws.cookies = {"access_token": "invalid_jwt_token"}
    
    from api.websocket import get_websocket_user_id
    
    with pytest.raises(WebSocketException) as excinfo:
        asyncio.run(get_websocket_user_id(ws))
    assert excinfo.value.code == 1008
