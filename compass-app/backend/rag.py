"""
RAG pipeline: FAISS retrieval + LLM (Ollama or Claude) generation.
"""
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


def build_ollama_chain(retriever):
    llm = Ollama(base_url=OLLAMA_BASE_URL, model=OLLAMA_MODEL, temperature=0.1)
    return RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=retriever,
        return_source_documents=True,
        chain_type_kwargs={"prompt": LANGCHAIN_PROMPT},
    )


def retrieve_docs(retriever, question: str) -> list:
    return retriever.invoke(question)


def run_huggingface(docs: list, question: str) -> str:
    context = "\n\n---\n\n".join(
        f"[{doc.metadata.get('source_file', 'unknown')} p.{doc.metadata.get('page', '?')}]\n{doc.page_content}"
        for doc in docs
    )
    client = InferenceClient(api_key=HF_API_TOKEN)
    response = client.chat.completions.create(
        model=HF_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT_TEXT},
            {
                "role": "user",
                "content": f"Retrieved context:\n{context}\n\nQuestion: {question}",
            },
        ],
        max_tokens=1500,
        temperature=0.1,
    )
    return response.choices[0].message.content


def run_claude(docs: list, question: str) -> str:
    context = "\n\n---\n\n".join(
        f"[{doc.metadata.get('source_file', 'unknown')} p.{doc.metadata.get('page', '?')}]\n{doc.page_content}"
        for doc in docs
    )
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    message = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=1500,
        system=SYSTEM_PROMPT_TEXT,
        messages=[
            {
                "role": "user",
                "content": f"Retrieved context:\n{context}\n\nQuestion: {question}",
            }
        ],
    )
    return message.content[0].text


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
