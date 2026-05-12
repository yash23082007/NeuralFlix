import asyncio
import json
import logging
from typing import Dict, Optional

from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger("WEBSOCKET")


class ConnectionManager:
    def __init__(self):
        self.connections: Dict[int, WebSocket] = {}

    async def connect(self, user_id: int, ws: WebSocket):
        await ws.accept()
        self.connections[user_id] = ws
        logger.info(f"WebSocket connected: user {user_id}")

    async def disconnect(self, user_id: int):
        if user_id in self.connections:
            del self.connections[user_id]
            logger.info(f"WebSocket disconnected: user {user_id}")

    async def push_recommendations(self, user_id: int, recs: list):
        if user_id in self.connections:
            try:
                await self.connections[user_id].send_json({
                    "type": "recommendations_update",
                    "data": recs,
                })
            except Exception as e:
                logger.error(f"WebSocket push error for user {user_id}: {e}")
                await self.disconnect(user_id)

    async def send_personal_message(self, user_id: int, message: dict):
        if user_id in self.connections:
            try:
                await self.connections[user_id].send_json(message)
            except Exception as e:
                logger.error(f"WebSocket send error: {e}")

    @property
    def active_connections(self) -> int:
        return len(self.connections)


manager = ConnectionManager()


async def handle_websocket(websocket: WebSocket, user_id: int):
    await manager.connect(user_id, websocket)
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
