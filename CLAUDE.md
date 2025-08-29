# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is "와글와글" (WaglWagl), a multi-agent debate system that facilitates AI-powered discussions between multiple agents with real-time WebSocket communication to both a Next.js frontend and SuperCollider audio synthesis environment.

## Common Commands

### Frontend Development (Next.js)
```bash
cd client
npm install           # Install dependencies
npm run dev           # Run dev server on port 4000
npm run build         # Build for production
npm start             # Start production server on port 4000
npm run lint          # Lint TypeScript/React code
```

### Legacy Frontend (Vue.js - kept for reference)
```bash
cd server
yarn install          # Install dependencies
yarn serve            # Run dev server on port 4000
yarn build            # Build for production
yarn lint             # Lint Vue/JavaScript code
```

### Backend Development (FastAPI/Python)
```bash
cd server/backend
pip install -r requirements.txt    # Install Python dependencies
python main.py                      # Run backend server
# OR
uvicorn main:app --reload --port 4001
```

## Architecture

### Backend (server/backend/)
- **main.py**: FastAPI WebSocket server managing multiple client connections
  - `/ws/chat`: WebSocket endpoint for chat clients (Vue frontend)
  - `/ws/sc`: WebSocket endpoint for SuperCollider clients
  - Implements real-time typing effect for message streaming
  - Handles multi-agent debate coordination

- **agent_multi.py**: LangGraph-based multi-agent debate system
  - Implements StateGraph with multiple debate participants (FRITZ, BOB, DONNA, BEN, JOHN)
  - Moderator agent controls debate flow and topic transitions
  - Uses various LLMs (OpenAI, Anthropic, XAI) for agent personalities
  - Manages debate duration, topics, and participant interactions

### Frontend (client/)
- **Next.js 15 application** with TypeScript and real-time chat interface
- **app/page.tsx**: Main page component handling WebSocket communication, message rendering, and UI controls
- **components/Slider.tsx**: Reusable slider component for control inputs

### Legacy Frontend (server/)
- **Vue 3 application** with real-time chat interface
- **src/App.vue**: Main component handling WebSocket communication
- Features:
  - Real-time message display with markdown rendering
  - Agent-specific message styling
  - Control groups for interaction parameters
  - PDF export functionality

### Python CLI Tools (python/)
- **send_cli.py, set_cli.py, free_cli.py**: Command-line interfaces for system control
- OSC communication utilities for SuperCollider integration

### SuperCollider Integration (sc/)
- Audio synthesis scripts for generating sonic responses to debate content
- OSC receive handlers for real-time parameter control

## Key Technologies

- **LangGraph**: Orchestrates multi-agent debate workflow
- **LangChain**: Provides LLM integration and prompt engineering
- **FastAPI**: WebSocket server for real-time communication
- **Next.js 15**: Frontend framework with TypeScript for interactive UI
- **React 19**: UI library for component-based architecture
- **SuperCollider**: Real-time audio synthesis
- **OSC Protocol**: Inter-process communication for audio control

## Environment Variables

Required API keys (set in .env file):
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY` (optional)
- `XAI_API_KEY`
- `TAVILY_API_KEY`
- `LANGCHAIN_API_KEY` (for LangSmith tracing)

## Development Notes

- The system uses WebSocket connections for real-time bidirectional communication
- Message flow: Agent → Backend → WebSocket → Frontend/SuperCollider
- Debate topics are pre-configured in agent_multi.py
- Typing effect simulates natural conversation flow
- Memory management through LangGraph's MemorySaver for conversation persistence