const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
const { RedisInstrumentation } = require('@opentelemetry/instrumentation-redis');
const { IORedisInstrumentation } = require('@opentelemetry/instrumentation-ioredis');
const opentelemetry = require('@opentelemetry/api');

class TracingService {
  constructor(config = {}) {
    this.config = {
      serviceName: process.env.OTEL_SERVICE_NAME || 'attitudes-vip',
      jaegerEndpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
      enabled: process.env.ENABLE_TRACING === 'true',
      environment: process.env.NODE_ENV || 'development',
      ...config
    };

    this.tracer = null;
    this.provider = null;
    this.activeSpans = new Map();
  }

  async initialize() {
    if (!this.config.enabled) {
      console.log('Distributed tracing is disabled');
      return;
    }

    // Create resource
    const resource = Resource.default().merge(
      new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION || '1.0.0',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.config.environment,
      })
    );

    // Create provider
    this.provider = new NodeTracerProvider({
      resource,
      // Sampling configuration
      sampler: {
        shouldSample: () => {
          // Sample 100% in development, 10% in production
          const sampleRate = this.config.environment === 'production' ? 0.1 : 1.0;
          return {
            decision: Math.random() < sampleRate ? 1 : 0,
            attributes: []
          };
        }
      }
    });

    // Configure exporter
    const jaegerExporter = new JaegerExporter({
      endpoint: this.config.jaegerEndpoint,
      serviceName: this.config.serviceName
    });

    // Add span processor
    this.provider.addSpanProcessor(new BatchSpanProcessor(jaegerExporter));

    // Register provider
    this.provider.register();

    // Register instrumentations
    registerInstrumentations({
      instrumentations: [
        new HttpInstrumentation({
          requestHook: (span, request) => {
            span.setAttributes({
              'http.request.body.size': request.headers['content-length'] || 0,
              'http.user_agent': request.headers['user-agent']
            });
          },
          responseHook: (span, response) => {
            span.setAttributes({
              'http.response.body.size': response.headers['content-length'] || 0
            });
          }
        }),
        new ExpressInstrumentation({
          requestHook: (span, info) => {
            span.setAttributes({
              'express.route': info.route,
              'express.type': info.layerType
            });
          }
        }),
        new RedisInstrumentation(),
        new IORedisInstrumentation()
      ]
    });

    // Get tracer
    this.tracer = opentelemetry.trace.getTracer(
      this.config.serviceName,
      process.env.APP_VERSION || '1.0.0'
    );

    console.log(`Distributed tracing initialized for service: ${this.config.serviceName}`);
  }

  // Start a new span
  startSpan(name, options = {}) {
    if (!this.tracer) return null;

    const span = this.tracer.startSpan(name, {
      kind: options.kind || opentelemetry.SpanKind.INTERNAL,
      attributes: options.attributes || {}
    });

    const spanId = span.spanContext().spanId;
    this.activeSpans.set(spanId, span);

    return span;
  }

  // Get current span
  getCurrentSpan() {
    return opentelemetry.trace.getActiveSpan();
  }

  // Wedding operation tracing
  traceWeddingOperation(operationName, weddingId, fn) {
    const span = this.startSpan(`wedding.${operationName}`, {
      attributes: {
        'wedding.id': weddingId,
        'wedding.operation': operationName
      }
    });

    return this.executeWithSpan(span, fn);
  }

  // Vendor operation tracing
  traceVendorOperation(operationName, vendorType, vendorId, fn) {
    const span = this.startSpan(`vendor.${operationName}`, {
      attributes: {
        'vendor.id': vendorId,
        'vendor.type': vendorType,
        'vendor.operation': operationName
      }
    });

    return this.executeWithSpan(span, fn);
  }

  // Database operation tracing
  traceDatabaseOperation(operation, table, fn) {
    const span = this.startSpan(`db.${operation}`, {
      kind: opentelemetry.SpanKind.CLIENT,
      attributes: {
        'db.system': 'postgresql',
        'db.operation': operation,
        'db.table': table
      }
    });

    return this.executeWithSpan(span, fn);
  }

  // Cache operation tracing
  traceCacheOperation(operation, key, fn) {
    const span = this.startSpan(`cache.${operation}`, {
      kind: opentelemetry.SpanKind.CLIENT,
      attributes: {
        'cache.system': 'redis',
        'cache.operation': operation,
        'cache.key': key
      }
    });

    return this.executeWithSpan(span, fn);
  }

  // External API call tracing
  traceExternalCall(service, method, url, fn) {
    const span = this.startSpan(`external.${service}`, {
      kind: opentelemetry.SpanKind.CLIENT,
      attributes: {
        'http.method': method,
        'http.url': url,
        'peer.service': service
      }
    });

    return this.executeWithSpan(span, fn);
  }

  // Queue operation tracing
  traceQueueOperation(queueName, operation, fn) {
    const span = this.startSpan(`queue.${operation}`, {
      kind: opentelemetry.SpanKind.PRODUCER,
      attributes: {
        'messaging.system': 'redis',
        'messaging.destination': queueName,
        'messaging.operation': operation
      }
    });

    return this.executeWithSpan(span, fn);
  }

  // Execute function with span
  async executeWithSpan(span, fn) {
    if (!span) {
      return fn();
    }

    const context = opentelemetry.trace.setSpan(
      opentelemetry.context.active(),
      span
    );

    try {
      const result = await opentelemetry.context.with(context, fn);
      span.setStatus({ code: opentelemetry.SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error);
      span.setStatus({
        code: opentelemetry.SpanStatusCode.ERROR,
        message: error.message
      });
      throw error;
    } finally {
      span.end();
      const spanId = span.spanContext().spanId;
      this.activeSpans.delete(spanId);
    }
  }

  // Add event to current span
  addEvent(name, attributes = {}) {
    const span = this.getCurrentSpan();
    if (span) {
      span.addEvent(name, attributes);
    }
  }

  // Set attributes on current span
  setAttributes(attributes) {
    const span = this.getCurrentSpan();
    if (span) {
      span.setAttributes(attributes);
    }
  }

  // Set baggage
  setBaggage(key, value) {
    const baggage = opentelemetry.propagation.getBaggage(opentelemetry.context.active()) || 
                    opentelemetry.propagation.createBaggage();
    
    const newBaggage = baggage.setEntry(key, { value });
    opentelemetry.propagation.setBaggage(opentelemetry.context.active(), newBaggage);
  }

  // Get baggage
  getBaggage(key) {
    const baggage = opentelemetry.propagation.getBaggage(opentelemetry.context.active());
    return baggage?.getEntry(key)?.value;
  }

  // Create trace context for async operations
  createTraceContext() {
    const span = this.getCurrentSpan();
    if (!span) return null;

    return {
      traceId: span.spanContext().traceId,
      spanId: span.spanContext().spanId,
      traceFlags: span.spanContext().traceFlags
    };
  }

  // Restore trace context
  restoreTraceContext(traceContext) {
    if (!traceContext || !this.tracer) return null;

    const spanContext = {
      traceId: traceContext.traceId,
      spanId: traceContext.spanId,
      traceFlags: traceContext.traceFlags || opentelemetry.TraceFlags.SAMPLED
    };

    return opentelemetry.trace.setSpanContext(
      opentelemetry.context.active(),
      spanContext
    );
  }

  // Express middleware
  middleware() {
    return (req, res, next) => {
      const span = this.getCurrentSpan();
      
      if (span) {
        // Add request attributes
        span.setAttributes({
          'http.request_id': req.id,
          'user.id': req.user?.id,
          'user.type': req.user?.type
        });

        // Add trace ID to response headers
        res.setHeader('X-Trace-Id', span.spanContext().traceId);
      }

      next();
    };
  }

  // Get tracing metrics
  getMetrics() {
    return {
      enabled: this.config.enabled,
      activeSpans: this.activeSpans.size,
      serviceName: this.config.serviceName,
      endpoint: this.config.jaegerEndpoint
    };
  }

  async shutdown() {
    // End all active spans
    this.activeSpans.forEach(span => {
      span.setStatus({ code: opentelemetry.SpanStatusCode.ERROR, message: 'Service shutting down' });
      span.end();
    });
    this.activeSpans.clear();

    // Shutdown provider
    if (this.provider) {
      await this.provider.shutdown();
    }
  }
}

module.exports = TracingService;