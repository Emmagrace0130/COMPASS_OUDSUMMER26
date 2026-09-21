"""
RAG pipeline: FAISS retrieval + LLM (Ollama or Claude) generation.
"""
import base64
import anthropic
from huggingface_hub import InferenceClient
from langchain_community.embeddings import FastEmbedEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.llms import Ollama
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from config import (
    FAISS_INDEX_PATH,
    EMBEDDING_MODEL,
    OLLAMA_BASE_URL,
    OLLAMA_MODEL,
    OLLAMA_USERNAME,
    OLLAMA_PASSWORD,
    LLM_BACKEND,
    HF_API_TOKEN,
    HF_MODEL,
    ANTHROPIC_API_KEY,
    CLAUDE_MODEL,
    TOP_K,
)

SYSTEM_PROMPT_TEXT = """You are COMPASS, an AI research assistant specialized in opioid use disorder (OUD) with a focus on Tennessee. You answer questions using the provided clinical guidelines, research papers, and policy documents.

Guidelines for your answers:
- Base answers on the retrieved documents. Cite source documents when possible.
- Be specific about Tennessee context when relevant.
- Distinguish between clinical guidance, research evidence, and policy.
- If the documents do not contain enough information, say so clearly.
- Do not make up clinical recommendations not supported by the sources."""

LANGCHAIN_PROMPT = PromptTemplate(
    input_variables=["context", "question"],
    template=SYSTEM_PROMPT_TEXT + "\n\nRetrieved context:\n{context}\n\nQuestion: {question}\n\nAnswer:",
)

_embeddings = None


def get_embeddings():
    global _embeddings
    if _embeddings is None:
        _embeddings = FastEmbedEmbeddings(model_name=EMBEDDING_MODEL)
    return _embeddings


def load_vectorstore():
    return FAISS.load_local(
        str(FAISS_INDEX_PATH),
        get_embeddings(),
        allow_dangerous_deserialization=True,
    )


def load_retriever(vectorstore=None):
    vectorstore = vectorstore or load_vectorstore()
    return vectorstore.as_retriever(
        search_type="similarity",
        search_kwargs={"k": TOP_K},
    )


def _ollama_headers() -> dict:
    if OLLAMA_USERNAME and OLLAMA_PASSWORD:
        token = base64.b64encode(f"{OLLAMA_USERNAME}:{OLLAMA_PASSWORD}".encode()).decode()
        return {"Authorization": f"Basic {token}"}
    return {}


def build_ollama_chain(retriever):
    llm = Ollama(base_url=OLLAMA_BASE_URL, model=OLLAMA_MODEL, temperature=0.1, headers=_ollama_headers())
    return RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=retriever,
        return_source_documents=True,
        chain_type_kwargs={"prompt": LANGCHAIN_PROMPT},
    )


def retrieve_docs(retriever, question: str) -> list:
    return retriever.invoke(question)


GRAPH_PROMPT_TEMPLATE = PromptTemplate(
    input_variables=["context", "graph_context", "question"],
    template=SYSTEM_PROMPT_TEXT + (
        "\n\nYou also have access to a structured concept map of medications, conditions, "
        "guidelines, populations, and policies, given below as relationship triples. Use it "
        "to surface relevant relationships (e.g., contraindications, which guideline "
        "recommends what) alongside the retrieved text — but do not treat the concept map "
        "as a substitute for the retrieved sources.\n\n"
        "Retrieved context:\n{context}\n\n{graph_context}\n\nQuestion: {question}\n\nAnswer:"
    ),
)


def run_ollama_graph_augmented(retriever, question: str) -> dict:
    """Plain FAISS retrieval + concept-map neighborhood lookup, stuffed into one
    prompt. Mirrors build_ollama_chain's model/temperature/prompt structure so
    the only difference between the two paths is the added graph context —
    built for the graph-augmented vs. plain-RAG evaluation comparison."""
    import graph as graph_mod

    docs = retrieve_docs(retriever, question)
    text_context = "\n\n---\n\n".join(
        f"[{doc.metadata.get('source_file', 'unknown')} p.{doc.metadata.get('page', '?')}]\n{doc.page_content}"
        for doc in docs
    )

    graph_context = ""
    if graph_mod.is_available():
        combined_text = " ".join(doc.page_content for doc in docs)
        graph_context = graph_mod.get_context_for_question(question, extra_text=combined_text)

    prompt = GRAPH_PROMPT_TEMPLATE.format(
        context=text_context,
        graph_context=graph_context or "(no related concept-map entries found)",
        question=question,
    )

    llm = Ollama(base_url=OLLAMA_BASE_URL, model=OLLAMA_MODEL, temperature=0.1, headers=_ollama_headers())
    answer = llm.invoke(prompt)
    return {"answer": answer, "docs": docs, "graph_context": graph_context}


# ── ClinicBot-inspired structured-evidence ranking ──────────────────────────
# ClinicBot (Nananukul & Kejriwal, 2026, arXiv:2605.00846) extracts guideline
# text into semantic units (recommendations, tables, definitions, narrative)
# with explicit provenance and ranks by clinical significance and guideline
# structure rather than raw text similarity. This is a lighter-weight version
# of that idea: pull a larger candidate pool than the usual top-6, have the
# LLM classify each candidate into one of four unit types, and re-rank so
# recommendation/dosage content is prioritized over narrative background —
# rather than trusting cosine similarity alone to have surfaced the most
# clinically actionable passage.

STRUCTURED_POOL_K = 12  # candidate pool pulled before re-ranking down to TOP_K
UNIT_TYPES = ("recommendation", "dosage_table", "definition", "narrative")
UNIT_TYPE_PRIORITY = {"recommendation": 2, "dosage_table": 2, "definition": 1, "narrative": 0}

CLASSIFY_PROMPT_TEMPLATE = """Classify each numbered passage below into exactly one category:
- recommendation: a specific clinical recommendation, guideline statement, or "should/must/is recommended" instruction
- dosage_table: specific dosing, titration schedules, or numeric treatment protocol steps
- definition: a definition of a term, condition, or concept
- narrative: general background, study description, or context that is not a direct recommendation or dosing instruction

Passages:
{numbered_passages}

Respond ONLY with a JSON array of {n} strings, one category per passage in the same order, e.g. ["recommendation","narrative"]"""


def _classify_units(llm, docs: list) -> list[str]:
    """Classify each retrieved chunk into a ClinicBot-style semantic-unit type.
    Best-effort: returns "narrative" for every chunk (i.e. no re-ranking effect)
    if the LLM call fails or returns malformed output — classification failure
    should never break an otherwise-working chat response."""
    import json as _json

    numbered = "\n\n".join(f"[{i}] {d.page_content[:500]}" for i, d in enumerate(docs))
    prompt = CLASSIFY_PROMPT_TEMPLATE.format(numbered_passages=numbered, n=len(docs))
    try:
        text = llm.invoke(prompt).strip()
        if text.startswith("```"):
            text = "\n".join(text.split("\n")[1:-1])
        labels = _json.loads(text)
        if not isinstance(labels, list) or len(labels) != len(docs):
            raise ValueError("classification output length mismatch")
        return [l if l in UNIT_TYPE_PRIORITY else "narrative" for l in labels]
    except Exception:
        return ["narrative"] * len(docs)


def run_ollama_structured_rank(vectorstore, question: str) -> dict:
    """Pull a larger candidate pool than plain RAG's top-6, classify each chunk
    into a semantic-unit type, and re-rank so recommendation/dosage-table
    content outranks narrative background — instead of trusting embedding
    similarity alone. Mirrors build_ollama_chain's model/temperature/prompt so
    the only difference from plain RAG is which chunks get selected.

    Kept exactly as first implemented and evaluated (composite 0.813, below
    plain RAG's 0.850) — see run_ollama_structured_rank_v2 for the corrected
    version. Left unchanged rather than patched in place so the original
    result stays reproducible against the code that actually produced it."""
    candidates = vectorstore.similarity_search(question, k=STRUCTURED_POOL_K)
    llm = Ollama(base_url=OLLAMA_BASE_URL, model=OLLAMA_MODEL, temperature=0.1, headers=_ollama_headers())

    labels = _classify_units(llm, candidates)
    pool_size = len(candidates)
    order = sorted(
        range(pool_size),
        key=lambda i: UNIT_TYPE_PRIORITY.get(labels[i], 0) - i / pool_size,
        reverse=True,
    )[:TOP_K]
    docs = [candidates[i] for i in order]
    selected_labels = [labels[i] for i in order]

    text_context = "\n\n---\n\n".join(
        f"[{doc.metadata.get('source_file', 'unknown')} p.{doc.metadata.get('page', '?')}]\n{doc.page_content}"
        for doc in docs
    )
    prompt = LANGCHAIN_PROMPT.format(context=text_context, question=question)
    answer = llm.invoke(prompt)
    return {"answer": answer, "docs": docs, "labels": selected_labels}


# ── v2: corrected structured-evidence ranking ───────────────────────────────
# Three fixes to the diagnosed failures in v1:
#   1. Type priority is a small tie-breaker (max ±0.15) added to a properly
#      normalized similarity score (0-1), not a term (max 2) that can swamp a
#      rank-position penalty (max 1) — a genuinely more relevant chunk can no
#      longer be displaced by a barely-relevant one that merely has a
#      favored label.
#   2. A per-source cap stops the final selection from clustering entirely
#      inside one document/section (the T2-02 failure).
#   3. A fifth category, "statistic", gives epidemiological/surveillance
#      content somewhere to go other than the default "narrative" bucket
#      (the "data"-tier regression).

TYPE_TIEBREAK_WEIGHT = 0.15  # small nudge — similarity dominates, type only breaks near-ties
MAX_PER_SOURCE = 2            # no more than this many of the final TOP_K from one source file
UNIT_TYPE_PRIORITY_V2 = {
    "recommendation": 2, "dosage_table": 2, "definition": 1, "statistic": 1, "narrative": 0,
}

CLASSIFY_PROMPT_TEMPLATE_V2 = """Classify each numbered passage below into exactly one category:
- recommendation: a specific clinical recommendation, guideline statement, or "should/must/is recommended" instruction
- dosage_table: specific dosing, titration schedules, or numeric treatment protocol steps
- definition: a definition of a term, condition, or concept
- statistic: a reported statistic, rate, trend, or survey/surveillance estimate (e.g. overdose counts, prevalence rates)
- narrative: general background, study description, or context that is not any of the above

Passages:
{numbered_passages}

Respond ONLY with a JSON array of {n} strings, one category per passage in the same order, e.g. ["recommendation","narrative"]"""


def _classify_units_v2(llm, docs: list) -> list[str]:
    """Same as _classify_units but with the five-category v2 taxonomy."""
    import json as _json

    numbered = "\n\n".join(f"[{i}] {d.page_content[:500]}" for i, d in enumerate(docs))
    prompt = CLASSIFY_PROMPT_TEMPLATE_V2.format(numbered_passages=numbered, n=len(docs))
    try:
        text = llm.invoke(prompt).strip()
        if text.startswith("```"):
            text = "\n".join(text.split("\n")[1:-1])
        labels = _json.loads(text)
        if not isinstance(labels, list) or len(labels) != len(docs):
            raise ValueError("classification output length mismatch")
        return [l if l in UNIT_TYPE_PRIORITY_V2 else "narrative" for l in labels]
    except Exception:
        return ["narrative"] * len(docs)


def _shingles(text: str, n: int = 5) -> set:
    words = text.lower().split()[:120]
    return {" ".join(words[i:i + n]) for i in range(max(len(words) - n + 1, 1))}


def _is_near_duplicate(text: str, selected_texts: list[str], threshold: float = 0.6) -> bool:
    """True if `text` overlaps heavily (Jaccard over word 5-gram shingles) with
    any already-selected chunk — catches the same guideline indexed under
    several filenames, which a per-source-file cap cannot."""
    a = _shingles(text)
    for other in selected_texts:
        b = _shingles(other)
        union = a | b
        if union and len(a & b) / len(union) >= threshold:
            return True
    return False


def run_ollama_structured_rank_v2(vectorstore, question: str, dedupe_content: bool = False) -> dict:
    """Corrected structured-rank: real similarity scores (not rank position),
    a capped type nudge that can only break near-ties, a per-source diversity
    cap, and a fifth "statistic" category. See module comment above for the
    three specific v1 failures each change addresses.

    dedupe_content=True (the "v3" variant, off by default so v2 stays
    reproducible) additionally skips chunks that are near-duplicates of an
    already-selected chunk, so duplicate copies of one document under
    different filenames can't fill the context window."""
    results = vectorstore.similarity_search_with_score(question, k=STRUCTURED_POOL_K)
    candidates = [doc for doc, _ in results]
    scores = [score for _, score in results]  # FAISS L2 distance: lower = more similar

    lo, hi = min(scores), max(scores)
    spread = (hi - lo) or 1.0
    similarity = [1 - (s - lo) / spread for s in scores]  # 0..1, best match = 1.0

    llm = Ollama(base_url=OLLAMA_BASE_URL, model=OLLAMA_MODEL, temperature=0.1, headers=_ollama_headers())
    labels = _classify_units_v2(llm, candidates)

    combined = [
        similarity[i] + TYPE_TIEBREAK_WEIGHT * (UNIT_TYPE_PRIORITY_V2.get(labels[i], 0) / 2)
        for i in range(len(candidates))
    ]
    ranked = sorted(range(len(candidates)), key=lambda i: combined[i], reverse=True)

    selected: list[int] = []
    per_source: dict[str, int] = {}
    for i in ranked:
        src = candidates[i].metadata.get("source_file", "unknown")
        if per_source.get(src, 0) >= MAX_PER_SOURCE:
            continue
        if dedupe_content and _is_near_duplicate(
            candidates[i].page_content, [candidates[j].page_content for j in selected]
        ):
            continue
        selected.append(i)
        per_source[src] = per_source.get(src, 0) + 1
        if len(selected) == TOP_K:
            break
    # Backfill if the diversity cap left the pool short of TOP_K chunks.
    if len(selected) < TOP_K:
        for i in ranked:
            if i not in selected:
                selected.append(i)
            if len(selected) == TOP_K:
                break

    docs = [candidates[i] for i in selected]
    selected_labels = [labels[i] for i in selected]

    text_context = "\n\n---\n\n".join(
        f"[{doc.metadata.get('source_file', 'unknown')} p.{doc.metadata.get('page', '?')}]\n{doc.page_content}"
        for doc in docs
    )
    prompt = LANGCHAIN_PROMPT.format(context=text_context, question=question)
    answer = llm.invoke(prompt)
    return {"answer": answer, "docs": docs, "labels": selected_labels}


HF_RAG_TOOL = {
    "type": "function",
    "function": {
        "name": "search_research_documents",
        "description": (
            "Search the COMPASS library of OUD clinical guidelines, research papers, and Tennessee "
            "policy documents. Call this whenever you need evidence to answer a question. "
            "You may call it more than once with different queries for multi-part questions."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Specific search query using relevant medical or policy terminology.",
                }
            },
            "required": ["query"],
        },
    },
}


def _run_huggingface_fallback(retriever, question: str) -> tuple[str, list]:
    """Classic pre-fetch RAG when the model doesn't support tool calls."""
    docs = retrieve_docs(retriever, question)
    context = "\n\n---\n\n".join(
        f"[{doc.metadata.get('source_file', 'unknown')} p.{doc.metadata.get('page', '?')}]\n{doc.page_content}"
        for doc in docs
    )
    client = InferenceClient(api_key=HF_API_TOKEN)
    response = client.chat.completions.create(
        model=HF_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT_TEXT},
            {"role": "user", "content": f"Retrieved context:\n{context}\n\nQuestion: {question}"},
        ],
        max_tokens=1500,
        temperature=0.1,
    )
    return response.choices[0].message.content, docs


def run_huggingface_with_tools(retriever, question: str) -> tuple[str, list]:
    """Agentic RAG: Llama 3.1 decides when to call search_research_documents.
    Falls back to classic pre-fetch if the endpoint doesn't support tool calls."""
    import json

    client = InferenceClient(api_key=HF_API_TOKEN)
    messages = [
        {"role": "system", "content": TOOL_SYSTEM_PROMPT},
        {"role": "user", "content": question},
    ]
    all_docs: list = []
    seen_keys: set = set()

    for _ in range(5):  # guard against runaway tool loops
        try:
            response = client.chat.completions.create(
                model=HF_MODEL,
                messages=messages,
                tools=[HF_RAG_TOOL],
                max_tokens=1500,
                temperature=0.1,
            )
        except Exception as e:
            if "bad request" in str(e).lower() or "400" in str(e):
                print(f"Tool calls not supported by {HF_MODEL}, falling back to pre-fetch RAG.", flush=True)
                return _run_huggingface_fallback(retriever, question)
            raise

        choice = response.choices[0]

        if choice.finish_reason == "tool_calls" and choice.message.tool_calls:
            # Append the assistant turn with its tool_calls
            messages.append({
                "role": "assistant",
                "content": choice.message.content or "",
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                    }
                    for tc in choice.message.tool_calls
                ],
            })

            # Execute each tool call and append results
            for tc in choice.message.tool_calls:
                args = json.loads(tc.function.arguments)
                query = args.get("query", question)
                docs = retrieve_docs(retriever, query)

                for doc in docs:
                    key = (doc.metadata.get("source_file", ""), doc.metadata.get("page", ""))
                    if key not in seen_keys:
                        seen_keys.add(key)
                        all_docs.append(doc)

                tool_result = "\n\n---\n\n".join(
                    f"[{doc.metadata.get('source_file', 'unknown')} p.{doc.metadata.get('page', '?')}]\n{doc.page_content}"
                    for doc in docs
                )
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": tool_result,
                })

        else:
            return choice.message.content or "", all_docs

    # Fallback if loop limit hit
    return choice.message.content or "", all_docs


RAG_TOOL = {
    "name": "search_research_documents",
    "description": (
        "Search the COMPASS library of OUD clinical guidelines, research papers, and Tennessee "
        "policy documents. Call this whenever you need evidence to answer a question. "
        "You may call it more than once with different queries for multi-part questions."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Specific search query using relevant medical or policy terminology.",
            }
        },
        "required": ["query"],
    },
}

TOOL_SYSTEM_PROMPT = SYSTEM_PROMPT_TEXT + (
    "\n\nYou have access to a search tool that retrieves relevant passages from the COMPASS "
    "research library. Always call the tool before answering factual questions — do not rely "
    "on training knowledge for clinical or policy claims."
)


def run_claude_with_tools(retriever, question: str) -> tuple[str, list]:
    """Agentic RAG: Claude decides when to call search_research_documents."""
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    messages = [{"role": "user", "content": question}]
    all_docs: list = []
    seen_keys: set = set()

    while True:
        response = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=1500,
            system=TOOL_SYSTEM_PROMPT,
            tools=[RAG_TOOL],
            messages=messages,
        )

        if response.stop_reason == "tool_use":
            tool_block = next(b for b in response.content if b.type == "tool_use")
            query = tool_block.input["query"]
            docs = retrieve_docs(retriever, query)

            # Deduplicate across multiple tool calls
            for doc in docs:
                key = (doc.metadata.get("source_file", ""), doc.metadata.get("page", ""))
                if key not in seen_keys:
                    seen_keys.add(key)
                    all_docs.append(doc)

            tool_result = "\n\n---\n\n".join(
                f"[{doc.metadata.get('source_file', 'unknown')} p.{doc.metadata.get('page', '?')}]\n{doc.page_content}"
                for doc in docs
            )

            messages.append({"role": "assistant", "content": response.content})
            messages.append({
                "role": "user",
                "content": [{"type": "tool_result", "tool_use_id": tool_block.id, "content": tool_result}],
            })

        else:
            text = next((b.text for b in response.content if hasattr(b, "text")), "")
            return text, all_docs


def format_sources(docs: list) -> list[dict]:
    seen = set()
    sources = []
    for doc in docs:
        key = (doc.metadata.get("source_file", ""), doc.metadata.get("page", ""))
        if key in seen:
            continue
        seen.add(key)
        sources.append(
            {
                "file": doc.metadata.get("source_file", "Unknown"),
                "topic": doc.metadata.get("topic", ""),
                "page": doc.metadata.get("page", ""),
                "excerpt": doc.page_content[:300].strip(),
            }
        )
    return sources
