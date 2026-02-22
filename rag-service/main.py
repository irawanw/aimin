from fastapi import FastAPI, HTTPException
from typing import Optional
from pydantic import BaseModel
from chunker import chunk_text
from embedder import embed_texts, embed_query
from vector_store import (
    store_chunks, store_chapters, search_chunks, delete_store_index, store_has_index,
    store_products, search_products, delete_products_index, products_has_index,
)

app = FastAPI(title="AiMin RAG Service", version="2.0.0")

# ─── Request / Response Models ────────────────────────────────────────────────

class Chapter(BaseModel):
    title: str
    content: str

class IndexRequest(BaseModel):
    folder: str
    # New path: pre-chunked chapters from LLM formatter (preferred)
    chapters: Optional[list[Chapter]] = None
    # Legacy path: raw KB text → local chunker
    text: Optional[str] = None

class QueryRequest(BaseModel):
    folder: str
    query: str
    top_k: int = 5

class DeleteRequest(BaseModel):
    folder: str

# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/healthz")
def health():
    return {"status": "ok"}

@app.post("/index")
def index_kb(req: IndexRequest):
    """
    Embed and store a store's knowledge base.
    Accepts either:
      - chapters: pre-chunked by LLM formatter (title + content per chapter)
      - text: raw KB text → local chunker (legacy / manual edit fallback)
    Replaces any existing index for this store.
    """
    if not req.folder:
        raise HTTPException(status_code=400, detail="folder is required")

    # ── New path: chapters from LLM formatter ─────────────────────────────
    if req.chapters is not None:
        if not req.chapters:
            delete_store_index(req.folder)
            return {"status": "skipped", "reason": "Empty chapters list", "chunks_count": 0}

        # Embed: title + "\n\n" + content for each chapter
        texts_to_embed = [f"{ch.title}\n\n{ch.content}" for ch in req.chapters]
        embeddings = embed_texts(texts_to_embed)
        store_chapters(
            req.folder,
            [{"title": ch.title, "content": ch.content} for ch in req.chapters],
            embeddings,
        )
        return {"status": "ok", "chunks_count": len(req.chapters)}

    # ── Legacy path: raw text → local chunker ─────────────────────────────
    if req.text:
        if len(req.text.strip()) <= 1500:
            delete_store_index(req.folder)
            return {"status": "skipped", "reason": "KB too short for RAG, using full text", "chunks_count": 0}

        chunks = chunk_text(req.text)
        if not chunks:
            delete_store_index(req.folder)
            return {"status": "skipped", "reason": "No meaningful chunks extracted", "chunks_count": 0}

        embeddings = embed_texts(chunks)
        store_chunks(req.folder, chunks, embeddings)
        return {"status": "ok", "chunks_count": len(chunks)}

    raise HTTPException(status_code=400, detail="Either 'chapters' or 'text' is required")

@app.post("/query")
def query_kb(req: QueryRequest):
    """
    Retrieve the top-k most relevant chapters/chunks for a user query.
    Returns full chapter content + titles (titles may be empty for legacy chunks).
    """
    if not req.folder or not req.query:
        raise HTTPException(status_code=400, detail="folder and query are required")

    if not store_has_index(req.folder):
        return {"chunks": [], "titles": [], "has_index": False}

    qvec = embed_query(req.query)
    chunks, titles = search_chunks(req.folder, qvec, top_k=req.top_k)

    return {"chunks": chunks, "titles": titles, "has_index": True}

@app.delete("/index")
def delete_index(req: DeleteRequest):
    """Remove all vectors for a store (called when KB is cleared)."""
    if not req.folder:
        raise HTTPException(status_code=400, detail="folder is required")
    delete_store_index(req.folder)
    return {"status": "ok"}

# ─── Product endpoints ────────────────────────────────────────────────────────

class ProductItem(BaseModel):
    id: int
    name: str
    category: Optional[str] = None
    price: Optional[float] = None
    description: Optional[str] = None
    specs: Optional[dict] = None

class ProductIndexRequest(BaseModel):
    folder: str
    products: list[ProductItem]

class ProductQueryRequest(BaseModel):
    folder: str
    query: str
    top_k: int = 5

def build_product_text(p: ProductItem) -> str:
    """Build the text that gets embedded for one product variant."""
    parts = [f"Nama: {p.name}"]
    if p.category:
        parts.append(f"Kategori: {p.category}")
    if p.price is not None:
        parts.append(f"Harga: {int(p.price)}")
    if p.description:
        parts.append(p.description)
    if p.specs:
        spec_lines = [
            f"- {k}: {v}"
            for k, v in p.specs.items()
            if v is not None and str(v).strip()
        ]
        if spec_lines:
            parts.append("Spesifikasi:\n" + "\n".join(spec_lines))
    return "\n".join(parts)

@app.post("/products/index")
def index_products(req: ProductIndexRequest):
    """
    Embed and store product variants for a store.
    Each item in `products` is one variant row (one row per color/size combination).
    Replaces ALL existing product vectors for this folder.
    """
    if not req.folder:
        raise HTTPException(status_code=400, detail="folder is required")
    if not req.products:
        delete_products_index(req.folder)
        return {"status": "ok", "indexed": 0}

    texts = [build_product_text(p) for p in req.products]
    embeddings = embed_texts(texts)
    store_products(req.folder, [p.id for p in req.products], embeddings)
    return {"status": "ok", "indexed": len(req.products)}

@app.post("/products/query")
def query_products(req: ProductQueryRequest):
    """
    Semantic search over product variants.
    Returns SQL product IDs ordered by relevance — caller hydrates from MySQL.
    """
    if not req.folder or not req.query:
        raise HTTPException(status_code=400, detail="folder and query are required")

    has_index = products_has_index(req.folder)
    if not has_index:
        return {"product_ids": [], "has_index": False}

    qvec = embed_query(req.query)
    products = search_products(req.folder, qvec, top_k=req.top_k)
    # products = [{"product_id": int, "score": float}, ...]
    return {
        "products": products,
        "product_ids": [p["product_id"] for p in products],  # backward compat
        "has_index": True,
    }

@app.delete("/products/index")
def delete_products(req: DeleteRequest):
    """Remove all product vectors for a store."""
    if not req.folder:
        raise HTTPException(status_code=400, detail="folder is required")
    delete_products_index(req.folder)
    return {"status": "ok"}
