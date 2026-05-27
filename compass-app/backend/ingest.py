"""
Run once to build the FAISS vector index from all PDFs in Vector_Library.
Usage: python ingest.py
"""
import sys
from pathlib import Path
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import FastEmbedEmbeddings
from langchain_community.vectorstores import FAISS
from config import (
    VECTOR_LIBRARY_PATH,
    FAISS_INDEX_PATH,
    EMBEDDING_MODEL,
    CHUNK_SIZE,
    CHUNK_OVERLAP,
    TOPIC_LABELS,
)


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
    print(f"\nLoaded {len(docs)} pages total.\n")

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
