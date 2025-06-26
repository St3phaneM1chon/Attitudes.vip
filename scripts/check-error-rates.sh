#!/bin/bash

# Script de vérification des taux d'erreur pour Attitudes.vip
# Usage: ./scripts/check-error-rates.sh

set -e

echo "🚨 Checking error rates for Attitudes.vip..."

# Configuration
PROMETHEUS_URL="http://localhost:9090"
ERROR_THRESHOLD=0.05  # 5% de taux d'erreur maximum
TIMEOUT=30

# Fonction pour interroger Prometheus
query_prometheus() {
    local query="$1"
    local result=$(curl -s --max-time $TIMEOUT "$PROMETHEUS_URL/api/v1/query?query=$query" | jq -r '.data.result[0].value[1]' 2>/dev/null || echo "0")
    echo "$result"
}

# Fonction pour calculer le taux d'erreur
calculate_error_rate() {
    local total_requests=$(query_prometheus "sum(rate(http_requests_total[5m]))")
    local error_requests=$(query_prometheus "sum(rate(http_requests_total{status=~\"5..\"}[5m]))")
    
    if [ "$total_requests" = "0" ] || [ "$total_requests" = "null" ]; then
        echo "0"
    else
        local error_rate=$(echo "scale=4; $error_requests / $total_requests" | bc -l 2>/dev/null || echo "0")
        echo "$error_rate"
    fi
}

# Fonction pour vérifier les métriques de base
check_basic_metrics() {
    echo "📊 Checking basic metrics..."
    
    local up_status=$(query_prometheus "up{job=\"attitudes-vip\"}")
    if [ "$up_status" = "1" ]; then
        echo "✅ Application is up"
    else
        echo "❌ Application is down"
        return 1
    fi
    
    local total_requests=$(query_prometheus "sum(http_requests_total)")
    echo "📈 Total requests: $total_requests"
    
    local active_connections=$(query_prometheus "nodejs_active_handles_total")
    echo "🔗 Active connections: $active_connections"
}

# Fonction pour vérifier les taux d'erreur HTTP
check_http_error_rates() {
    echo "🌐 Checking HTTP error rates..."
    
    local error_rate=$(calculate_error_rate)
    echo "🚨 Current error rate: $(echo "$error_rate * 100" | bc -l)%"
    
    if (( $(echo "$error_rate > $ERROR_THRESHOLD" | bc -l) )); then
        echo "❌ Error rate exceeds threshold of $(echo "$ERROR_THRESHOLD * 100" | bc -l)%"
        return 1
    else
        echo "✅ Error rate is acceptable"
    fi
    
    # Vérifier les erreurs par code de statut
    local error_500=$(query_prometheus "sum(rate(http_requests_total{status=\"500\"}[5m]))")
    local error_502=$(query_prometheus "sum(rate(http_requests_total{status=\"502\"}[5m]))")
    local error_503=$(query_prometheus "sum(rate(http_requests_total{status=\"503\"}[5m]))")
    local error_504=$(query_prometheus "sum(rate(http_requests_total{status=\"504\"}[5m]))")
    
    echo "📋 Error breakdown:"
    echo "   500 errors: $error_500 req/s"
    echo "   502 errors: $error_502 req/s"
    echo "   503 errors: $error_503 req/s"
    echo "   504 errors: $error_504 req/s"
}

# Fonction pour vérifier les erreurs d'application
check_application_errors() {
    echo "🔍 Checking application errors..."
    
    local uncaught_exceptions=$(query_prometheus "nodejs_uncaught_exceptions_total")
    local unhandled_rejections=$(query_prometheus "nodejs_unhandled_rejections_total")
    
    echo "📋 Application error metrics:"
    echo "   Uncaught exceptions: $uncaught_exceptions"
    echo "   Unhandled rejections: $unhandled_rejections"
    
    if [ "$uncaught_exceptions" != "0" ] || [ "$unhandled_rejections" != "0" ]; then
        echo "⚠️  Application errors detected"
        return 1
    else
        echo "✅ No application errors"
    fi
}

# Fonction pour vérifier les erreurs de base de données
check_database_errors() {
    echo "🗄️  Checking database errors..."
    
    local db_connection_errors=$(query_prometheus "pg_stat_database_deadlocks")
    local db_query_errors=$(query_prometheus "pg_stat_database_tup_deleted")
    
    echo "📋 Database metrics:"
    echo "   Deadlocks: $db_connection_errors"
    echo "   Deleted tuples: $db_query_errors"
    
    if [ "$db_connection_errors" != "0" ]; then
        echo "⚠️  Database connection issues detected"
        return 1
    else
        echo "✅ Database is healthy"
    fi
}

# Fonction pour vérifier les erreurs Redis
check_redis_errors() {
    echo "⚡ Checking Redis errors..."
    
    local redis_connection_errors=$(query_prometheus "redis_connected_clients")
    local redis_memory_usage=$(query_prometheus "redis_memory_used_bytes")
    
    echo "📋 Redis metrics:"
    echo "   Connected clients: $redis_connection_errors"
    echo "   Memory usage: $redis_memory_usage bytes"
    
    if [ "$redis_connection_errors" = "0" ]; then
        echo "⚠️  No Redis connections"
        return 1
    else
        echo "✅ Redis is healthy"
    fi
}

# Fonction pour vérifier les erreurs de performance
check_performance_errors() {
    echo "⚡ Checking performance issues..."
    
    local response_time_95th=$(query_prometheus "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))")
    local response_time_99th=$(query_prometheus "histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))")
    
    echo "📋 Performance metrics:"
    echo "   95th percentile response time: ${response_time_95th}s"
    echo "   99th percentile response time: ${response_time_99th}s"
    
    if (( $(echo "$response_time_95th > 2" | bc -l) )); then
        echo "⚠️  High response times detected"
        return 1
    else
        echo "✅ Response times are acceptable"
    fi
}

# Fonction pour générer un rapport d'erreurs
generate_error_report() {
    echo "📋 Generating error report..."
    
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local error_rate=$(calculate_error_rate)
    local total_requests=$(query_prometheus "sum(rate(http_requests_total[5m]))")
    local error_requests=$(query_prometheus "sum(rate(http_requests_total{status=~\"5..\"}[5m]))")
    
    cat > error-report-$(date +%Y%m%d-%H%M%S).json << EOF
{
  "timestamp": "$timestamp",
  "error_rate": $error_rate,
  "total_requests_per_second": $total_requests,
  "error_requests_per_second": $error_requests,
  "threshold": $ERROR_THRESHOLD,
  "status": "$(if (( $(echo "$error_rate > $ERROR_THRESHOLD" | bc -l) )); then echo "CRITICAL"; else echo "HEALTHY"; fi)"
}
EOF
    
    echo "📄 Error report generated: error-report-$(date +%Y%m%d-%H%M%S).json"
}

# Fonction pour envoyer des alertes
send_alerts() {
    local error_rate=$1
    
    if (( $(echo "$error_rate > $ERROR_THRESHOLD" | bc -l) )); then
        echo "🚨 Sending alert: Error rate is $(echo "$error_rate * 100" | bc -l)%"
        
        # Envoyer une alerte Slack (si configuré)
        if [ -n "$SLACK_WEBHOOK_URL" ]; then
            curl -X POST -H 'Content-type: application/json' \
                --data "{\"text\":\"🚨 Attitudes.vip Error Rate Alert: $(echo "$error_rate * 100" | bc -l)% errors detected\"}" \
                "$SLACK_WEBHOOK_URL"
        fi
        
        # Envoyer une alerte par email (si configuré)
        if [ -n "$ALERT_EMAIL" ]; then
            echo "Error rate alert: $(echo "$error_rate * 100" | bc -l)%" | mail -s "Attitudes.vip Error Alert" "$ALERT_EMAIL"
        fi
    fi
}

# Fonction principale
main() {
    echo "🎯 Starting error rate analysis..."
    echo "⏰ Timestamp: $(date)"
    echo "🔍 Error threshold: $(echo "$ERROR_THRESHOLD * 100" | bc -l)%"
    echo ""
    
    local failed_checks=0
    
    # Vérifications de base
    check_basic_metrics || ((failed_checks++))
    
    # Vérifications des erreurs HTTP
    local error_rate=$(calculate_error_rate)
    check_http_error_rates || ((failed_checks++))
    
    # Vérifications des erreurs d'application
    check_application_errors || ((failed_checks++))
    
    # Vérifications des erreurs de base de données
    check_database_errors || ((failed_checks++))
    
    # Vérifications des erreurs Redis
    check_redis_errors || ((failed_checks++))
    
    # Vérifications des erreurs de performance
    check_performance_errors || ((failed_checks++))
    
    # Génération du rapport
    generate_error_report
    
    # Envoi d'alertes si nécessaire
    send_alerts "$error_rate"
    
    echo ""
    echo "📊 Error rate analysis summary:"
    if [ $failed_checks -eq 0 ]; then
        echo "✅ All error rate checks passed!"
        echo "🎉 Application error rates are healthy"
        exit 0
    else
        echo "❌ $failed_checks check(s) failed"
        echo "🚨 Application may have error rate issues"
        exit 1
    fi
}

# Exécution du script
main "$@" 