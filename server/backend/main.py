# main.py

import random
import os
import re
# import json
import pprint
# from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.websockets import WebSocketState  # WebSocketState 임포트

import asyncio
# from agent import get_graph  # 에이전트 가져오기
from agent_multi import get_graph  # 에이전트 가져오기
from langchain_core.messages import AIMessage
from langchain_core.runnables.config import RunnableConfig
from pythonosc import udp_client

synth_list = []

# SuperCollider가 실행 중인 로컬 서버와 포트
client = udp_client.SimpleUDPClient("127.0.0.1", 57120)
# 저장할 경로를 설정 (예: 'scd_files' 디렉토리)
save_directory = "scd_files"

# 디렉토리가 존재하지 않으면 생성
if not os.path.exists(save_directory):
    os.makedirs(save_directory)

app = FastAPI()

# 웹소켓 클라이언트 목록
sc_clients = []  # /ws/sc에 연결된 클라이언트 목록

# 정적 파일 경로를 '/static'으로 설정하고, 파일들이 저장된 디렉토리를 지정
# app.mount("/static", StaticFiles(directory="static"), name="static")

# 컴파일된 그래프 가져오기
graph = get_graph()

configurable = {"thread_id": "1"}
config = RunnableConfig(configurable=configurable, recursion_limit=100)
# config = RunnableConfig(recursion_limit=100)
researcher_index = 0

# FOR TEST
morse_test = False

@app.websocket("/ws/sc")
async def websocket_sc(websocket: WebSocket):
    await websocket.accept()

    # 클라이언트에게 환영 메시지 전송
    welcome_message = {"response": "WebSocket connected!", "agentType": "Server"}
    await websocket.send_json(welcome_message)

    # 클라이언트를 목록에 추가
    sc_clients.append(websocket)
    print("sc_clients: ", sc_clients)

    try:
        while True:
            data = await websocket.receive_json()
            print("Data: \n")
            print(data)
       
            # "heartbeat" 메시지인지 확인
            if data.get("heartbeat") == "ping":
                # await websocket.send_json({"response": "pong", "agentType": "heartbeat"})
                continue  # "heartbeat" 메시지일 경우, 아래의 로직을 건너뜁니다.


    except WebSocketDisconnect:
        print("WebSocket connection closed")

    except Exception as e:
        print(f"WebSocket Error: {e}")
        await websocket.close()


@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    global researcher_index  # 전역 변수로서 접근을 명시
    global synth_list
    global morse_test

    await websocket.accept()

    try:
        while True:
            data = await websocket.receive_json()
            print("Raw Data: ")
            print(data)

            # "heartbeat" 메시지인지 확인
            if data.get("heartbeat") == "ping":
                # await websocket.send_json({"response": "pong", "agentType": "heartbeat"})
                continue  # "heartbeat" 메시지일 경우, 아래의 로직을 건너뜁니다.

            response_message = ""
            partial_message = ""

            msg_type = data.get("type", "")

            if msg_type == "Test":
                print("Test...")
                morse_test = True

                if morse_test == True:
                    for sc_client in sc_clients:
                        try:
                            if sc_client.client_state == WebSocketState.CONNECTED:
                                print("sending from messages...")
                                message = { "type": "Sentance", "index": data.get("index", ""), "value": [0, 1, 2, 0, 1]}
                                # sock.sendall(message.encode('utf-8'))  # 문자열을 바이트로 인코딩해 전송
                                await sc_client.send_json(message)
                            else:
                                print("Client is not connected.")
                        except Exception as e:
                            print(f"Error sending message: {e}")
                    morse_test = False
                continue

            if msg_type == "Button":
                # /ws/sc에 연결된 모든 클라이언트에게 메시지 전송
                print("Button...")
                for sc_client in sc_clients:
                    try:
                        if sc_client.client_state == WebSocketState.CONNECTED:
                            print("sending from buttons...")
                            await sc_client.send_json(data)
                        else:
                            print("Client is not connected.")
                    except Exception as e:
                        print(f"Error sending message: {e}")

                continue

            if msg_type == "Slider":
                # /ws/sc에 연결된 모든 클라이언트에게 메시지 전송
                print("Slider...")
                for sc_client in sc_clients:
                    try:
                        if sc_client.client_state == WebSocketState.CONNECTED:
                            print("sending from sliders...")
                            await sc_client.send_json(data)
                        else:
                            print("Client is not connected.")
                    except Exception as e:
                        print(f"Error sending message: {e}")

                continue

            user_input = data.get("message", "")
            # print("user_input: ", user_input)
            # inputs = {"messages": user_input}
            # print("inputs: ", inputs)
            key = "Bot"

            message = ""
            
            topic = ""
            # topic = "현재의 문명 수준을 유지하면서 기후 위기를 피하는 것은 가능할까요? 어느 수준의 희생과 타협은 불가피한 것일까요?"
            # topic = "AI로서 토론에 참여하고 있는 당신에게 인간은 어떤 도전과 변화에 직면하고 있다고 보이나요?, 그 속에서 인간의 본질은 어떻게 재정의될까요? 인간과 AI의 관계는 어떤 방향으로 나아갈 수 있을까요? 인간성에 새로운 질문을 던지며 그들의 본질을 위협하게 될까요?"
            inputs = {"topic": topic, "messages":message, "feedback": "", "topic_changed": False } 

            for output in graph.stream(inputs, config):
                # print("output:", output)
                # response_data = output
                # print(response_data)
                response_message = ''
                response_morse = ''

                for key, value in output.items():
                    print(f"{key}: {value}")
                    if 'messages' in value:
                        for message in value['messages']:
                            response_message = message.content  

                    elif 'morse' in value:     
                        for morse in value['morse']:
                            response_morse = morse.content        

                    # for key_, value_ in value.items():
                    #     print(f"{key_}: {value_}")

                # # 'content' 부분 추출
                # # response_message = response_data['chatbot']['messages'][0].content  
                # response_message = response_data['host']['messages'][0].content
                # print("response_message: ", response_message)

                # 타이핑 효과를 위해, 실시간으로 클라이언트에게 부분적으로 응답을 전송
                chunk_size = 1  # 한 번에 보낼 글자의 수를 설정, 클수록 출력 빠름
                if response_message != '':
                    for i in range(len(partial_message), len(response_message), chunk_size):
                        new_message = response_message[i:i+chunk_size]
                        partial_message += new_message
                        # print("new_message: ", new_message)
                        # print("new_message_unicode: ", ord(new_message))
                        await websocket.send_json({"response": partial_message, "agentType": key})
                        await asyncio.sleep(0.025)  # 타이핑 딜레이

                partial_message = ""
                await websocket.send_json({"response": "[END]", "agentType": key})

            pprint.pprint("------------------------------------")


    except WebSocketDisconnect:
        print("WebSocket connection closed")

    except Exception as e:
        print(f"WebSocket Error: {e}")
        await websocket.close()

# FastAPI 실행
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=4001)
