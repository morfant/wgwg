import asyncio
import websockets
import json
import random
from pythonosc import udp_client

# WebSocket 서버의 URL
uri = "ws://localhost:4001/ws/sc"
# uri = "ws://unbarrier.net:4001/ws/sc"

# OSC 클라이언트 설정 (SuperCollider의 서버 IP와 포트)
client = udp_client.SimpleUDPClient("127.0.0.1", 57120)

async def connect_to_server():
    async with websockets.connect(uri) as websocket:
        print("서버와 연결되었습니다.")
        
        # 서버로부터 환영 메시지를 받습니다.
        response = await websocket.recv()
        print(f"서버 메시지: {response}")

        while True:
            # 서버로부터 메시지 수신
            response = await websocket.recv()
            print(f"Msg from server: {response}")
            
            # JSON 형식으로 수신한 데이터를 파싱
            data = json.loads(response)
            if "type" in data:
                type = data["type"]
                index = data["index"]
                value = data["value"]
                print(f"{type} / {index} / {value}")

                if type == "Button":
                    random_value = random.uniform(0.0, 1.0)
                    client.send_message(f"/play_synth_{index}", value)
                
                if type == "Slider":
                    random_value = random.uniform(0.0, 1.0)
                    client.send_message(f"/set_synth_{index}", value)
                    

# 비동기 루프 실행
asyncio.get_event_loop().run_until_complete(connect_to_server())