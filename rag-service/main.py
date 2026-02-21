from fastapi import FastAPI, HTTPException
from typing import Optional
from pydantic import BaseModel
from chunker import chunk_text
from embedder import embed_texts, embed_query
from vector_store import store_chunks, store_chapters, search_chunks, delete_store_index, store_has_index

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
