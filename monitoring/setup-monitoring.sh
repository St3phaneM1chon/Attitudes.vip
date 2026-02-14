#!/bin/bash

# Setup script for Attitudes.vip monitoring stack

set -e

echo "🚀 Setting up Attitudes.vip Monitoring Stack..."

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p monitoring/{dashboards,alerts,datasources}
mkdir -p monitoring/grafana/{dashboards,provisioning}
mkdir -p monitoring/prometheus/rules

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Create network if it doesn't exist
echo "🌐 Creating Docker network..."
docker network create attitudes_monitoring 2>/dev/null || echo "Network already exists"

# Copy configuration files
echo "📋 Setting up configuration files..."

# Create Grafana datasource configuration
cat > monitoring/datasources/prometheus.yml << EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    
  - name: Elasticsearch
    type: elasticsearch
    access: proxy
    url: http://elasticsearch:9200
    database: "apm-*"
    version: "8.0+"
    
  - name: Jaeger
    type: jaeger
    access: proxy
    url: http://jaeger:16686
EOF

# Create Loki configuration
cat > monitoring/loki-config.yml << EOF
auth_enabled: false

server:
  http_listen_port: 3100

ingester:
  lifecycler:
    address: 127.0.0.1
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1
    final_sleep: 0s

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

storage_config:
  boltdb_shipper:
    active_index_directory: /loki/boltdb-shipper-active
    cache_location: /loki/boltdb-shipper-cache
    cache_ttl: 24h
    shared_store: filesystem
  filesystem:
    directory: /loki/chunks

limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h
EOF

# Create Promtail configuration
cat > monitoring/promtail-config.yml << EOF
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: system
    static_configs:
      - targets:
          - localhost
        labels:
          job: varlogs
          __path__: /var/log/*log
          
  - job_name: containers
    static_configs:
      - targets:
          - localhost
        labels:
          job: containerlogs
          __path__: /var/lib/docker/containers/*/*log
EOF

# Create AlertManager configuration
cat > monitoring/alertmanager.yml << EOF
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'
  
receivers:
  - name: 'default'
    webhook_configs:
      - url: 'http://attitudes-app:3000/api/alerts/webhook'
        send_resolved: true
EOF

# Pull Docker images
echo "🐳 Pulling Docker images..."
docker-compose -f monitoring/docker-compose.monitoring.yml pull

# Start monitoring stack
echo "🎯 Starting monitoring services..."
docker-compose -f monitoring/docker-compose.monitoring.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Check service health
echo "🏥 Checking service health..."
services=("prometheus:9090" "grafana:3000" "jaeger:16686" "elasticsearch:9200")

for service in "${services[@]}"; do
    IFS=':' read -r name port <<< "$service"
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port" | grep -q "200\|302"; then
        echo "✅ $name is running on port $port"
    else
        echo "❌ $name failed to start on port $port"
    fi
done

echo ""
echo "🎉 Monitoring stack setup complete!"
echo ""
echo "📊 Access your dashboards at:"
echo "   - Grafana: http://localhost:3000 (admin/admin)"
echo "   - Prometheus: http://localhost:9090"
echo "   - Jaeger: http://localhost:16686"
echo "   - Kibana: http://localhost:5601"
echo ""
echo "📝 Next steps:"
echo "   1. Update your .env file with monitoring credentials"
echo "   2. Import the dashboards in Grafana"
echo "   3. Configure alert channels in AlertManager"
echo "   4. Set up retention policies"
echo ""
echo "💡 To stop monitoring: docker-compose -f monitoring/docker-compose.monitoring.yml down"