# RAG Infrastructure Documentation

## Overview

RAG (Retrieval-Augmented Generation) allows the AI bot to answer questions from a store's Knowledge Base (KB) accurately — even when the KB is very large (20,000+ characters). Instead of sending the whole KB to the AI (which would exceed token limits), only the most relevant paragraphs are retrieved and sent.

**RAG activates automatically when KB > 1,500 characters. Short KBs are sent as-is.**

---

## Where Everything Lives

```
Server (aiminassist.com)
│
├── /opt/rag-service/              ← Python FastAPI microservice
│   ├── main.py                    ← API endpoints: /index, /query, /healthz
│   ├── embedder.py                ← Loads bge-m3 model, creates vector embeddings
│   ├── chunker.py                 ← Splits KB text into ~400-char chunks
│   ├── vector_store.py            ← Reads/writes vectors to Qdrant
│   ├── requirements.txt           ← Python dependencies
│   ├── ecosystem.config.js        ← PM2 process config
│   ├── install.sh                 ← First-time install script
│   ├── deploy.sh                  ← Full deployment script (Qdrant + service + PM2)
│   └── venv/                      ← Python virtual environment (~2GB incl. model)
│
├── /data/qdrant_storage/          ← Vector database storage (persisted on disk)
│   └── collections/
│       └── aimin_kb/              ← All store chunks in one collection
│                                     (filtered per-store by "folder" field)
│
└── /data/www/aimin/               ← Next.js app (aiminassist.com)
    ├── src/app/api/v1/rag/
    │   ├── query/route.ts         ← POST /api/v1/rag/query  (bot uses this)
    │   └── index/route.ts         ← POST /api/v1/rag/index  (bot/dashboard uses this)
    ├── src/app/api/user/
    │   └── knowledge-base/route.ts ← POST/DELETE for dashboard file upload (PDF/DOCX)
    └── src/app/api/user/
        └── store/route.ts         ← Auto-triggers RAG re-index when KB is saved

Also staged (source of truth for redeployment):
└── /data/www/aimin/rag-service/   ← Same files as /opt/rag-service/ (copy here before deploy)
```

---

## Running Services

| Service       | How it runs       | Port  | PM2 name      | Memory  |
|---------------|-------------------|-------|---------------|---------|
| rag-service   | PM2 (Python/uvicorn) | 8002 | `rag-service` | ~1.8GB  |
| Qdrant        | Docker container  | 6333  | `qdrant`      | ~200MB  |
| aimin (Next.js) | PM2 (Node.js)   | 3001  | `aimin`       | ~130MB  |

**Check status:**
```bash
pm2 status                          # shows all PM2 processes
docker ps --filter name=qdrant      # shows Qdrant container
curl http://127.0.0.1:8002/healthz  # → {"status":"ok"}
curl http://localhost:6333/healthz  # → Qdrant health
```

**Logs:**
```bash
pm2 logs rag-service --lines 50    # rag-service logs
pm2 logs aimin --lines 50          # Next.js app logs
```

---

## Data Flow

### Flow 1: Store owner uploads a PDF/DOCX from the dashboard

```
User uploads file at /user/edit (dashboard)
  ↓
POST /api/user/knowledge-base  (Next.js, aimin)
  ↓ parses PDF with pdf-parse / DOCX with mammoth
  ↓ saves extracted text → pelanggan.store_knowledge_base in MySQL
  ↓
fire-and-forget POST http://127.0.0.1:8002/index
  { folder: "store_folder", text: "full KB text" }
  ↓
rag-service/chunker.py   → splits into ~400-char chunks with 50-char overlap
rag-service/embedder.py  → embeds each chunk with BAAI/bge-m3 (1024-dim vectors)
rag-service/vector_store.py → deletes old chunks for this store, stores new ones in Qdrant
  ↓
Done — index ready (runs in background, ~30-60 sec for large KBs)
```

### Flow 2: Store owner types/edits KB manually in the dashboard

```
User saves store info at /user/edit
  ↓
PUT /api/user/store  (Next.js, aimin)
  ↓ saves store_knowledge_base to MySQL
  ↓
fire-and-forget POST http://127.0.0.1:8002/index  ← same as above
  (if KB is empty → DELETE instead, clears the index)
```

### Flow 3: Bot receives a user message

```
Bot user sends WhatsApp/web message
  ↓
Bot calls POST https://aiminassist.com/api/v1/rag/query
  Authorization: Bearer <API_KEY>
  { "folder": "store_folder", "query": "user message", "top_k": 5 }
  ↓
Next.js /api/v1/rag/query/route.ts  → validates Bearer token
  ↓ proxies to →
POST http://127.0.0.1:8002/query
  ↓
rag-service checks if store has an index in Qdrant
  If no index → returns { chunks: [], has_index: false }
  If has index →
    embed query with bge-m3
    cosine search in Qdrant (score threshold: 0.35)
    returns top-5 matching chunks
  ↓
Response: { "chunks": ["relevant paragraph...", ...], "has_index": true }
  ↓
Bot injects chunks into AI prompt instead of full KB
  → AI answers with accurate, relevant info
```

---

## API Endpoints

### Public (requires Bearer token)

| Method | Endpoint | Used by | Description |
|--------|----------|---------|-------------|
| POST | `/api/v1/rag/query` | Bot | Get relevant chunks for a user query |
| POST | `/api/v1/rag/index` | Bot / dashboard | Trigger KB indexing (fire-and-forget, returns 202) |
| DELETE | `/api/v1/rag/index` | Dashboard | Delete index for a store |

**Auth header:** `Authorization: Bearer aimin_sk_7f8d9e2a1b4c6d8e0f2a4b6c8d0e2f4a`

### Internal (no auth, localhost only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `http://127.0.0.1:8002/healthz` | Health check |
| POST | `http://127.0.0.1:8002/index` | Chunk + embed + store KB |
| POST | `http://127.0.0.1:8002/query` | Search chunks by query |
| DELETE | `http://127.0.0.1:8002/index` | Delete store's vectors |

---

## The "folder" Field

Each store's chunks are identified by `store_folder` from the `pelanggan` MySQL table. This is the same value used by the bot when querying.

```bash
# Check a store's folder:
mysql -u aimin -p'bzYG+5Fz5bQJR+tT' aimin \
  -se "SELECT store_folder, LENGTH(store_knowledge_base) FROM pelanggan WHERE store_whatsapp_jid LIKE '%NUMBER%'"
```

---

## Common Operations

### Manually re-index a store's KB

```bash
# Get the KB text and re-index in one command:
KB=$(mysql -u aimin -p'bzYG+5Fz5bQJR+tT' aimin -se \
  "SELECT store_knowledge_base FROM pelanggan WHERE store_whatsapp_jid LIKE '%PHONENUMBER%'" 2>/dev/null)

curl -s -X POST http://127.0.0.1:8002/index \
  -H "Content-Type: application/json" \
  -d "{\"folder\":\"STORE_FOLDER\",\"text\":$(echo "$KB" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')}"

# → {"status":"ok","chunks_count":92}
```

### Test a query

```bash
curl -s -X POST http://127.0.0.1:8002/query \
  -H "Content-Type: application/json" \
  -d '{"folder":"STORE_FOLDER","query":"your test question","top_k":3}'
```

### Check how many chunks a store has indexed

```bash
curl -s http://localhost:6333/collections/aimin_kb/points/count \
  -H "Content-Type: application/json" \
  -d '{"filter":{"must":[{"key":"folder","match":{"value":"STORE_FOLDER"}}]}}'
```

### Restart rag-service after code changes

```bash
# Edit files in /opt/rag-service/, then:
pm2 restart rag-service
sleep 20  # wait for bge-m3 model to load
curl http://127.0.0.1:8002/healthz
```

### Restart Qdrant (if Docker container stopped)

```bash
docker start qdrant
# Data in /data/qdrant_storage/ is preserved
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `[RAG] no index, KB truncated` in bot logs | Store not indexed yet | Manually re-index (see above) |
| `POST /index HTTP/1.1 500` in rag-service logs | Embedder crash | `pm2 logs rag-service` to read error |
| `/api/v1/rag/index` returns 500 | Next.js crash | `pm2 logs aimin` to read error |
| Qdrant not responding | Docker stopped | `docker start qdrant` |
| rag-service using wrong chunks | Old index not cleared | The index endpoint deletes old chunks before inserting new ones — re-indexing fixes it |
| Model download stuck during install | Large file (~2.3GB) | Wait; if frozen >10min, re-run `python3 -c "from FlagEmbedding import BGEM3FlagModel; BGEM3FlagModel('BAAI/bge-m3', use_fp16=True, device='cpu')"` |

---

## Model Info

- **Model:** `BAAI/bge-m3` — multilingual, excellent Indonesian + English
- **Dimension:** 1024
- **Device:** CPU (GPU reserved for vLLM/Qwen)
- **Size:** ~2.3GB download, cached in `~/.cache/huggingface/`
- **Speed:** ~30-60 sec to embed a full 25,000-char KB on CPU
- **Query speed:** ~150ms per query on CPU

---

## File to Edit If You Need Changes

| What to change | File |
|----------------|------|
| Chunk size / overlap | `/opt/rag-service/chunker.py` |
| Embedding model / device | `/opt/rag-service/embedder.py` |
| Qdrant collection / score threshold | `/opt/rag-service/vector_store.py` |
| API endpoints / auth | `/opt/rag-service/main.py` |
| Next.js proxy endpoints | `/data/www/aimin/src/app/api/v1/rag/` |
| Dashboard file upload UI | `/data/www/aimin/src/app/user/edit/page.tsx` |
| Auto-index hook on KB save | `/data/www/aimin/src/app/api/user/store/route.ts` |

After editing `/opt/rag-service/*.py`, always run `pm2 restart rag-service`.
After editing Next.js files, run `npx next build` then `pm2 restart aimin`.
