# Repository Guidelines

## Project Structure & Module Organization
- `client/`: Next.js (TypeScript + Tailwind) app. Pages under `app/`, shared UI in `components/` and `components/ui/`.
- `server/`: Vue 3 SPA (`src/`) and a Python FastAPI backend in `backend/` (WebSocket endpoints `/ws/chat`, `/ws/sc`). Static assets in `public/`.
- `backend/`: Agent logic (e.g., `agent_multi.py`), entrypoint `main.py`, deps in `requirements.txt` and `pyproject.toml`.
- `python/`: Small OSC/utility scripts.
- `sc/`: SuperCollider scripts and prompts.

## Build, Test, and Development Commands
- Client dev: `cd client && pnpm dev` (or `npm run dev`) — Next.js on `http://localhost:4000`.
- Client build: `cd client && pnpm build && pnpm start` — production build/start.
- Vue dev (optional UI): `cd server && npm run serve` — Vue CLI dev server on `:4000`.
- Backend setup: `cd backend && uv venv && source .venv/bin/activate && uv pip install -r requirements.txt`.
- Backend run: `uv run main.py` (FastAPI via Uvicorn on `:4001`).
- Lint: `cd client && pnpm lint`; `cd server && npm run lint`.

## Coding Style & Naming Conventions
- TypeScript/React: 2-space indent; functional components; Tailwind classes in JSX. Components live in `components/` (PascalCase exports; filenames follow existing pattern).
- Vue: Vue 3 SFC style; keep script/setup concise; follow ESLint rules in `server/package.json`.
- Python: 3.12+. Follow PEP 8, 4-space indent. Keep modules small and pure; place new agents in `backend/`.

## Testing Guidelines
- No formal unit tests yet. Prefer lightweight integration checks:
  - Start backend, verify `/ws/chat` and `/ws/sc` message flow.
  - Run client and exercise chat/controls.
- If adding tests, use `*.test.tsx` under `client/` and `pytest` under `backend/tests/`.

## Commit & Pull Request Guidelines
- Commits: short imperative summary. Allowed prefixes: `기능:` (feature), `수정:` (fix), `chore:`, `docs:`. Example: `수정: Tailwind 구성 에러 해결`.
- PRs: include scope/description, linked issues, screenshots or logs, and local run steps. Ensure linters pass and avoid committing `.venv`, `node_modules/`, or secrets.

## Security & Configuration
- Keep API keys and service URLs in environment variables; do not commit `.env` files.
- Default ports: client `4000`, backend `4001`. Adjust as needed to avoid conflicts.
