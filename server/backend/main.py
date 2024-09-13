# main.py

import json
import pprint
# from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import asyncio
from agent import get_graph  # 에이전트 가져오기
# from agents_ import get_graph  # 에이전트 가져오기
# from agents_ import initialPlan, Review, Research, Result
from langchain_core.messages import AIMessage
from langchain_core.runnables.config import RunnableConfig


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
            print("user_input: ", user_input)

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
                        await asyncio.sleep(0.1)  # 타이핑 딜레이
                partial_message = ""


                await websocket.send_json({"response": "[END]", "agentType": key})

            pprint.pprint("------------------------------------")
            # Final generation
            # pprint.pprint(value["generation"])


    except WebSocketDisconnect:
        print("WebSocket connection closed")

    except Exception as e:
        print(f"WebSocket Error: {e}")
        await websocket.close()

# FastAPI 실행
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=4001)
