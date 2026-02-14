# 📊 Requirements de Monitoring

## 🎯 Objectifs de Performance (SLO)

### ✅ OBLIGATOIRE - Service Level Objectives
```yaml
availability:
  target: 99.9%  # 43.2 minutes downtime/mois
  measurement: "Uptime Robot + Prometheus"
  
response_time:
  p50: 100ms     # Médiane
  p95: 200ms     # 95e percentile
  p99: 500ms     # 99e percentile
  
error_rate:
  target: < 0.1%
  critical_threshold: 1%
  
throughput:
  minimum: 1000 req/min
  peak_capacity: 10000 req/min
```

## 📈 Métriques Obligatoires

### 1. Métriques Application (APM)
```javascript
// ✅ OBLIGATOIRE - Instrumentation avec OpenTelemetry
const { MeterProvider } = require('@opentelemetry/metrics');
const { PrometheusExporter } = require('@opentelemetry/exporter-prometheus');

// Métriques custom
const meter = meterProvider.getMeter('attitudes-api');

// Latence des requêtes
const requestDuration = meter.createHistogram('http_request_duration', {
  description: 'Duration of HTTP requests',
  unit: 'ms',
  boundaries: [10, 50, 100, 200, 500, 1000, 5000]
});

// Compteur d'erreurs
const errorCounter = meter.createCounter('app_errors_total', {
  description: 'Total number of application errors'
});

// Gauge pour connexions actives
const activeConnections = meter.createUpDownCounter('active_connections', {
  description: 'Number of active connections'
});

// Business metrics
const weddingsCreated = meter.createCounter('weddings_created_total');
const revenueProcessed = meter.createCounter('revenue_processed_total', {
  unit: 'CAD'
});
```

### 2. Métriques Infrastructure
```yaml
# ✅ OBLIGATOIRE - Node Exporter + cAdvisor
infrastructure_metrics:
  cpu:
    - usage_percent
    - load_average_1m
    - load_average_5m
    
  memory:
    - used_percent
    - available_mb
    - swap_usage
    
  disk:
    - usage_percent
    - iops_read
    - iops_write
    - latency_ms
    
  network:
    - bandwidth_in_mbps
    - bandwidth_out_mbps
    - packet_loss_percent
    - latency_ms
```

### 3. Métriques Base de Données
```sql
-- ✅ OBLIGATOIRE - PostgreSQL metrics
-- Requêtes lentes
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Vue pour monitoring
CREATE VIEW db_monitoring AS
SELECT 
  datname,
  numbackends as active_connections,
  xact_commit as transactions_committed,
  xact_rollback as transactions_rolled_back,
  blks_read as disk_blocks_read,
  blks_hit as cache_hits,
  tup_returned as rows_returned,
  tup_fetched as rows_fetched,
  tup_inserted as rows_inserted,
  tup_updated as rows_updated,
  tup_deleted as rows_deleted,
  conflicts,
  deadlocks
FROM pg_stat_database
WHERE datname = current_database();
```

## 🚨 Alerting Configuration

### ✅ OBLIGATOIRE - Règles d'Alerte
```yaml
alerts:
  # P0 - Service Down
  - name: ServiceDown
    condition: up == 0
    duration: 1m
    severity: critical
    channels: ["pagerduty", "slack-oncall"]
    
  # P1 - High Error Rate
  - name: HighErrorRate
    condition: error_rate > 1%
    duration: 5m
    severity: high
    channels: ["pagerduty", "slack-alerts"]
    
  # P1 - Response Time Degradation
  - name: SlowResponseTime
    condition: http_request_duration_p95 > 500ms
    duration: 5m
    severity: high
    channels: ["slack-alerts", "email"]
    
  # P2 - High CPU Usage
  - name: HighCPU
    condition: cpu_usage > 80%
    duration: 10m
    severity: medium
    channels: ["slack-alerts"]
    
  # P2 - Low Disk Space
  - name: LowDiskSpace
    condition: disk_usage > 85%
    duration: 5m
    severity: medium
    channels: ["slack-alerts", "email"]
    
  # P3 - SSL Certificate Expiry
  - name: SSLCertExpiringSoon
    condition: ssl_cert_expiry_days < 30
    duration: 1h
    severity: low
    channels: ["email"]
```

### Escalation Policy
```yaml
escalation:
  critical:
    - notify: oncall_engineer
      after: 0m
    - notify: team_lead
      after: 15m
    - notify: engineering_manager
      after: 30m
    - notify: cto
      after: 60m
      
  high:
    - notify: oncall_engineer
      after: 0m
    - notify: team_lead
      after: 30m
      
  medium:
    - notify: team_slack
      after: 0m
    - notify: oncall_engineer
      after: 60m
```

## 📊 Dashboards Obligatoires

### 1. Overview Dashboard
```javascript
// Grafana Dashboard JSON
{
  "dashboard": {
    "title": "Attitudes.vip Overview",
    "panels": [
      {
        "title": "Service Health",
        "type": "stat",
        "targets": [
          { "expr": "up{job='attitudes-api'}" }
        ]
      },
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          { "expr": "rate(http_requests_total[5m])" }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          { "expr": "rate(http_requests_total{status=~'5..'}[5m])" }
        ]
      },
      {
        "title": "Response Time (p95)",
        "type": "graph",
        "targets": [
          { "expr": "histogram_quantile(0.95, http_request_duration_bucket)" }
        ]
      }
    ]
  }
}
```

### 2. Business Metrics Dashboard
- Mariages créés par jour
- Revenus traités
- Utilisateurs actifs
- Taux de conversion
- Satisfaction client (NPS)

### 3. Infrastructure Dashboard
- CPU/Memory/Disk par service
- Network I/O
- Container health
- Database connections
- Cache hit rate

## 📝 Logging Standards

### ✅ OBLIGATOIRE - Format de Logs Structurés
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'attitudes-api',
    environment: process.env.NODE_ENV,
    version: process.env.APP_VERSION
  },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Utilisation
logger.info('Wedding created', {
  weddingId: wedding.id,
  userId: user.id,
  duration: Date.now() - startTime,
  correlationId: req.correlationId
});

logger.error('Payment failed', {
  error: err.message,
  stack: err.stack,
  paymentId: payment.id,
  amount: payment.amount,
  correlationId: req.correlationId
});
```

### Log Levels
```yaml
log_levels:
  fatal:   "Application crash"
  error:   "Error nécessitant attention"
  warn:    "Comportement anormal mais géré"
  info:    "Événements business importants"
  debug:   "Information de débogage"
  trace:   "Très détaillé (dev only)"
```

## 🔍 Distributed Tracing

### ✅ OBLIGATOIRE - OpenTelemetry Tracing
```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');

// Configuration
const traceExporter = new JaegerExporter({
  endpoint: 'http://jaeger:14268/api/traces',
});

const sdk = new NodeSDK({
  traceExporter,
  serviceName: 'attitudes-api'
});

// Instrumentation automatique
sdk.start();

// Traces custom
const tracer = opentelemetry.trace.getTracer('attitudes-api');

async function createWedding(data) {
  const span = tracer.startSpan('createWedding', {
    attributes: {
      'wedding.date': data.date,
      'wedding.venue': data.venue
    }
  });
  
  try {
    // Validation
    const validationSpan = tracer.startSpan('validation', { parent: span });
    await validateWeddingData(data);
    validationSpan.end();
    
    // Sauvegarde DB
    const dbSpan = tracer.startSpan('database.save', { parent: span });
    const wedding = await db.weddings.create(data);
    dbSpan.end();
    
    span.setStatus({ code: SpanStatusCode.OK });
    return wedding;
    
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    throw error;
  } finally {
    span.end();
  }
}
```

## 📱 Real User Monitoring (RUM)

### ✅ OBLIGATOIRE - Monitoring Frontend
```javascript
// Integration avec Sentry ou DataDog RUM
<script>
  window.RUM = {
    init: function() {
      // Performance metrics
      const perfData = window.performance.getEntriesByType('navigation')[0];
      
      this.track('page_load', {
        dns: perfData.domainLookupEnd - perfData.domainLookupStart,
        tcp: perfData.connectEnd - perfData.connectStart,
        request: perfData.responseStart - perfData.requestStart,
        response: perfData.responseEnd - perfData.responseStart,
        dom: perfData.domComplete - perfData.domLoading,
        total: perfData.loadEventEnd - perfData.fetchStart
      });
      
      // Error tracking
      window.addEventListener('error', (e) => {
        this.track('js_error', {
          message: e.message,
          source: e.filename,
          line: e.lineno,
          column: e.colno,
          stack: e.error?.stack
        });
      });
      
      // User interactions
      this.trackClicks();
      this.trackFormSubmissions();
    }
  };
  
  RUM.init();
</script>
```

## 🚑 Health Checks

### ✅ OBLIGATOIRE - Endpoints de Santé
```javascript
// Health check simple
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Health check détaillé
app.get('/health/detailed', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    disk: await checkDiskSpace(),
    memory: await checkMemory(),
    externalAPIs: await checkExternalServices()
  };
  
  const overall = Object.values(checks).every(c => c.status === 'healthy');
  
  res.status(overall ? 200 : 503).json({
    status: overall ? 'healthy' : 'unhealthy',
    version: process.env.APP_VERSION,
    uptime: process.uptime(),
    checks
  });
});

async function checkDatabase() {
  try {
    const start = Date.now();
    await db.raw('SELECT 1');
    const duration = Date.now() - start;
    
    return {
      status: duration < 50 ? 'healthy' : 'degraded',
      responseTime: duration,
      connections: await db.client.pool.numUsed()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}
```

## 📈 SLI/SLO Reporting

### ✅ OBLIGATOIRE - Rapport Mensuel
```yaml
monthly_slo_report:
  availability:
    target: 99.9%
    achieved: 99.95%
    status: "✅ Met"
    
  response_time_p95:
    target: 200ms
    achieved: 185ms
    status: "✅ Met"
    
  error_rate:
    target: < 0.1%
    achieved: 0.08%
    status: "✅ Met"
    
  incidents:
    p0: 0
    p1: 2
    p2: 5
    mttr: "15 minutes"
```

## 🔧 Tools Stack

### ✅ OBLIGATOIRE - Outils de Monitoring
1. **Metrics**: Prometheus + Grafana
2. **Logs**: ELK Stack (Elasticsearch, Logstash, Kibana)
3. **Traces**: Jaeger
4. **APM**: DataDog ou New Relic
5. **Uptime**: Uptime Robot ou Pingdom
6. **RUM**: Sentry ou DataDog RUM
7. **Alerting**: PagerDuty + Slack

---

**Un monitoring proactif est la clé pour maintenir un service de haute qualité!** 📊