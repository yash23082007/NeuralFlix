import asyncio
import json
import logging
import os
from typing import Dict, Optional

from fastapi import WebSocket, WebSocketDisconnect, WebSocketException
from jose import jwt, JWTError

logger = logging.getLogger("WEBSOCKET")

JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-key-change-in-prod")
ALGORITHM = "HS256"


async def get_websocket_user_id(websocket: WebSocket) -> str:
    """
    Authenticate WebSocket connections using HttpOnly cookies.
    The client does not need to send any token — the browser automatically
    includes cookies during the WebSocket handshake for same-site connections.
    
    Rejects the connection (close code 1008: Policy Violation) if:
    - No access_token cookie is present
    - The token is invalid or expired
    - The token type is not 'access'
    """
    # Accept the connection first to be able to close with a code
    # Actually, we need to check before accepting for proper security
    token = websocket.cookies.get("access_token")

    if not token:
        await websocket.close(code=1008)
        raise WebSocketException(code=1008)

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])

        if payload.get("type") != "access":
            await websocket.close(code=1008)
            raise WebSocketException(code=1008)

        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=1008)
            raise WebSocketException(code=1008)

        return user_id

    except JWTError:
        await websocket.close(code=1008)
        raise WebSocketException(code=1008)


class ConnectionManager:
    def __init__(self):
        self.connections: Dict[str, WebSocket] = {}

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()
        self.connections[user_id] = ws
        logger.info(f"WebSocket connected: user {user_id}")

    async def disconnect(self, user_id: str):
        if user_id in self.connections:
            del self.connections[user_id]
            logger.info(f"WebSocket disconnected: user {user_id}")

    async def push_recommendations(self, user_id: str, recs: list):
        if user_id in self.connections:
            try:
                await self.connections[user_id].send_json({
                    "type": "recommendations_update",
                    "data": recs,
                })
            except Exception as e:
                logger.error(f"WebSocket push error for user {user_id}: {e}")
                await self.disconnect(user_id)

    async def send_personal_message(self, user_id: str, message: dict):
        if user_id in self.connections:
            try:
                await self.connections[user_id].send_json(message)
            except Exception as e:
                logger.error(f"WebSocket send error: {e}")

    @property
    def active_connections(self) -> int:
        return len(self.connections)


manager = ConnectionManager()


async def send_keepalive(user_id: str):
    try:
        while True:
            await asyncio.sleep(25)
            await manager.send_personal_message(user_id, {"type": "ping"})
    except asyncio.CancelledError:
        pass
    except Exception as e:
        logger.error(f"Keepalive error for user {user_id}: {e}")


async def handle_websocket(websocket: WebSocket, user_id: str):
    """
    Handle WebSocket connection for a verified user.
    The user_id is derived from the cookie-based JWT, not from the URL.
    """
    await manager.connect(user_id, websocket)
    keepalive_task = asyncio.create_task(send_keepalive(user_id))
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "")

            if msg_type == "ping":
                await manager.send_personal_message(user_id, {"type": "pong"})

            elif msg_type == "watch_event":
                movie_id = data.get("movie_id")
                if movie_id:
                    from utils.recommendation_engine import hybrid_recommendation
                    recs = await hybrid_recommendation(
                        movie_id=str(movie_id),
                        user_id=str(user_id),
                        limit=12,
                    )
                    await manager.push_recommendations(user_id, recs)

            elif msg_type == "request_recs":
                movie_id = data.get("movie_id")
                from utils.recommendation_engine import hybrid_recommendation
                recs = await hybrid_recommendation(
                    movie_id=str(movie_id) if movie_id else None,
                    user_id=str(user_id),
                    limit=data.get("limit", 12),
                )
                await manager.push_recommendations(user_id, recs)

    except WebSocketDisconnect:
        await manager.disconnect(user_id)
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
        await manager.disconnect(user_id)
    finally:
        keepalive_task.cancel()
        try:
            await keepalive_task
        except asyncio.CancelledError:
            pass
