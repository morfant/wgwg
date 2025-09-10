import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.websockets import WebSocketState

import app_state

router = APIRouter()

@router.websocket("/ws/sc")
async def websocket_sc(websocket: WebSocket):
    await websocket.accept()

    welcome_message = {"response": "WebSocket connected!", "agentType": "Server"}
    await websocket.send_json(welcome_message)

    app_state.sc_clients.append(websocket)
    print(f">> sc_clients connected: {len(app_state.sc_clients)}")

    try:
        while True:
            data = await websocket.receive_json()
            print(f"Data from /ws/sc: {data}")

            if data.get("heartbeat") == "ping":
                continue

            asyncio.create_task(handle_sc_message(data, websocket))

    except WebSocketDisconnect:
        print("WebSocket /ws/sc connection closed")
        app_state.sc_clients.remove(websocket)
        print(f">> sc_clients connected: {len(app_state.sc_clients)}")

async def handle_sc_message(data, websocket: WebSocket):
    try:
        if websocket.client_state == WebSocketState.CONNECTED:
            await websocket.send_json({"response": "Processing your request..."})
    except Exception as e:
        print(f"Error sending /ws/sc message: {e}")
