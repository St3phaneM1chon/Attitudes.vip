#!/bin/bash

echo "🔍 Test des services MCP..."
echo "=========================="

# Test réseau Docker
echo -n "Docker network: "
docker network ls | grep attitudes-network && echo "✅ OK" || echo "❌ FAIL"

# Test containers
echo -n "MCP containers: "
docker-compose -f docker-compose.mcp.yml ps

# Test filesystem access
echo -n "Filesystem test: "
ls -la > /dev/null && echo "✅ OK" || echo "❌ FAIL"

# Test Git
echo -n "Git test: "
git status > /dev/null 2>&1 && echo "✅ OK" || echo "❌ FAIL"

echo ""
echo "✅ Tests terminés!"
