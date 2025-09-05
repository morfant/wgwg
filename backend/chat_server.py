
import asyncio
import os
from typing import Dict, List, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Body
import redis.asyncio as redis

app = FastAPI()

# CORS for client on :4000
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4000",
        "http://127.0.0.1:4000",
        "http://localhost",
        "http://127.0.0.1",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Redis configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CHAT_HISTORY_MAX = int(os.getenv("CHAT_HISTORY_MAX", "500"))

# Redis keys helpers
def _history_key(room_id: str) -> str:
    return f"room:{room_id}:messages"

def _users_key(room_id: str) -> str:
    return f"room:{room_id}:users"

def _name_key(room_id: str) -> str:
    return f"room:{room_id}:name"

redis_client: Optional[redis.Redis] = None


@app.on_event("startup")
async def on_startup() -> None:
    global redis_client
    try:
        redis_client = redis.from_url(REDIS_URL, encoding="utf-8", decode_responses=True)
        # simple ping to verify connectivity (non-fatal if fails)
        try:
            await redis_client.ping()
        except Exception:
            print("[chat_server] Redis ping failed; continuing without Redis")
    except Exception as e:
        print(f"[chat_server] Redis init error: {e}")
        redis_client = None


@app.on_event("shutdown")
async def on_shutdown() -> None:
    global redis_client
    if redis_client is not None:
        try:
            await redis_client.close()
        except Exception:
            pass

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


async def save_message(room_id: str, client_id: str, text: str) -> None:
    """Append a message to Redis history and trim to max length.

    Stored as a simple string "client_id: text" for easy replay.
    """
    if not redis_client:
        return
    try:
        msg = f"{client_id}: {text}"
        await redis_client.rpush(_history_key(room_id), msg)
        # Keep only last CHAT_HISTORY_MAX messages
        await redis_client.ltrim(_history_key(room_id), -CHAT_HISTORY_MAX, -1)
    except Exception as e:
        print(f"[chat_server] save_message error: {e}")


async def get_history(room_id: str) -> List[str]:
    if not redis_client:
        return []
    try:
        # Get full history (oldest to newest)
        msgs = await redis_client.lrange(_history_key(room_id), 0, -1)
        return msgs or []
    except Exception as e:
        print(f"[chat_server] get_history error: {e}")
        return []


async def add_user(room_id: str, client_id: str) -> None:
    if not redis_client:
        return
    try:
        await redis_client.sadd(_users_key(room_id), client_id)
    except Exception as e:
        print(f"[chat_server] add_user error: {e}")


async def remove_user(room_id: str, client_id: str) -> None:
    if not redis_client:
        return
    try:
        await redis_client.srem(_users_key(room_id), client_id)
    except Exception as e:
        print(f"[chat_server] remove_user error: {e}")


async def get_users(room_id: str) -> List[str]:
    if not redis_client:
        return []
    try:
        members = await redis_client.smembers(_users_key(room_id))
        return sorted(list(members)) if members else []
    except Exception as e:
        print(f"[chat_server] get_users error: {e}")
        return []


async def set_room_name(room_id: str, name: str) -> None:
    if not redis_client:
        return
    try:
        await redis_client.set(_name_key(room_id), name)
    except Exception as e:
        print(f"[chat_server] set_room_name error: {e}")


async def get_room_name(room_id: str) -> str:
    if not redis_client:
        return room_id
    try:
        val = await redis_client.get(_name_key(room_id))
        return val or room_id
    except Exception as e:
        print(f"[chat_server] get_room_name error: {e}")
        return room_id

@app.websocket("/ws/{room_id}/{client_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, client_id: str):
    await manager.connect(websocket, room_id)
    
    try:
        # Mark user online in Redis
        await add_user(room_id, client_id)

        # Send full history to the newly connected user
        history = await get_history(room_id)
        if history:
            await websocket.send_text("[히스토리 시작]")
            for msg in history:
                await websocket.send_text(msg)
            await websocket.send_text("[히스토리 종료]")

        # Notify room that user joined and show user list
        join_message = f"SYSTEM: {client_id}님이 채팅룸에 참여했습니다."
        await manager.broadcast_to_room(room_id, join_message)

        users = await get_users(room_id)
        if users:
            await manager.broadcast_to_room(room_id, f"SYSTEM: 현재 접속자 - {', '.join(users)}")

        while True:
            data = await websocket.receive_text()
            message = f"{client_id}: {data}"

            # Save and broadcast
            await save_message(room_id, client_id, data)
            await manager.broadcast_to_room(room_id, message)

            # Publish to Redis channel (optional fanout)
            if redis_client:
                try:
                    await redis_client.publish(f"{REDIS_CHANNEL}_{room_id}", data)
                except Exception:
                    pass

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await remove_user(room_id, client_id)
        leave_message = f"SYSTEM: {client_id}님이 채팅룸에서 나갔습니다."
        await manager.broadcast_to_room(room_id, leave_message)
        # Broadcast updated user list
        users = await get_users(room_id)
        if users:
            await manager.broadcast_to_room(room_id, f"SYSTEM: 현재 접속자 - {', '.join(users)}")
        else:
            await manager.broadcast_to_room(room_id, "SYSTEM: 현재 접속자 없음")
            # Cleanup empty room data in Redis (delete keys)
            await cleanup_room_if_empty(room_id)

@app.get("/rooms/{room_id}/size")
async def get_room_size(room_id: str):
    return {"room_id": room_id, "size": manager.get_room_size(room_id)}

@app.get("/rooms")
async def get_active_rooms():
    return {"rooms": list(manager.rooms.keys())}


@app.get("/rooms/{room_id}/users")
async def get_room_users(room_id: str):
    users = await get_users(room_id)
    return {"room_id": room_id, "users": users, "count": len(users)}


@app.get("/rooms/{room_id}/history")
async def get_room_history(room_id: str):
    msgs = await get_history(room_id)
    return {"room_id": room_id, "history": msgs, "count": len(msgs)}


async def cleanup_room_if_empty(room_id: str) -> None:
    if not redis_client:
        return
    try:
        users = await get_users(room_id)
        if len(users) == 0:
            # delete Redis keys for this room
            await redis_client.delete(
                _users_key(room_id),
                _history_key(room_id),
                _name_key(room_id),
            )
    except Exception as e:
        print(f"[chat_server] cleanup_room_if_empty error: {e}")


async def list_rooms_from_redis() -> List[str]:
    if not redis_client:
        return []
    room_ids: List[str] = []
    try:
        # scan_iter is non-blocking; collect keys matching users sets
        async for key in redis_client.scan_iter(match="room:*:users", count=100):
            # key format: room:{room_id}:users
            try:
                parts = str(key).split(":")
                if len(parts) >= 3 and parts[0] == "room" and parts[-1] == "users":
                    room_ids.append(":".join(parts[1:-1]))
            except Exception:
                continue
    except Exception as e:
        print(f"[chat_server] list_rooms_from_redis error: {e}")
    # dedupe
    return sorted(list(set(room_ids)))


@app.get("/rooms/summary")
async def get_rooms_summary():
    # union of in-memory active rooms and redis-tracked rooms
    redis_rooms = await list_rooms_from_redis()
    memory_rooms = list(manager.rooms.keys())
    all_rooms = sorted(list(set(redis_rooms + memory_rooms)))

    items = []
    for rid in all_rooms:
        if redis_client is not None:
            users_list = await get_users(rid)
            count = len(users_list)
            users_out = users_list
        else:
            # Fallback to in-memory connections
            count = manager.get_room_size(rid)
            users_out = []
        if count == 0:
            # skip empty rooms
            continue
        friendly = await get_room_name(rid)
        items.append({
            "id": rid,
            "name": friendly,
            "count": count,
            "users": users_out,
        })
    return {"rooms": items}


@app.get("/rooms/{room_id}/meta")
async def get_room_meta(room_id: str):
    name = await get_room_name(room_id)
    return {"id": room_id, "name": name}


@app.post("/rooms/{room_id}/name")
async def set_room_meta_name(room_id: str, payload: dict = Body(...)):
    name = str(payload.get("name", "")).strip()
    if name:
        await set_room_name(room_id, name)
    name_now = await get_room_name(room_id)
    return {"id": room_id, "name": name_now}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
