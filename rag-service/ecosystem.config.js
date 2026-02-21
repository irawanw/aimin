module.exports = {
  apps: [{
    name: 'rag-service',
    cwd: '/opt/rag-service',
    script: '/opt/rag-service/venv/bin/uvicorn',
    args: 'main:app --host 127.0.0.1 --port 8002 --workers 1',
    interpreter: 'none',
    restart_delay: 3000,
    autorestart: true,
    env: {
      PYTHONPATH: '/opt/rag-service'
    }
  }]
}
