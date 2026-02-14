#!/bin/bash
service=${1:-}
if [ -z "$service" ]; then
    docker-compose -f docker-compose.mcp-extended.yml logs -f
else
    docker-compose -f docker-compose.mcp-extended.yml logs -f $service
fi
