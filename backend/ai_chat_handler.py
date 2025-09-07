import asyncio
import pprint
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.websockets import WebSocketState

import app_state

router = APIRouter()

async def typing_worker():
    while True:
        msg, agent_type = await app_state.typing_queue.get()
        try:
            await typing_effect(msg, agent_type)
        except Exception as e:
            print(f">> typing_worker error: {e}", flush=True)
        finally:
            app_state.typing_queue.task_done()

@router.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    await websocket.accept()
    app_state.chat_clients.append(websocket)

    try:
        while True:
            data = await websocket.receive_json()
            print(">> Raw Data: ", data)

            if data.get("heartbeat") == "ping":
                continue

            if data.get("type") in ["Button", "Slider"]:
                print(f"Received {data['type']} event, broadcasting to other clients...")
                await broadcast_to_all_except_sender(websocket, data)
            else:
                asyncio.create_task(handle_chat_message(data, websocket))

    except WebSocketDisconnect:
        print(">> WebSocket /ws/chat 연결이 종료되었습니다.")
        app_state.chat_clients.remove(websocket)

async def typing_effect(full_message: str, agent_type: str):
    try:
        print(f">> typing starts: {agent_type}", flush=True)
        partial_message = ""
        chunk_size = 1

        for i in range(0, len(full_message), chunk_size):
            partial_message += full_message[i:i+chunk_size]
            await broadcast_to_all_chat_clients({"response": partial_message, "agentType": agent_type})
            await asyncio.sleep(0.0)
    except Exception as e:
        print(f">> typing_effect error: {e}", flush=True)

async def handle_chat_message(data, websocket: WebSocket):
    try:
        key = "Bot"
        message = ""
        topic = ""

        user_input = data.get("message", "")

        if not app_state.user_comment:
            print(">> 토론 시작")
            inputs = {
                "topic": topic,
                "messages": message,
                "feedback": "",
                "user_comment": user_input,
                "topic_changed": False,
                "debate_end": False
            }
        else:
            print(f">> 말씀하신 내용을 사회자에게 전달합니다. {user_input}")
            app_state.graph.update_state(
                app_state.config,
                {"user_comment": user_input},
            )
            inputs = None

        async for output in app_state.graph.astream(inputs, app_state.config):
            response_message = ''
            response_morse = ''

            for key, value in output.items():
                print(f"{key}: {value}")
                if 'messages' in value:
                    for msg in value['messages']:
                        response_message = msg.content
                elif 'morse' in value:
                    for morse in value['morse']:
                        response_morse = morse.content
            
            if response_morse:
                app_state.morse_idx %= 5
                joined_string = '3'.join(response_morse)
                for sc_client in app_state.sc_clients:
                    if sc_client.client_state == WebSocketState.CONNECTED:
                        morse_message = {"type": "MorseCode", "group": 100, "index": app_state.morse_idx + 1, "value": joined_string}
                        await sc_client.send_json(morse_message)
                app_state.morse_idx += 1

            if response_message:
                print(">> response_message is not empty and typing starts", flush=True)
                await app_state.typing_queue.put((response_message, key))
                await asyncio.sleep(0)

        pprint.pprint("----------------------END OF GRAPH--------------------------")
        app_state.user_comment = True
        await broadcast_to_all_chat_clients({"response": "[END]", "agentType": key})
        pprint.pprint("------------------------------------")

    except Exception as e:
        print(f"WebSocket Error: {e}")
        await websocket.close()

async def broadcast_to_all_chat_clients(message: dict):
    async with app_state.send_lock:
        for client in app_state.chat_clients:
            try:
                if client.client_state == WebSocketState.CONNECTED:
                    await client.send_json(message)
            except Exception as e:
                print(f"Error sending message to client: {e}", flush=True)

async def broadcast_to_all_except_sender(sender: WebSocket, data: dict):
    msg_type = data.get("type", "")

    if msg_type == "Test":
        app_state.morse_test = True
        if app_state.morse_test:
            for sc_client in app_state.sc_clients:
                if sc_client.client_state == WebSocketState.CONNECTED:
                    message = {"type": "MorseCode", "group": data.get("group", 1), "index": data.get("index", 1), "value": "0120123101"}
                    await sc_client.send_json(message)
            app_state.morse_test = False

    elif msg_type in ["Button", "Slider"]:
        for sc_client in app_state.sc_clients:
            if sc_client.client_state == WebSocketState.CONNECTED:
                await sc_client.send_json(data)
    
    for client in app_state.chat_clients:
        if client != sender and client.client_state == WebSocketState.CONNECTED:
            try:
                await client.send_json(data)
            except Exception as e:
                print(f"Error sending message to client: {e}")
