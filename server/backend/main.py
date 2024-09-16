# main.py

import os
import re
# import json
import pprint
# from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import asyncio
from agent import get_graph  # 에이전트 가져오기
from langchain_core.messages import AIMessage
from langchain_core.runnables.config import RunnableConfig
from pythonosc import udp_client

# SuperCollider가 실행 중인 로컬 서버와 포트
client = udp_client.SimpleUDPClient("127.0.0.1", 57120)
# 저장할 경로를 설정 (예: 'scd_files' 디렉토리)
save_directory = "scd_files"

# 디렉토리가 존재하지 않으면 생성
if not os.path.exists(save_directory):
    os.makedirs(save_directory)

app = FastAPI()
# 정적 파일 경로를 '/static'으로 설정하고, 파일들이 저장된 디렉토리를 지정
# app.mount("/static", StaticFiles(directory="static"), name="static")

# 컴파일된 그래프 가져오기
graph = get_graph()

config = RunnableConfig(recursion_limit=100)
researcher_index = 0

@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    global researcher_index  # 전역 변수로서 접근을 명시

    await websocket.accept()

    try:
        while True:
            data = await websocket.receive_json()
            print("Data: \n")
            print(data)

            
            # "heartbeat" 메시지인지 확인
            if data.get("heartbeat") == "ping":
                # await websocket.send_json({"response": "pong", "agentType": "heartbeat"})
                continue  # "heartbeat" 메시지일 경우, 아래의 로직을 건너뜁니다.

            user_input = data.get("message", "")
            # print("user_input: ", user_input)

            response_message = ""
            partial_message = ""

            inputs = {"messages": user_input}
            print("inputs: ", inputs)

            key = "Bot"
            
            for output in graph.stream(inputs, config):
                # print("output:", output)

                response_data = output

                # 'content' 부분 추출
                response_message = response_data['chatbot']['messages'][0].content
                print("response_message: ", response_message)

                # 타이핑 효과를 위해, 실시간으로 클라이언트에게 부분적으로 응답을 전송
                chunk_size = 1  # 한 번에 보낼 글자의 수를 설정, 클수록 출력 빠름
                if response_message != None:
                    for i in range(len(partial_message), len(response_message), chunk_size):
                        partial_message += response_message[i:i+chunk_size]
                        await websocket.send_json({"response": partial_message, "agentType": key})
                        await asyncio.sleep(0.01)  # 타이핑 딜레이
                partial_message = ""

                
                # SC 파일에 대한 처리
                if response_message.startswith("```supercollider") and response_message.endswith("```"):
                    response_message = response_message[len("```supercollider"):].strip("```").strip()

                if response_message.startswith("```") and response_message.endswith("```"):
                    response_message = response_message[len("```"):].strip("```").strip()

                # response_message가 '//'로 시작하는 경우 처리
                if response_message.startswith("//"):
                    response_lines = response_message.splitlines()
                    
                    # 첫 번째 줄에서 '//' 뒤의 내용을 파일 이름으로 사용
                    raw_filename = response_lines[0].replace("//", "").strip()
                    filename = re.sub(r'[^\w\s-]', '', raw_filename) + ".scd"  # 특수 문자 제거 후 파일 이름 생성

                    # 파일 저장 경로 설정
                    filepath = os.path.join(save_directory, filename)
                    
                    # 두 번째 줄부터 나머지 줄을 코드로 사용
                    sc_code = "\n".join(response_lines[1:]).strip()
                    print("sc_code: ", sc_code)

                    # .scd 파일로 저장
                    with open(filepath, "w") as scd_file:
                        scd_file.write(sc_code)
                    
                    print(f"{filepath} 파일이 저장되었습니다.")

                    # 파이썬 파일의 SC_CODE 대체하여 저장
                    # with open("sc_code.py", "w") as py_file:
                        # py_file.write(f'SC_CODE = """{sc_code}"""')

                    # OSC 메시지 전송
                    client.send_message("/runCode", sc_code)

                    # 0.1초 대기
                    await asyncio.sleep(0.1)

                    client.send_message("/playCode", filename.split('.')[0])



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
