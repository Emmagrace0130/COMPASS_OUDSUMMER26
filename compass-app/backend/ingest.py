"""
Run once to build the FAISS vector index from all PDFs in Vector_Library.
Usage: python ingest.py
"""
import sys
from pathlib import Path
from datetime import datetime
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import FastEmbedEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.schema import Document
from config import (
    VECTOR_LIBRARY_PATH,
    FAISS_INDEX_PATH,
    EMBEDDING_MODEL,
    CHUNK_SIZE,
    CHUNK_OVERLAP,
    TOPIC_LABELS,
)


def load_xlsx(library_path: Path) -> list:
    """Convert each row of xlsx drug-death datasets into a text Document."""
    try:
        import openpyxl
    except ImportError:
        print("WARNING: openpyxl not installed — skipping xlsx files.", file=sys.stderr)
        return []

    docs = []
    xlsx_files = list(library_path.rglob("*.xlsx"))
    if not xlsx_files:
        return docs

    print(f"Found {len(xlsx_files)} xlsx files")
    for xlsx_path in xlsx_files:
        topic_folder = xlsx_path.parent.name
        topic_label = TOPIC_LABELS.get(topic_folder, topic_folder)
        try:
            wb = openpyxl.load_workbook(xlsx_path, read_only=True)
            for sheet_name in wb.sheetnames:
                ws = wb[sheet_name]
                rows = list(ws.iter_rows(values_only=True))
                if not rows:
                    continue
                headers = [str(h) if h is not None else "" for h in rows[0]]
                for row in rows[1:]:
                    if all(v is None for v in row):
                        continue
                    parts = []
                    tox = []
                    for h, v in zip(headers, row):
                        if v is None:
                            continue
                        val = v.strftime("%Y-%m-%d %H:%M") if isinstance(v, datetime) else str(v)
                        if h.startswith("Toxicology"):
                            tox.append(val)
                        else:
                            parts.append(f"{h}: {val}")
                    if tox:
                        parts.append(f"Toxicology substances detected: {', '.join(tox)}")
                    text = "\n".join(parts)
                    docs.append(Document(
                        page_content=text,
                        metadata={
                            "source_file": xlsx_path.name,
                            "topic": topic_label,
                            "topic_folder": topic_folder,
                            "page": sheet_name,
                        }
                    ))
            print(f"  Loaded {len(docs)} records from {xlsx_path.name}")
        except Exception as e:
            print(f"  WARNING: Could not load {xlsx_path.name}: {e}", file=sys.stderr)
    return docs


def load_docx(library_path: Path) -> list:
    """Load all .docx files from the Vector_Library into text Documents."""
    try:
        import docx as python_docx
    except ImportError:
        print("WARNING: python-docx not installed — skipping docx files.", file=sys.stderr)
        return []

    docs = []
    docx_files = list(library_path.rglob("*.docx"))
    if not docx_files:
        return docs

    print(f"Found {len(docx_files)} docx files")
    for docx_path in docx_files:
        topic_folder = docx_path.parent.name
        topic_label = TOPIC_LABELS.get(topic_folder, topic_folder)
        try:
            doc = python_docx.Document(str(docx_path))
            text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
            if text:
                docs.append(Document(
                    page_content=text,
                    metadata={
                        "source_file": docx_path.name,
                        "topic": topic_label,
                        "topic_folder": topic_folder,
                        "page": 0,
                    }
                ))
            print(f"  Loaded {docx_path.name}")
        except Exception as e:
            print(f"  WARNING: Could not load {docx_path.name}: {e}", file=sys.stderr)
    return docs


def load_pdfs(library_path: Path) -> list:
    docs = []
    pdf_files = list(library_path.rglob("*.pdf"))
    print(f"Found {len(pdf_files)} PDFs in {library_path}")

    for i, pdf_path in enumerate(pdf_files, 1):
        topic_folder = pdf_path.parent.name
        topic_label = TOPIC_LABELS.get(topic_folder, topic_folder)
        try:
            loader = PyPDFLoader(str(pdf_path))
            pages = loader.load()
            for page in pages:
                page.metadata["source_file"] = pdf_path.name
                page.metadata["topic"] = topic_label
                page.metadata["topic_folder"] = topic_folder
            docs.extend(pages)
            if i % 20 == 0 or i == len(pdf_files):
                print(f"  Loaded {i}/{len(pdf_files)}: {pdf_path.name}")
        except Exception as e:
            print(f"  WARNING: Could not load {pdf_path.name}: {e}", file=sys.stderr)

    return docs


def build_index():
    print("=== COMPASS Vector Index Builder ===\n")

    print(f"Loading PDFs from {VECTOR_LIBRARY_PATH} ...")
    docs = load_pdfs(VECTOR_LIBRARY_PATH)
    print(f"\nLoaded {len(docs)} PDF pages total.")

    print(f"\nLoading xlsx datasets ...")
    xlsx_docs = load_xlsx(VECTOR_LIBRARY_PATH)
    docs.extend(xlsx_docs)

    print(f"\nLoading docx files ...")
    docx_docs = load_docx(VECTOR_LIBRARY_PATH)
    docs.extend(docx_docs)
    print(f"Total documents: {len(docs)}\n")

    print(f"Splitting into chunks (size={CHUNK_SIZE}, overlap={CHUNK_OVERLAP}) ...")
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_documents(docs)
    print(f"Created {len(chunks)} chunks.\n")

    print(f"Loading fastembed model: {EMBEDDING_MODEL} ...")
    embeddings = FastEmbedEmbeddings(model_name=EMBEDDING_MODEL)

    print("Building FAISS index (this may take several minutes) ...")
    vectorstore = FAISS.from_documents(chunks, embeddings)

    FAISS_INDEX_PATH.mkdir(parents=True, exist_ok=True)
    vectorstore.save_local(str(FAISS_INDEX_PATH))
    print(f"\nIndex saved to {FAISS_INDEX_PATH}")
    print("Done! Run the server with: uvicorn main:app --reload")


if __name__ == "__main__":
    build_index()
