# COMPASS — OUD Research Assistant

## What it is
COMPASS is a RAG-based chatbot for querying 150+ clinical guidelines, research papers, and Tennessee policy documents related to Opioid Use Disorder (OUD) treatment. It is deployed at `https://compass.axiomsystemslab.com`.

## Repo layout
```
compass-app/
  frontend/       React + Vite + TypeScript + Tailwind CSS
  backend/        Python FastAPI + FAISS vector search
  docker-compose.yml
Vector_Library/   Source documents ingested into the FAISS index
```

## Tech stack
- **Frontend**: React 18, Vite 6, TypeScript 5.6, Tailwind CSS 3, react-markdown, recharts
- **Backend**: FastAPI, FAISS, fastembed, supports three LLM backends: Ollama, Claude (Anthropic), HuggingFace
- **Deployment**: Docker Compose behind an nginx-proxy + letsencrypt setup on `viridian_network` (external Docker network)

## API endpoints
- `POST /chat` — main RAG query, returns `{ answer, sources, backend }`
- `GET /health` — reports index readiness, LLM backend, Ollama reachability
- `GET /data/facilities` — returns TN OUD treatment facilities from CSV

## Frontend → backend routing
nginx in the frontend container proxies `/chat`, `/health`, `/data` to `http://backend:8000`. Everything else serves the React SPA (`index.html`).

## Environment
Backend reads from `./backend/.env`. Key vars:
- `LLM_BACKEND` — `ollama` | `claude` | `huggingface`
- `ANTHROPIC_API_KEY`, `CLAUDE_MODEL`
- `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `OLLAMA_USERNAME`, `OLLAMA_PASSWORD`
- `HF_API_TOKEN`, `HF_MODEL`
- `VECTOR_LIBRARY_PATH`, `FAISS_INDEX_PATH`

## Rebuild & deploy
```bash
cd compass-app
docker compose down
docker compose build --no-cache frontend   # or `backend` or omit for both
docker compose up -d
```
The user (`emma`) is in the `docker` group — no `sudo` needed. If docker commands fail with permission denied after a group change, the VSCode Remote server needs to be killed and restarted: `Ctrl+Shift+P → Remote-SSH: Kill VS Code Server on Host`.

## Known issues / history
- `src/vite-env.d.ts` was missing — caused build failure (`noUncheckedSideEffectImports` in tsconfig couldn't resolve `import "./index.css"`). Fixed and committed.
- `public/compass-transparent.svg` was untracked — Docker build would silently omit it. Fixed and committed.
- FAISS index is not in the repo — it lives in `compass-app/backend/faiss_index/` (Docker volume). If missing, run `python ingest.py` inside the backend container.
