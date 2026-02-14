#!/bin/bash

# Script pour activer l'intégration entre Discovery Agent et Self-Check
# Synchronise automatiquement les découvertes hebdomadaires

set -e

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_DIR="/Volumes/AI_Project/AttitudesFramework"
BRIDGE_MODULE="$PROJECT_DIR/src/utils/mcp-integration-bridge.js"

echo -e "${BLUE}🔄 MCP Integration Bridge${NC}"
echo "============================"

# Fonction principale
run_integration() {
    cd "$PROJECT_DIR"
    
    case "$1" in
        start)
            echo -e "${GREEN}🚀 Démarrage de l'intégration automatique...${NC}"
            
            # Créer les répertoires nécessaires
            mkdir -p "$PROJECT_DIR/data/mcp-discovery"
            mkdir -p "$PROJECT_DIR/logs"
            
            # Démarrer avec variable d'environnement
            export MCP_BRIDGE_AUTO_START="true"
            
            # Exécuter le bridge
            node -e "
                const { startMCPSync } = require('$BRIDGE_MODULE');
                startMCPSync();
                console.log('✅ Intégration démarrée - Les découvertes seront synchronisées automatiquement');
                
                // Garder le processus actif
                setInterval(() => {}, 1000);
                
                // Gérer l'arrêt propre
                process.on('SIGINT', () => {
                    console.log('\\n🛑 Arrêt de l\\'intégration...');
                    process.exit(0);
                });
            " &
            
            echo $! > "$PROJECT_DIR/data/mcp-bridge.pid"
            echo -e "${GREEN}✅ Intégration démarrée (PID: $!)${NC}"
            ;;
            
        sync)
            echo -e "${YELLOW}🔄 Synchronisation manuelle...${NC}"
            
            node -e "
                const { syncNow } = require('$BRIDGE_MODULE');
                syncNow().then(report => {
                    console.log('✅ Synchronisation terminée');
                    if (report) {
                        console.log('📊 Résumé:');
                        console.log('  - Ajoutés:', report.summary.added);
                        console.log('  - Mis à jour:', report.summary.updated);
                        console.log('  - Total:', report.summary.total);
                    }
                    process.exit(0);
                }).catch(err => {
                    console.error('❌ Erreur:', err.message);
                    process.exit(1);
                });
            "
            ;;
            
        status)
            echo -e "${BLUE}📊 Statut de l'intégration${NC}"
            
            node -e "
                const { getSyncStatus } = require('$BRIDGE_MODULE');
                getSyncStatus().then(status => {
                    console.log('État:', status.isRunning ? '✅ Actif' : '❌ Inactif');
                    console.log('Dernière sync:', status.lastSync || 'Jamais');
                    console.log('Statistiques:');
                    console.log('  - Total synchronisations:', status.stats.totalSynced);
                    console.log('  - MCP ajoutés:', status.stats.totalAdded);
                    console.log('  - MCP mis à jour:', status.stats.totalUpdated);
                    if (status.isRunning) {
                        console.log('Prochaine sync:', status.nextSync);
                    }
                    process.exit(0);
                });
            "
            ;;
            
        test)
            echo -e "${YELLOW}🧪 Test de l'intégration...${NC}"
            
            # Créer un faux rapport de découverte pour test
            cat > "$PROJECT_DIR/data/mcp-discovery/test-discovery.json" << EOF
{
  "generatedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "topRecommendations": [
    {
      "name": "mcp-test-integration",
      "score": 0.85,
      "tools": ["test_tool_1", "test_tool_2"],
      "installation": "npm install -g mcp-test-integration"
    }
  ]
}
EOF
            
            echo "📄 Rapport de test créé"
            echo "🔄 Lancement de la synchronisation..."
            
            # Lancer la sync
            $0 sync
            
            # Vérifier si le MCP test apparaît dans Self-Check
            echo -e "\n${YELLOW}🔍 Vérification de l'intégration...${NC}"
            
            node -e "
                const { checkMCPv2 } = require('$PROJECT_DIR/src/utils/mcp-self-check-v2.js');
                
                setTimeout(async () => {
                    const result = await checkMCPv2('utiliser mcp-test-integration');
                    
                    if (result.services.find(s => s.service === 'test-integration')) {
                        console.log('✅ TEST RÉUSSI - Le MCP test a été intégré dans Self-Check!');
                    } else {
                        console.log('❌ TEST ÉCHOUÉ - Le MCP test n\\'a pas été trouvé');
                    }
                    
                    // Nettoyer
                    const fs = require('fs');
                    fs.unlinkSync('$PROJECT_DIR/data/mcp-discovery/test-discovery.json');
                    
                    process.exit(0);
                }, 2000);
            "
            ;;
            
        logs)
            echo -e "${YELLOW}📋 Logs de synchronisation${NC}"
            
            if [ -f "$PROJECT_DIR/logs/mcp-sync.log" ]; then
                tail -f "$PROJECT_DIR/logs/mcp-sync.log"
            else
                echo "Aucun log disponible"
            fi
            ;;
            
        *)
            echo "Usage: $0 {start|sync|status|test|logs}"
            echo ""
            echo "Commands:"
            echo "  start  - Démarrer l'intégration automatique"
            echo "  sync   - Synchroniser manuellement maintenant"
            echo "  status - Voir le statut de l'intégration"
            echo "  test   - Tester l'intégration avec un faux MCP"
            echo "  logs   - Voir les logs de synchronisation"
            exit 1
            ;;
    esac
}

# Exécuter la commande
run_integration "$1"