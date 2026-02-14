#!/bin/bash
service=$1
if [ -z "$service" ]; then
    echo "Usage: $0 <service-name>"
    echo "Exemple: $0 mcp-stripe"
    exit 1
fi
docker-compose -f docker-compose.mcp-extended.yml restart $service
echo "✅ Service $service redémarré"
