#!/bin/bash

# Script pour générer un rapport de statut des serveurs MCP

echo "📊 Rapport de Statut des Serveurs MCP - Attitudes.vip"
echo "=================================================="
echo ""
echo "Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Compter les conteneurs MCP actifs
active_count=$(docker ps --filter "name=mcp-" --format "{{.Names}}" | wc -l)
echo "🚀 Serveurs MCP Actifs: $active_count"
echo ""

# Lister tous les serveurs actifs
echo "✅ Services Actifs:"
docker ps --filter "name=mcp-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -v "NAMES"
echo ""

# Vérifier l'espace disque utilisé
echo "💾 Utilisation Disque:"
docker system df | grep -E "(Images|Containers|Volumes|Build Cache)"
echo ""

# Afficher les statistiques depuis le tracker
echo "📈 Statistiques du Tracker:"
if [ -f mcp-servers/mcp-tracker.json ]; then
    active=$(jq -r '.statistics.active' mcp-servers/mcp-tracker.json)
    pending=$(jq -r '.statistics.pending' mcp-servers/mcp-tracker.json)
    total=$(jq -r '.totalServers' mcp-servers/mcp-tracker.json)
    
    echo "   Total de services: $total"
    echo "   Actifs: $active"
    echo "   En attente: $pending"
else
    echo "   Tracker non trouvé"
fi
echo ""

# Vérifier la santé des services
echo "🏥 Santé des Services:"
for container in $(docker ps --filter "name=mcp-" --format "{{.Names}}"); do
    health=$(docker inspect --format='{{.State.Health.Status}}' $container 2>/dev/null || echo "no health check")
    echo "   $container: $health"
done
echo ""

echo "📝 Scripts de Gestion Disponibles:"
echo "   ./scripts/install-extended-mcp.sh - Installer nouveaux services"
echo "   ./scripts/stop-extended-mcp.sh     - Arrêter services étendus"
echo "   ./scripts/logs-extended-mcp.sh     - Voir les logs"
echo ""
echo "🌐 Dashboard Web: http://localhost:8080/mcp-servers/mcp-dashboard.html"
echo ""
echo "=================================================="