#!/bin/bash

# Script de déploiement Kubernetes pour Attitudes.vip
# Usage: ./scripts/deploy-k8s.sh [environment] [action]

set -e

# Configuration
ENVIRONMENT=${1:-production}
ACTION=${2:-deploy}
PROJECT_NAME="attitudes-vip"
NAMESPACE="attitudes-vip"
STAGING_NAMESPACE="attitudes-vip-staging"
MONITORING_NAMESPACE="attitudes-vip-monitoring"
REGISTRY=${DOCKER_REGISTRY:-"attitudes-vip"}
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
    log "Vérification des prérequis Kubernetes..."
    
    # Vérifier kubectl
    if ! command -v kubectl &> /dev/null; then
        error "kubectl n'est pas installé"
        exit 1
    fi
    
    # Vérifier la connexion au cluster
    if ! kubectl cluster-info &> /dev/null; then
        error "Impossible de se connecter au cluster Kubernetes"
        exit 1
    fi
    
    # Vérifier helm (optionnel)
    if ! command -v helm &> /dev/null; then
        warning "Helm n'est pas installé, certaines fonctionnalités seront limitées"
    fi
    
    success "Prérequis Kubernetes vérifiés"
}

# Création des namespaces
create_namespaces() {
    log "Création des namespaces..."
    
    kubectl apply -f ops/kubernetes/namespace.yaml
    
    success "Namespaces créés"
}

# Déploiement des ConfigMaps et Secrets
deploy_configs() {
    log "Déploiement des ConfigMaps et Secrets..."
    
    kubectl apply -f ops/kubernetes/configmaps.yaml
    kubectl apply -f ops/kubernetes/secrets.yaml
    
    success "ConfigMaps et Secrets déployés"
}

# Déploiement des Persistent Volumes
deploy_storage() {
    log "Déploiement du stockage..."
    
    # Créer les PVCs
    kubectl apply -f ops/kubernetes/storage.yaml
    
    success "Stockage déployé"
}

# Déploiement des services
deploy_services() {
    log "Déploiement des services..."
    
    kubectl apply -f ops/kubernetes/services.yaml
    
    success "Services déployés"
}

# Déploiement des deployments
deploy_applications() {
    log "Déploiement des applications..."
    
    # Mettre à jour les images avec la version actuelle
    sed -i.bak "s|image: ${REGISTRY}/ui:latest|image: ${REGISTRY}/ui:${VERSION}|g" ops/kubernetes/deployments.yaml
    sed -i.bak "s|image: ${REGISTRY}/auth:latest|image: ${REGISTRY}/auth:${VERSION}|g" ops/kubernetes/deployments.yaml
    
    kubectl apply -f ops/kubernetes/deployments.yaml
    
    # Restaurer les fichiers
    mv ops/kubernetes/deployments.yaml.bak ops/kubernetes/deployments.yaml
    
    success "Applications déployées"
}

# Déploiement de l'Ingress
deploy_ingress() {
    log "Déploiement de l'Ingress..."
    
    kubectl apply -f ops/kubernetes/ingress.yaml
    
    success "Ingress déployé"
}

# Déploiement des HPA
deploy_hpa() {
    log "Déploiement des HPA..."
    
    kubectl apply -f ops/kubernetes/hpa.yaml
    
    success "HPA déployés"
}

# Déploiement du monitoring
deploy_monitoring() {
    log "Déploiement du monitoring..."
    
    # Prometheus
    kubectl apply -f ops/kubernetes/monitoring/prometheus.yaml
    kubectl apply -f ops/kubernetes/monitoring/alerts.yaml
    
    # Grafana
    kubectl apply -f ops/kubernetes/monitoring/grafana-dashboards.yaml
    
    # Déployer Prometheus et Grafana (si helm est disponible)
    if command -v helm &> /dev/null; then
        log "Installation de Prometheus avec Helm..."
        helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
        helm repo update
        helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
            --namespace ${MONITORING_NAMESPACE} \
            --create-namespace \
            --set prometheus.prometheusSpec.retention=7d \
            --set grafana.adminPassword=attitudes-vip-admin
    else
        warning "Helm non disponible, déploiement manuel du monitoring requis"
    fi
    
    success "Monitoring déployé"
}

# Déploiement de la sécurité
deploy_security() {
    log "Déploiement des politiques de sécurité..."
    
    kubectl apply -f ops/kubernetes/security/network-policies.yaml
    
    success "Politiques de sécurité déployées"
}

# Vérification de la santé
check_health() {
    log "Vérification de la santé des services..."
    
    # Attendre que les pods soient prêts
    log "Attente du démarrage des pods..."
    kubectl wait --for=condition=ready pod -l app=attitudes-vip -n ${NAMESPACE} --timeout=300s
    
    # Vérifier les services
    if kubectl get svc attitudes-vip-ui -n ${NAMESPACE} &> /dev/null; then
        success "Service UI opérationnel"
    else
        error "Service UI non accessible"
        exit 1
    fi
    
    if kubectl get svc attitudes-vip-auth -n ${NAMESPACE} &> /dev/null; then
        success "Service Auth opérationnel"
    else
        error "Service Auth non accessible"
        exit 1
    fi
    
    # Vérifier les endpoints
    kubectl get endpoints -n ${NAMESPACE}
    
    success "Tous les services sont opérationnels"
}

# Rollback
rollback() {
    log "Rollback vers la version précédente..."
    
    # Récupérer la version précédente
    PREVIOUS_VERSION=$(kubectl get deployment attitudes-vip-ui -n ${NAMESPACE} -o jsonpath='{.spec.template.spec.containers[0].image}' | cut -d: -f2)
    
    if [ -z "$PREVIOUS_VERSION" ]; then
        error "Aucune version précédente trouvée"
        exit 1
    fi
    
    # Rollback des deployments
    kubectl rollout undo deployment/attitudes-vip-ui -n ${NAMESPACE}
    kubectl rollout undo deployment/attitudes-vip-auth -n ${NAMESPACE}
    
    # Attendre la fin du rollback
    kubectl rollout status deployment/attitudes-vip-ui -n ${NAMESPACE}
    kubectl rollout status deployment/attitudes-vip-auth -n ${NAMESPACE}
    
    success "Rollback terminé vers la version ${PREVIOUS_VERSION}"
}

# Nettoyage
cleanup() {
    log "Nettoyage des ressources..."
    
    # Supprimer les ressources non utilisées
    kubectl delete pods --field-selector=status.phase=Succeeded -n ${NAMESPACE} 2>/dev/null || true
    kubectl delete pods --field-selector=status.phase=Failed -n ${NAMESPACE} 2>/dev/null || true
    
    success "Nettoyage terminé"
}

# Affichage des informations
show_info() {
    log "Informations de déploiement Kubernetes:"
    echo "  Environnement: ${ENVIRONMENT}"
    echo "  Version: ${VERSION}"
    echo "  Registry: ${REGISTRY}"
    echo "  Namespace: ${NAMESPACE}"
    echo ""
    echo "Services disponibles:"
    echo "  UI: https://attitudes.vip"
    echo "  API: https://api.attitudes.vip"
    echo "  Staging: https://staging.attitudes.vip"
    echo ""
    echo "Monitoring:"
    echo "  Grafana: http://localhost:3000 (port-forward)"
    echo "  Prometheus: http://localhost:9090 (port-forward)"
    echo ""
    echo "Commandes utiles:"
    echo "  kubectl get pods -n ${NAMESPACE}"
    echo "  kubectl logs -f deployment/attitudes-vip-ui -n ${NAMESPACE}"
    echo "  kubectl port-forward svc/prometheus 9090:9090 -n ${MONITORING_NAMESPACE}"
}

# Menu principal
main() {
    case "${ACTION}" in
        "deploy")
            check_prerequisites
            create_namespaces
            deploy_configs
            deploy_storage
            deploy_services
            deploy_applications
            deploy_ingress
            deploy_hpa
            deploy_monitoring
            deploy_security
            check_health
            cleanup
            ;;
        "rollback")
            rollback
            ;;
        "health")
            check_health
            ;;
        "monitoring")
            deploy_monitoring
            ;;
        "security")
            deploy_security
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
            echo ""
            echo "Actions:"
            echo "  deploy     - Déployer complètement (défaut)"
            echo "  rollback   - Rollback vers version précédente"
            echo "  health     - Vérifier la santé des services"
            echo "  monitoring - Déployer le monitoring"
            echo "  security   - Déployer les politiques de sécurité"
            echo "  cleanup    - Nettoyer les ressources"
            echo "  info       - Afficher les informations"
            exit 1
            ;;
    esac
    
    show_info
}

# Exécution du script
main "$@" 