"""
COMPASS RAG Evaluation — standalone script version of compass_rag_eval.ipynb
Run: python run_eval.py
"""
import json, os, time, sys
from pathlib import Path
from datetime import datetime

import requests
from tqdm import tqdm
from dotenv import load_dotenv

# ── Config ────────────────────────────────────────────────────────────────────
load_dotenv(Path("../compass-app/backend/.env"))
COMPASS_URL      = os.getenv("COMPASS_URL", "https://compass.axiomsystemslab.com")
OLLAMA_JUDGE_URL = os.getenv("OLLAMA_JUDGE_URL", "http://localhost:11434")
JUDGE_MODEL      = os.getenv("OLLAMA_JUDGE_MODEL", "qwen3:32b")
RESULTS_DIR      = Path("results")
RESULTS_DIR.mkdir(exist_ok=True)

# Opt-in evaluation conditions, for the RAG-vs-RAG+graph and RAG-vs-structured-rank
# comparisons. Default (no flag) is unchanged from the original script — plain RAG.
GRAPH_AUGMENT      = "--graph" in sys.argv or os.getenv("GRAPH_AUGMENT", "").lower() in ("1", "true", "yes")
STRUCTURED_RANK    = "--structured" in sys.argv or os.getenv("STRUCTURED_RANK", "").lower() in ("1", "true", "yes")
STRUCTURED_RANK_V2 = "--structured-v2" in sys.argv or os.getenv("STRUCTURED_RANK_V2", "").lower() in ("1", "true", "yes")
CLINICAL_QUERY     = "--clinical-query" in sys.argv or os.getenv("CLINICAL_QUERY", "").lower() in ("1", "true", "yes")
CLINICAL_QUERY_V2  = "--clinical-query-v2" in sys.argv or os.getenv("CLINICAL_QUERY_V2", "").lower() in ("1", "true", "yes")
STRUCTURED_RANK_V3 = "--structured-v3" in sys.argv or os.getenv("STRUCTURED_RANK_V3", "").lower() in ("1", "true", "yes")
if sum([GRAPH_AUGMENT, STRUCTURED_RANK, STRUCTURED_RANK_V2, STRUCTURED_RANK_V3, CLINICAL_QUERY, CLINICAL_QUERY_V2]) > 1:
    print("❌ --graph, --structured, --structured-v2, and --structured-v3 are mutually exclusive conditions in this script.")
    sys.exit(1)
CONDITION_LABEL = (" — GRAPH-AUGMENTED" if GRAPH_AUGMENT else
                   " — STRUCTURED-RANK" if STRUCTURED_RANK else
                   " — STRUCTURED-RANK-V2" if STRUCTURED_RANK_V2 else
                   " — STRUCTURED-RANK-V3" if STRUCTURED_RANK_V3 else
                   " — CLINICAL-QUERY" if CLINICAL_QUERY else
                   " — CLINICAL-QUERY-V2" if CLINICAL_QUERY_V2 else "")
RESULT_SUFFIX   = ("_graph" if GRAPH_AUGMENT else
                   "_structured" if STRUCTURED_RANK else
                   "_structured_v2" if STRUCTURED_RANK_V2 else
                   "_structured_v3" if STRUCTURED_RANK_V3 else
                   "_clinicalquery" if CLINICAL_QUERY else
                   "_clinicalqueryv2" if CLINICAL_QUERY_V2 else "")

print("=" * 60)
print("COMPASS RAG EVALUATION" + CONDITION_LABEL)
print(f"Endpoint   : {COMPASS_URL}")
print(f"Judge model: {JUDGE_MODEL} (Ollama @ {OLLAMA_JUDGE_URL})")
print("=" * 60)

# ── Health check ──────────────────────────────────────────────────────────────
try:
    h = requests.get(f"{COMPASS_URL}/health", timeout=10).json()
    print(f"\n✅ COMPASS reachable  |  backend={h.get('llm_backend')}  |  index={h.get('index_ready')}  |  chain={h.get('chain_loaded')}")
except Exception as e:
    print(f"\n❌ Cannot reach COMPASS: {e}")
    sys.exit(1)

try:
    r = requests.post(f"{OLLAMA_JUDGE_URL}/api/chat",
                      json={"model": JUDGE_MODEL, "messages": [{"role":"user","content":"ping"}],
                            "stream": False, "think": False},
                      timeout=30)
    r.raise_for_status()
    print(f"✅ Ollama judge reachable  |  model={JUDGE_MODEL}\n")
except Exception as e:
    print(f"❌ Cannot reach Ollama judge at {OLLAMA_JUDGE_URL}: {e}")
    sys.exit(1)

# ── Load test set ─────────────────────────────────────────────────────────────
with open("test_set.json") as f:
    test_set = json.load(f)
print(f"Loaded {len(test_set)} questions across {len({q['topic'] for q in test_set})} topics\n")

# ── Query COMPASS ─────────────────────────────────────────────────────────────
def query_compass(question: str, timeout: int = 120) -> dict:
    t0 = time.time()
    try:
        r = requests.post(f"{COMPASS_URL}/chat",
                           json={"question": question, "graph_augment": GRAPH_AUGMENT,
                                 "structured_rank": STRUCTURED_RANK,
                                 "structured_rank_v2": STRUCTURED_RANK_V2,
                                 "structured_rank_v3": STRUCTURED_RANK_V3,
                                 "clinical_query": CLINICAL_QUERY, "clinical_query_v2": CLINICAL_QUERY_V2},
                           timeout=timeout)
        r.raise_for_status()
        d = r.json()
        return {"answer": d.get("answer",""), "sources": d.get("sources",[]),
                "backend": d.get("backend",""), "latency_s": round(time.time()-t0,2), "error": None}
    except Exception as e:
        return {"answer":"","sources":[],"backend":"error","latency_s":round(time.time()-t0,2),"error":str(e)}

results = []
print("Querying COMPASS...")
for item in tqdm(test_set, ncols=70):
    resp = query_compass(item["question"])
    answered = resp["error"] is None and len(resp["answer"]) > 20
    results.append({**item, **resp, "answered": answered, "n_sources": len(resp["sources"])})
    time.sleep(0.5)

n_ok = sum(r["answered"] for r in results)
avg_lat = sum(r["latency_s"] for r in results) / len(results)
print(f"\n✅ {n_ok}/{len(results)} questions answered  |  avg latency: {avg_lat:.1f}s")

# ── Keyword coverage ──────────────────────────────────────────────────────────
def kw_score(answer: str, themes: list) -> float:
    a = answer.lower()
    found = sum(1 for t in themes if t.lower() in a)
    return round(found / len(themes), 3) if themes else 0.0

for r in results:
    r["kw_score"] = kw_score(r["answer"], r["expected_themes"])

avg_kw = sum(r["kw_score"] for r in results) / len(results)
print(f"Keyword coverage (mean): {avg_kw:.3f}")

# ── Claude judge ──────────────────────────────────────────────────────────────
JUDGE_PROMPT = """\
You are evaluating COMPASS, an AI assistant for opioid use disorder (OUD) research.

Score this Q&A on three dimensions (0–5):
- faithfulness: all claims grounded in OUD evidence, no hallucinations
- answer_relevance: directly addresses what was asked
- completeness: covers key clinical/policy concepts expected

Sources cited: {sources}
Question: {question}
Answer: {answer}

Respond ONLY with valid JSON:
{{"faithfulness": <int>, "answer_relevance": <int>, "completeness": <int>, "reasoning": "<one sentence>"}}"""

import re as _re

def judge(row: dict) -> dict | None:
    if not row["answered"]:
        return None
    sources = ", ".join(s.get("file","") for s in row.get("sources",[])[:4]) or "none"
    prompt = JUDGE_PROMPT.format(sources=sources, question=row["question"], answer=row["answer"][:2000])
    try:
        resp = requests.post(
            f"{OLLAMA_JUDGE_URL}/api/chat",
            json={"model": JUDGE_MODEL,
                  "messages": [{"role":"user","content":prompt}],
                  "stream": False, "think": False,
                  "options": {"temperature": 0}},
            timeout=120,
        )
        resp.raise_for_status()
        text = resp.json()["message"]["content"].strip()
        # strip any residual <think>…</think> blocks
        text = _re.sub(r"<think>.*?</think>", "", text, flags=_re.DOTALL).strip()
        if text.startswith("```"):
            text = "\n".join(text.split("\n")[1:-1])
        return json.loads(text)
    except Exception as e:
        print(f"  Judge error [{row['id']}]: {e}")
        return None

print("\nRunning Ollama judge scoring...")
for r in tqdm(results, ncols=70):
    score = judge(r)
    r["faithfulness"]     = score["faithfulness"]     if score else None
    r["answer_relevance"] = score["answer_relevance"] if score else None
    r["completeness"]     = score["completeness"]     if score else None
    r["reasoning"]        = score.get("reasoning","") if score else ""

# ── Summary ───────────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("RESULTS SUMMARY")
print("=" * 60)

# Per-question table
header = f"{'ID':<8} {'Difficulty':<10} {'KW':>5} {'Faith':>6} {'Relev':>6} {'Comp':>5} {'Lat':>6}  Question"
print("\n" + header)
print("-" * len(header))
for r in sorted(results, key=lambda x: x["kw_score"]):
    f  = f"{r['faithfulness']:.0f}"     if r["faithfulness"]     is not None else "—"
    rv = f"{r['answer_relevance']:.0f}" if r["answer_relevance"] is not None else "—"
    c  = f"{r['completeness']:.0f}"     if r["completeness"]     is not None else "—"
    print(f"{r['id']:<8} {r['difficulty']:<10} {r['kw_score']:>5.2f} {f:>6} {rv:>6} {c:>5} {r['latency_s']:>5.1f}s  {r['question'][:55]}…")

# Aggregate
print(f"\n{'─'*40}")
print(f"Avg keyword coverage : {sum(r['kw_score'] for r in results)/len(results):.3f}")
print(f"Questions ≥ 0.70 kw  : {sum(r['kw_score']>=0.7 for r in results)}/{len(results)}")
print(f"Avg sources cited    : {sum(r['n_sources'] for r in results)/len(results):.1f}")
print(f"Avg latency          : {avg_lat:.1f}s")

scored = [r for r in results if r["faithfulness"] is not None]
if scored:
    print(f"\nClaude Judge (n={len(scored)}, scale 0–5):")
    print(f"  Faithfulness      : {sum(r['faithfulness'] for r in scored)/len(scored):.2f}")
    print(f"  Answer relevance  : {sum(r['answer_relevance'] for r in scored)/len(scored):.2f}")
    print(f"  Completeness      : {sum(r['completeness'] for r in scored)/len(scored):.2f}")
    composite = sum((r['faithfulness']+r['answer_relevance']+r['completeness'])/15 for r in scored)/len(scored)
    print(f"  Composite (0–1)   : {composite:.3f}")

# Weakest questions
print(f"\n⚠️  Weakest keyword coverage:")
for r in sorted(results, key=lambda x: x["kw_score"])[:5]:
    missing = [t for t in r["expected_themes"] if t.lower() not in r["answer"].lower()]
    print(f"  [{r['id']}] kw={r['kw_score']:.2f}  missing: {', '.join(missing[:4])}")
    if r.get("reasoning"):
        print(f"          judge: {r['reasoning']}")

# Save
stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
suffix = RESULT_SUFFIX
csv_path = RESULTS_DIR / f"eval_{stamp}{suffix}.csv"

import csv
fields = ["id","topic","difficulty","question","answered","n_sources","latency_s",
          "kw_score","faithfulness","answer_relevance","completeness","reasoning","backend"]
with open(csv_path, "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
    w.writeheader()
    w.writerows(results)

json_path = RESULTS_DIR / f"raw_{stamp}{suffix}.json"
with open(json_path, "w") as f:
    json.dump([{k:v for k,v in r.items() if k != "sources"} for r in results], f, indent=2)

print(f"\n✅ Results saved to {csv_path}")
print(f"✅ Raw data saved  to {json_path}")
