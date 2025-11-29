# 와글와글 (WGWG) 프로젝트 코드 구조 분석

## 📋 프로젝트 개요

**와글와글**은 AI 에이전트들이 주어진 주제에 대해 토론하는 시스템입니다. LangGraph를 활용한 멀티 에이전트 토론 플랫폼으로, 실시간 웹소켓 통신을 통해 토론 내용을 전달합니다.

---

## 🏗️ 전체 프로젝트 구조

```
wgwg/
├── backend/          # Python 백엔드 (FastAPI + LangGraph)
├── client/           # Next.js 프론트엔드
├── server/           # Vue.js 서버 (별도 UI)
├── sc/               # 추가 컴포넌트
├── python/           # Python 유틸리티
└── docker-compose.yml
```

---

## 🔧 백엔드 구조 (`/backend`)

### 핵심 파일

| 파일명 | 용도 | 크기 |
|--------|------|------|
| `agent_multi.py` | 멀티 에이전트 토론 시스템 핵심 로직 | ~106KB (1,780줄) |
| `main.py` | FastAPI 웹서버 + WebSocket 핸들러 | ~12KB (329줄) |
| `agent_with_chat.py` | 채팅 기능이 포함된 에이전트 | ~73KB |
| `agents_.py` | 기타 에이전트 로직 | ~84KB |

---

## 🤖 `agent_multi.py` 상세 분석

### 1. 기본 설정

#### 환경 변수 및 API 키
```python
# 사용 중인 LLM 서비스
- OpenAI API (GPT-4, GPT-4.1, GPT-5-mini)
- Tavily API (검색)
- LangSmith (트레이싱)
```

#### 토론 참가자 (Members)
```python
members = ["FRITZ", "BOB", "DONNA", "BEN", "JOHN", "CITIZEN"]
```

6명의 AI 에이전트가 토론에 참여합니다.

---

### 2. 토론 주제 (Topics)

총 **15개의 토론 주제**가 사전 정의되어 있습니다:

#### 주요 카테고리
- **기후 위기와 문명** (4개 주제)
  - 기후 위기 극복 가능성
  - 아시아의 기후정의
  - 신식민주의와 기후위기
  
- **AI와 인간성** (4개 주제)
  - AI 시대의 인간 본질
  - AI와 미래 사회
  - 창의성의 재정의

- **사회 갈등과 정체성** (3개 주제)
  - 내집단 편향
  - 유럽 우경화
  - SNS와 양극화

- **AI 네이티브 세대** (4개 주제)
  - 창의성 교육
  - 창작 동기
  - AI 협업

---

### 3. 데이터 모델

#### GraphState (토론 상태)
```python
class GraphState(TypedDict):
    messages: Annotated[list, add_messages]  # 대화 메시지
    topic: str                                # 현재 토론 주제
    next: str                                 # 다음 발언자
    user_comment: str                         # 사용자 코멘트
    feedback: str                             # 비평가 피드백
    morse: List[str]                          # 모스 부호 (시각화용)
    topic_changed: Optional[bool]             # 주제 변경 여부
    debate_end: Optional[bool]                # 토론 종료 여부
```

#### routeResponse (라우팅 응답)
```python
class routeResponse(BaseModel):
    content: str      # 에이전트의 발언 내용
    next: Literal[*members]  # 다음 발언자 선택
```

---

### 4. LLM 모델 구성

```python
# 각 역할별 LLM 할당
llm_translator = ChatOpenAI(model="gpt-4o")           # 번역
llm_host = ChatOpenAI(model="gpt-4.1-2025-04-14")     # 사회자
llm_critic = ChatOpenAI(model="gpt-4.1-2025-04-14")   # 비평가
llm_01~04 = ChatOpenAI(model="gpt-4.1-2025-04-14")    # 토론자들
llm_gpt5 = ChatOpenAI(model="gpt-5-mini")             # 특수 용도
llm_punchliner = ChatOpenAI(model="gpt-4.1-2025-04-14") # 요약
```

---

### 5. 에이전트 페르소나 (Personas)

각 에이전트는 고유한 성격과 토론 스타일을 가집니다:

| 에이전트 | 페르소나 | 특징 |
|---------|---------|------|
| **FRITZ** | `persona_neoliberal` | 신자유주의자, 자본주의 옹호 |
| **BOB** | `persona_PINKER` | 스티븐 핑커 스타일, 낙관적 진보주의 |
| **DONNA** | `persona_WILSON` | E.O. 윌슨, 생물학·생태학 중심 |
| **BEN** | `persona_SHAPIRO` | 벤 샤피로, 보수적·논리 중심 |
| **JOHN** | `persona_PINKER` | 스티븐 핑커 (중복) |
| **CITIZEN** | `persona_CITIZEN` | 일반 시민, 실생활 중심 관점 |

#### 추가 정의된 페르소나들
- `persona_DAWKINS` - 리처드 도킨스 (과학적 엄밀성)
- `persona_HARARI` - 유발 하라리 (역사·철학)
- `persona_CHOMSKY` - 노암 촘스키 (사회비평)
- `persona_GRAY` - 존 그레이 (회의적 철학)
- `persona_HARAWAY` - 도나 해러웨이 (페미니즘·기술)
- `persona_WILSON` - E.O. 윌슨 (생물다양성)
- `persona_SMIL` - 바츨라프 스밀 (에너지·환경)
- `persona_ROSLING` - 한스 로슬링 (데이터 기반)

---

### 6. 핵심 에이전트 함수들

```python
# 주요 에이전트 노드
def agent_host(state)        # 사회자 - 토론 진행 및 다음 발언자 선택
def agent_translator(state)  # 번역가 - 한영 번역
def agent_critic(state)      # 비평가 - 토론 피드백 제공
def agent_punchliner(state)  # 요약가 - 핵심 포인트 정리
def agent_simplifier(state)  # 단순화 - 복잡한 내용 쉽게 설명

# 토론 참가자들
def agent_01_(state)  # FRITZ
def agent_02_(state)  # BOB
def agent_03_(state)  # DONNA
def agent_04_(state)  # BEN
def agent_05_(state)  # JOHN
def agent_06_(state)  # CITIZEN
```

---

### 7. 프롬프트 시스템

#### 사회자 지침 (`host_instructions_02`)
- 토론 주제 소개 (최소 300단어)
- 참가자별 균등한 발언 기회 보장
- 논리적 허점 지적 및 구체성 요구
- 반복 주장 방지
- 새로운 관점 유도
- 사용자 코멘트 통합
- 비평가 피드백 반영
- **한국어로 진행**

#### 토론자 지침 (`debate_agent_instructions`)
- 페르소나에 맞는 주장 전개
- 증거 기반 논증 (최소 150단어)
- 공격적 반론 허용
- 감정적 표현 전략적 활용
- 반복 금지, 새로운 각도 제시
- **한국어 사용 필수**
- 마크다운 문법 활용 (볼드체 강조)

#### 커뮤니티 스타일 지침 (`community_instructions_03`)
- 레딧 스타일 토론
- REBUT / DEVELOP / HYBRID 전략
- 밈, 이모지 적극 활용
- 페르소나 기반 감정 표현
- 무례하고 과장된 표현 허용
- 5-10문장 (125-150단어)

---

### 8. 비평가 시스템

#### Critic Agent 역할
```python
critic_instructions_02 = """
특정 참가자에게 전략적 조언 제공:
1. 상대 논리의 취약점 분석 (3-6개)
2. 공략 전략 제시 (3-5개)
3. 실제 사용 가능한 발화 예시 (2-4문장)

분석 관점:
- 논리 구조 분석
- 근거의 강약 분석
- 감정·레토릭 전략
- 전략적 포지션
"""
```

---

### 9. 모스 부호 시스템

토론 내용을 시각화하기 위한 모스 부호 변환 기능:

```python
morse_dict = {
    'A': [0, 1],  # 0=dot, 1=dash
    'B': [1, 0, 0, 0],
    # ... 알파벳, 숫자, 특수문자
    ' ': [2]  # 공백
}

def text_to_morse_sentence(text)
    # 문장을 모스 부호로 변환
```

---

## 🌐 `main.py` - 웹서버 구조

### FastAPI + WebSocket 서버

#### WebSocket 엔드포인트

| 엔드포인트 | 용도 | 클라이언트 |
|-----------|------|-----------|
| `/ws/chat` | 토론 메시지 전송 | `chat_clients[]` |
| `/ws/sc` | 모스 부호/제어 신호 | `sc_clients[]` |

#### 주요 기능

```python
# 1. 타이핑 효과
async def typing_effect(full_message, agent_type)
    # 글자 단위로 점진적 전송 (0.04초 간격)

# 2. 비동기 큐 처리
typing_queue = asyncio.Queue()
async def typing_worker()
    # 메시지를 순차적으로 처리

# 3. 브로드캐스팅
async def broadcast_to_all_chat_clients(message)
    # 모든 연결된 클라이언트에게 전송

# 4. 토론 처리
async def handle_chat_message(data, websocket)
    # LangGraph 실행 및 스트리밍 응답
```

#### 메시지 흐름

```
사용자 입력
    ↓
WebSocket (/ws/chat)
    ↓
handle_chat_message()
    ↓
graph.astream() - LangGraph 실행
    ↓
typing_queue.put()
    ↓
typing_worker()
    ↓
broadcast_to_all_chat_clients()
    ↓
모든 클라이언트에게 전송
```

---

## 🎨 프론트엔드 구조

### Client (Next.js)
```
client/
├── app/              # Next.js 앱 라우터
├── components/       # React 컴포넌트
├── lib/              # 유틸리티
└── public/           # 정적 파일
```

### Server (Vue.js)
```
server/
├── src/
│   ├── components/
│   ├── views/
│   └── backend/
└── public/
```

---

## 🔄 토론 플로우

### 1. 초기화
```
사용자 접속
    ↓
WebSocket 연결 (/ws/chat, /ws/sc)
    ↓
토론 시작 메시지 전송
```

### 2. 토론 진행
```
agent_host (사회자)
    ↓ (next 선택)
agent_01~06 (토론자)
    ↓
agent_translator (번역)
    ↓
모스 부호 변환
    ↓
클라이언트 전송
```

### 3. 피드백 루프
```
agent_critic (비평가)
    ↓ (feedback 제공)
agent_host (피드백 반영)
    ↓
다음 발언자 선택
```

### 4. 사용자 참여
```
사용자 코멘트 입력
    ↓
graph.update_state()
    ↓
agent_host가 코멘트 소개
    ↓
적절한 에이전트 선택하여 응답
```

---

## 🔧 기술 스택

### 백엔드
- **Python 3.x**
- **FastAPI** - 웹 프레임워크
- **LangGraph** - 에이전트 오케스트레이션
- **LangChain** - LLM 통합
- **OpenAI GPT-4/4.1/5-mini** - 언어 모델
- **WebSocket** - 실시간 통신
- **asyncio** - 비동기 처리

### 프론트엔드
- **Next.js** (client)
- **Vue.js** (server)
- **TypeScript**
- **TailwindCSS**

### 인프라
- **Docker** - 컨테이너화
- **uv** - Python 패키지 관리

---

## 📊 주요 설정값

```python
# 토론 설정
feedback_interval = 5  # 피드백 주기 (참가자 수 - 1)
interval = 30          # 주제 전환 간격
debate_duration = 60 * 25  # 토론 시간 (25분)

# 타이핑 효과
chunk_size = 1         # 글자 단위 전송
typing_delay = 0.04    # 0.04초 간격

# 서버
host = "0.0.0.0"
port = 4001
```

---

## 🎯 핵심 특징

### 1. **멀티 페르소나 시스템**
- 각 에이전트가 고유한 사상가/전문가 페르소나 보유
- 페르소나별 차별화된 논증 스타일

### 2. **동적 토론 관리**
- 사회자가 토론 흐름 제어
- 비평가가 실시간 피드백 제공
- 반복 방지 및 깊이 있는 논의 유도

### 3. **사용자 참여**
- 실시간 코멘트 입력
- 토론 흐름에 즉시 반영

### 4. **시각화**
- 모스 부호 변환으로 토론 시각화
- 타이핑 효과로 자연스러운 대화 연출

### 5. **다국어 지원**
- 한국어 토론 진행
- 영어 번역 기능

---

## 🚀 실행 방법

### Backend
```bash
cd backend
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
uv run main.py
```

### Client (Next.js)
```bash
cd client
pnpm install
pnpm dev
```

### Docker
```bash
docker compose up -d
```

---

## 📝 개선 가능 영역

1. **페르소나 중복** - JOHN과 BOB이 같은 `persona_PINKER` 사용
2. **하드코딩된 설정** - 토론 주제, 참가자 수 등이 코드에 고정
3. **에러 처리** - WebSocket 연결 끊김 시 복구 로직 보완 필요
4. **확장성** - 참가자 동적 추가/제거 기능 부재
5. **테스트** - 단위 테스트 및 통합 테스트 부족

---

## 🔍 코드 품질

- **총 라인 수**: ~1,780줄 (agent_multi.py)
- **함수 수**: 106개 이상
- **복잡도**: 중상 (멀티 에이전트 오케스트레이션)
- **문서화**: 주석 부족, 타입 힌트 일부 사용
- **모듈화**: 단일 파일에 과도한 로직 집중

---

## 💡 아키텍처 패턴

### 1. **에이전트 기반 아키텍처**
- LangGraph의 StateGraph 활용
- 각 에이전트가 독립적인 노드로 동작

### 2. **이벤트 기반 통신**
- WebSocket을 통한 실시간 양방향 통신
- 비동기 큐를 통한 메시지 처리

### 3. **상태 관리**
- GraphState로 토론 상태 중앙 관리
- LangGraph의 체크포인트 기능 활용

---

## 🎓 학습 포인트

이 프로젝트는 다음을 학습하기에 좋은 예제입니다:

- ✅ LangGraph를 활용한 멀티 에이전트 시스템
- ✅ FastAPI WebSocket 실시간 통신
- ✅ 비동기 Python 프로그래밍
- ✅ LLM 프롬프트 엔지니어링
- ✅ 복잡한 상태 관리
- ✅ 페르소나 기반 AI 대화 시스템

---

## 📌 요약

**와글와글**은 LangGraph 기반의 정교한 AI 토론 시스템으로, 6명의 서로 다른 페르소나를 가진 AI 에이전트들이 사회자의 진행 하에 구조화된 토론을 진행합니다. 실시간 WebSocket 통신, 비동기 처리, 타이핑 효과 등을 통해 자연스러운 토론 경험을 제공하며, 사용자 참여와 시각화 기능을 갖추고 있습니다.
