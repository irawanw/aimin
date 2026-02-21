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

    _client.upsert(collection_name=COLLECTION_NAME, points=points)
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

    _client.upsert(collection_name=COLLECTION_NAME, points=points)
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
