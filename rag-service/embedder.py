import os
from FlagEmbedding import BGEM3FlagModel

# Load model once at startup. use_fp16=True halves memory usage with minimal accuracy loss.
# Device is auto-detected: uses GPU if available, else CPU.
# On 3060 with vLLM occupying GPU, this will typically run on CPU (~150ms per query).
print("[RAG] Loading bge-m3 model...")
_model = BGEM3FlagModel(
    'BAAI/bge-m3',
    use_fp16=True,
    device='cpu'   # Force CPU — GPU is reserved for vLLM (Qwen 2.5-14B)
)
print("[RAG] Model loaded.")

def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed a list of text strings. Returns list of 1024-dim vectors."""
    if not texts:
        return []
    output = _model.encode(
        texts,
        batch_size=32,
        max_length=512,
        return_dense=True,
        return_sparse=False,
        return_colbert_vecs=False,
    )
    return output['dense_vecs'].tolist()

def embed_query(text: str) -> list[float]:
    """Embed a single query string."""
    result = embed_texts([text])
    return result[0] if result else []
