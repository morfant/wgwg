## Setup

```
// 1. 가상환경 생성
uv venv

// 2. 가상환경 활성화
// Windows
source .venv/Scripts/activate

or 

// Linux or Mac
source .venv/bin/activate


// 3. 패키지 설치
uv pip install -r requirements.txt


// 4. 실행
uv run main.py

// (옵션) Redis 기반 채팅 서버 실행
//   - 채팅 히스토리 저장/조회
//   - 접속 사용자 저장/목록 조회
//   - 접속 시 히스토리 전송
// WS: ws://localhost:8001/ws/{room_id}/{client_id}
// API: GET /rooms, /rooms/{room_id}/users, /rooms/{room_id}/history
uv run chat_server.py

```
