#!/bin/bash

# Script pour construire des serveurs MCP locaux basés sur les exemples officiels

set -e

echo "🔨 Construction des serveurs MCP locaux..."

# Créer la structure des serveurs
mkdir -p mcp-servers/local

# 1. Serveur MCP Echo simple pour tests
cat > mcp-servers/local/echo-server.js << 'EOF'
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Endpoint de santé
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'echo-mcp' });
});

// Echo endpoint
app.post('/echo', (req, res) => {
  res.json({ echo: req.body, timestamp: new Date().toISOString() });
});

// MCP protocol endpoint
app.post('/mcp', (req, res) => {
  const { method, params } = req.body;
  res.json({
    jsonrpc: '2.0',
    result: {
      method,
      params,
      service: 'echo-mcp',
      timestamp: new Date().toISOString()
    },
    id: req.body.id || 1
  });
});

app.listen(port, () => {
  console.log(`Echo MCP Server listening on port ${port}`);
});
EOF

# 2. Serveur MCP Memory pour stockage local
cat > mcp-servers/local/memory-server.js << 'EOF'
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Stockage en mémoire
const memory = new Map();

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'memory-mcp', items: memory.size });
});

app.post('/mcp', (req, res) => {
  const { method, params, id } = req.body;
  let result;

  switch(method) {
    case 'store':
      memory.set(params.key, params.value);
      result = { success: true, key: params.key };
      break;
    case 'retrieve':
      result = { value: memory.get(params.key) || null };
      break;
    case 'list':
      result = { keys: Array.from(memory.keys()) };
      break;
    case 'clear':
      memory.clear();
      result = { success: true };
      break;
    default:
      result = { error: 'Unknown method' };
  }

  res.json({ jsonrpc: '2.0', result, id: id || 1 });
});

app.listen(port, () => {
  console.log(`Memory MCP Server listening on port ${port}`);
});
EOF

# 3. Dockerfile pour les serveurs
cat > mcp-servers/local/Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Installer les dépendances
RUN npm init -y && npm install express

# Copier le serveur approprié
ARG SERVER_TYPE=echo
COPY ${SERVER_TYPE}-server.js server.js

EXPOSE 3000

CMD ["node", "server.js"]
EOF

# 4. Docker Compose pour les serveurs locaux
cat > docker-compose.mcp-local.yml << 'EOF'
version: '3.8'

services:
  mcp-echo:
    build:
      context: ./mcp-servers/local
      args:
        SERVER_TYPE: echo
    container_name: mcp-echo
    ports:
      - "3030:3000"
    networks:
      - mcp-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  mcp-memory:
    build:
      context: ./mcp-servers/local
      args:
        SERVER_TYPE: memory
    container_name: mcp-memory
    ports:
      - "3031:3000"
    networks:
      - mcp-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  mcp-network:
    external: true
    name: mcp-network
EOF

echo "✅ Fichiers de construction créés"
echo ""
echo "Pour construire et lancer les serveurs locaux :"
echo "  docker-compose -f docker-compose.mcp-local.yml build"
echo "  docker-compose -f docker-compose.mcp-local.yml up -d"