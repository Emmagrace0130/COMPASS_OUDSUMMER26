"""Pure generation-noise floor: runs each scenario's UNCHANGED base vignette question
N times against the default (unmitigated) pipeline. Since the question string never
changes, retrieval is trivially identical every rep -- any score spread here is 100%
generation-time stochasticity (temperature 0.1) plus judge noise, with zero retrieval
variance. Compares directly against the equity pilot's demographic-variant gaps to test
whether those gaps are distinguishable from ordinary noise."""
import json, os, re, time
from datetime import datetime
from pathlib import Path
import requests
from tqdm import tqdm
COMPASS_URL=os.getenv("COMPASS_URL","https://compass.axiomsystemslab.com")
JUDGE_URL=os.getenv("OLLAMA_JUDGE_URL","http://localhost:11434"); JUDGE=os.getenv("OLLAMA_JUDGE_MODEL","qwen3:32b")
N_REPS=8
V=json.load(open("equity_vignettes.json"))
BASES=[v for v in V if v["variant"]=="base"]
PROMPT="""\
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
def ask(q):
    t0=time.time()
    try:
        r=requests.post(f"{COMPASS_URL}/chat",json={"question":q},timeout=120); r.raise_for_status(); d=r.json()
        return d["answer"],[s["file"] for s in d.get("sources",[])],round(time.time()-t0,2),None
    except Exception as e: return "",[],round(time.time()-t0,2),str(e)
def judge(q,a,src):
    try:
        r=requests.post(f"{JUDGE_URL}/api/chat",json={"model":JUDGE,"messages":[{"role":"user","content":PROMPT.format(sources=", ".join(src[:4]) or "none",question=q,answer=a[:2000])}],
            "stream":False,"think":False,"options":{"temperature":0}},timeout=120); r.raise_for_status()
        t=re.sub(r"<think>.*?</think>","",r.json()["message"]["content"],flags=re.S).strip()
        if t.startswith("```"): t="\n".join(t.split("\n")[1:-1])
        return json.loads(t)
    except Exception: return None
print("health:",requests.get(f"{COMPASS_URL}/health",timeout=10).json().get("llm_backend"),flush=True)
jobs=[(v,rep) for v in BASES for rep in range(N_REPS)]
res=[]
for v,rep in tqdm(jobs,ncols=70):
    a,src,lat,err=ask(v["question"]); sc=judge(v["question"],a,src) if (a and not err) else None
    res.append(dict(id=f"{v['scenario']}-noise{rep}",scenario=v["scenario"],rep=rep,question=v["question"],
        sources=src,latency_s=lat,error=err,
        faithfulness=sc and sc["faithfulness"],answer_relevance=sc and sc["answer_relevance"],completeness=sc and sc["completeness"],reasoning=(sc or {}).get("reasoning","")))
    time.sleep(0.3)
stamp=datetime.now().strftime("%Y%m%d_%H%M%S"); out=Path("results")/f"noisefloor_{stamp}.json"
json.dump(res,open(out,"w"),indent=1); print("saved",out,"| judged:",sum(r["faithfulness"] is not None for r in res),"/",len(res))
