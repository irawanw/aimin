from fastapi import FastAPI, HTTPException
from typing import Optional
from pydantic import BaseModel
from collections import defaultdict
import base64, io, threading
from chunker import chunk_text
from embedder import embed_texts, embed_query
from vector_store import (
    store_chunks, store_chapters, search_chunks, delete_store_index, store_has_index,
    store_products, reindex_products_full, search_products, delete_products_index, delete_product_by_name, products_has_index,
)

app = FastAPI(title="AiMin RAG Service", version="2.0.0")

# ─── Scrapling web fetcher (lazy-loaded so rag-service starts fast) ───────────
_scrapling_lock = threading.Lock()

def _scrapling_fetch(url: str, timeout_ms: int = 30000) -> dict:
    """Fetch a URL using Scrapling StealthyFetcher (headless Chromium).
    Returns { text, links, title } or raises on failure."""
    from scrapling.fetchers import StealthyFetcher
    page = StealthyFetcher.fetch(url, headless=True, timeout=timeout_ms, network_idle=True)
    title = page.css('title')
    title_text = title[0].text.strip() if title else ''
    text = page.get_all_text(ignore_tags=('script', 'style', 'noscript', 'head'))
    raw_links = [a.attrib.get('href', '') for a in page.css('a[href]')]
    return {'text': text.strip(), 'links': raw_links, 'title': title_text}

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

class DeleteOneRequest(BaseModel):
    folder: str
    product_name: str

# ─── Endpoints ────────────────────────────────────────────────────────────────

class ScrapeRequest(BaseModel):
    url: str
    timeout_ms: int = 30000

@app.post("/scrape")
def scrape_url(req: ScrapeRequest):
    """Fetch a URL with headless Chromium via Scrapling. Returns text + links."""
    if not req.url.startswith('http'):
        raise HTTPException(status_code=400, detail="url must start with http/https")
    with _scrapling_lock:
        try:
            result = _scrapling_fetch(req.url, req.timeout_ms)
            return result
        except Exception as e:
            raise HTTPException(status_code=502, detail=str(e))

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

def build_group_text(name: str, category: str, variants: list[ProductItem]) -> str:
    """Build the text that gets embedded for one product group (all variants combined)."""
    parts = [f"Nama: {name}"]
    if category:
        parts.append(f"Kategori: {category}")
    prices = [v.price for v in variants if v.price is not None]
    if prices:
        lo, hi = int(min(prices)), int(max(prices))
        parts.append(f"Harga: {lo}" if lo == hi else f"Harga: {lo} - {hi}")
    for v in variants:
        if v.description:
            parts.append(v.description)
            break
    spec_values: dict = defaultdict(set)
    for v in variants:
        if v.specs:
            for k, val in v.specs.items():
                if val is not None and str(val).strip():
                    spec_values[k].add(str(val))
    if spec_values:
        lines = [f"- {k}: {', '.join(sorted(vals))}" for k, vals in spec_values.items()]
        parts.append("Spesifikasi:\n" + "\n".join(lines))
    return "\n".join(parts)

@app.post("/products/index")
def index_products(req: ProductIndexRequest):
    """
    Embed and store product groups for a store.
    Input: one ProductItem per variant row (unchanged upload format).
    Groups variants by (name, category) → one vector per unique product.
    Replaces ALL existing product vectors for this folder.
    """
    if not req.folder:
        raise HTTPException(status_code=400, detail="folder is required")
    if not req.products:
        delete_products_index(req.folder)
        return {"status": "ok", "indexed": 0, "variants": 0}

    # Group variants by (name.strip(), category.strip())
    groups: dict = defaultdict(list)
    for p in req.products:
        key = (p.name.strip(), (p.category or '').strip())
        groups[key].append(p)

    group_keys = list(groups.keys())
    group_names = [k[0] for k in group_keys]
    group_categories = [k[1] for k in group_keys]
    group_texts = [build_group_text(k[0], k[1], groups[k]) for k in group_keys]

    embeddings = embed_texts(group_texts)
    store_products(req.folder, group_names, group_categories, embeddings)
    return {"status": "ok", "indexed": len(groups), "variants": len(req.products)}

@app.post("/products/query")
def query_products(req: ProductQueryRequest):
    """
    Semantic search over product groups.
    Returns product_name + product_category for each match — caller hydrates from MySQL.
    """
    if not req.folder or not req.query:
        raise HTTPException(status_code=400, detail="folder and query are required")

    has_index = products_has_index(req.folder)
    if not has_index:
        return {"products": [], "has_index": False}

    qvec = embed_query(req.query)
    products = search_products(req.folder, qvec, top_k=req.top_k)
    # products = [{"product_name": str, "product_category": str, "score": float}, ...]
    return {"products": products, "has_index": True}

@app.post("/products/reindex")
def reindex_products(req: ProductIndexRequest):
    """
    Full rebuild: clears ALL existing product vectors for the folder,
    then re-indexes from the provided product list.
    Use this for bulk migrations or fixing stale data.
    Unlike /products/index (incremental upsert), this guarantees a clean slate.
    """
    if not req.folder:
        raise HTTPException(status_code=400, detail="folder is required")
    if not req.products:
        delete_products_index(req.folder)
        return {"status": "ok", "indexed": 0, "variants": 0}

    groups: dict = defaultdict(list)
    for p in req.products:
        key = (p.name.strip(), (p.category or '').strip())
        groups[key].append(p)

    group_keys = list(groups.keys())
    group_names = [k[0] for k in group_keys]
    group_categories = [k[1] for k in group_keys]
    group_texts = [build_group_text(k[0], k[1], groups[k]) for k in group_keys]

    embeddings = embed_texts(group_texts)
    reindex_products_full(req.folder, group_names, group_categories, embeddings)
    return {"status": "ok", "indexed": len(groups), "variants": len(req.products)}

@app.delete("/products/index")
def delete_products(req: DeleteRequest):
    """Remove all product vectors for a store."""
    if not req.folder:
        raise HTTPException(status_code=400, detail="folder is required")
    delete_products_index(req.folder)
    return {"status": "ok"}

@app.delete("/products/one")
def delete_one_product(req: DeleteOneRequest):
    """Remove the vector for a single product by name."""
    if not req.folder or not req.product_name:
        raise HTTPException(status_code=400, detail="folder and product_name are required")
    delete_product_by_name(req.folder, req.product_name)
    return {"status": "ok"}

# ─── OCR endpoint ─────────────────────────────────────────────────────────────
# Lazy-load easyocr reader (downloads models on first use, ~200MB)
_ocr_reader = None
_ocr_lock = threading.Lock()

def get_ocr_reader():
    global _ocr_reader
    if _ocr_reader is None:
        with _ocr_lock:
            if _ocr_reader is None:
                import easyocr
                # Indonesian + English; GPU auto-detected
                _ocr_reader = easyocr.Reader(['id', 'en'], gpu=True, verbose=False)
    return _ocr_reader

class OcrRequest(BaseModel):
    image: str  # base64-encoded JPEG/PNG

@app.post("/ocr")
def ocr_image(req: OcrRequest):
    """
    Extract text from a base64 image using easyocr.
    Returns {"text": "...", "confidence": 0.0-1.0}
    Used as fast local alternative to NIM vision for Instagram image analysis.
    """
    try:
        import numpy as np
        import cv2

        img_bytes = base64.b64decode(req.image)
        # Use cv2 to decode — handles JPEG, PNG, WebP, and most formats robustly
        arr = np.frombuffer(img_bytes, dtype=np.uint8)
        img_bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img_bgr is None:
            # cv2 failed — try PIL as fallback
            from PIL import Image
            pil_img = Image.open(io.BytesIO(img_bytes)).convert('RGB')
            img_bgr = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)

        # easyocr expects RGB
        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

        reader = get_ocr_reader()
        results = reader.readtext(img_rgb, detail=1, paragraph=False)

        if not results:
            return {"text": "", "confidence": 0.0}

        # Filter low-confidence results (< 0.3) and join lines
        good = [r for r in results if r[2] >= 0.3 and r[1].strip()]
        if not good:
            return {"text": "", "confidence": 0.0}

        lines = [r[1].strip() for r in good]
        avg_conf = sum(r[2] for r in good) / len(good)

        return {"text": "\n".join(lines), "confidence": round(avg_conf, 3)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
