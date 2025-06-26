#!/bin/bash

# Script de génération de rapport de déploiement pour Attitudes.vip
# Usage: ./scripts/generate-deployment-report.sh [commit-sha]

set -e

COMMIT_SHA=${1:-$(git rev-parse HEAD)}
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
REPORT_FILE="deployment-report-$(date +%Y%m%d-%H%M%S).md"

echo "📋 Generating deployment report for commit: $COMMIT_SHA"

# Fonction pour récupérer les informations du commit
get_commit_info() {
    echo "## 📝 Commit Information"
    echo ""
    echo "- **Commit SHA:** \`$COMMIT_SHA\`"
    echo "- **Author:** $(git log -1 --pretty=format:"%an" $COMMIT_SHA)"
    echo "- **Date:** $(git log -1 --pretty=format:"%ad" $COMMIT_SHA)"
    echo "- **Message:** $(git log -1 --pretty=format:"%s" $COMMIT_SHA)"
    echo ""
}

# Fonction pour récupérer les informations de l'environnement
get_environment_info() {
    echo "## 🌍 Environment Information"
    echo ""
    echo "- **Deployment Time:** $TIMESTAMP"
    echo "- **Environment:** $ENVIRONMENT"
    echo "- **Kubernetes Version:** $(kubectl version --short 2>/dev/null | grep Server | cut -d' ' -f3 || echo "N/A")"
    echo "- **Node Count:** $(kubectl get nodes --no-headers | wc -l)"
    echo "- **Namespace:** $NAMESPACE"
    echo ""
}

# Fonction pour récupérer les informations des pods
get_pod_info() {
    echo "## 🔧 Pod Information"
    echo ""
    
    local pods=$(kubectl get pods -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || echo "")
    
    if [ -n "$pods" ]; then
        echo "| Pod Name | Status | Ready | Restarts | Age |"
        echo "|----------|--------|-------|----------|-----|"
        
        for pod in $pods; do
            local status=$(kubectl get pod $pod -n $NAMESPACE -o jsonpath='{.status.phase}' 2>/dev/null || echo "Unknown")
            local ready=$(kubectl get pod $pod -n $NAMESPACE -o jsonpath='{.status.containerStatuses[0].ready}' 2>/dev/null || echo "Unknown")
            local restarts=$(kubectl get pod $pod -n $NAMESPACE -o jsonpath='{.status.containerStatuses[0].restartCount}' 2>/dev/null || echo "0")
            local age=$(kubectl get pod $pod -n $NAMESPACE -o jsonpath='{.metadata.creationTimestamp}' 2>/dev/null || echo "Unknown")
            
            echo "| $pod | $status | $ready | $restarts | $age |"
        done
    else
        echo "No pods found in namespace $NAMESPACE"
    fi
    echo ""
}

# Fonction pour récupérer les informations des services
get_service_info() {
    echo "## 🌐 Service Information"
    echo ""
    
    local services=$(kubectl get svc -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || echo "")
    
    if [ -n "$services" ]; then
        echo "| Service Name | Type | Cluster IP | External IP | Ports |"
        echo "|--------------|------|------------|-------------|-------|"
        
        for service in $services; do
            local type=$(kubectl get svc $service -n $NAMESPACE -o jsonpath='{.spec.type}' 2>/dev/null || echo "Unknown")
            local cluster_ip=$(kubectl get svc $service -n $NAMESPACE -o jsonpath='{.spec.clusterIP}' 2>/dev/null || echo "None")
            local external_ip=$(kubectl get svc $service -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "None")
            local ports=$(kubectl get svc $service -n $NAMESPACE -o jsonpath='{.spec.ports[*].port}' 2>/dev/null || echo "Unknown")
            
            echo "| $service | $type | $cluster_ip | $external_ip | $ports |"
        done
    else
        echo "No services found in namespace $NAMESPACE"
    fi
    echo ""
}

# Fonction pour récupérer les métriques de performance
get_performance_metrics() {
    echo "## ⚡ Performance Metrics"
    echo ""
    
    # Vérifier si Prometheus est accessible
    if curl -f -s "http://localhost:9090/api/v1/query?query=up" >/dev/null 2>&1; then
        local response_time=$(curl -s "http://localhost:9090/api/v1/query?query=histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))" | jq -r '.data.result[0].value[1]' 2>/dev/null || echo "N/A")
        local request_rate=$(curl -s "http://localhost:9090/api/v1/query?query=sum(rate(http_requests_total[5m]))" | jq -r '.data.result[0].value[1]' 2>/dev/null || echo "N/A")
        local error_rate=$(curl -s "http://localhost:9090/api/v1/query?query=sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m]))" | jq -r '.data.result[0].value[1]' 2>/dev/null || echo "N/A")
        
        echo "- **95th Percentile Response Time:** ${response_time}s"
        echo "- **Request Rate:** ${request_rate} req/s"
        echo "- **Error Rate:** $(echo "$error_rate * 100" | bc -l 2>/dev/null || echo "N/A")%"
    else
        echo "Prometheus metrics not available"
    fi
    echo ""
}

# Fonction pour récupérer les informations de santé
get_health_status() {
    echo "## 🏥 Health Status"
    echo ""
    
    local healthy_pods=0
    local total_pods=0
    
    local pods=$(kubectl get pods -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || echo "")
    
    for pod in $pods; do
        ((total_pods++))
        local status=$(kubectl get pod $pod -n $NAMESPACE -o jsonpath='{.status.phase}' 2>/dev/null || echo "Unknown")
        local ready=$(kubectl get pod $pod -n $NAMESPACE -o jsonpath='{.status.containerStatuses[0].ready}' 2>/dev/null || echo "false")
        
        if [ "$status" = "Running" ] && [ "$ready" = "true" ]; then
            ((healthy_pods++))
        fi
    done
    
    local health_percentage=0
    if [ $total_pods -gt 0 ]; then
        health_percentage=$(( (healthy_pods * 100) / total_pods ))
    fi
    
    echo "- **Healthy Pods:** $healthy_pods/$total_pods"
    echo "- **Health Percentage:** ${health_percentage}%"
    
    if [ $health_percentage -eq 100 ]; then
        echo "- **Status:** ✅ Healthy"
    elif [ $health_percentage -ge 80 ]; then
        echo "- **Status:** ⚠️  Degraded"
    else
        echo "- **Status:** ❌ Unhealthy"
    fi
    echo ""
}

# Fonction pour récupérer les logs récents
get_recent_logs() {
    echo "## 📋 Recent Logs"
    echo ""
    
    local app_pod=$(kubectl get pods -n $NAMESPACE -l app=attitudes-vip-ui -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    
    if [ -n "$app_pod" ]; then
        echo "### Application Logs (last 10 lines)"
        echo '```'
        kubectl logs --tail=10 $app_pod -n $NAMESPACE 2>/dev/null || echo "No logs available"
        echo '```'
        echo ""
        
        echo "### Error Logs (last 5 lines)"
        echo '```'
        kubectl logs --tail=50 $app_pod -n $NAMESPACE 2>/dev/null | grep -i "error\|exception\|fatal" | tail -5 || echo "No errors found"
        echo '```'
    else
        echo "Application pod not found"
    fi
    echo ""
}

# Fonction pour récupérer les informations de configuration
get_config_info() {
    echo "## ⚙️ Configuration Information"
    echo ""
    
    echo "### Environment Variables"
    echo '```'
    kubectl get configmap -n $NAMESPACE -o yaml 2>/dev/null | grep -A 10 "data:" || echo "No configmaps found"
    echo '```'
    echo ""
    
    echo "### Secrets (names only)"
    echo '```'
    kubectl get secrets -n $NAMESPACE --no-headers 2>/dev/null | awk '{print $1}' || echo "No secrets found"
    echo '```'
    echo ""
}

# Fonction pour récupérer les informations de ressources
get_resource_info() {
    echo "## 💾 Resource Usage"
    echo ""
    
    echo "### Pod Resource Usage"
    echo '```'
    kubectl top pods -n $NAMESPACE 2>/dev/null || echo "Metrics server not available"
    echo '```'
    echo ""
    
    echo "### Node Resource Usage"
    echo '```'
    kubectl top nodes 2>/dev/null || echo "Metrics server not available"
    echo '```'
    echo ""
}

# Fonction pour générer le rapport complet
generate_report() {
    cat > $REPORT_FILE << EOF
# 🚀 Attitudes.vip Deployment Report

**Generated:** $TIMESTAMP  
**Commit:** $COMMIT_SHA  
**Environment:** $ENVIRONMENT  

$(get_commit_info)
$(get_environment_info)
$(get_pod_info)
$(get_service_info)
$(get_performance_metrics)
$(get_health_status)
$(get_config_info)
$(get_resource_info)
$(get_recent_logs)

## 📊 Summary

- **Deployment Status:** $(if [ $health_percentage -eq 100 ]; then echo "✅ Successful"; else echo "⚠️  Issues detected"; fi)
- **Health Score:** ${health_percentage}%
- **Pods Running:** $healthy_pods/$total_pods

## 🔗 Useful Commands

\`\`\`bash
# Check pod status
kubectl get pods -n $NAMESPACE

# View logs
kubectl logs -f deployment/attitudes-vip-ui -n $NAMESPACE

# Check service status
kubectl get svc -n $NAMESPACE

# Monitor resources
kubectl top pods -n $NAMESPACE
\`\`\`

---
*Report generated automatically by Attitudes.vip CI/CD pipeline*
EOF

    echo "📄 Deployment report generated: $REPORT_FILE"
}

# Configuration de l'environnement
ENVIRONMENT=${ENVIRONMENT:-production}
NAMESPACE="attitudes-vip-$ENVIRONMENT"

# Variables pour le rapport
healthy_pods=0
total_pods=0

# Génération du rapport
generate_report

echo "✅ Deployment report completed successfully!" 