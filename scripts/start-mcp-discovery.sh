#!/bin/bash

# Script pour démarrer l'agent de découverte MCP
# Peut être ajouté au crontab ou systemd pour démarrage automatique

set -e

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Répertoire du projet
PROJECT_DIR="/Volumes/AI_Project/AttitudesFramework"
AGENT_SCRIPT="$PROJECT_DIR/src/agents/mcp-discovery-scheduler.js"
PID_FILE="$PROJECT_DIR/data/mcp-discovery-agent.pid"
LOG_DIR="$PROJECT_DIR/logs"

echo -e "${YELLOW}🤖 MCP Discovery Agent Manager${NC}"
echo "================================"

# Fonction pour vérifier si l'agent est en cours d'exécution
check_running() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            return 0
        else
            rm -f "$PID_FILE"
            return 1
        fi
    else
        return 1
    fi
}

# Fonction pour démarrer l'agent
start_agent() {
    if check_running; then
        echo -e "${YELLOW}⚠️  L'agent est déjà en cours d'exécution (PID: $(cat $PID_FILE))${NC}"
        return 1
    fi
    
    echo -e "${GREEN}🚀 Démarrage de l'agent de découverte MCP...${NC}"
    
    # Créer les répertoires nécessaires
    mkdir -p "$LOG_DIR"
    mkdir -p "$PROJECT_DIR/data/mcp-discovery"
    mkdir -p "$PROJECT_DIR/data/notifications"
    
    # Définir les variables d'environnement
    export MCP_DISCOVERY_AUTO_START="false"  # Pas d'exécution immédiate
    export MCP_DISCOVERY_USE_INTERVAL="false"  # Utiliser cron
    export MCP_AUTO_INSTALL="false"  # Installation manuelle par défaut
    
    # Démarrer l'agent en arrière-plan
    cd "$PROJECT_DIR"
    nohup node "$AGENT_SCRIPT" start > "$LOG_DIR/mcp-discovery-agent.out" 2>&1 &
    
    echo $! > "$PID_FILE"
    
    sleep 2
    
    if check_running; then
        echo -e "${GREEN}✅ Agent démarré avec succès (PID: $(cat $PID_FILE))${NC}"
        echo -e "📋 Logs: $LOG_DIR/mcp-discovery-agent.out"
        echo -e "📅 Prochaine exécution: Lundi prochain à 3h00"
    else
        echo -e "${RED}❌ Échec du démarrage de l'agent${NC}"
        return 1
    fi
}

# Fonction pour arrêter l'agent
stop_agent() {
    if ! check_running; then
        echo -e "${YELLOW}⚠️  L'agent n'est pas en cours d'exécution${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}🛑 Arrêt de l'agent...${NC}"
    
    PID=$(cat "$PID_FILE")
    kill $PID 2>/dev/null || true
    
    # Attendre l'arrêt
    for i in {1..10}; do
        if ! ps -p $PID > /dev/null 2>&1; then
            break
        fi
        sleep 1
    done
    
    # Forcer l'arrêt si nécessaire
    if ps -p $PID > /dev/null 2>&1; then
        kill -9 $PID 2>/dev/null || true
    fi
    
    rm -f "$PID_FILE"
    echo -e "${GREEN}✅ Agent arrêté${NC}"
}

# Fonction pour afficher le statut
show_status() {
    echo -e "${YELLOW}📊 Statut de l'agent${NC}"
    
    if check_running; then
        PID=$(cat "$PID_FILE")
        echo -e "État: ${GREEN}En cours d'exécution${NC}"
        echo -e "PID: $PID"
        
        # Afficher les informations du processus
        ps -p $PID -o pid,ppid,user,start,time,command | tail -n +1
        
        # Dernières lignes du log
        if [ -f "$LOG_DIR/mcp-discovery-scheduler.log" ]; then
            echo -e "\n${YELLOW}📋 Dernières entrées du log:${NC}"
            tail -5 "$LOG_DIR/mcp-discovery-scheduler.log" 2>/dev/null || echo "Pas de logs disponibles"
        fi
        
        # Dernière découverte
        LAST_REPORT=$(ls -t "$PROJECT_DIR/data/mcp-discovery/discovery-report-"*.json 2>/dev/null | head -1)
        if [ -n "$LAST_REPORT" ]; then
            echo -e "\n${YELLOW}📄 Dernier rapport:${NC} $(basename $LAST_REPORT)"
        fi
    else
        echo -e "État: ${RED}Arrêté${NC}"
    fi
}

# Fonction pour exécuter manuellement
run_discovery() {
    echo -e "${GREEN}🔍 Exécution manuelle de la découverte MCP...${NC}"
    
    cd "$PROJECT_DIR"
    node "$AGENT_SCRIPT" run
}

# Fonction pour voir les logs
show_logs() {
    echo -e "${YELLOW}📋 Logs de l'agent${NC}"
    
    if [ -f "$LOG_DIR/mcp-discovery-agent.out" ]; then
        tail -f "$LOG_DIR/mcp-discovery-agent.out"
    else
        echo -e "${RED}Aucun fichier de log trouvé${NC}"
    fi
}

# Fonction pour installer comme service systemd
install_service() {
    echo -e "${YELLOW}🔧 Installation comme service systemd...${NC}"
    
    SERVICE_FILE="/etc/systemd/system/mcp-discovery-agent.service"
    
    sudo tee $SERVICE_FILE > /dev/null << EOF
[Unit]
Description=MCP Discovery Agent for Attitudes.vip
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/bin/node $AGENT_SCRIPT start
ExecStop=/usr/bin/node $AGENT_SCRIPT stop
Restart=on-failure
RestartSec=10
StandardOutput=append:$LOG_DIR/mcp-discovery-agent.out
StandardError=append:$LOG_DIR/mcp-discovery-agent.err

Environment="MCP_DISCOVERY_AUTO_START=false"
Environment="MCP_DISCOVERY_USE_INTERVAL=false"
Environment="MCP_AUTO_INSTALL=false"

[Install]
WantedBy=multi-user.target
EOF
    
    sudo systemctl daemon-reload
    sudo systemctl enable mcp-discovery-agent.service
    
    echo -e "${GREEN}✅ Service installé${NC}"
    echo -e "Commandes disponibles:"
    echo -e "  sudo systemctl start mcp-discovery-agent"
    echo -e "  sudo systemctl stop mcp-discovery-agent"
    echo -e "  sudo systemctl status mcp-discovery-agent"
}

# Menu principal
case "$1" in
    start)
        start_agent
        ;;
    stop)
        stop_agent
        ;;
    restart)
        stop_agent
        sleep 2
        start_agent
        ;;
    status)
        show_status
        ;;
    run)
        run_discovery
        ;;
    logs)
        show_logs
        ;;
    install-service)
        install_service
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|run|logs|install-service}"
        echo ""
        echo "Commands:"
        echo "  start           - Démarrer l'agent en arrière-plan"
        echo "  stop            - Arrêter l'agent"
        echo "  restart         - Redémarrer l'agent"
        echo "  status          - Afficher le statut"
        echo "  run             - Exécuter manuellement la découverte"
        echo "  logs            - Afficher les logs en temps réel"
        echo "  install-service - Installer comme service systemd"
        exit 1
        ;;
esac