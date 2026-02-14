const MetricsCollector = require('./metricsCollector');
const HealthCheckService = require('./healthCheck');
const APMService = require('./apm');
const ErrorTracker = require('./errorTracker');
const BusinessMetrics = require('./businessMetrics');
const TracingService = require('./tracing');

class MonitoringService {
  constructor(config = {}) {
    this.config = {
      prometheusPort: process.env.PROMETHEUS_PORT || 9090,
      enableTracing: process.env.ENABLE_TRACING === 'true',
      enableAPM: process.env.ENABLE_APM === 'true',
      errorTrackingDSN: process.env.SENTRY_DSN,
      ...config
    };

    this.metrics = new MetricsCollector(this.config);
    this.healthCheck = new HealthCheckService(this.config);
    this.apm = new APMService(this.config);
    this.errorTracker = new ErrorTracker(this.config);
    this.businessMetrics = new BusinessMetrics(this.config);
    this.tracing = new TracingService(this.config);
  }

  async initialize() {
    console.log('Initializing monitoring services...');
    
    await Promise.all([
      this.metrics.initialize(),
      this.healthCheck.initialize(),
      this.apm.initialize(),
      this.errorTracker.initialize(),
      this.businessMetrics.initialize(),
      this.tracing.initialize()
    ]);

    console.log('Monitoring services initialized successfully');
  }

  // Express middleware for request monitoring
  requestMonitoring() {
    return (req, res, next) => {
      const start = Date.now();
      const span = this.tracing.startSpan('http_request', {
        'http.method': req.method,
        'http.url': req.url,
        'http.target': req.path
      });

      // Track request
      this.metrics.httpRequestsTotal.inc({
        method: req.method,
        path: req.route?.path || req.path
      });

      // Monitor response
      res.on('finish', () => {
        const duration = Date.now() - start;
        
        this.metrics.httpRequestDuration.observe({
          method: req.method,
          path: req.route?.path || req.path,
          status: res.statusCode
        }, duration / 1000);

        this.metrics.httpResponsesTotal.inc({
          method: req.method,
          path: req.route?.path || req.path,
          status: res.statusCode
        });

        span.setTag('http.status_code', res.statusCode);
        span.finish();
      });

      next();
    };
  }

  // Track custom events
  trackEvent(eventName, properties = {}) {
    this.businessMetrics.trackEvent(eventName, properties);
    this.apm.trackEvent(eventName, properties);
  }

  // Track errors
  trackError(error, context = {}) {
    this.errorTracker.captureException(error, context);
    this.metrics.errorsTotal.inc({
      type: error.name || 'UnknownError',
      severity: context.severity || 'error'
    });
  }

  // Get current metrics
  async getMetrics() {
    return {
      prometheus: await this.metrics.getMetrics(),
      health: await this.healthCheck.getStatus(),
      business: await this.businessMetrics.getMetrics(),
      apm: await this.apm.getMetrics()
    };
  }

  // Shutdown monitoring services
  async shutdown() {
    await Promise.all([
      this.metrics.shutdown(),
      this.apm.shutdown(),
      this.errorTracker.shutdown(),
      this.tracing.shutdown()
    ]);
  }
}

module.exports = MonitoringService;