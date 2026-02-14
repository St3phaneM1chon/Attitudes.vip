#!/bin/bash
echo "🛑 Arrêt des services MCP étendus..."
docker-compose -f docker-compose.mcp-extended.yml down
echo "✅ Services arrêtés"
