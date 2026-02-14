const promClient = require('prom-client');
const express = require('express');

class MetricsCollector {
  constructor(config = {}) {
    this.config = config;
    this.register = new promClient.Registry();
    
    // Default metrics (CPU, memory, etc.)
    promClient.collectDefaultMetrics({ register: this.register });

    // HTTP metrics
    this.httpRequestsTotal = new promClient.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path'],
      registers: [this.register]
    });

    this.httpRequestDuration = new promClient.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'path', 'status'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
      registers: [this.register]
    });

    this.httpResponsesTotal = new promClient.Counter({
      name: 'http_responses_total',
      help: 'Total number of HTTP responses',
      labelNames: ['method', 'path', 'status'],
      registers: [this.register]
    });

    // Database metrics
    this.dbConnectionsActive = new promClient.Gauge({
      name: 'db_connections_active',
      help: 'Number of active database connections',
      labelNames: ['pool'],
      registers: [this.register]
    });

    this.dbQueryDuration = new promClient.Histogram({
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.register]
    });

    // Cache metrics
    this.cacheHits = new promClient.Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_name'],
      registers: [this.register]
    });

    this.cacheMisses = new promClient.Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_name'],
      registers: [this.register]
    });

    // Error metrics
    this.errorsTotal = new promClient.Counter({
      name: 'errors_total',
      help: 'Total number of errors',
      labelNames: ['type', 'severity'],
      registers: [this.register]
    });

    // Business metrics
    this.activeUsers = new promClient.Gauge({
      name: 'active_users',
      help: 'Number of active users',
      labelNames: ['type'],
      registers: [this.register]
    });

    this.requestsPerMinute = new promClient.Gauge({
      name: 'requests_per_minute',
      help: 'Requests per minute',
      registers: [this.register]
    });

    // WebSocket metrics
    this.wsConnectionsActive = new promClient.Gauge({
      name: 'ws_connections_active',
      help: 'Number of active WebSocket connections',
      labelNames: ['namespace'],
      registers: [this.register]
    });

    this.wsMessagesTotal = new promClient.Counter({
      name: 'ws_messages_total',
      help: 'Total number of WebSocket messages',
      labelNames: ['direction', 'type'],
      registers: [this.register]
    });

    // Queue metrics
    this.queueSize = new promClient.Gauge({
      name: 'queue_size',
      help: 'Current queue size',
      labelNames: ['queue_name'],
      registers: [this.register]
    });

    this.queueProcessingDuration = new promClient.Histogram({
      name: 'queue_processing_duration_seconds',
      help: 'Duration of queue job processing',
      labelNames: ['queue_name', 'job_type'],
      buckets: [0.1, 0.5, 1, 5, 10, 30, 60],
      registers: [this.register]
    });
  }

  async initialize() {
    if (this.config.prometheusPort) {
      this.app = express();
      
      // Prometheus metrics endpoint
      this.app.get('/metrics', async (req, res) => {
        try {
          res.set('Content-Type', this.register.contentType);
          const metrics = await this.register.metrics();
          res.end(metrics);
        } catch (error) {
          res.status(500).end(error.message);
        }
      });

      this.server = this.app.listen(this.config.prometheusPort, () => {
        console.log(`Prometheus metrics available at http://localhost:${this.config.prometheusPort}/metrics`);
      });
    }
  }

  // Helper methods for tracking metrics
  trackDatabaseQuery(operation, table, duration) {
    this.dbQueryDuration.observe({ operation, table }, duration / 1000);
  }

  trackCacheOperation(cacheName, hit) {
    if (hit) {
      this.cacheHits.inc({ cache_name: cacheName });
    } else {
      this.cacheMisses.inc({ cache_name: cacheName });
    }
  }

  updateActiveConnections(pool, count) {
    this.dbConnectionsActive.set({ pool }, count);
  }

  updateActiveUsers(type, count) {
    this.activeUsers.set({ type }, count);
  }

  trackWebSocketConnection(namespace, delta) {
    this.wsConnectionsActive.inc({ namespace }, delta);
  }

  trackWebSocketMessage(direction, type) {
    this.wsMessagesTotal.inc({ direction, type });
  }

  updateQueueSize(queueName, size) {
    this.queueSize.set({ queue_name: queueName }, size);
  }

  trackQueueJob(queueName, jobType, duration) {
    this.queueProcessingDuration.observe({ queue_name: queueName, job_type: jobType }, duration / 1000);
  }

  async getMetrics() {
    return this.register.metrics();
  }

  async shutdown() {
    if (this.server) {
      await new Promise((resolve) => this.server.close(resolve));
    }
  }
}

module.exports = MetricsCollector;