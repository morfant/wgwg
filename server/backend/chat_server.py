
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import Dict, List
import redis.asyncio as redis

app = FastAPI()

class RoomManager:
    def __init__(self):
        self.rooms: Dict[str, List[WebSocket]] = {}
        self.client_rooms: Dict[WebSocket, str] = {}

    async def connect(self, websocket: WebSocket, room_id: str):
        await websocket.accept()
        
        if room_id not in self.rooms:
            self.rooms[room_id] = []
        
        self.rooms[room_id].append(websocket)
        self.client_rooms[websocket] = room_id

    def disconnect(self, websocket: WebSocket):
        room_id = self.client_rooms.get(websocket)
        if room_id and room_id in self.rooms:
            self.rooms[room_id].remove(websocket)
            if len(self.rooms[room_id]) == 0:
                del self.rooms[room_id]
        
        if websocket in self.client_rooms:
            del self.client_rooms[websocket]

    async def broadcast_to_room(self, room_id: str, message: str):
        if room_id in self.rooms:
            disconnected = []
            for connection in self.rooms[room_id]:
                try:
                    await connection.send_text(message)
                except:
                    disconnected.append(connection)
            
            # Remove disconnected connections
            for conn in disconnected:
                self.disconnect(conn)

    def get_room_size(self, room_id: str) -> int:
        return len(self.rooms.get(room_id, []))

manager = RoomManager()
REDIS_CHANNEL = "chat_messages"

@app.websocket("/ws/{room_id}/{client_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, client_id: str):
    await manager.connect(websocket, room_id)
    
    try:
        # Optional Redis setup (can work without Redis)
        redis_client = None
        try:
            redis_client = redis.from_url("redis://localhost", encoding="utf-8", decode_responses=True)
        except:
            print("Redis not available, continuing without Redis")
    
        # Notify room that user joined
        join_message = f"{client_id}님이 채팅룸에 참여했습니다."
        await manager.broadcast_to_room(room_id, join_message)

        while True:
            data = await websocket.receive_text()
            message = f"{client_id}: {data}"
            await manager.broadcast_to_room(room_id, message)
            
            # Publish to Redis if available
            if redis_client:
                try:
                    await redis_client.publish(f"{REDIS_CHANNEL}_{room_id}", data)
                except:
                    pass  # Continue without Redis if it fails

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        leave_message = f"{client_id}님이 채팅룸에서 나갔습니다."
        await manager.broadcast_to_room(room_id, leave_message)
    finally:
        if redis_client:
            try:
                await redis_client.close()
            except:
                pass

@app.get("/rooms/{room_id}/size")
async def get_room_size(room_id: str):
    return {"room_id": room_id, "size": manager.get_room_size(room_id)}

@app.get("/rooms")
async def get_active_rooms():
    return {"rooms": list(manager.rooms.keys())}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
