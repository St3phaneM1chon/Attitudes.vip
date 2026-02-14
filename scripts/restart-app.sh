#!/bin/bash

# Script de redémarrage sécurisé pour Attitudes.vip
# Gère le redémarrage complet ou partiel de l'application avec sécurité

set -e

# Couleurs pour output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_DIR="/Volumes/AI_Project/AttitudesFramework"
BACKUP_DIR="$PROJECT_DIR/backups"
LOG_FILE="$PROJECT_DIR/logs/restart-$(date +%Y%m%d-%H%M%S).log"
HEALTH_CHECK_TIMEOUT=60
RESTART_MODE=${1:-"safe"}  # safe, quick, emergency, service
SERVICE_NAME=${2:-"all"}

# Créer le répertoire de logs si nécessaire
mkdir -p "$(dirname "$LOG_FILE")"

# Fonction de logging
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Fonction pour afficher l'usage
show_usage() {
    echo "Usage: $0 [mode] [service]"
    echo ""
    echo "Modes:"
    echo "  safe      - Redémarrage sécurisé avec sauvegarde (défaut)"
    echo "  quick     - Redémarrage rapide sans sauvegarde"
    echo "  emergency - Redémarrage d'urgence (force)"
    echo "  service   - Redémarrer un service spécifique"
    echo "  status    - Voir le statut des services"
    echo "  health    - Vérifier la santé de l'application"
    echo ""
    echo "Services disponibles:"
    echo "  all, ui, auth-service, database, redis, mcp-*"
    echo ""
    echo "Exemples:"
    echo "  $0                    # Redémarrage sécurisé complet"
    echo "  $0 quick              # Redémarrage rapide"
    echo "  $0 service redis      # Redémarrer Redis uniquement"
    echo "  $0 status             # Voir le statut"
}

# Fonction pour vérifier les prérequis
check_prerequisites() {
    log "🔍 Vérification des prérequis..."
    
    # Vérifier Docker
    if ! command -v docker &> /dev/null; then
        log "❌ Docker n'est pas installé"
        exit 1
    fi
    
    # Vérifier Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log "❌ Docker Compose n'est pas installé"
        exit 1
    fi
    
    # Vérifier que nous sommes dans le bon répertoire
    if [ ! -f "$PROJECT_DIR/docker-compose.yml" ]; then
        log "❌ Fichier docker-compose.yml non trouvé dans $PROJECT_DIR"
        exit 1
    fi
    
    cd "$PROJECT_DIR"
    log "✅ Prérequis vérifiés"
}

# Fonction pour vérifier la santé de l'application
check_health() {
    log "🏥 Vérification de la santé de l'application..."
    
    local all_healthy=true
    
    # Vérifier le service UI
    if curl -sf http://localhost:8080/health > /dev/null 2>&1; then
        log "✅ UI (Nginx) : OK"
    else
        log "❌ UI (Nginx) : NON DISPONIBLE"
        all_healthy=false
    fi
    
    # Vérifier le service Auth
    if curl -sf http://localhost:3000/health > /dev/null 2>&1; then
        log "✅ Auth Service : OK"
    else
        log "❌ Auth Service : NON DISPONIBLE"
        all_healthy=false
    fi
    
    # Vérifier PostgreSQL
    if docker-compose exec -T database pg_isready > /dev/null 2>&1; then
        log "✅ PostgreSQL : OK"
    else
        log "❌ PostgreSQL : NON DISPONIBLE"
        all_healthy=false
    fi
    
    # Vérifier Redis
    if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
        log "✅ Redis : OK"
    else
        log "❌ Redis : NON DISPONIBLE"
        all_healthy=false
    fi
    
    # Vérifier les services MCP
    if docker-compose -f docker-compose.mcp.yml ps 2>/dev/null | grep -q "Up"; then
        log "✅ Services MCP : OK"
    else
        log "⚠️  Services MCP : Partiellement disponibles"
    fi
    
    if [ "$all_healthy" = true ]; then
        log "✅ Tous les services sont en bonne santé"
        return 0
    else
        log "⚠️  Certains services ont des problèmes"
        return 1
    fi
}

# Fonction pour créer une sauvegarde
create_backup() {
    log "💾 Création d'une sauvegarde..."
    
    mkdir -p "$BACKUP_DIR"
    local backup_name="backup-$(date +%Y%m%d-%H%M%S)"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    # Sauvegarde de la base de données
    if docker-compose exec -T database pg_dump -U attitudes attitudes_db > "$backup_path.sql" 2>/dev/null; then
        log "✅ Base de données sauvegardée : $backup_path.sql"
    else
        log "⚠️  Impossible de sauvegarder la base de données"
    fi
    
    # Sauvegarde des volumes Docker
    docker run --rm -v attitudesframework_postgres_data:/data -v "$BACKUP_DIR":/backup \
        alpine tar czf "/backup/$backup_name-volumes.tar.gz" -C / data 2>/dev/null || true
    
    # Sauvegarde de la configuration
    tar czf "$backup_path-config.tar.gz" .env docker-compose*.yml nginx.conf redis.conf 2>/dev/null || true
    
    log "✅ Sauvegarde terminée : $backup_path.*"
}

# Fonction pour attendre que les services soient prêts
wait_for_services() {
    log "⏳ Attente du démarrage des services..."
    
    local timeout=$HEALTH_CHECK_TIMEOUT
    local elapsed=0
    
    while [ $elapsed -lt $timeout ]; do
        if check_health > /dev/null 2>&1; then
            log "✅ Tous les services sont prêts"
            return 0
        fi
        
        sleep 5
        elapsed=$((elapsed + 5))
        echo -ne "\r⏳ Attente... ${elapsed}s / ${timeout}s"
    done
    
    echo ""
    log "⚠️  Timeout atteint, certains services pourraient ne pas être prêts"
    return 1
}

# Fonction pour notifier les utilisateurs (si implémenté)
notify_users() {
    local message="$1"
    log "📢 Notification : $message"
    
    # Ici on pourrait envoyer des notifications via :
    # - WebSocket aux utilisateurs connectés
    # - Email aux administrateurs
    # - Slack/Discord
    # - SMS via Twilio
    
    # Pour l'instant, on log simplement
    echo "$message" >> "$PROJECT_DIR/logs/maintenance.log"
}

# Fonction de redémarrage sécurisé
restart_safe() {
    log "🔒 Début du redémarrage sécurisé..."
    
    # 1. Vérification de santé initiale
    log "État avant redémarrage :"
    check_health || true
    
    # 2. Notification aux utilisateurs
    notify_users "Maintenance planifiée : redémarrage de l'application dans 2 minutes"
    sleep 10  # Donner le temps aux utilisateurs de sauvegarder
    
    # 3. Sauvegarde
    create_backup
    
    # 4. Arrêt gracieux
    log "🛑 Arrêt des services..."
    docker-compose stop
    
    # 5. Attendre l'arrêt complet
    sleep 5
    
    # 6. Redémarrage
    log "🚀 Démarrage des services..."
    docker-compose up -d
    
    # 7. Attendre que les services soient prêts
    wait_for_services
    
    # 8. Vérification finale
    log "État après redémarrage :"
    check_health
    
    # 9. Notification de fin
    notify_users "Maintenance terminée : l'application est à nouveau disponible"
    
    log "✅ Redémarrage sécurisé terminé"
}

# Fonction de redémarrage rapide
restart_quick() {
    log "⚡ Début du redémarrage rapide..."
    
    # 1. Notification
    notify_users "Redémarrage rapide en cours..."
    
    # 2. Redémarrage Docker Compose
    log "🔄 Redémarrage des services..."
    docker-compose restart
    
    # 3. Attendre que les services soient prêts
    wait_for_services
    
    # 4. Vérification
    check_health
    
    log "✅ Redémarrage rapide terminé"
}

# Fonction de redémarrage d'urgence
restart_emergency() {
    log "🚨 REDÉMARRAGE D'URGENCE..."
    
    # 1. Force l'arrêt
    log "🛑 Arrêt forcé des services..."
    docker-compose down
    
    # 2. Nettoyer les conteneurs orphelins
    docker container prune -f
    
    # 3. Redémarrer
    log "🚀 Démarrage d'urgence..."
    docker-compose up -d --force-recreate
    
    # 4. Démarrer aussi les services MCP
    docker-compose -f docker-compose.mcp.yml up -d
    
    # 5. Attendre et vérifier
    wait_for_services
    check_health || log "⚠️  Certains services pourraient avoir des problèmes"
    
    log "✅ Redémarrage d'urgence terminé"
}

# Fonction pour redémarrer un service spécifique
restart_service() {
    local service="$1"
    
    if [ "$service" = "all" ]; then
        restart_safe
        return
    fi
    
    log "🔧 Redémarrage du service : $service"
    
    # Vérifier que le service existe
    if ! docker-compose ps | grep -q "$service"; then
        log "❌ Service '$service' non trouvé"
        exit 1
    fi
    
    # Redémarrer le service
    docker-compose restart "$service"
    
    # Attendre un peu
    sleep 10
    
    # Vérifier la santé
    check_health
    
    log "✅ Service '$service' redémarré"
}

# Fonction pour afficher le statut
show_status() {
    echo -e "${BLUE}📊 Statut des services Attitudes.vip${NC}"
    echo "====================================="
    
    # Services principaux
    echo -e "\n${YELLOW}Services principaux :${NC}"
    docker-compose ps
    
    # Services MCP
    echo -e "\n${YELLOW}Services MCP :${NC}"
    docker-compose -f docker-compose.mcp.yml ps 2>/dev/null || echo "Services MCP non démarrés"
    
    # Santé
    echo -e "\n${YELLOW}Santé de l'application :${NC}"
    check_health || true
    
    # Utilisation des ressources
    echo -e "\n${YELLOW}Utilisation des ressources :${NC}"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
}

# Fonction principale
main() {
    case "$RESTART_MODE" in
        safe)
            check_prerequisites
            restart_safe
            ;;
        quick)
            check_prerequisites
            restart_quick
            ;;
        emergency)
            check_prerequisites
            restart_emergency
            ;;
        service)
            check_prerequisites
            restart_service "$SERVICE_NAME"
            ;;
        status)
            show_status
            ;;
        health)
            check_prerequisites
            check_health
            ;;
        help|--help|-h)
            show_usage
            exit 0
            ;;
        *)
            echo -e "${RED}Mode invalide : $RESTART_MODE${NC}"
            show_usage
            exit 1
            ;;
    esac
}

# Gestion des signaux pour un arrêt propre
trap 'log "⚠️  Interruption détectée, arrêt du script..."; exit 1' SIGINT SIGTERM

# Exécution
echo -e "${BLUE}🔄 Script de redémarrage Attitudes.vip${NC}"
echo "======================================="
main