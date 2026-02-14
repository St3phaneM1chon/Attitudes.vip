#!/bin/bash

# Script de déploiement pour l'environnement staging
# Usage: ./scripts/deploy-staging.sh

set -e

echo "🚀 Déploiement Staging Attitudes.vip"
echo "===================================="

# Variables
COMPOSE_FILE="docker-compose.staging.yml"
ENV_FILE=".env.staging"
BACKUP_DIR="./backups/staging"
LOG_FILE="./logs/staging/deploy-$(date +%Y%m%d-%H%M%S).log"

# Créer les répertoires nécessaires
mkdir -p ./logs/staging
mkdir -p ./backups/staging
mkdir -p ./uploads/staging
mkdir -p ./nginx/certs/staging

# Logger
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Vérifier les prérequis
check_requirements() {
    log "📋 Vérification des prérequis..."
    
    if ! command -v docker &> /dev/null; then
        log "❌ Docker n'est pas installé"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log "❌ Docker Compose n'est pas installé"
        exit 1
    fi
    
    if [ ! -f "$ENV_FILE" ]; then
        log "❌ Fichier $ENV_FILE manquant"
        exit 1
    fi
    
    log "✅ Prérequis validés"
}

# Backup de la base de données
backup_database() {
    log "💾 Backup de la base de données..."
    
    if docker ps | grep -q attitudes_postgres_staging; then
        BACKUP_FILE="$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).sql"
        docker exec attitudes_postgres_staging pg_dump -U postgres attitudes_staging > "$BACKUP_FILE"
        
        if [ -f "$BACKUP_FILE" ]; then
            gzip "$BACKUP_FILE"
            log "✅ Backup créé: ${BACKUP_FILE}.gz"
        else
            log "⚠️  Échec du backup"
        fi
    else
        log "ℹ️  Base de données non active, pas de backup"
    fi
}

# Build et déploiement
deploy() {
    log "🔨 Build de l'image Docker..."
    docker-compose -f "$COMPOSE_FILE" build --no-cache app-staging
    
    log "🎯 Arrêt des anciens containers..."
    docker-compose -f "$COMPOSE_FILE" down
    
    log "🚀 Démarrage des nouveaux containers..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    log "⏳ Attente du démarrage des services..."
    sleep 10
    
    # Vérifier la santé
    if docker exec attitudes_app_staging curl -f http://localhost:3000/api/v1/health > /dev/null 2>&1; then
        log "✅ Application démarrée avec succès"
    else
        log "❌ L'application ne répond pas"
        docker-compose -f "$COMPOSE_FILE" logs app-staging
        exit 1
    fi
}

# Migrations de base de données
run_migrations() {
    log "🔄 Exécution des migrations..."
    
    # Attendre que PostgreSQL soit prêt
    until docker exec attitudes_postgres_staging pg_isready -U postgres > /dev/null 2>&1; do
        log "⏳ En attente de PostgreSQL..."
        sleep 2
    done
    
    # Exécuter les migrations
    docker exec attitudes_app_staging npm run db:migrate || {
        log "❌ Échec des migrations"
        exit 1
    }
    
    log "✅ Migrations terminées"
}

# Tests de santé
health_checks() {
    log "🏥 Tests de santé..."
    
    # Test API
    if curl -f https://api-staging.attitudes.vip/api/v1/health > /dev/null 2>&1; then
        log "✅ API accessible"
    else
        log "⚠️  API non accessible publiquement"
    fi
    
    # Test Frontend
    if curl -f https://staging.attitudes.vip > /dev/null 2>&1; then
        log "✅ Frontend accessible"
    else
        log "⚠️  Frontend non accessible publiquement"
    fi
    
    # Test WebSocket
    if docker exec attitudes_app_staging node -e "require('socket.io-client')('http://localhost:3000').on('connect', () => process.exit(0))" > /dev/null 2>&1; then
        log "✅ WebSocket fonctionnel"
    else
        log "⚠️  WebSocket non fonctionnel"
    fi
}

# Nettoyage
cleanup() {
    log "🧹 Nettoyage..."
    
    # Supprimer les anciennes images
    docker image prune -f
    
    # Supprimer les anciens backups (garder 7 jours)
    find "$BACKUP_DIR" -name "*.gz" -mtime +7 -delete
    
    log "✅ Nettoyage terminé"
}

# Monitoring
setup_monitoring() {
    log "📊 Configuration du monitoring..."
    
    # Démarrer Prometheus et Grafana
    docker-compose -f docker-compose.monitoring.yml up -d prometheus-staging grafana-staging
    
    log "✅ Monitoring configuré"
    log "   - Grafana: https://monitoring-staging.attitudes.vip"
    log "   - Prometheus: https://monitoring-staging.attitudes.vip/prometheus"
}

# Main
main() {
    log "🚀 Début du déploiement staging"
    
    check_requirements
    backup_database
    deploy
    run_migrations
    health_checks
    setup_monitoring
    cleanup
    
    log "✅ Déploiement terminé avec succès!"
    log ""
    log "📌 URLs de staging:"
    log "   - Application: https://staging.attitudes.vip"
    log "   - API: https://api-staging.attitudes.vip"
    log "   - Monitoring: https://monitoring-staging.attitudes.vip"
    log ""
    log "📝 Logs disponibles dans: $LOG_FILE"
}

# Gestion des erreurs
trap 'log "❌ Erreur lors du déploiement"; exit 1' ERR

# Exécuter le déploiement
main "$@"