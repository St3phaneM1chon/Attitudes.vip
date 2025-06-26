#!/bin/bash

# Script de tests de fumée pour Attitudes.vip
# Usage: ./scripts/smoke-tests.sh [environment]

set -e

ENVIRONMENT=${1:-staging}
TIMEOUT=30
RETRIES=3

echo "🚀 Running smoke tests for $ENVIRONMENT environment..."

# Configuration selon l'environnement
case $ENVIRONMENT in
  staging)
    BASE_URL="https://staging.attitudes.vip"
    ;;
  production)
    BASE_URL="https://attitudes.vip"
    ;;
  *)
    echo "❌ Unknown environment: $ENVIRONMENT"
    exit 1
    ;;
esac

# Fonction pour tester un endpoint
test_endpoint() {
    local endpoint=$1
    local expected_status=${2:-200}
    local description=${3:-"$endpoint"}
    
    echo "🔍 Testing $description..."
    
    for i in $(seq 1 $RETRIES); do
        if curl -f -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$BASE_URL$endpoint" | grep -q "$expected_status"; then
            echo "✅ $description - OK"
            return 0
        else
            echo "⚠️  Attempt $i failed for $description"
            if [ $i -eq $RETRIES ]; then
                echo "❌ $description - FAILED after $RETRIES attempts"
                return 1
            fi
            sleep 5
        fi
    done
}

# Fonction pour tester l'authentification
test_auth() {
    echo "🔐 Testing authentication endpoints..."
    
    # Test de la page de connexion
    test_endpoint "/auth/login" "200" "Login page"
    
    # Test de l'API d'authentification
    test_endpoint "/auth/verify" "401" "Auth verification (unauthorized)"
    
    # Test de l'endpoint de santé de l'API
    test_endpoint "/health" "200" "API health check"
}

# Fonction pour tester les dashboards
test_dashboards() {
    echo "📊 Testing dashboard endpoints..."
    
    # Test de la page principale
    test_endpoint "/" "200" "Main page"
    
    # Test des dashboards (devraient rediriger vers login si non authentifié)
    test_endpoint "/dashboard/customer" "302" "Customer dashboard redirect"
    test_endpoint "/dashboard/admin" "302" "Admin dashboard redirect"
    test_endpoint "/dashboard/cio" "302" "CIO dashboard redirect"
}

# Fonction pour tester les performances
test_performance() {
    echo "⚡ Testing performance..."
    
    # Test de temps de réponse
    local start_time=$(date +%s%N)
    curl -f -s -o /dev/null "$BASE_URL/"
    local end_time=$(date +%s%N)
    local response_time=$(( (end_time - start_time) / 1000000 ))
    
    echo "📈 Response time: ${response_time}ms"
    
    if [ $response_time -gt 2000 ]; then
        echo "⚠️  Warning: Response time > 2s"
    else
        echo "✅ Response time acceptable"
    fi
}

# Fonction pour tester la sécurité
test_security() {
    echo "🔒 Testing security headers..."
    
    local headers=$(curl -f -s -I "$BASE_URL/" | grep -E "(X-Frame-Options|X-Content-Type-Options|X-XSS-Protection|Strict-Transport-Security)")
    
    if echo "$headers" | grep -q "X-Frame-Options"; then
        echo "✅ X-Frame-Options header present"
    else
        echo "⚠️  X-Frame-Options header missing"
    fi
    
    if echo "$headers" | grep -q "X-Content-Type-Options"; then
        echo "✅ X-Content-Type-Options header present"
    else
        echo "⚠️  X-Content-Type-Options header missing"
    fi
}

# Fonction pour tester les ressources statiques
test_static_assets() {
    echo "📁 Testing static assets..."
    
    test_endpoint "/styles/components.css" "200" "CSS components"
    test_endpoint "/favicon.ico" "200" "Favicon"
}

# Fonction pour vérifier les logs d'erreur
check_error_logs() {
    echo "📋 Checking for recent errors..."
    
    # Vérifier les logs Kubernetes
    if kubectl logs --tail=50 deployment/attitudes-vip-ui -n attitudes-vip-$ENVIRONMENT 2>/dev/null | grep -i "error\|exception\|fatal" > /dev/null; then
        echo "⚠️  Recent errors found in logs"
        kubectl logs --tail=20 deployment/attitudes-vip-ui -n attitudes-vip-$ENVIRONMENT | grep -i "error\|exception\|fatal" || true
    else
        echo "✅ No recent errors in logs"
    fi
}

# Fonction principale
main() {
    echo "🎯 Starting smoke tests for $ENVIRONMENT..."
    echo "🌐 Base URL: $BASE_URL"
    echo "⏱️  Timeout: ${TIMEOUT}s"
    echo "🔄 Retries: $RETRIES"
    echo ""
    
    local failed_tests=0
    
    # Tests de base
    test_endpoint "/" "200" "Main application" || ((failed_tests++))
    test_endpoint "/health" "200" "Health check" || ((failed_tests++))
    
    # Tests d'authentification
    test_auth || ((failed_tests++))
    
    # Tests des dashboards
    test_dashboards || ((failed_tests++))
    
    # Tests des ressources statiques
    test_static_assets || ((failed_tests++))
    
    # Tests de sécurité
    test_security || ((failed_tests++))
    
    # Tests de performance
    test_performance || ((failed_tests++))
    
    # Vérification des logs
    check_error_logs || ((failed_tests++))
    
    echo ""
    echo "📊 Smoke test summary:"
    if [ $failed_tests -eq 0 ]; then
        echo "✅ All smoke tests passed!"
        exit 0
    else
        echo "❌ $failed_tests test(s) failed"
        exit 1
    fi
}

# Exécution du script
main "$@" 