from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, VectorParams, PointStruct, Filter,
    FieldCondition, MatchValue
)
import uuid

QDRANT_URL = "http://localhost:6333"
COLLECTION_NAME = "aimin_kb"
VECTOR_DIM = 1024  # bge-m3 dense dimension

_client = QdrantClient(url=QDRANT_URL)

def _ensure_collection():
    """Create collection if it doesn't exist."""
    existing = [c.name for c in _client.get_collections().collections]
    if COLLECTION_NAME not in existing:
        _client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=VECTOR_DIM, distance=Distance.COSINE),
        )
        print(f"[RAG] Created Qdrant collection: {COLLECTION_NAME}")

_ensure_collection()

def _delete_folder(folder: str):
    """Delete all vectors for a folder."""
    _client.delete(
        collection_name=COLLECTION_NAME,
        points_selector=Filter(
            must=[FieldCondition(key="folder", match=MatchValue(value=folder))]
        ),
    )

def store_chapters(folder: str, chapters: list[dict], embeddings: list[list[float]]):
    """
    Store pre-chunked chapters (from LLM formatter).
    Each chapter has {"title": ..., "content": ...}.
    The vector is the embedding of title + "\\n\\n" + content.
    """
    _delete_folder(folder)

    if not chapters:
        return

    points = [
        PointStruct(
            id=str(uuid.uuid4()),
            vector=embedding,
            payload={
                "folder": folder,
                "title": ch["title"],
                "content": ch["content"],
                "chunk_index": i,
            }
        )
        for i, (ch, embedding) in enumerate(zip(chapters, embeddings))
    ]

    for i in range(0, len(points), UPSERT_BATCH_SIZE):
        _client.upsert(collection_name=COLLECTION_NAME, points=points[i:i + UPSERT_BATCH_SIZE])
    print(f"[RAG] Stored {len(points)} chapters for folder: {folder}")

def store_chunks(folder: str, chunks: list[str], embeddings: list[list[float]]):
    """
    Legacy: store plain text chunks (from local chunker, used for manual KB edits).
    Stored with empty title so query results degrade gracefully.
    """
    _delete_folder(folder)

    if not chunks:
        return

    points = [
        PointStruct(
            id=str(uuid.uuid4()),
            vector=embedding,
            payload={
                "folder": folder,
                "title": "",
                "content": chunk,
                "chunk_index": i,
            }
        )
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings))
    ]

    for i in range(0, len(points), UPSERT_BATCH_SIZE):
        _client.upsert(collection_name=COLLECTION_NAME, points=points[i:i + UPSERT_BATCH_SIZE])
    print(f"[RAG] Stored {len(points)} chunks for folder: {folder}")

def search_chunks(folder: str, query_vector: list[float], top_k: int = 5) -> tuple[list[str], list[str]]:
    """
    Search for the top-k most relevant chapters/chunks.
    Returns (chunks, titles) where:
      - chunks: full text sent to the bot (title + "\\n\\n" + content for chapters,
                or just content for legacy plain chunks)
      - titles: chapter title or "" for legacy chunks
    """
    results = _client.search(
        collection_name=COLLECTION_NAME,
        query_vector=query_vector,
        query_filter=Filter(
            must=[FieldCondition(key="folder", match=MatchValue(value=folder))]
        ),
        limit=top_k,
        score_threshold=0.35,
    )

    chunks = []
    titles = []
    for hit in results:
        title = hit.payload.get("title", "")
        # Return content only — title is already embedded inside content by the LLM formatter
        content = hit.payload.get("content") or hit.payload.get("text", "")
        chunks.append(content)
        titles.append(title)

    return chunks, titles

def delete_store_index(folder: str):
    """Remove all vectors for a store."""
    _delete_folder(folder)
    print(f"[RAG] Deleted index for folder: {folder}")

def store_has_index(folder: str) -> bool:
    """Check if a store has any vectors indexed."""
    result = _client.count(
        collection_name=COLLECTION_NAME,
        count_filter=Filter(
            must=[FieldCondition(key="folder", match=MatchValue(value=folder))]
        ),
        exact=False,
    )
    return result.count > 0

# ─── Products collection ──────────────────────────────────────────────────────

PRODUCTS_COLLECTION = "aimin_products"

def _ensure_products_collection():
    existing = [c.name for c in _client.get_collections().collections]
    if PRODUCTS_COLLECTION not in existing:
        _client.create_collection(
            collection_name=PRODUCTS_COLLECTION,
            vectors_config=VectorParams(size=VECTOR_DIM, distance=Distance.COSINE),
        )
        print(f"[RAG] Created Qdrant collection: {PRODUCTS_COLLECTION}")

_ensure_products_collection()

UPSERT_BATCH_SIZE = 500  # ~6MB per batch at 1024-dim, well under Qdrant's 32MB limit

# Namespace UUID for deterministic product group IDs
_PRODUCT_NS = uuid.UUID('7a9e2c4b-1f3d-4e8a-b6c5-0d2f1e3a7b9c')

def _product_point_id(folder: str, name: str, category: str) -> str:
    """Deterministic UUID for a product group — same (folder, name, category) always maps to the same Qdrant point."""
    return str(uuid.uuid5(_PRODUCT_NS, f"{folder}|{name}|{category}"))

def store_products(folder: str, product_names: list[str], product_categories: list[str], embeddings: list[list[float]]):
    """
    Upsert product group vectors. One vector per unique (name, category) group.
    Uses deterministic UUIDs so re-indexing the same product updates in place
    rather than creating duplicates. Does NOT delete existing products — call
    reindex_products_full() to clear + rebuild from scratch.
    Payload: {"folder", "product_name", "product_category"}
    """
    if not product_names:
        return
    points = [
        PointStruct(
            id=_product_point_id(folder, name, cat),
            vector=emb,
            payload={"folder": folder, "product_name": name, "product_category": cat},
        )
        for name, cat, emb in zip(product_names, product_categories, embeddings)
    ]
    # Batch upserts to stay under Qdrant's 32MB JSON payload limit
    for i in range(0, len(points), UPSERT_BATCH_SIZE):
        batch = points[i:i + UPSERT_BATCH_SIZE]
        _client.upsert(collection_name=PRODUCTS_COLLECTION, points=batch)
        print(f"[RAG] Upserted batch {i // UPSERT_BATCH_SIZE + 1} ({len(batch)} vectors) for folder: {folder}")
    print(f"[RAG] Indexed {len(points)} product groups for folder: {folder}")

def reindex_products_full(folder: str, product_names: list[str], product_categories: list[str], embeddings: list[list[float]]):
    """
    Full rebuild: delete all existing vectors for the folder, then re-insert.
    Use this after bulk edits or to fix stale data.
    """
    _client.delete(
        collection_name=PRODUCTS_COLLECTION,
        points_selector=Filter(
            must=[FieldCondition(key="folder", match=MatchValue(value=folder))]
        ),
    )
    print(f"[RAG] Cleared product index for folder: {folder}")
    store_products(folder, product_names, product_categories, embeddings)

def search_products(folder: str, query_vector: list[float], top_k: int = 5) -> list[dict]:
    """
    Semantic product search.
    Returns [{"product_name": str, "product_category": str, "score": float}, ...] ordered by relevance.
    """
    results = _client.search(
        collection_name=PRODUCTS_COLLECTION,
        query_vector=query_vector,
        query_filter=Filter(
            must=[FieldCondition(key="folder", match=MatchValue(value=folder))]
        ),
        limit=top_k,
        score_threshold=0.30,
    )
    return [
        {
            "product_name": hit.payload.get("product_name"),
            "product_category": hit.payload.get("product_category"),
            "score": hit.score,
        }
        for hit in results
    ]

def delete_products_index(folder: str):
    """Remove all product vectors for a store."""
    _client.delete(
        collection_name=PRODUCTS_COLLECTION,
        points_selector=Filter(
            must=[FieldCondition(key="folder", match=MatchValue(value=folder))]
        ),
    )
    print(f"[RAG] Deleted product index for folder: {folder}")

def delete_product_by_name(folder: str, product_name: str):
    """Remove the vector for a single product (matched by folder + product_name)."""
    _client.delete(
        collection_name=PRODUCTS_COLLECTION,
        points_selector=Filter(
            must=[
                FieldCondition(key="folder", match=MatchValue(value=folder)),
                FieldCondition(key="product_name", match=MatchValue(value=product_name)),
            ]
        ),
    )
    print(f"[RAG] Deleted product vector: folder={folder}, name={product_name}")

def products_has_index(folder: str) -> bool:
    result = _client.count(
        collection_name=PRODUCTS_COLLECTION,
        count_filter=Filter(
            must=[FieldCondition(key="folder", match=MatchValue(value=folder))]
        ),
        exact=False,
    )
    return result.count > 0
