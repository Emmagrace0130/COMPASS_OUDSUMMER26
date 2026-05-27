import csv
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

from config import FAISS_INDEX_PATH, OLLAMA_BASE_URL, LLM_BACKEND, ANTHROPIC_API_KEY, CLAUDE_MODEL, HF_API_TOKEN, HF_MODEL
from rag import load_retriever, build_ollama_chain, retrieve_docs, run_huggingface, run_claude, format_sources

app = FastAPI(title="COMPASS OUD Research Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

retriever = None
ollama_chain = None


@app.on_event("startup")
async def startup():
    global retriever, ollama_chain
    if not FAISS_INDEX_PATH.exists():
        print("WARNING: FAISS index not found. Run `python ingest.py` first.", flush=True)
        return

    print("Loading FAISS index ...", flush=True)
    retriever = load_retriever()

    if LLM_BACKEND == "ollama":
        print("Building Ollama QA chain ...", flush=True)
        ollama_chain = build_ollama_chain(retriever)

    if LLM_BACKEND == "huggingface":
        backend_label = f"HuggingFace ({HF_MODEL})"
    elif LLM_BACKEND == "claude":
        backend_label = f"Claude ({CLAUDE_MODEL})"
    else:
        backend_label = f"Ollama ({OLLAMA_BASE_URL})"
    print(f"COMPASS ready — backend: {backend_label}", flush=True)


class ChatRequest(BaseModel):
    question: str


class Source(BaseModel):
    file: str
    topic: str
    page: int | str
    excerpt: str


class ChatResponse(BaseModel):
    answer: str
    sources: list[Source]
    backend: str


@app.get("/health")
async def health():
    index_ready = FAISS_INDEX_PATH.exists()

    ollama_ok = False
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            ollama_ok = r.status_code == 200
    except Exception:
        pass

    return {
        "index_ready": index_ready,
        "llm_backend": LLM_BACKEND,
        "ollama_reachable": ollama_ok,
        "claude_model": CLAUDE_MODEL if LLM_BACKEND == "claude" else None,
        "chain_loaded": retriever is not None,
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    if retriever is None:
        if not FAISS_INDEX_PATH.exists():
            raise HTTPException(status_code=503, detail="Vector index not built yet. Run `python ingest.py` first.")
        raise HTTPException(status_code=503, detail="Server is still loading. Retry in a moment.")

    docs = retrieve_docs(retriever, req.question)

    if LLM_BACKEND == "huggingface":
        if not HF_API_TOKEN:
            raise HTTPException(status_code=503, detail="HF_API_TOKEN not set in .env")
        try:
            answer = run_huggingface(docs, req.question)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"HuggingFace API error: {e}")
        return ChatResponse(answer=answer, sources=format_sources(docs), backend="huggingface")

    if LLM_BACKEND == "claude":
        if not ANTHROPIC_API_KEY:
            raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY not set in .env")
        try:
            answer = run_claude(docs, req.question)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Claude API error: {e}")
        return ChatResponse(answer=answer, sources=format_sources(docs), backend="claude")

    # Ollama path
    if ollama_chain is None:
        raise HTTPException(status_code=503, detail="Ollama chain not loaded. Check OLLAMA_BASE_URL.")
    try:
        result = ollama_chain.invoke({"query": req.question})
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Ollama error: {e}")
    return ChatResponse(answer=result["result"], sources=format_sources(result.get("source_documents", [])), backend="ollama")


FACILITIES_CSV = Path(__file__).parent.parent.parent / "Vector_Library" / "T1:OUD_med&treat" / "opioid-treatment-directory-1779729812.csv"


@app.get("/data/facilities")
async def get_facilities():
    if not FACILITIES_CSV.exists():
        raise HTTPException(status_code=404, detail="Facilities CSV not found.")
    facilities = []
    with open(FACILITIES_CSV, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            facilities.append({
                "name": row["Program Name"],
                "street": row["Street"],
                "city": row["City"],
                "state": row["State"],
                "zip": row["Zip Code"],
                "phone": row["Phone"],
                "certification": row["Certification"],
                "certified_date": row["First Full Certification Date/CMS Use"],
            })
    return {"facilities": facilities}
