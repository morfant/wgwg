import asyncio
import websockets
import json
import random
from pythonosc import udp_client

# WebSocket 서버의 URL
uri = "ws://localhost:4001/ws/sc"

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
            print(f"서버 응답: {response}")
            
            # JSON 형식으로 수신한 데이터를 파싱
            data = json.loads(response)
            if "message" in data:
                message = data["message"]
                print("msg: ", message)

                # 수신된 메시지가 "synth_1", "synth_2", "synth_3", "synth_4"인 경우 처리
                if message == "synth_1":
                    random_value = random.uniform(0.0, 1.0)
                    client.send_message("/play_synth_1", random_value)
                    print(f"/play_synth_1로 {random_value} 전송")
                    
                elif message == "synth_2":
                    random_value = random.uniform(0.0, 1.0)
                    client.send_message("/play_synth_2", random_value)
                    print(f"/play_synth_2로 {random_value} 전송")

                elif message == "synth_3":
                    random_value = random.uniform(0.0, 1.0)
                    client.send_message("/play_synth_3", random_value)
                    print(f"/play_synth_3로 {random_value} 전송")
                    
                elif message == "synth_4":
                    random_value = random.uniform(0.0, 1.0)
                    client.send_message("/play_synth_4", random_value)
                    print(f"/play_synth_4로 {random_value} 전송")

# 비동기 루프 실행
asyncio.get_event_loop().run_until_complete(connect_to_server())