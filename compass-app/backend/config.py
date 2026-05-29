import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Paths
BASE_DIR = Path(__file__).parent
VECTOR_LIBRARY_PATH = Path(os.getenv("VECTOR_LIBRARY_PATH", str(BASE_DIR / "../../Vector_Library")))
FAISS_INDEX_PATH = Path(os.getenv("FAISS_INDEX_PATH", str(BASE_DIR / "faiss_index")))

# Embeddings — fastembed uses ONNX, no PyTorch dependency
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")

# LLM backend: "huggingface" (default), "ollama", or "claude"
LLM_BACKEND = os.getenv("LLM_BACKEND", "huggingface")

# HuggingFace Inference API
HF_API_TOKEN = os.getenv("HF_API_TOKEN", "")
HF_MODEL = os.getenv("HF_MODEL", "meta-llama/Llama-3.1-8B-Instruct")

# Ollama (GPU server)
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1")
OLLAMA_USERNAME = os.getenv("OLLAMA_USERNAME", "")
OLLAMA_PASSWORD = os.getenv("OLLAMA_PASSWORD", "")

# Claude (Anthropic API — optional)
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6")

# Chunking
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "800"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "150"))

# Retrieval
TOP_K = int(os.getenv("TOP_K", "6"))

# Topic labels for display
TOPIC_LABELS = {
    "T1:OUD_med&treat": "OUD Medications & Treatment",
    "T2:Clinical_pract_guide": "Clinical Practice Guidelines",
    "T3:TN_OUD_data&surv": "TN OUD Data & Surveillance",
    "T4:Behavioral&couns_treat": "Behavioral & Counseling Treatment",
    "T5:How_Opioid_Dependance_Works_in_Brain": "Neuroscience of Opioid Dependence",
    "T6:Co-occuring_mental_health_conditions": "Co-occurring Mental Health Conditions",
    "T7:Health_equity_&_access_gaps_in_TN": "Health Equity & Access Gaps in TN",
    "T8:Harm_reduction": "Harm Reduction",
    "T9:Policy_&_Law": "Policy & Law",
    "T10:Existing_AI_work_in_addiction_medicine": "AI in Addiction Medicine",
}
