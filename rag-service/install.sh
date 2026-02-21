#!/bin/bash
set -e

echo "=== Installing RAG Service ==="

cd /opt/rag-service

# Create Python venv
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Pre-download the model (runs once, ~600MB download)
python3 -c "from FlagEmbedding import BGEM3FlagModel; BGEM3FlagModel('BAAI/bge-m3', use_fp16=True, device='cpu')"

echo "=== Installation complete ==="
