# COMPASS Chat Interface

FastAPI + React chat UI backed by LangChain + FAISS RAG over the Vector_Library PDFs, with Ollama as the LLM.

## Quick start

### 1. Backend

```bash
cd compass-app/backend

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env: set OLLAMA_BASE_URL to your GPU server
```

**Build the vector index (run once):**
```bash
python ingest.py
```
This embeds all PDFs in Vector_Library using a local sentence-transformers model and saves the FAISS index to `backend/faiss_index/`. Takes ~15–30 min for 150+ documents.

**Start the API server:**
```bash
uvicorn main:app --reload --port 8000
```

### 2. Frontend

Requires Node.js (install from https://nodejs.org if not installed).

```bash
cd compass-app/frontend
npm install
npm run dev
```

Open http://localhost:5173

### 3. Ollama (GPU server)

When your GPU server is back up, set in `.env`:
```
OLLAMA_BASE_URL=http://your-server-ip:11434
OLLAMA_MODEL=llama3.1
```
Then restart the backend. The `/health` endpoint shows whether Ollama is reachable.

## API endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Returns index, Ollama, and chain status |
| `/chat` | POST | `{"question": "..."}` → `{"answer": "...", "sources": [...]}` |

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `llama3.1` | Model to use |
| `EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | Local embedding model |
| `VECTOR_LIBRARY_PATH` | `../../Vector_Library` | Path to PDF collection |
| `CHUNK_SIZE` | `800` | Characters per chunk |
| `TOP_K` | `6` | Documents retrieved per query |
