import csv
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

from config import FAISS_INDEX_PATH, OLLAMA_BASE_URL, OLLAMA_MODEL, LLM_BACKEND, ANTHROPIC_API_KEY, CLAUDE_MODEL, HF_API_TOKEN, HF_MODEL, OLLAMA_USERNAME, OLLAMA_PASSWORD
from rag import load_vectorstore, load_retriever, build_ollama_chain, retrieve_docs, run_huggingface_with_tools, run_claude_with_tools, run_ollama_graph_augmented, run_ollama_structured_rank, run_ollama_structured_rank_v2, run_ollama_clinical_query, run_ollama_clinical_query_v2, format_sources

app = FastAPI(title="COMPASS OUD Research Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "https://compass.axiomsystemslab.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

retriever     = None
vectorstore   = None  # raw FAISS store, needed for the structured-rank path's larger candidate pool
ollama_chain  = None
active_backend = LLM_BACKEND  # mutable at runtime


@app.on_event("startup")
async def startup():
    global retriever, vectorstore, ollama_chain, active_backend
    if not FAISS_INDEX_PATH.exists():
        print("WARNING: FAISS index not found. Run `python ingest.py` first.", flush=True)
        return

    print("Loading FAISS index ...", flush=True)
    vectorstore = load_vectorstore()
    retriever = load_retriever(vectorstore)

    if active_backend == "ollama":
        print("Building Ollama QA chain ...", flush=True)
        ollama_chain = build_ollama_chain(retriever)

    if active_backend == "huggingface":
        backend_label = f"HuggingFace ({HF_MODEL})"
    elif active_backend == "claude":
        backend_label = f"Claude ({CLAUDE_MODEL})"
    else:
        backend_label = f"Ollama ({OLLAMA_MODEL} @ {OLLAMA_BASE_URL})"
    print(f"COMPASS ready — backend: {backend_label}", flush=True)


class ChatRequest(BaseModel):
    question: str
    # Opt-in only — default (False) leaves the deployed /chat behavior exactly
    # as before. Used to run the graph-augmented vs. plain-RAG evaluation
    # comparison (Ollama backend only; ignored by other backends).
    graph_augment: bool = False
    # Opt-in only — ClinicBot-inspired structured-evidence re-ranking (Ollama
    # backend only). If both this and graph_augment are true, structured_rank
    # takes precedence; the two haven't been tested combined.
    structured_rank: bool = False
    # Opt-in only — corrected structured-rank (real similarity scores, capped
    # type nudge, per-source diversity cap, 5th "statistic" category).
    # Precedence over structured_rank if both are set.
    structured_rank_v2: bool = False
    # Opt-in only — v2 plus near-duplicate-content skipping ("v3").
    structured_rank_v3: bool = False
    # Opt-in only — retrieve on a descriptor-free rewritten clinical query (equity mitigation).
    clinical_query: bool = False
    # Opt-in only — deterministic (regex-based, no LLM call) version of clinical_query.
    clinical_query_v2: bool = False


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
        auth = (OLLAMA_USERNAME, OLLAMA_PASSWORD) if OLLAMA_USERNAME else None
        async with httpx.AsyncClient(timeout=3.0, auth=auth) as client:
            r = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            ollama_ok = r.status_code == 200
    except Exception:
        pass

    available = []
    if OLLAMA_BASE_URL:
        available.append({"id": "ollama", "label": f"Ollama · {OLLAMA_MODEL}"})
    if ANTHROPIC_API_KEY:
        available.append({"id": "claude", "label": f"Claude · {CLAUDE_MODEL}"})
    if HF_API_TOKEN:
        available.append({"id": "huggingface", "label": f"HuggingFace · {HF_MODEL.split('/')[-1]}"})

    return {
        "index_ready": index_ready,
        "llm_backend": active_backend,
        "ollama_reachable": ollama_ok,
        "claude_model": CLAUDE_MODEL if active_backend == "claude" else None,
        "chain_loaded": retriever is not None,
        "available_backends": available,
    }


class BackendRequest(BaseModel):
    backend: str


@app.post("/settings/backend")
async def set_backend(req: BackendRequest):
    global active_backend, ollama_chain
    b = req.backend
    if b not in ("ollama", "claude", "huggingface"):
        raise HTTPException(status_code=400, detail=f"Unknown backend: {b}")
    if b == "claude" and not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=400, detail="ANTHROPIC_API_KEY not configured.")
    if b == "huggingface" and not HF_API_TOKEN:
        raise HTTPException(status_code=400, detail="HF_API_TOKEN not configured.")
    if b == "ollama" and retriever is not None and ollama_chain is None:
        ollama_chain = build_ollama_chain(retriever)
    active_backend = b
    return {"active_backend": active_backend}


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    if retriever is None:
        if not FAISS_INDEX_PATH.exists():
            raise HTTPException(status_code=503, detail="Vector index not built yet. Run `python ingest.py` first.")
        raise HTTPException(status_code=503, detail="Server is still loading. Retry in a moment.")

    if active_backend == "huggingface":
        if not HF_API_TOKEN:
            raise HTTPException(status_code=503, detail="HF_API_TOKEN not set in .env")
        try:
            answer, docs = run_huggingface_with_tools(retriever, req.question)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"HuggingFace API error: {e}")
        return ChatResponse(answer=answer, sources=format_sources(docs), backend="huggingface")

    if active_backend == "claude":
        if not ANTHROPIC_API_KEY:
            raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY not set in .env")
        try:
            answer, docs = run_claude_with_tools(retriever, req.question)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Claude API error: {e}")
        return ChatResponse(answer=answer, sources=format_sources(docs), backend="claude")

    # Ollama path
    if ollama_chain is None:
        raise HTTPException(status_code=503, detail="Ollama chain not loaded. Check OLLAMA_BASE_URL.")
    try:
        if req.clinical_query_v2:
            result = run_ollama_clinical_query_v2(retriever, req.question)
            return ChatResponse(answer=result["answer"], sources=format_sources(result["docs"]), backend="ollama+clinical-query-v2")
        if req.clinical_query:
            result = run_ollama_clinical_query(retriever, req.question)
            return ChatResponse(answer=result["answer"], sources=format_sources(result["docs"]), backend="ollama+clinical-query")
        if req.structured_rank_v3:
            result = run_ollama_structured_rank_v2(vectorstore, req.question, dedupe_content=True)
            return ChatResponse(answer=result["answer"], sources=format_sources(result["docs"]), backend="ollama+structured-v3")
        if req.structured_rank_v2:
            result = run_ollama_structured_rank_v2(vectorstore, req.question)
            return ChatResponse(answer=result["answer"], sources=format_sources(result["docs"]), backend="ollama+structured-v2")
        if req.structured_rank:
            result = run_ollama_structured_rank(vectorstore, req.question)
            return ChatResponse(answer=result["answer"], sources=format_sources(result["docs"]), backend="ollama+structured")
        if req.graph_augment:
            result = run_ollama_graph_augmented(retriever, req.question)
            return ChatResponse(answer=result["answer"], sources=format_sources(result["docs"]), backend="ollama+graph")
        result = ollama_chain.invoke({"query": req.question})
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Ollama error: {e}")
    return ChatResponse(answer=result["result"], sources=format_sources(result.get("source_documents", [])), backend="ollama")


VECTOR_LIBRARY = Path(__file__).parent / "Vector_Library"


def _clean_name(stem: str) -> str:
    """Turn a filename stem into a readable display name."""
    import re
    s = stem
    # Strip PMC prefix like PMC12345678_
    s = re.sub(r'^PMC\d+_', '', s)
    # Strip DOI-style prefixes like 10-1234-
    s = re.sub(r'^10[-\.]\d+[-\.]', '', s)
    # Strip numeric journal IDs like 13722_2021_Article_
    s = re.sub(r'^\d+_\d+_Article_', '', s)
    # Replace hyphens and underscores with spaces
    s = re.sub(r'[-_]+', ' ', s)
    # Capitalise first letter
    return s[:1].upper() + s[1:] if s else stem


@app.get("/data/library_docs")
async def get_library_docs():
    from config import TOPIC_LABELS
    docs = []
    for folder in sorted(VECTOR_LIBRARY.iterdir()):
        if not folder.is_dir():
            continue
        label = TOPIC_LABELS.get(folder.name, folder.name)
        for pdf in sorted(folder.glob("*.pdf")):
            docs.append({
                "filename":     pdf.name,
                "display_name": _clean_name(pdf.stem),
                "topic":        label,
                "topic_folder": folder.name,
                "size_kb":      round(pdf.stat().st_size / 1024),
            })
    return {"docs": docs, "total": len(docs)}


@app.get("/data/library_docs/preview")
async def get_doc_preview(file: str, folder: str):
    from pypdf import PdfReader
    path = VECTOR_LIBRARY / folder / file
    if not path.exists() or not path.suffix == ".pdf":
        raise HTTPException(status_code=404, detail="File not found.")
    try:
        reader = PdfReader(str(path))
        text = ""
        for page in reader.pages[:3]:
            text += page.extract_text() or ""
            if len(text) > 800:
                break
        # Clean up whitespace
        import re
        text = re.sub(r'\s+', ' ', text).strip()
        return {"preview": text[:800]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/data/library")
async def get_library():
    from config import TOPIC_LABELS
    topics = []
    for folder in sorted(VECTOR_LIBRARY.iterdir()):
        if not folder.is_dir():
            continue
        pdfs = list(folder.glob("*.pdf"))
        csvs = list(folder.rglob("*.csv")) + list(folder.rglob("*.xlsx"))
        label = TOPIC_LABELS.get(folder.name, folder.name)
        topics.append({
            "folder": folder.name,
            "label": label,
            "pdf_count": len(pdfs),
            "dataset_count": len(csvs),
        })
    total_pdfs = sum(t["pdf_count"] for t in topics)
    return {"topics": topics, "total_pdfs": total_pdfs}


NSDUH_SAE_FOLDER = Path(__file__).parent / "Vector_Library" / "T3:TN_OUD_data&surv" / "OUD_data" / "raw" / "samhsa" / "2024-nsduh-sae-tables-percent-CSVs"

STATE_ABBREV = {
    "Alabama":"AL","Alaska":"AK","Arizona":"AZ","Arkansas":"AR","California":"CA",
    "Colorado":"CO","Connecticut":"CT","Delaware":"DE","District of Columbia":"DC",
    "Florida":"FL","Georgia":"GA","Hawaii":"HI","Idaho":"ID","Illinois":"IL",
    "Indiana":"IN","Iowa":"IA","Kansas":"KS","Kentucky":"KY","Louisiana":"LA",
    "Maine":"ME","Maryland":"MD","Massachusetts":"MA","Michigan":"MI","Minnesota":"MN",
    "Mississippi":"MS","Missouri":"MO","Montana":"MT","Nebraska":"NE","Nevada":"NV",
    "New Hampshire":"NH","New Jersey":"NJ","New Mexico":"NM","New York":"NY",
    "North Carolina":"NC","North Dakota":"ND","Ohio":"OH","Oklahoma":"OK","Oregon":"OR",
    "Pennsylvania":"PA","Rhode Island":"RI","South Carolina":"SC","South Dakota":"SD",
    "Tennessee":"TN","Texas":"TX","Utah":"UT","Vermont":"VT","Virginia":"VA",
    "Washington":"WA","West Virginia":"WV","Wisconsin":"WI","Wyoming":"WY",
}

STATE_POP_100K = {
    "AL":49,"AK":7,"AZ":74,"AR":30,"CA":395,"CO":58,"CT":36,"DC":7,"DE":10,
    "FL":220,"GA":107,"HI":14,"ID":19,"IL":126,"IN":68,"IA":32,"KS":29,"KY":45,
    "LA":46,"ME":13,"MD":62,"MA":70,"MI":100,"MN":57,"MS":30,"MO":62,"MT":11,
    "NE":20,"NV":32,"NH":14,"NJ":92,"NM":21,"NY":196,"NC":105,"ND":8,"OH":117,
    "OK":40,"OR":43,"PA":130,"RI":11,"SC":52,"SD":9,"TN":70,"TX":297,"UT":33,
    "VT":6,"VA":87,"WA":77,"WV":18,"WI":58,"WY":6,
}


@app.get("/data/treatment_gap")
async def get_treatment_gap():
    import csv as csv_mod, re

    def load_nsduh(fname: str) -> dict[str, float]:
        path = NSDUH_SAE_FOLDER / fname
        if not path.exists():
            return {}
        out: dict[str, float] = {}
        header_found = False
        SKIP = re.compile(r"Northeast|Midwest|South|West|Total|Region", re.I)
        with open(path, newline="", encoding="latin-1") as f:
            for row in csv_mod.reader(f):
                if not header_found:
                    if row and row[0].strip('"') == "Order":
                        header_found = True
                    continue
                if not row or not row[0].strip('"').isdigit():
                    continue
                state = row[1].strip('"')
                if SKIP.search(state):
                    continue
                try:
                    out[state] = float(row[2].strip('"').replace("%", ""))
                except ValueError:
                    pass
        return out

    oud      = load_nsduh("2024-nsduh-sae-excel-tab29.csv")
    needs    = load_nsduh("2024-nsduh-sae-excel-tab31.csv")
    received = load_nsduh("2024-nsduh-sae-excel-tab30.csv")
    unmet    = load_nsduh("2024-nsduh-sae-excel-tab32.csv")

    # Facility counts per state
    facility_counts: dict[str, int] = {}
    fac_path = FACILITIES_CSV
    if fac_path.exists():
        with open(fac_path, newline="", encoding="utf-8") as f:
            for row in csv_mod.DictReader(f):
                st = row.get("State", "").strip()
                if st:
                    facility_counts[st] = facility_counts.get(st, 0) + 1

    states = []
    for name, abbrev in STATE_ABBREV.items():
        pop = STATE_POP_100K.get(abbrev, 1)
        facs = facility_counts.get(abbrev, 0)
        gap = round((needs.get(name, 0) or 0) - (received.get(name, 0) or 0), 2)
        states.append({
            "name":           name,
            "abbrev":         abbrev,
            "oud_pct":        oud.get(name),
            "needs_pct":      needs.get(name),
            "received_pct":   received.get(name),
            "unmet_pct":      unmet.get(name),
            "gap_pct":        gap if needs.get(name) else None,
            "facilities":     facs,
            "fac_per_100k":   round(facs / pop, 2) if pop else 0,
        })

    states.sort(key=lambda s: -(s["unmet_pct"] or 0))
    return {"states": states}


TN_COUNTY_CSV    = Path(__file__).parent / "Vector_Library" / "T3:TN_OUD_data&surv" / "OUD_data" / "raw" / "cdc" / "cdc_vsrr_county_level_drug_overdose_death_counts.csv"
TN_OD_FOLDER     = Path(__file__).parent / "Vector_Library" / "T3:TN_OUD_data&surv"
PRESCRIPTION_CSV = TN_OD_FOLDER / "Prescription_Data_2013_2024.csv"


@app.get("/data/tn_counties")
async def get_tn_counties():
    import csv as csv_mod

    if not TN_COUNTY_CSV.exists():
        raise HTTPException(status_code=404, detail="TN county CSV not found.")

    # Aggregate total deaths per county per year
    # {year: {fips: {"county": name, "deaths": int, "suppressed": bool}}}
    by_year: dict[str, dict[str, dict]] = {}
    all_deaths: list[int] = []

    with open(TN_COUNTY_CSV, newline="", encoding="utf-8-sig") as f:
        for row in csv_mod.DictReader(f):
            if row.get("STATE_NAME") != "Tennessee":
                continue
            year    = row.get("Year", "").strip()
            county  = row.get("COUNTYNAME", "").strip()
            fips    = row.get("FIPS", "").strip()
            val_str = row.get("Provisional Drug Overdose Deaths", "").strip()
            footnote = row.get("Footnote", "").strip()

            if not year or not county or not fips:
                continue

            if year not in by_year:
                by_year[year] = {}

            suppressed = "1-9" in footnote or "suppressed" in footnote.lower()

            if val_str and not suppressed:
                try:
                    deaths = int(float(val_str))
                    existing = by_year[year].get(fips)
                    if existing and existing["deaths"] is not None:
                        by_year[year][fips]["deaths"] = max(existing["deaths"], deaths)
                    else:
                        by_year[year][fips] = {"county": county, "fips": fips, "deaths": deaths, "suppressed": False}
                    all_deaths.append(deaths)
                except ValueError:
                    pass
            elif suppressed and fips not in by_year[year]:
                by_year[year][fips] = {"county": county, "fips": fips, "deaths": None, "suppressed": True}

    # Compute global max per year for color scaling
    result = {}
    for year, counties in sorted(by_year.items()):
        vals = [c["deaths"] for c in counties.values() if c["deaths"] is not None]
        result[year] = {
            "max_deaths": max(vals) if vals else 0,
            "total":      sum(vals),
            "counties":   list(counties.values()),
        }

    years = sorted(result.keys())
    return {"years": years, "data": result}

FATAL_INDICATORS = {
    "All Drug Overdose Deaths": "All Drug OD Deaths",
    "Drug Overdose Deaths Involving All Opioids": "All Opioids",
    "Drug Overdose Deaths Involving Fentanyl": "Fentanyl",
    "Drug Overdose Deaths Involving Heroin": "Heroin",
    "Drug Overdose Deaths Involving Cocaine": "Cocaine",
    "Drug Overdoes Deaths Involving Psychostimulants with Abuse Potential (Including Methamphetamine)": "Meth/Stimulants",
    "Drug Overdose Deaths Involving Prescription Opioids": "Prescription Opioids",
    "Drug Overdose Deaths Involving Benzodiazepines": "Benzodiazepines",
}

NONFATAL_INDICATORS = {
    "Inpatient Stays Involving All Drug Overdose": "All Drug OD (Inpatient)",
    "Inpatient Stays Involving All Opioid Overdose Excluding Heroin": "Opioids Excl. Heroin (Inpatient)",
    "Inpatient Stays Involving All Stimulant Overdose": "Stimulants (Inpatient)",
    "ED Visits Involving All Drug Overdose": "All Drug OD (ED)",
    "ED Visits Involving All Opioid Overdose Excluding Heroin": "Opioids Excl. Heroin (ED)",
}


@app.get("/data/tn_od")
async def get_tn_od():
    import openpyxl

    def load_sheet(fname: str, sheet: str) -> list:
        path = TN_OD_FOLDER / fname
        if not path.exists():
            return []
        wb = openpyxl.load_workbook(path, read_only=True)
        if sheet not in wb.sheetnames:
            return []
        ws = wb[sheet]
        rows = list(ws.iter_rows(values_only=True))
        if not rows:
            return []
        headers = rows[0]
        return [dict(zip(headers, r)) for r in rows[1:] if any(v is not None for v in r)]

    fatal_rows    = load_sheet("FatalOD_Downloadable_Data_2013_2023.xlsx",    "Fatal_Data_2013_2023")
    nonfatal_rows = load_sheet("NonfatalOD_Downloadable_Data_2013_2023.xlsx", "Nonfatal_Data_2013_2023")

    # State-level trend by indicator (fatal)
    fatal_trends: dict[str, dict[int, int]] = {}
    for r in fatal_rows:
        if r.get("Geography Type") != "State" or r.get("Value Type") != "Count":
            continue
        ind = FATAL_INDICATORS.get(r.get("Indicator", ""))
        if not ind:
            continue
        yr = r.get("Year")
        val = r.get("Value")
        if yr and val is not None:
            try:
                fatal_trends.setdefault(ind, {})[int(yr)] = int(val)
            except (ValueError, TypeError):
                pass

    years = sorted({yr for vals in fatal_trends.values() for yr in vals})
    fatal_trend_rows = []
    for yr in years:
        row: dict = {"year": yr}
        for label, vals in fatal_trends.items():
            if yr in vals:
                row[label] = vals[yr]
        fatal_trend_rows.append(row)

    # County totals for most recent year (fatal, all drug OD deaths)
    latest_yr = max(years) if years else None
    county_totals: dict[str, int] = {}
    for r in fatal_rows:
        if r.get("Geography Type") != "County" or r.get("Value Type") != "Count":
            continue
        if r.get("Indicator") != "All Drug Overdose Deaths":
            continue
        if r.get("Year") != latest_yr:
            continue
        county = r.get("Geography", "")
        val = r.get("Value")
        if county and val is not None:
            try:
                county_totals[county] = int(val)
            except (ValueError, TypeError):
                pass

    top_counties = sorted(county_totals.items(), key=lambda x: -x[1])[:20]

    # Nonfatal state-level trend
    nonfatal_trends: dict[str, dict[int, int]] = {}
    for r in nonfatal_rows:
        if r.get("Geography Type") != "State" or r.get("Value Type") != "Count":
            continue
        ind = NONFATAL_INDICATORS.get(r.get("Indicator", ""))
        if not ind:
            continue
        yr = r.get("Year")
        val = r.get("Value")
        if yr and val is not None:
            try:
                nonfatal_trends.setdefault(ind, {})[int(yr)] = int(val)
            except (ValueError, TypeError):
                pass

    nonfatal_years = sorted({yr for vals in nonfatal_trends.values() for yr in vals})
    nonfatal_trend_rows = []
    for yr in nonfatal_years:
        row = {"year": yr}
        for label, vals in nonfatal_trends.items():
            if yr in vals:
                row[label] = vals[yr]
        nonfatal_trend_rows.append(row)

    return {
        "fatal_trends": fatal_trend_rows,
        "fatal_indicators": list(fatal_trends.keys()),
        "nonfatal_trends": nonfatal_trend_rows,
        "nonfatal_indicators": list(nonfatal_trends.keys()),
        "top_counties": [{"county": k, "deaths": v} for k, v in top_counties],
        "latest_year": latest_yr,
    }


WASTEWATER_CSV = Path(__file__).parent / "Vector_Library" / "T3:TN_OUD_data&surv" / "Wastewater_Testing_Opioids_results.csv"

AREA_TO_SITE = {
    "Collection Area 1": "TP01",
    "Collection Area 2": "TP02",
    "Collection Area 3": "TP03",
    "Collection Area 4": "TP04",
    "Collection Area 5": "TP05",
}


@app.get("/data/wastewater")
async def get_wastewater():
    import csv as csv_mod
    from datetime import datetime as dt

    if not WASTEWATER_CSV.exists():
        raise HTTPException(status_code=404, detail="Wastewater CSV not found.")

    # {drug: {area: [{date, pnml}]}}
    series: dict[str, dict[str, list]] = {}
    with open(WASTEWATER_CSV, newline="", encoding="utf-8-sig") as f:
        for row in csv_mod.DictReader(f):
            drug = row.get("target", "").strip()
            area = row.get("sample_location", "").strip()
            pnml_str = row.get("pnml", "").strip()
            date_str = row.get("week_start_date", "").strip()
            if not drug or not area or not pnml_str or not date_str:
                continue
            try:
                pnml = round(float(pnml_str), 4)
                date = date_str[:10]   # YYYY-MM-DD
            except ValueError:
                continue
            series.setdefault(drug, {}).setdefault(area, []).append({"date": date, "pnml": pnml})

    # Sort each series by date
    for drug in series:
        for area in series[drug]:
            series[drug][area].sort(key=lambda r: r["date"])

    # Latest value per drug per area
    latest: dict[str, dict[str, float]] = {}
    for drug, areas in series.items():
        for area, pts in areas.items():
            if pts:
                latest.setdefault(drug, {})[area] = pts[-1]["pnml"]

    drugs = sorted(series.keys())
    areas = sorted({a for d in series.values() for a in d.keys()})

    return {
        "drugs": drugs,
        "areas": areas,
        "area_to_site": AREA_TO_SITE,
        "series": series,
        "latest": latest,
    }


MOUD_FOLDER = Path(__file__).parent / "Vector_Library" / "T1:OUD_med&treat"
MOUD_FILES  = {
    "Baseline": "Patient-Baseline-Data.csv",
    "3-month":  "Patient-3-month-Data.csv",
    "6-month":  "Patient-6-month-Data.csv",
    "12-month": "Patient-12-month-Data.csv",
    "18-month": "Patient-18-month-Data.csv",
}
TREATMENT_LABELS = {"1": "Methadone", "2": "Buprenorphine", "3": "Naltrexone", "4": "Counseling Only"}
TIMEPOINT_ORDER  = ["Baseline", "3-month", "6-month", "12-month", "18-month"]


@app.get("/data/moud")
async def get_moud():
    import csv as csv_mod

    def load(fname: str) -> list[dict]:
        p = MOUD_FOLDER / fname
        if not p.exists():
            return []
        with open(p, newline="", encoding="utf-8-sig") as f:
            return list(csv_mod.DictReader(f))

    def pct(num, denom):
        return round(100 * num / denom, 1) if denom else 0

    timepoints = []
    for tp in TIMEPOINT_ORDER:
        rows = load(MOUD_FILES[tp])
        if not rows:
            continue
        n = len(rows)
        responded   = sum(1 for r in rows if r.get("responded","").strip() == "1")
        in_tx       = sum(1 for r in rows if r.get("inanytx","").strip()   == "1")
        abstinent   = sum(1 for r in rows if r.get("abstinent30ohf","").strip() == "1")
        overdose    = sum(1 for r in rows if r.get("opoverdose","").strip() == "1")
        bup         = sum(1 for r in rows if r.get("currentbup","").strip() == "1")
        mmt         = sum(1 for r in rows if r.get("currentmmt","").strip() == "1")
        ntx         = sum(1 for r in rows if r.get("currentntx","").strip() == "1")
        coun        = sum(1 for r in rows if r.get("currentcoun","").strip() == "1")
        n_resp      = responded if tp != "Baseline" else n

        timepoints.append({
            "timepoint":         tp,
            "n_enrolled":        n,
            "n_responded":       responded,
            "response_rate":     pct(responded, n),
            "retention_pct":     pct(in_tx, n_resp),
            "abstinence_pct":    pct(abstinent, n_resp),
            "overdose_pct":      pct(overdose, n_resp),
            "on_buprenorphine":  bup,
            "on_methadone":      mmt,
            "on_naltrexone":     ntx,
            "counseling_only":   coun,
            "bup_pct":           pct(bup, n_resp),
            "mmt_pct":           pct(mmt, n_resp),
            "ntx_pct":           pct(ntx, n_resp),
            "coun_pct":          pct(coun, n_resp),
        })

    # Outcomes by treatment type (from all non-baseline timepoints combined)
    by_treatment: dict[str, dict] = {v: {"n":0,"abstinent":0,"overdose":0,"in_tx":0} for v in TREATMENT_LABELS.values()}
    for tp in TIMEPOINT_ORDER[1:]:   # skip baseline
        rows = load(MOUD_FILES[tp])
        for r in rows:
            if r.get("responded","").strip() != "1":
                continue
            tx = "Buprenorphine" if r.get("currentbup","").strip()=="1" else \
                 "Methadone"     if r.get("currentmmt","").strip()=="1" else \
                 "Naltrexone"    if r.get("currentntx","").strip()=="1" else \
                 "Counseling Only" if r.get("currentcoun","").strip()=="1" else None
            if not tx:
                continue
            by_treatment[tx]["n"]         += 1
            by_treatment[tx]["abstinent"] += 1 if r.get("abstinent30ohf","").strip()=="1" else 0
            by_treatment[tx]["overdose"]  += 1 if r.get("opoverdose","").strip()=="1"    else 0
            by_treatment[tx]["in_tx"]     += 1 if r.get("inanytx","").strip()=="1"       else 0

    treatment_outcomes = [
        {
            "treatment":      tx,
            "n":              d["n"],
            "abstinence_pct": pct(d["abstinent"], d["n"]),
            "overdose_pct":   pct(d["overdose"],  d["n"]),
            "retention_pct":  pct(d["in_tx"],     d["n"]),
        }
        for tx, d in by_treatment.items() if d["n"] > 0
    ]

    # Baseline demographics
    base_rows = load(MOUD_FILES["Baseline"])
    employed  = sum(1 for r in base_rows if r.get("employed","").strip()=="1")
    insured   = sum(1 for r in base_rows if r.get("healthins","").strip()=="1")
    n_base    = len(base_rows)

    return {
        "timepoints":         timepoints,
        "treatment_outcomes": treatment_outcomes,
        "enrollment":         n_base,
        "employed_pct":       pct(employed, n_base),
        "insured_pct":        pct(insured, n_base),
        "source":             "CDC MOUD Study — 1,974 adults, 62 outpatient facilities, 18-month follow-up",
    }


FACILITIES_CSV = Path(__file__).parent / "Vector_Library" / "T1:OUD_med&treat" / "opioid-treatment-directory-1779729812.csv"


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


DRD_FOLDER  = Path(__file__).parent / "Vector_Library" / "T3:TN_OUD_data&surv"

# Metabolites/cut-outs to exclude — they just confirm parent drug presence
DRD_SKIP = {
    "Caffeine","Cotinine","Nicotine",
    "Norfentanyl","4-ANPP",                          # fentanyl metabolites
    "Benzoylecgonine","Ecgonine Methyl Ester","Cocaethylene",  # cocaine metabolites
    "Amphetamine",                                    # meth metabolite
    "Delta-9 Carboxy THC",                            # THC metabolite
    "Amlodipine","Quetiapine","Duloxetine",           # prescription non-abused
    "Phenylpropanolamine","9-Hydroxyrisperidone",
    "Blood Alcohol Concentration (BAC)",
}

DRD_FILES = ["2025 DRD Data set.xlsx", "March 2025 Data set DRD.xlsx"]


def _load_drd_cases() -> dict:
    """Load both DRD files, dedup by case number (the two files overlap),
    and return {case_number: (date_of_death, filtered_drug_set)}."""
    import openpyxl

    cases: dict = {}
    for fname in DRD_FILES:
        path = DRD_FOLDER / fname
        if not path.exists():
            continue
        wb = openpyxl.load_workbook(path, read_only=True)
        ws = wb.active
        rows = list(ws.iter_rows(values_only=True))
        headers = rows[0]
        case_idx = headers.index("Case number") if "Case number" in headers else None
        date_idx = headers.index("Date of death") if "Date of death" in headers else None
        if case_idx is None or date_idx is None:
            continue
        for row in rows[1:]:
            case_no = row[case_idx]
            date = row[date_idx]
            if not case_no or not date:
                continue
            drugs = {
                str(v).strip() for h, v in zip(headers, row)
                if h and "Toxicology" in str(h) and v
                and str(v).strip() not in DRD_SKIP
                and str(v).strip()
            }
            cases[case_no] = (date, drugs)  # later file wins on duplicate case numbers
    return cases

@app.get("/data/drd_heatmap")
async def get_drd_heatmap():
    from itertools import combinations

    cases: list[list[str]] = [list(drugs) for _, drugs in _load_drd_cases().values() if drugs]

    if not cases:
        raise HTTPException(status_code=404, detail="No DRD data found.")

    n = len(cases)

    # Drug prevalence (individual counts)
    from collections import Counter
    prevalence: Counter = Counter()
    for case in cases:
        for drug in case:
            prevalence[drug] += 1

    # Keep top drugs (≥ 3% prevalence)
    threshold = max(3, round(n * 0.03))
    top_drugs = [d for d, c in prevalence.most_common() if c >= threshold]

    # Co-occurrence matrix
    cooccur: dict[tuple[str,str], int] = Counter()
    for case in cases:
        relevant = [d for d in case if d in set(top_drugs)]
        for a, b in combinations(sorted(relevant), 2):
            cooccur[(a, b)] += 1

    # Build symmetric matrix
    matrix = []
    for drug_a in top_drugs:
        row = []
        for drug_b in top_drugs:
            if drug_a == drug_b:
                row.append(prevalence[drug_a])
            else:
                key = tuple(sorted([drug_a, drug_b]))
                row.append(cooccur.get(key, 0))  # type: ignore
        matrix.append(row)

    return {
        "drugs":      top_drugs,
        "matrix":     matrix,
        "prevalence": {d: prevalence[d] for d in top_drugs},
        "n_cases":    n,
    }


DRD_RISK_CAVEATS = [
    "This reflects medical examiner toxicology from fatal overdoses in Knox County, TN — not a real-time test of any specific substance.",
    "Death-record data lags by weeks to months; the most recent month is marked preliminary and excluded from the trend calculation.",
    "Knox County only — does not reflect other counties or states.",
]

DRD_RISK_TIPS = [
    "Fentanyl test strips can detect (but not quantify) fentanyl in a sample before use.",
    "Avoid using alone — have someone nearby who can respond, or use a service that can check in on you.",
    "Carry naloxone (Narcan) and know how to use it; it can reverse opioid overdoses including fentanyl.",
    "Start with a smaller amount than usual, especially with a new supply or after a period of not using.",
]


def _pct(numerator: int, denominator: int) -> float:
    return round(100 * numerator / denominator, 1) if denominator else 0.0


@app.get("/data/drd_risk_trend")
async def get_drd_risk_trend():
    from collections import defaultdict

    cases = list(_load_drd_cases().values())
    if not cases:
        raise HTTPException(status_code=404, detail="No DRD data found.")

    by_month: dict[str, list[set]] = defaultdict(list)
    for date, drugs in cases:
        by_month[date.strftime("%Y-%m")].append(drugs)

    months_sorted = sorted(by_month.keys())

    def month_stats(drug_sets: list[set]) -> dict:
        n = len(drug_sets)
        fent = sum(1 for d in drug_sets if "Fentanyl" in d)
        xyl  = sum(1 for d in drug_sets if "Xylazine" in d)
        poly = sum(1 for d in drug_sets if len(d) >= 3)
        return {
            "n_cases": n,
            "fentanyl_count": fent, "fentanyl_pct": _pct(fent, n),
            "xylazine_count": xyl, "xylazine_pct": _pct(xyl, n),
            "polysubstance_count": poly, "polysubstance_pct": _pct(poly, n),
        }

    PRELIM_MIN_N = 10
    month_rows = []
    usable_months = []  # months with enough cases to trust, in chronological order
    for i, m in enumerate(months_sorted):
        stats = month_stats(by_month[m])
        preliminary = (i == len(months_sorted) - 1) and stats["n_cases"] < PRELIM_MIN_N
        month_rows.append({
            "month": m,
            "n_cases": stats["n_cases"],
            "fentanyl_pct": stats["fentanyl_pct"],
            "xylazine_pct": stats["xylazine_pct"],
            "polysubstance_pct": stats["polysubstance_pct"],
            "preliminary": preliminary,
        })
        if not preliminary:
            usable_months.append(m)

    def window_stats(months: list[str]) -> dict:
        pooled = [d for m in months for d in by_month[m]]
        return month_stats(pooled)

    current_months = usable_months[-3:]
    prior_months   = usable_months[-6:-3]
    current_window = window_stats(current_months) if current_months else month_stats([])
    prior_window   = window_stats(prior_months) if prior_months else month_stats([])

    fent_delta = current_window["fentanyl_pct"] - prior_window["fentanyl_pct"]
    poly_delta = current_window["polysubstance_pct"] - prior_window["polysubstance_pct"]
    xyl_delta  = current_window["xylazine_pct"] - prior_window["xylazine_pct"]

    drivers: list[str] = []

    def quarter_label(months: list[str]) -> str:
        return f"{months[0]} to {months[-1]}" if months else "n/a"

    high = (
        current_window["fentanyl_pct"] >= 65
        or current_window["polysubstance_pct"] >= 70
        or (current_window["xylazine_pct"] >= 5 and current_window["xylazine_count"] >= 3)
    )
    elevated = (
        current_window["fentanyl_pct"] >= 45
        or current_window["polysubstance_pct"] >= 55
        or fent_delta >= 10
        or poly_delta >= 10
    )

    risk_band = "High" if high else ("Elevated" if elevated else "Low")

    if current_window["fentanyl_pct"] >= 45:
        drivers.append(f"Fentanyl was detected in {current_window['fentanyl_pct']}% of Knox Co. overdose deaths from {quarter_label(current_months)}.")
    if current_window["polysubstance_pct"] >= 55:
        drivers.append(f"{current_window['polysubstance_pct']}% of cases in that period involved 3 or more substances detected together.")
    if current_window["xylazine_count"] >= 3:
        drivers.append(f"Xylazine — a dangerous adulterant — appeared in {current_window['xylazine_pct']}% of cases in that period.")
    if fent_delta >= 10:
        drivers.append(f"Fentanyl-positive cases rose {round(fent_delta,1)} points versus the prior quarter ({prior_window['fentanyl_pct']}% to {current_window['fentanyl_pct']}%).")
    if poly_delta >= 10:
        drivers.append(f"Polysubstance combinations rose {round(poly_delta,1)} points versus the prior quarter ({prior_window['polysubstance_pct']}% to {current_window['polysubstance_pct']}%).")
    if not drivers:
        drivers.append(f"Fentanyl and polysubstance rates in the most recent quarter ({quarter_label(current_months)}) are within the typical range for Knox County.")

    return {
        "months": month_rows,
        "risk_band": risk_band,
        "current_window": {
            "label": quarter_label(current_months),
            "fentanyl_pct": current_window["fentanyl_pct"],
            "xylazine_pct": current_window["xylazine_pct"],
            "polysubstance_pct": current_window["polysubstance_pct"],
            "n_cases": current_window["n_cases"],
        },
        "prior_window": {
            "label": quarter_label(prior_months),
            "fentanyl_pct": prior_window["fentanyl_pct"],
            "xylazine_pct": prior_window["xylazine_pct"],
            "polysubstance_pct": prior_window["polysubstance_pct"],
            "n_cases": prior_window["n_cases"],
        },
        "drivers": drivers,
        "caveats": DRD_RISK_CAVEATS,
        "harm_reduction_tips": DRD_RISK_TIPS,
    }


NSDUH_CSV_FOLDER = Path(__file__).parent / "Vector_Library" / "T3:TN_OUD_data&surv" / "OUD_data" / "raw" / "samhsa" / "2024-nsduh-sae-tables-percent-CSVs"

NSDUH_TABLES = {
    "tab09": "Heroin Use (Past Year)",
    "tab12": "Methamphetamine Use (Past Year)",
    "tab13": "Prescription Opioid Misuse (Past Year)",
    "tab14": "Opioid Misuse (Past Year)",
    "tab29": "Opioid Use Disorder (Past Year)",
    "tab30": "Received SU Treatment (Past Year)",
    "tab31": "Needs SU Treatment (Past Year)",
    "tab32": "Unmet Treatment Need",
    "tab35": "Co-occurring SUD + Mental Illness",
}

TN_NEIGHBORS = {"Tennessee", "Kentucky", "Virginia", "North Carolina", "Georgia",
                "Alabama", "Mississippi", "Arkansas", "Missouri", "Total U.S."}


@app.get("/data/nsduh")
async def get_nsduh():
    import csv as csv_mod, re

    if not NSDUH_CSV_FOLDER.exists():
        raise HTTPException(status_code=404, detail="NSDUH CSV folder not found.")

    def parse_pct(s: str) -> float | None:
        try:
            return float(s.strip().replace("%", ""))
        except (ValueError, AttributeError):
            return None

    result: dict = {"tables": {}, "table_labels": NSDUH_TABLES}

    for key, label in NSDUH_TABLES.items():
        pattern = f"2024-nsduh-sae-excel-{key}.csv"
        fpath = NSDUH_CSV_FOLDER / pattern
        if not fpath.exists():
            continue

        rows = []
        with open(fpath, newline="", encoding="latin-1") as f:
            reader = csv_mod.reader(f)
            header_found = False
            headers: list[str] = []
            for row in reader:
                if not header_found:
                    if row and row[0].strip('"') == "Order":
                        headers = [h.strip('"') for h in row]
                        header_found = True
                    continue
                if not row or not row[0].strip('"').isdigit():
                    continue
                state = row[1].strip('"') if len(row) > 1 else ""
                est_12plus = parse_pct(row[2]) if len(row) > 2 else None
                ci_low  = parse_pct(row[3]) if len(row) > 3 else None
                ci_high = parse_pct(row[4]) if len(row) > 4 else None
                if state and est_12plus is not None:
                    rows.append({
                        "state": state,
                        "estimate": est_12plus,
                        "ci_low": ci_low,
                        "ci_high": ci_high,
                    })

        rows.sort(key=lambda r: -r["estimate"])
        result["tables"][key] = rows

    return result
CDC_FOLDER = Path(__file__).parent / "Vector_Library" / "T3:TN_OUD_data&surv" / "OUD_data" / "raw" / "cdc"

MONTH_MAP = {"January":1,"February":2,"March":3,"April":4,"May":5,"June":6,
             "July":7,"August":8,"September":9,"October":10,"November":11,"December":12}

TN_INDICATORS = {
    "Number of Drug Overdose Deaths": "Total Overdose Deaths",
    "Synthetic opioids, excl. methadone (T40.4)": "Synthetic Opioids (fentanyl)",
    "Heroin (T40.1)": "Heroin",
    "Cocaine (T40.5)": "Cocaine",
    "Psychostimulants with abuse potential (T43.6)": "Stimulants (meth)",
    "Natural & semi-synthetic opioids (T40.2)": "Prescription Opioids",
}


@app.get("/data/cdc")
async def get_cdc_data():
    import csv as csv_mod

    result: dict = {}

    # ── 1. TN state-level trends by indicator ─────────────────────────────
    tn_trends: dict[str, dict[str, int]] = {}
    state_file = CDC_FOLDER / "cdc_vsrr_provisional_drug_overdose_death_counts.csv"
    if state_file.exists():
        with open(state_file, newline="", encoding="utf-8-sig") as f:
            for row in csv_mod.DictReader(f):
                if row.get("State") != "TN":
                    continue
                indicator = row.get("Indicator", "").strip()
                label = TN_INDICATORS.get(indicator)
                if not label:
                    continue
                val_str = row.get("Data Value", "").strip()
                if not val_str:
                    continue
                try:
                    val = int(float(val_str))
                except ValueError:
                    continue
                year = row.get("Year", "").strip()
                month_name = row.get("Month", "").strip()
                month_num = MONTH_MAP.get(month_name, 0)
                key = f"{year}-{month_num:02d}"
                if label not in tn_trends:
                    tn_trends[label] = {}
                tn_trends[label][key] = val

    # pivot to list of {period, label: val, ...} for recharts
    all_periods = sorted({p for vals in tn_trends.values() for p in vals})
    tn_trend_rows = []
    for p in all_periods:
        row_out: dict = {"period": p}
        for label in tn_trends:
            if p in tn_trends[label]:
                row_out[label] = tn_trends[label][p]
        tn_trend_rows.append(row_out)
    result["tn_trends"] = tn_trend_rows
    result["tn_indicators"] = list(TN_INDICATORS.values())

    # ── 2. TN county totals ───────────────────────────────────────────────
    county_totals: dict[str, int] = {}
    county_file = CDC_FOLDER / "cdc_vsrr_county_level_drug_overdose_death_counts.csv"
    if county_file.exists():
        with open(county_file, newline="", encoding="utf-8") as f:
            for row in csv_mod.DictReader(f):
                if row.get("STATE_NAME") != "Tennessee":
                    continue
                county = row.get("COUNTYNAME", "").strip()
                val_str = row.get("Provisional Drug Overdose Deaths", "").strip()
                if not val_str or not county:
                    continue
                try:
                    county_totals[county] = county_totals.get(county, 0) + int(float(val_str))
                except ValueError:
                    continue
    result["tn_counties"] = [
        {"county": k, "deaths": v}
        for k, v in sorted(county_totals.items(), key=lambda x: -x[1])
    ]

    # ── 3. National specific drug trends (US total, 12-month ending) ──────
    drug_trends: dict[str, dict[str, int]] = {}
    drug_file = CDC_FOLDER / "cdc_provisional_overdose_specific_drugs.csv"
    if drug_file.exists():
        with open(drug_file, newline="", encoding="utf-8") as f:
            for row in csv_mod.DictReader(f):
                if row.get("jurisdiction_occurrence") != "United States":
                    continue
                if row.get("time_period") != "12 month-ending":
                    continue
                drug = row.get("drug_involved", "").strip()
                val_str = row.get("drug_overdose_deaths", "").strip()
                date = row.get("month_ending_date", "").strip()
                if not drug or not val_str or not date:
                    continue
                try:
                    val = int(float(val_str))
                except ValueError:
                    continue
                if drug not in drug_trends:
                    drug_trends[drug] = {}
                drug_trends[drug][date] = val

    all_dates = sorted({d for vals in drug_trends.values() for d in vals})
    drug_rows = []
    for d in all_dates:
        row_out = {"date": d}
        for drug in drug_trends:
            if d in drug_trends[drug]:
                row_out[drug] = drug_trends[drug][d]
        drug_rows.append(row_out)
    result["national_drug_trends"] = drug_rows
    result["national_drugs"] = list(drug_trends.keys())

    return result


DEMO_CSV = CDC_FOLDER / "cdc_drug_overdose_death_rates_demographics.csv"

DEMO_PANELS = {
    "All drug overdose deaths":                                          "All OD Deaths",
    "Drug overdose deaths involving any opioid":                         "Any Opioid",
    "Drug overdose deaths involving other synthetic opioids (other than methadone)": "Synthetic Opioids (fentanyl)",
    "Drug overdose deaths involving heroin":                             "Heroin",
    "Drug overdose deaths involving natural and semisynthetic opioids":  "Prescription Opioids",
    "Drug overdose deaths involving methadone":                          "Methadone",
}

RACE_SIMPLIFY = {
    "Hispanic or Latino: All races": "Hispanic/Latino",
    "Not Hispanic or Latino: White": "Non-Hisp. White",
    "Not Hispanic or Latino: Black": "Non-Hisp. Black",
    "Not Hispanic or Latino: American Indian or Alaska Native": "AI/AN",
    "Not Hispanic or Latino: Asian or Pacific Islander": "Asian/PI",
    "Not Hispanic or Latino: Asian": "Asian",
    "Not Hispanic or Latino: Native Hawaiian or Other Pacific Islander": "NHPI",
}


@app.get("/data/cdc_demographics")
async def get_cdc_demographics():
    import csv as csv_mod

    if not DEMO_CSV.exists():
        raise HTTPException(status_code=404, detail="CDC demographics data not found.")

    def safe_float(s: str) -> float | None:
        try:
            return float(s.strip()) if s.strip() else None
        except (ValueError, AttributeError):
            return None

    rows = []
    with open(DEMO_CSV, newline="", encoding="utf-8") as f:
        for row in csv_mod.DictReader(f):
            est = safe_float(row.get("ESTIMATE", ""))
            if est is None:
                continue
            rows.append({
                "panel":      row["PANEL"],
                "stub_name":  row["STUB_NAME"],
                "stub_label": row["STUB_LABEL"],
                "year":       int(row["YEAR"]),
                "age":        row["AGE"],
                "estimate":   est,
            })

    # ── 1. Sex trends: Male/Female rates per 100k, by year, for each drug panel ──
    sex_trends: dict[str, dict[int, dict[str, float]]] = {}  # {panel_short: {year: {sex: rate}}}
    for r in rows:
        if r["stub_name"] != "Sex" or r["age"] != "All ages":
            continue
        plabel = DEMO_PANELS.get(r["panel"])
        if not plabel:
            continue
        sex_trends.setdefault(plabel, {}).setdefault(r["year"], {})[r["stub_label"]] = r["estimate"]

    sex_trend_list: dict[str, list] = {}
    for plabel, by_year in sex_trends.items():
        sex_trend_list[plabel] = [
            {"year": yr, **vals}
            for yr, vals in sorted(by_year.items())
        ]

    # ── 2. Age distribution: most recent year, rates by age group, each panel ──
    age_rows = [r for r in rows if r["stub_name"] == "Age" and r["age"] != "All ages"]
    latest_year = max(r["year"] for r in age_rows) if age_rows else 2018
    age_dist: dict[str, dict[str, float]] = {}  # {age_label: {panel_short: rate}}
    for r in [r for r in age_rows if r["year"] == latest_year]:
        plabel = DEMO_PANELS.get(r["panel"])
        if not plabel:
            continue
        age_dist.setdefault(r["age"], {})[plabel] = r["estimate"]

    # Sort age groups logically
    AGE_ORDER = ["Under 15 years","15-24 years","25-34 years","35-44 years",
                 "45-54 years","55-64 years","65-74 years","75-84 years","85 years and over"]
    age_dist_list = [
        {"age": age, **age_dist.get(age, {})}
        for age in AGE_ORDER if age in age_dist
    ]

    # ── 3. Race/ethnicity: most recent year, rates by simplified race label, each panel ──
    race_rows = [r for r in rows
                 if "Hispanic" in r["stub_name"]
                 and r["age"] == "All ages"
                 and r["year"] == latest_year]
    race_dist: dict[str, dict[str, dict[str, float]]] = {}  # {panel_short: {race: {sex: rate}}}
    for r in race_rows:
        plabel = DEMO_PANELS.get(r["panel"])
        if not plabel:
            continue
        # stub_label is like "Male: Not Hispanic or Latino: White"
        parts = r["stub_label"].split(": ", 1)
        if len(parts) != 2:
            continue
        sex, race_str = parts[0].strip(), parts[1].strip()
        # Handle 3-part labels like "Not Hispanic or Latino: White"
        race_key = RACE_SIMPLIFY.get(race_str)
        if not race_key:
            continue
        race_dist.setdefault(plabel, {}).setdefault(race_key, {})[sex] = r["estimate"]

    RACE_ORDER = ["Non-Hisp. White","Non-Hisp. Black","Hispanic/Latino","AI/AN","Asian/PI","Asian","NHPI"]
    race_dist_list: dict[str, list] = {}
    for plabel, by_race in race_dist.items():
        race_dist_list[plabel] = [
            {"race": race, **by_race.get(race, {})}
            for race in RACE_ORDER if race in by_race
        ]

    return {
        "sex_trends":   sex_trend_list,
        "age_dist":     age_dist_list,
        "race_dist":    race_dist_list,
        "panels":       list(DEMO_PANELS.values()),
        "latest_year":  latest_year,
        "unit":         "Deaths per 100,000 resident population (age-adjusted)",
        "source":       "CDC NCHS — Drug overdose death rates by demographics, 1999–2018",
    }

FIELD_MAP = {
    "County": "county",
    "Case number": "case_number",
    "Homeless": "homeless",
    "Sex": "sex",
    "Race": "race",
    "Ethnicity": "ethnicity",
    "Date of death": "date",
    "Age": "age",
    "Description": "location_type",
    "Injury Location - Description": "location_type",
    "Injury Location - Address 1": "address",
    "Injury Location - City": "city",
    "Injury Location - County": "injury_county",
    "Injury Location - Zip": "zip",
    "Immediate cause": "cause",
    "Cause of death 2": "cause2",
    "Cause of death 3": "cause3",
    "Other conditions": "other_conditions",
    "Autopsy - Cause of death 2": "cause2",
    "Autopsy - Other conditions": "other_conditions",
    "Autopsy - COD/Circumstances type": "cod_type",
}


@app.get("/data/drd")
async def get_drd():
    import openpyxl
    from datetime import datetime as dt

    if not DRD_FOLDER.exists():
        raise HTTPException(status_code=404, detail="DRD data folder not found.")

    # Only read the known DRD case files — DRD_FOLDER.glob("*.xlsx") also picks up
    # statewide OD/prescription xlsx files that aren't case records. Deduplicate by
    # case number so the March 2025 subset (29 cases) doesn't double-count.
    by_case: dict[str, dict] = {}
    for fname in DRD_FILES:
        xlsx_path = DRD_FOLDER / fname
        if not xlsx_path.exists():
            continue
        wb = openpyxl.load_workbook(xlsx_path, read_only=True)
        for sheet_name in wb.sheetnames:
            ws = wb[sheet_name]
            rows = list(ws.iter_rows(values_only=True))
            if not rows:
                continue
            raw_headers = [str(h) if h is not None else "" for h in rows[0]]
            case_idx = next((i for i, h in enumerate(raw_headers) if h == "Case number"), None)
            for row in rows[1:]:
                if all(v is None for v in row):
                    continue
                rec: dict = {}
                tox = []
                for h, v in zip(raw_headers, row):
                    if v is None:
                        continue
                    if h.startswith("Toxicology"):
                        tox.append(str(v))
                    else:
                        key = FIELD_MAP.get(h, h)
                        rec[key] = v.strftime("%Y-%m-%d") if isinstance(v, dt) else v
                rec["toxicology"] = tox
                rec["source"] = xlsx_path.name
                key = str(rec.get("case_number", id(rec))) if case_idx is not None else str(id(rec))
                by_case[key] = rec

    records = list(by_case.values())
    return {"records": records, "total": len(records)}


@app.get("/data/prescriptions")
async def get_prescriptions():
    import csv as csv_mod

    if not PRESCRIPTION_CSV.exists():
        raise HTTPException(status_code=404, detail="Prescription data not found")

    rows: list[dict] = []
    with open(PRESCRIPTION_CSV, newline="", encoding="utf-8") as f:
        for row in csv_mod.DictReader(f):
            rows.append(row)

    # ── State-level trend (Rate per 1,000) ───────────────────────────────────
    OPIOIDS = {"All Opioids for Pain", "Hydrocodone", "Oxycodone", "Tramadol"}
    BENZOS  = {"All Benzodiazepines", "Alprazolam", "Clonazepam", "Diazepam", "Lorazepam"}

    state_rate: dict[str, dict[str, float]] = {}  # {year: {indicator: rate}}
    for r in rows:
        if r["Geography Type"] != "State" or r["Value Type"] != "Rate":
            continue
        yr  = r["Year"]
        ind = r["Indicator"]
        if ind not in OPIOIDS | BENZOS:
            continue
        state_rate.setdefault(yr, {})[ind] = float(r["Value"])

    trends = [{"year": int(yr), **vals}
              for yr, vals in sorted(state_rate.items(), key=lambda x: int(x[0]))]

    # ── County-level (Rate) by year ───────────────────────────────────────────
    county_rate: dict[str, dict[str, dict[str, float]]] = {}  # {year: {county: {ind: rate}}}
    for r in rows:
        if r["Geography Type"] != "County" or r["Value Type"] != "Rate":
            continue
        yr      = r["Year"]
        county  = r["Geography"]
        ind     = r["Indicator"]
        if ind not in {"All Opioids for Pain", "All Benzodiazepines"}:
            continue
        county_rate.setdefault(yr, {}).setdefault(county, {})[ind] = float(r["Value"])

    county_by_year: dict[str, list] = {}
    for yr, counties in county_rate.items():
        county_by_year[yr] = [
            {"county": c, **vals}
            for c, vals in sorted(counties.items(), key=lambda x: x[1].get("All Opioids for Pain", 0), reverse=True)
        ]

    # ── Summary stats ─────────────────────────────────────────────────────────
    opioid_rates = [t.get("All Opioids for Pain", 0) for t in trends]
    peak_year    = trends[opioid_rates.index(max(opioid_rates))]["year"] if opioid_rates else None
    latest       = trends[-1] if trends else {}
    earliest     = trends[0]  if trends else {}

    pct_decline = None
    if latest.get("All Opioids for Pain") and earliest.get("All Opioids for Pain"):
        pct_decline = round((1 - latest["All Opioids for Pain"] / earliest["All Opioids for Pain"]) * 100, 1)

    return {
        "trends":        trends,
        "county_by_year": county_by_year,
        "summary": {
            "peak_year":   peak_year,
            "pct_decline": pct_decline,
            "latest_year": latest.get("year"),
            "latest_opioid_rate": latest.get("All Opioids for Pain"),
            "latest_benzo_rate":  latest.get("All Benzodiazepines"),
        },
        "indicators": sorted(OPIOIDS | BENZOS),
    }


# Pre-aggregated from TEDS-A tedsa_puf_2006_2023.csv (4.6 GB — not processable at runtime)
# SUB1: 5=heroin, 6=non-Rx methadone, 7=other opioids/synthetics | PSOURCE 7=CJ | METHUSE 1=MAT
TEDS_TN_DATA = [
    {"year":2006,"total":1529,"heroin":0,   "rx_opioid":1529,"methadone_sub":0, "cj_referral":390, "self_referral":782, "health_referral":138,"mat":0},
    {"year":2007,"total":1743,"heroin":2,   "rx_opioid":1741,"methadone_sub":0, "cj_referral":444, "self_referral":917, "health_referral":135,"mat":4},
    {"year":2008,"total":2022,"heroin":0,   "rx_opioid":2022,"methadone_sub":0, "cj_referral":516, "self_referral":1101,"health_referral":142,"mat":1},
    {"year":2009,"total":2469,"heroin":104, "rx_opioid":2334,"methadone_sub":31,"cj_referral":704, "self_referral":1336,"health_referral":169,"mat":7},
    {"year":2010,"total":3590,"heroin":199, "rx_opioid":3331,"methadone_sub":60,"cj_referral":1094,"self_referral":1832,"health_referral":359,"mat":3},
    {"year":2011,"total":4126,"heroin":240, "rx_opioid":3832,"methadone_sub":54,"cj_referral":1480,"self_referral":1897,"health_referral":411,"mat":6},
    {"year":2012,"total":4611,"heroin":392, "rx_opioid":4163,"methadone_sub":56,"cj_referral":1653,"self_referral":1836,"health_referral":770,"mat":5},
    {"year":2013,"total":5070,"heroin":555, "rx_opioid":4451,"methadone_sub":64,"cj_referral":1967,"self_referral":1753,"health_referral":934,"mat":4},
    {"year":2014,"total":5318,"heroin":745, "rx_opioid":4508,"methadone_sub":65,"cj_referral":2167,"self_referral":1830,"health_referral":896,"mat":16},
    {"year":2015,"total":5477,"heroin":1088,"rx_opioid":4315,"methadone_sub":74,"cj_referral":2279,"self_referral":1719,"health_referral":1057,"mat":17},
    {"year":2016,"total":6010,"heroin":1696,"rx_opioid":4254,"methadone_sub":60,"cj_referral":2520,"self_referral":2119,"health_referral":925,"mat":16},
    {"year":2017,"total":6567,"heroin":2203,"rx_opioid":4316,"methadone_sub":48,"cj_referral":2474,"self_referral":2708,"health_referral":804,"mat":9},
    {"year":2018,"total":7407,"heroin":2897,"rx_opioid":4451,"methadone_sub":59,"cj_referral":2695,"self_referral":2771,"health_referral":1225,"mat":17},
    {"year":2019,"total":7284,"heroin":3334,"rx_opioid":3893,"methadone_sub":57,"cj_referral":2202,"self_referral":3041,"health_referral":1294,"mat":39},
    {"year":2020,"total":6009,"heroin":3147,"rx_opioid":2816,"methadone_sub":46,"cj_referral":1339,"self_referral":2973,"health_referral":878, "mat":21},
    {"year":2021,"total":5996,"heroin":3168,"rx_opioid":2795,"methadone_sub":33,"cj_referral":1402,"self_referral":3107,"health_referral":741, "mat":22},
    {"year":2022,"total":5619,"heroin":2316,"rx_opioid":3267,"methadone_sub":36,"cj_referral":1472,"self_referral":2769,"health_referral":700, "mat":5},
    {"year":2023,"total":5073,"heroin":1575,"rx_opioid":3466,"methadone_sub":32,"cj_referral":1468,"self_referral":2332,"health_referral":739, "mat":15},
]


@app.get("/data/teds")
async def get_teds():
    rows = []
    for d in TEDS_TN_DATA:
        row = dict(d)
        total = row["total"] or 1
        row["heroin_pct"]    = round(100 * row["heroin"] / total, 1)
        row["rx_opioid_pct"] = round(100 * row["rx_opioid"] / total, 1)
        row["cj_pct"]        = round(100 * row["cj_referral"] / total, 1)
        row["self_pct"]      = round(100 * row["self_referral"] / total, 1)
        row["health_pct"]    = round(100 * row["health_referral"] / total, 1)
        rows.append(row)

    peak = max(rows, key=lambda r: r["total"])
    latest = rows[-1]
    first = rows[0]

    return {
        "rows": rows,
        "peak_year":  peak["year"],
        "peak_total": peak["total"],
        "first_year": first["year"],
        "latest_year": latest["year"],
        "growth_pct": round(100 * (latest["total"] - first["total"]) / first["total"]),
        "source": "SAMHSA TEDS-A (Treatment Episode Data Set — Admissions) · TN state FIPS 47 · SUB1 opioid admissions only",
        "notes": [
            "TEDS captures specialty SUD treatment programs only — individual buprenorphine prescribers are not included.",
            "SUB1 codes used: 5=heroin, 6=non-Rx methadone, 7=other opioids/synthetics (includes Rx opioids and illicit fentanyl).",
            "METHUSE=1 indicates medication-assisted therapy at time of admission (not whether MAT was provided during treatment).",
            "2020 drop reflects COVID-19 disruption to treatment services.",
            "Post-2021 heroin decline likely reflects illicit fentanyl replacing heroin in the drug supply, changing what clients report as primary substance.",
        ],
    }


DRUG_COURTS_XLSX = Path(__file__).parent / "Vector_Library" / "T11:TN_Judicial_&_Drug_Courts" / "TN-RecoveryVet-DrugCourts-Data.xlsx"

@app.get("/data/drug_courts")
async def get_drug_courts():
    import openpyxl, re

    if not DRUG_COURTS_XLSX.exists():
        raise HTTPException(status_code=404, detail="Drug courts data not found.")

    wb = openpyxl.load_workbook(DRUG_COURTS_XLSX, read_only=True)
    ws = wb["Serve DUI Offenders"]
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return {"courts": [], "total": 0}

    courts = []
    for row in rows[1:]:
        jurisdiction, title, level, judge, city, dui_raw = (row[i] if i < len(row) else None for i in range(6))
        if not jurisdiction or not title:
            continue
        jurisdiction = jurisdiction.strip()
        title = title.strip()
        level = (level or "").strip().rstrip()
        judge = (judge or "").strip() or None
        city = (city or "").strip() or None

        # Normalize DUI flag
        dui_str = str(dui_raw or "").strip().upper()
        if dui_str.startswith("Y"):
            dui = "Y"
        elif dui_str.startswith("N"):
            dui = "N"
        else:
            dui = None

        # Normalize court level (collapse trailing whitespace variants)
        level = re.sub(r"\s+", " ", level).strip()

        courts.append({
            "jurisdiction": jurisdiction,
            "title": title,
            "level": level,
            "judge": judge,
            "city": city,
            "serves_dui": dui,
        })

    # Summary stats
    level_counts: dict[str, int] = {}
    for c in courts:
        lv = c["level"] or "Unknown"
        level_counts[lv] = level_counts.get(lv, 0) + 1

    unique_jurisdictions = len({c["jurisdiction"] for c in courts})

    return {
        "courts": courts,
        "total": len(courts),
        "unique_jurisdictions": unique_jurisdictions,
        "level_counts": level_counts,
        "data_note": "Source: TN RecoveryVet Drug Court Directory · Data as of July 2015",
    }


@app.get("/data/patient_outcomes")
async def get_patient_outcomes():
    import csv as csv_mod

    def load(fname: str) -> list[dict]:
        p = MOUD_FOLDER / fname
        if not p.exists():
            return []
        with open(p, newline="", encoding="utf-8-sig") as f:
            return list(csv_mod.DictReader(f))

    def pct(rows, col, val="1"):
        valid = [r for r in rows if r.get(col, "").strip() not in ("", "NULL", "Z", "U")]
        if not valid:
            return None
        n = sum(1 for r in valid if r.get(col, "").strip() == val)
        return round(100 * n / len(valid), 1)

    OUTCOMES = [
        ("op_abst_pct",    "opabst90",     "Opioid Abstinent (90d)"),
        ("fn_abst_pct",    "fnabst90",     "Fentanyl Abstinent (90d)"),
        ("hr_abst_pct",    "hrabst90",     "Heroin Abstinent (90d)"),
        ("in_tx_pct",      "inanytx",      "In Any Treatment"),
        ("overdose_pct",   "suoverdose",   "Overdose Event"),
        ("ed_visit_pct",   "edvisit",      "ED Visit"),
        ("hosp_pct",       "hospstay",     "Hospitalization"),
        ("employed_pct",   "employed",     "Employed"),
        ("mental_ill_pct", "mentalillness","Mental Illness"),
    ]

    # Overall trend across timepoints
    trend = []
    for tp in TIMEPOINT_ORDER:
        rows = load(MOUD_FILES[tp])
        if not rows:
            continue
        responded = [r for r in rows if r.get("responded", "").strip() == "1"] if tp != "Baseline" else rows
        row_out: dict = {
            "timepoint": tp,
            "n_enrolled": len(rows),
            "n_responded": len(responded),
            "response_rate": round(100 * len(responded) / len(rows), 1) if rows else 0,
        }
        for key, col, _ in OUTCOMES:
            row_out[key] = pct(responded, col)
        trend.append(row_out)

    # Outcomes by treatment group per timepoint
    by_group: dict[str, list] = {label: [] for label in TREATMENT_LABELS.values()}
    for tp in TIMEPOINT_ORDER:
        rows = load(MOUD_FILES[tp])
        if not rows:
            continue
        responded = [r for r in rows if r.get("responded", "").strip() == "1"] if tp != "Baseline" else rows
        for mat_val, label in TREATMENT_LABELS.items():
            group = [r for r in responded if r.get("MAT_COUN", "").strip() == mat_val]
            if not group:
                continue
            row_out = {"timepoint": tp, "n": len(group)}
            for key, col, _ in OUTCOMES:
                row_out[key] = pct(group, col)
            by_group[label].append(row_out)

    # Baseline demographics
    base = load(MOUD_FILES["Baseline"])
    ss_counts = {"Low": 0, "Moderate": 0, "High": 0}
    for r in base:
        v = r.get("socialsupportcat", "").strip()
        if v == "1": ss_counts["Low"] += 1
        elif v == "2": ss_counts["Moderate"] += 1
        elif v == "3": ss_counts["High"] += 1

    mat_counts = {label: sum(1 for r in base if r.get("MAT_COUN", "").strip() == val)
                  for val, label in TREATMENT_LABELS.items()}

    return {
        "trend":       trend,
        "by_group":    by_group,
        "mat_counts":  mat_counts,
        "ss_counts":   ss_counts,
        "enrollment":  len(base),
        "outcome_labels": {key: label for key, _, label in OUTCOMES},
        "source": "CDC MOUD Study — 1,974 adults, 62 outpatient facilities, 18-month follow-up",
    }


# ── Graph endpoints ────────────────────────────────────────────────────────
from graph import get_full_graph, get_neighborhood, search_nodes, is_available as graph_available

@app.get("/graph/status")
async def graph_status():
    return {"available": graph_available()}

@app.get("/graph/full")
async def graph_full():
    if not graph_available():
        raise HTTPException(status_code=503, detail="Graph database not available")
    return get_full_graph()

@app.get("/graph/neighborhood")
async def graph_neighborhood(name: str, depth: int = 2):
    if not graph_available():
        raise HTTPException(status_code=503, detail="Graph database not available")
    return get_neighborhood(name, min(depth, 3))

@app.get("/graph/search")
async def graph_search(q: str):
    if not graph_available():
        raise HTTPException(status_code=503, detail="Graph database not available")
    return {"results": search_nodes(q)}
