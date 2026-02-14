const apm = require('elastic-apm-node');

class APMService {
  constructor(config = {}) {
    this.config = {
      serviceName: process.env.APM_SERVICE_NAME || 'attitudes-vip',
      secretToken: process.env.APM_SECRET_TOKEN,
      serverUrl: process.env.APM_SERVER_URL || 'http://localhost:8200',
      environment: process.env.NODE_ENV || 'development',
      active: process.env.ENABLE_APM === 'true',
      captureBody: 'all',
      captureHeaders: true,
      logLevel: 'info',
      ...config
    };

    this.agent = null;
    this.transactions = new Map();
    this.spans = new Map();
  }

  async initialize() {
    if (this.config.active && this.config.secretToken) {
      this.agent = apm.start({
        serviceName: this.config.serviceName,
        secretToken: this.config.secretToken,
        serverUrl: this.config.serverUrl,
        environment: this.config.environment,
        captureBody: this.config.captureBody,
        captureHeaders: this.config.captureHeaders,
        logLevel: this.config.logLevel,
        
        // Custom transaction sampling
        transactionSampleRate: this.config.environment === 'production' ? 0.1 : 1.0,
        
        // Ignore certain routes
        ignoreUrls: ['/health', '/metrics', '/favicon.ico'],
        
        // Custom filters
        addFilter: (payload) => {
          // Remove sensitive data
          if (payload.context?.request?.headers) {
            delete payload.context.request.headers.authorization;
            delete payload.context.request.headers.cookie;
          }
          return payload;
        }
      });

      console.log(`APM initialized for service: ${this.config.serviceName}`);
    } else {
      console.log('APM is disabled or not configured');
    }
  }

  // Start a custom transaction
  startTransaction(name, type = 'custom') {
    if (!this.agent) return null;
    
    const transaction = this.agent.startTransaction(name, type);
    if (transaction) {
      const id = this.generateId();
      this.transactions.set(id, transaction);
      return id;
    }
    return null;
  }

  // End a transaction
  endTransaction(transactionId, result = 'success') {
    const transaction = this.transactions.get(transactionId);
    if (transaction) {
      transaction.result = result;
      transaction.end();
      this.transactions.delete(transactionId);
    }
  }

  // Start a span within current transaction
  startSpan(name, type = 'custom', subtype = null) {
    if (!this.agent) return null;
    
    const span = this.agent.startSpan(name, type, subtype);
    if (span) {
      const id = this.generateId();
      this.spans.set(id, span);
      return id;
    }
    return null;
  }

  // End a span
  endSpan(spanId) {
    const span = this.spans.get(spanId);
    if (span) {
      span.end();
      this.spans.delete(spanId);
    }
  }

  // Track custom events
  trackEvent(eventName, properties = {}) {
    if (!this.agent) return;

    // Add custom context
    this.agent.addLabels({
      event_name: eventName,
      ...this.flattenObject(properties)
    });

    // For important events, create a custom transaction
    if (properties.important) {
      const transaction = this.agent.startTransaction(eventName, 'event');
      if (transaction) {
        Object.entries(properties).forEach(([key, value]) => {
          transaction.setLabel(key, value);
        });
        transaction.end();
      }
    }
  }

  // Capture errors with context
  captureError(error, context = {}) {
    if (!this.agent) return;

    this.agent.captureError(error, {
      custom: context,
      user: context.user || {},
      tags: context.tags || {}
    });
  }

  // Add user context
  setUserContext(user) {
    if (!this.agent) return;

    this.agent.setUserContext({
      id: user.id,
      username: user.username,
      email: user.email
    });
  }

  // Add custom context
  setCustomContext(context) {
    if (!this.agent) return;

    this.agent.setCustomContext(context);
  }

  // Add tags/labels
  addLabels(labels) {
    if (!this.agent) return;

    this.agent.addLabels(labels);
  }

  // Wedding-specific APM tracking
  trackWeddingOperation(operation, weddingId, details = {}) {
    const transaction = this.startTransaction(`wedding.${operation}`, 'wedding');
    
    if (transaction) {
      this.agent.addLabels({
        wedding_id: weddingId,
        operation: operation,
        ...details
      });

      return {
        transactionId: transaction,
        end: (result = 'success') => this.endTransaction(transaction, result)
      };
    }

    return { end: () => {} };
  }

  // Vendor operation tracking
  trackVendorOperation(operation, vendorType, vendorId, details = {}) {
    const transaction = this.startTransaction(`vendor.${operation}`, 'vendor');
    
    if (transaction) {
      this.agent.addLabels({
        vendor_id: vendorId,
        vendor_type: vendorType,
        operation: operation,
        ...details
      });

      return {
        transactionId: transaction,
        end: (result = 'success') => this.endTransaction(transaction, result)
      };
    }

    return { end: () => {} };
  }

  // Database query tracking
  trackDatabaseQuery(query, table) {
    const span = this.startSpan(`db.${table}`, 'db', 'postgresql');
    
    if (span) {
      this.agent.currentSpan?.setDbContext({
        statement: query,
        type: 'sql',
        instance: process.env.DB_NAME,
        user: process.env.DB_USER
      });
    }

    return {
      spanId: span,
      end: () => this.endSpan(span)
    };
  }

  // External API call tracking
  trackExternalCall(service, method, url) {
    const span = this.startSpan(`external.${service}`, 'external', 'http');
    
    if (span) {
      this.agent.currentSpan?.setHttpContext({
        method: method,
        url: url
      });
    }

    return {
      spanId: span,
      end: (statusCode) => {
        if (this.agent.currentSpan) {
          this.agent.currentSpan.setHttpContext({ status_code: statusCode });
        }
        this.endSpan(span);
      }
    };
  }

  // Cache operation tracking
  trackCacheOperation(operation, key, hit) {
    const span = this.startSpan(`cache.${operation}`, 'cache', 'redis');
    
    if (span && this.agent.currentSpan) {
      this.agent.currentSpan.addLabels({
        cache_key: key,
        cache_hit: hit
      });
    }

    return {
      spanId: span,
      end: () => this.endSpan(span)
    };
  }

  // Get current transaction
  getCurrentTransaction() {
    return this.agent?.currentTransaction;
  }

  // Get current span
  getCurrentSpan() {
    return this.agent?.currentSpan;
  }

  // Middleware for Express
  middleware() {
    return (req, res, next) => {
      if (!this.agent) {
        return next();
      }

      // Add request context
      if (req.user) {
        this.setUserContext(req.user);
      }

      // Add custom labels
      this.addLabels({
        request_id: req.id,
        user_agent: req.get('user-agent'),
        ip: req.ip
      });

      next();
    };
  }

  // Get APM metrics
  async getMetrics() {
    if (!this.agent) {
      return { enabled: false };
    }

    return {
      enabled: true,
      serviceName: this.config.serviceName,
      environment: this.config.environment,
      activeTransactions: this.transactions.size,
      activeSpans: this.spans.size
    };
  }

  // Helper to flatten nested objects for labels
  flattenObject(obj, prefix = '') {
    const flattened = {};
    
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      const newKey = prefix ? `${prefix}_${key}` : key;
      
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(flattened, this.flattenObject(value, newKey));
      } else {
        flattened[newKey] = value;
      }
    });
    
    return flattened;
  }

  // Generate unique ID
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async shutdown() {
    // End all active transactions and spans
    this.transactions.forEach((transaction, id) => {
      this.endTransaction(id, 'shutdown');
    });

    this.spans.forEach((span, id) => {
      this.endSpan(id);
    });

    if (this.agent) {
      await new Promise((resolve) => {
        this.agent.flush(() => {
          resolve();
        });
      });
    }
  }
}

module.exports = APMService;