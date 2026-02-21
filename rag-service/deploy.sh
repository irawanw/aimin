#!/bin/bash
# Run this script once to set up the RAG service on the server
set -e

echo "=== RAG Service Deployment ==="

# 1. Install Qdrant (Docker)
echo "--- Step 1: Starting Qdrant ---"
docker pull qdrant/qdrant
docker run -d \
  --name qdrant \
  --restart always \
  -p 6333:6333 \
  -p 6334:6334 \
  -v /data/qdrant_storage:/qdrant/storage \
  qdrant/qdrant || echo "Qdrant may already be running"

sleep 3
curl -s http://localhost:6333/healthz && echo " ← Qdrant OK" || echo "Qdrant not responding yet"

# 2. Copy service files
echo "--- Step 2: Deploying service files ---"
sudo mkdir -p /opt/rag-service
sudo cp -r /data/www/aimin/rag-service/* /opt/rag-service/
sudo chown -R $(whoami):$(whoami) /opt/rag-service

# 3. Install Python dependencies + download model
echo "--- Step 3: Installing dependencies (this may take a few minutes) ---"
chmod +x /opt/rag-service/install.sh
/opt/rag-service/install.sh

# 4. Start with PM2
echo "--- Step 4: Starting with PM2 ---"
pm2 start /opt/rag-service/ecosystem.config.js
pm2 save

echo ""
echo "=== Deployment complete ==="
echo "Test: curl http://127.0.0.1:8002/healthz"
