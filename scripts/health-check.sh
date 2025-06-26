#!/bin/bash

# Script de vérification de santé pour Attitudes.vip
# Usage: ./scripts/health-check.sh [environment]

set -e

ENVIRONMENT=${1:-production}
TIMEOUT=10
RETRIES=3

echo "🏥 Running health checks for $ENVIRONMENT environment..."

# Configuration selon l'environnement
case $ENVIRONMENT in
  staging)
    BASE_URL="https://staging.attitudes.vip"
    NAMESPACE="attitudes-vip-staging"
    ;;
  production)
    BASE_URL="https://attitudes.vip"
    NAMESPACE="attitudes-vip"
    ;;
  *)
    echo "❌ Unknown environment: $ENVIRONMENT"
    exit 1
    ;;
esac

# Fonction pour vérifier un endpoint
check_endpoint() {
    local endpoint=$1
    local description=${2:-"$endpoint"}
    
    echo "🔍 Checking $description..."
    
    for i in $(seq 1 $RETRIES); do
        if curl -f -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$BASE_URL$endpoint" | grep -q "200"; then
            echo "✅ $description - Healthy"
            return 0
        else
            echo "⚠️  Attempt $i failed for $description"
            if [ $i -eq $RETRIES ]; then
                echo "❌ $description - Unhealthy after $RETRIES attempts"
                return 1
            fi
            sleep 2
        fi
    done
}

# Fonction pour vérifier les pods Kubernetes
check_k8s_pods() {
    echo "🔧 Checking Kubernetes pods..."
    
    local pods=$(kubectl get pods -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}')
    local unhealthy_pods=0
    
    for pod in $pods; do
        local status=$(kubectl get pod $pod -n $NAMESPACE -o jsonpath='{.status.phase}')
        local ready=$(kubectl get pod $pod -n $NAMESPACE -o jsonpath='{.status.containerStatuses[0].ready}')
        
        if [ "$status" = "Running" ] && [ "$ready" = "true" ]; then
            echo "✅ Pod $pod - Running and Ready"
        else
            echo "❌ Pod $pod - Status: $status, Ready: $ready"
            ((unhealthy_pods++))
        fi
    done
    
    if [ $unhealthy_pods -gt 0 ]; then
        echo "⚠️  $unhealthy_pods unhealthy pod(s) found"
        return 1
    fi
    
    return 0
}

# Fonction pour vérifier les services
check_k8s_services() {
    echo "🌐 Checking Kubernetes services..."
    
    local services=$(kubectl get svc -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}')
    local unhealthy_services=0
    
    for service in $services; do
        local endpoints=$(kubectl get endpoints $service -n $NAMESPACE -o jsonpath='{.subsets[0].addresses[*].ip}' 2>/dev/null || echo "")
        
        if [ -n "$endpoints" ]; then
            echo "✅ Service $service - Has endpoints"
        else
            echo "❌ Service $service - No endpoints"
            ((unhealthy_services++))
        fi
    done
    
    if [ $unhealthy_services -gt 0 ]; then
        echo "⚠️  $unhealthy_services unhealthy service(s) found"
        return 1
    fi
    
    return 0
}

# Fonction pour vérifier la base de données
check_database() {
    echo "🗄️  Checking database connectivity..."
    
    # Vérifier si PostgreSQL est accessible
    local db_pod=$(kubectl get pods -n $NAMESPACE -l app=postgresql -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    
    if [ -n "$db_pod" ]; then
        if kubectl exec $db_pod -n $NAMESPACE -- pg_isready -U postgres >/dev/null 2>&1; then
            echo "✅ Database - PostgreSQL is ready"
        else
            echo "❌ Database - PostgreSQL is not ready"
            return 1
        fi
    else
        echo "⚠️  Database - PostgreSQL pod not found"
        return 1
    fi
    
    return 0
}

# Fonction pour vérifier Redis
check_redis() {
    echo "⚡ Checking Redis connectivity..."
    
    local redis_pod=$(kubectl get pods -n $NAMESPACE -l app=redis -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    
    if [ -n "$redis_pod" ]; then
        if kubectl exec $redis_pod -n $NAMESPACE -- redis-cli ping >/dev/null 2>&1; then
            echo "✅ Redis - PING successful"
        else
            echo "❌ Redis - PING failed"
            return 1
        fi
    else
        echo "⚠️  Redis - Redis pod not found"
        return 1
    fi
    
    return 0
}

# Fonction pour vérifier les métriques
check_metrics() {
    echo "📊 Checking application metrics..."
    
    # Vérifier les métriques Prometheus
    local prometheus_url="http://localhost:9090"
    
    if curl -f -s "$prometheus_url/api/v1/query?query=up" >/dev/null 2>&1; then
        echo "✅ Prometheus - Metrics endpoint accessible"
        
        # Vérifier les métriques spécifiques à l'application
        local http_requests=$(curl -s "$prometheus_url/api/v1/query?query=http_requests_total" | jq -r '.data.result[0].value[1]' 2>/dev/null || echo "0")
        echo "📈 HTTP Requests: $http_requests"
        
        local error_rate=$(curl -s "$prometheus_url/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}[5m])" | jq -r '.data.result[0].value[1]' 2>/dev/null || echo "0")
        echo "🚨 Error Rate: $error_rate"
        
    else
        echo "⚠️  Prometheus - Metrics endpoint not accessible"
        return 1
    fi
    
    return 0
}

# Fonction pour vérifier les logs récents
check_logs() {
    echo "📋 Checking recent logs..."
    
    local app_pod=$(kubectl get pods -n $NAMESPACE -l app=attitudes-vip-ui -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    
    if [ -n "$app_pod" ]; then
        local error_count=$(kubectl logs --tail=100 $app_pod -n $NAMESPACE 2>/dev/null | grep -c "ERROR\|FATAL\|Exception" || echo "0")
        
        if [ $error_count -eq 0 ]; then
            echo "✅ Logs - No recent errors"
        else
            echo "⚠️  Logs - $error_count recent error(s) found"
            kubectl logs --tail=10 $app_pod -n $NAMESPACE | grep "ERROR\|FATAL\|Exception" || true
        fi
    else
        echo "⚠️  Logs - Application pod not found"
        return 1
    fi
    
    return 0
}

# Fonction pour vérifier la performance
check_performance() {
    echo "⚡ Checking performance metrics..."
    
    # Test de temps de réponse
    local start_time=$(date +%s%N)
    if curl -f -s -o /dev/null "$BASE_URL/health" >/dev/null 2>&1; then
        local end_time=$(date +%s%N)
        local response_time=$(( (end_time - start_time) / 1000000 ))
        
        echo "📈 Response time: ${response_time}ms"
        
        if [ $response_time -gt 1000 ]; then
            echo "⚠️  Warning: Response time > 1s"
            return 1
        else
            echo "✅ Response time acceptable"
        fi
    else
        echo "❌ Performance test failed"
        return 1
    fi
    
    return 0
}

# Fonction principale
main() {
    echo "🎯 Starting health checks for $ENVIRONMENT..."
    echo "🌐 Base URL: $BASE_URL"
    echo "🏷️  Namespace: $NAMESPACE"
    echo "⏱️  Timeout: ${TIMEOUT}s"
    echo "🔄 Retries: $RETRIES"
    echo ""
    
    local failed_checks=0
    
    # Vérifications de base
    check_endpoint "/health" "Health endpoint" || ((failed_checks++))
    check_endpoint "/" "Main application" || ((failed_checks++))
    
    # Vérifications Kubernetes
    check_k8s_pods || ((failed_checks++))
    check_k8s_services || ((failed_checks++))
    
    # Vérifications des services
    check_database || ((failed_checks++))
    check_redis || ((failed_checks++))
    
    # Vérifications des métriques
    check_metrics || ((failed_checks++))
    
    # Vérifications des logs
    check_logs || ((failed_checks++))
    
    # Vérifications de performance
    check_performance || ((failed_checks++))
    
    echo ""
    echo "📊 Health check summary:"
    if [ $failed_checks -eq 0 ]; then
        echo "✅ All health checks passed!"
        echo "🎉 Application is healthy"
        exit 0
    else
        echo "❌ $failed_checks check(s) failed"
        echo "🚨 Application may have issues"
        exit 1
    fi
}

# Exécution du script
main "$@" 