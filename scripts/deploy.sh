#!/bin/bash

# Script de déploiement Attitudes.vip
# Usage: ./scripts/deploy.sh [environment]

set -e

# Configuration
ENVIRONMENT=${1:-production}
PROJECT_NAME="attitudes-vip"
DOCKER_REGISTRY=${DOCKER_REGISTRY:-"attitudes-vip"}
VERSION=${VERSION:-$(git rev-parse --short HEAD)}

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction de logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Vérification des prérequis
check_prerequisites() {
    log "Vérification des prérequis..."
    
    # Vérifier Docker
    if ! command -v docker &> /dev/null; then
        error "Docker n'est pas installé"
        exit 1
    fi
    
    # Vérifier Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose n'est pas installé"
        exit 1
    fi
    
    # Vérifier les variables d'environnement
    if [ ! -f ".env" ]; then
        warning "Fichier .env non trouvé, création d'un template..."
        cp .env.example .env
    fi
    
    success "Prérequis vérifiés"
}

# Build des images Docker
build_images() {
    log "Construction des images Docker..."
    
    # Build de l'image UI
    docker build \
        --target production \
        -t ${DOCKER_REGISTRY}/ui:${VERSION} \
        -t ${DOCKER_REGISTRY}/ui:latest \
        -f Dockerfile .
    
    # Build de l'image Auth Service
    docker build \
        --target production \
        -t ${DOCKER_REGISTRY}/auth:${VERSION} \
        -t ${DOCKER_REGISTRY}/auth:latest \
        -f Dockerfile.auth .
    
    success "Images construites avec succès"
}

# Tests de sécurité
security_tests() {
    log "Exécution des tests de sécurité..."
    
    # Audit npm
    npm audit --audit-level high || warning "Vulnérabilités npm détectées"
    
    # Scan des images Docker
    if command -v trivy &> /dev/null; then
        trivy image ${DOCKER_REGISTRY}/ui:${VERSION} || warning "Vulnérabilités détectées dans l'image UI"
        trivy image ${DOCKER_REGISTRY}/auth:${VERSION} || warning "Vulnérabilités détectées dans l'image Auth"
    else
        warning "Trivy non installé, scan de sécurité ignoré"
    fi
    
    success "Tests de sécurité terminés"
}

# Déploiement
deploy() {
    log "Déploiement en environnement ${ENVIRONMENT}..."
    
    # Arrêter les services existants
    docker-compose down --remove-orphans
    
    # Nettoyer les images non utilisées
    docker image prune -f
    
    # Démarrer les services
    if [ "$ENVIRONMENT" = "production" ]; then
        docker-compose up -d --build
    else
        docker-compose -f docker-compose.yml -f docker-compose.${ENVIRONMENT}.yml up -d --build
    fi
    
    # Attendre que les services soient prêts
    log "Attente du démarrage des services..."
    sleep 30
    
    # Vérifier la santé des services
    check_health
    
    success "Déploiement terminé avec succès"
}

# Vérification de la santé des services
check_health() {
    log "Vérification de la santé des services..."
    
    # Vérifier UI
    if curl -f http://localhost:8080/ > /dev/null 2>&1; then
        success "Service UI opérationnel"
    else
        error "Service UI non accessible"
        exit 1
    fi
    
    # Vérifier Auth Service
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        success "Service Auth opérationnel"
    else
        error "Service Auth non accessible"
        exit 1
    fi
    
    # Vérifier Database
    if docker-compose exec -T database pg_isready -U postgres > /dev/null 2>&1; then
        success "Base de données opérationnelle"
    else
        error "Base de données non accessible"
        exit 1
    fi
    
    # Vérifier Redis
    if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
        success "Redis opérationnel"
    else
        error "Redis non accessible"
        exit 1
    fi
}

# Sauvegarde
backup() {
    log "Création d'une sauvegarde..."
    
    BACKUP_DIR="./backups"
    BACKUP_FILE="${BACKUP_DIR}/backup-$(date +%Y%m%d-%H%M%S).sql"
    
    mkdir -p ${BACKUP_DIR}
    
    docker-compose exec -T database pg_dump -U postgres attitudes_vip > ${BACKUP_FILE}
    
    if [ $? -eq 0 ]; then
        success "Sauvegarde créée: ${BACKUP_FILE}"
    else
        error "Échec de la sauvegarde"
        exit 1
    fi
}

# Rollback
rollback() {
    log "Rollback vers la version précédente..."
    
    # Récupérer la version précédente
    PREVIOUS_VERSION=$(docker images ${DOCKER_REGISTRY}/ui --format "table {{.Tag}}" | grep -v "latest" | head -2 | tail -1)
    
    if [ -z "$PREVIOUS_VERSION" ]; then
        error "Aucune version précédente trouvée"
        exit 1
    fi
    
    # Tagger les images précédentes comme latest
    docker tag ${DOCKER_REGISTRY}/ui:${PREVIOUS_VERSION} ${DOCKER_REGISTRY}/ui:latest
    docker tag ${DOCKER_REGISTRY}/auth:${PREVIOUS_VERSION} ${DOCKER_REGISTRY}/auth:latest
    
    # Redéployer
    deploy
    
    success "Rollback terminé vers la version ${PREVIOUS_VERSION}"
}

# Nettoyage
cleanup() {
    log "Nettoyage des ressources..."
    
    # Supprimer les images non utilisées
    docker image prune -f
    
    # Supprimer les volumes non utilisés
    docker volume prune -f
    
    # Supprimer les réseaux non utilisés
    docker network prune -f
    
    success "Nettoyage terminé"
}

# Affichage des informations
show_info() {
    log "Informations de déploiement:"
    echo "  Environnement: ${ENVIRONMENT}"
    echo "  Version: ${VERSION}"
    echo "  Registry: ${DOCKER_REGISTRY}"
    echo "  Projet: ${PROJECT_NAME}"
    echo ""
    echo "Services disponibles:"
    echo "  UI: http://localhost:8080"
    echo "  Auth: http://localhost:3000"
    echo "  Database: localhost:5432"
    echo "  Redis: localhost:6379"
    if [ "$ENVIRONMENT" = "production" ]; then
        echo "  Monitoring: http://localhost:9090 (avec --profile monitoring)"
    fi
}

# Menu principal
main() {
    case "${2:-deploy}" in
        "build")
            check_prerequisites
            build_images
            ;;
        "test")
            check_prerequisites
            build_images
            security_tests
            ;;
        "deploy")
            check_prerequisites
            build_images
            security_tests
            backup
            deploy
            cleanup
            ;;
        "rollback")
            rollback
            ;;
        "health")
            check_health
            ;;
        "backup")
            backup
            ;;
        "cleanup")
            cleanup
            ;;
        "info")
            show_info
            ;;
        *)
            echo "Usage: $0 [environment] [action]"
            echo ""
            echo "Environnements:"
            echo "  production (défaut)"
            echo "  staging"
            echo "  development"
            echo ""
            echo "Actions:"
            echo "  build     - Construire les images"
            echo "  test      - Tests de sécurité"
            echo "  deploy    - Déployer (défaut)"
            echo "  rollback  - Rollback vers version précédente"
            echo "  health    - Vérifier la santé des services"
            echo "  backup    - Créer une sauvegarde"
            echo "  cleanup   - Nettoyer les ressources"
            echo "  info      - Afficher les informations"
            exit 1
            ;;
    esac
    
    show_info
}

# Exécution du script
main "$@"
