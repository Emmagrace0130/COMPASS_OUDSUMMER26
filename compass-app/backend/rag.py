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


def load_retriever():
    vectorstore = FAISS.load_local(
        str(FAISS_INDEX_PATH),
        get_embeddings(),
        allow_dangerous_deserialization=True,
    )
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
