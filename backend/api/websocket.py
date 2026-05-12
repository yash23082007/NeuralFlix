from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.connections: dict[int, WebSocket] = {}

    async def connect(self, user_id: int, ws: WebSocket):
        await ws.accept()
        self.connections[user_id] = ws

    async def push_recommendations(self, user_id: int, recs: list):
        if user_id in self.connections:
            try:
                await self.connections[user_id].send_json({
                    "type": "recommendations_update",
                    "data": recs
                })
            except Exception as e:
                print(f"Failed to push ws to user {user_id}: {e}")

manager = ConnectionManager()

# Mock function to be replaced by actual recommendation engine logic
async def update_and_recommend(user_id: int, movie_id: int):
    # This should update watch history and return a new list of recs
    return []

@router.websocket("/recommendations/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    await manager.connect(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "watch_event":
                movie_id = data.get("movie_id")
                # Example: real-time sequential update & recommendation calculation
                recs = await update_and_recommend(user_id, movie_id)
                await manager.push_recommendations(user_id, recs)
    except WebSocketDisconnect:
        if user_id in manager.connections:
            del manager.connections[user_id]
    except Exception as e:
        if user_id in manager.connections:
            del manager.connections[user_id]
        print(f"WebSocket error: {e}")