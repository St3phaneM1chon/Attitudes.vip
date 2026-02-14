const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');

class ErrorTracker {
  constructor(config = {}) {
    this.config = {
      dsn: process.env.SENTRY_DSN || config.dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      enabled: !!process.env.SENTRY_DSN,
      ...config
    };

    this.errorCounts = new Map();
    this.errorPatterns = new Map();
  }

  async initialize() {
    if (this.config.enabled && this.config.dsn) {
      Sentry.init({
        dsn: this.config.dsn,
        environment: this.config.environment,
        integrations: [
          new ProfilingIntegration(),
          new Sentry.Integrations.Http({ tracing: true }),
          new Sentry.Integrations.Express({ app: true, router: true })
        ],
        tracesSampleRate: this.config.tracesSampleRate,
        profilesSampleRate: this.config.profilesSampleRate,
        
        beforeSend: (event, hint) => {
          // Filter out certain errors
          if (event.exception) {
            const error = hint.originalException;
            
            // Don't send client-side validation errors
            if (error?.name === 'ValidationError') {
              return null;
            }
            
            // Track error patterns
            this.trackErrorPattern(error);
          }
          
          // Remove sensitive data
          if (event.request) {
            delete event.request.cookies;
            delete event.request.headers?.authorization;
          }
          
          return event;
        },
        
        beforeBreadcrumb: (breadcrumb) => {
          // Filter out noisy breadcrumbs
          if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
            return null;
          }
          
          return breadcrumb;
        }
      });

      console.log('Error tracking initialized with Sentry');
    } else {
      console.log('Error tracking is disabled');
    }
  }

  // Capture exceptions with context
  captureException(error, context = {}) {
    // Track locally
    this.trackError(error);

    if (!this.config.enabled) {
      console.error('Error captured (tracking disabled):', error, context);
      return;
    }

    // Add wedding-specific context
    const scope = new Sentry.Scope();
    
    if (context.user) {
      scope.setUser({
        id: context.user.id,
        email: context.user.email,
        username: context.user.username,
        userType: context.user.type
      });
    }

    if (context.wedding) {
      scope.setContext('wedding', {
        id: context.wedding.id,
        status: context.wedding.status,
        region: context.wedding.region,
        date: context.wedding.date
      });
    }

    if (context.vendor) {
      scope.setContext('vendor', {
        id: context.vendor.id,
        type: context.vendor.type,
        rating: context.vendor.rating
      });
    }

    // Add tags
    scope.setTags({
      feature: context.feature || 'unknown',
      severity: context.severity || 'error',
      ...context.tags
    });

    // Add extra data
    scope.setExtras({
      ...context.extra,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });

    // Set fingerprint for grouping
    if (context.fingerprint) {
      scope.setFingerprint(context.fingerprint);
    }

    // Capture the exception
    Sentry.captureException(error, scope);
  }

  // Capture messages
  captureMessage(message, level = 'info', context = {}) {
    if (!this.config.enabled) {
      console.log(`Message captured (tracking disabled) [${level}]:`, message);
      return;
    }

    const scope = new Sentry.Scope();
    scope.setLevel(level);
    scope.setExtras(context);
    
    Sentry.captureMessage(message, scope);
  }

  // Add breadcrumb
  addBreadcrumb(breadcrumb) {
    if (!this.config.enabled) return;

    Sentry.addBreadcrumb({
      ...breadcrumb,
      timestamp: Date.now() / 1000
    });
  }

  // Track error patterns for analysis
  trackError(error) {
    const errorKey = `${error.name}:${error.message}`;
    const count = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, count + 1);

    // Track error patterns
    const pattern = this.extractErrorPattern(error);
    const patternCount = this.errorPatterns.get(pattern) || 0;
    this.errorPatterns.set(pattern, patternCount + 1);
  }

  trackErrorPattern(error) {
    const pattern = this.extractErrorPattern(error);
    const existing = this.errorPatterns.get(pattern) || {
      count: 0,
      firstSeen: new Date(),
      lastSeen: new Date(),
      examples: []
    };

    existing.count++;
    existing.lastSeen = new Date();
    
    if (existing.examples.length < 5) {
      existing.examples.push({
        message: error.message,
        stack: error.stack,
        timestamp: new Date()
      });
    }

    this.errorPatterns.set(pattern, existing);
  }

  extractErrorPattern(error) {
    if (!error.stack) return error.name || 'UnknownError';

    // Extract the first meaningful line from stack trace
    const lines = error.stack.split('\n');
    const meaningfulLine = lines.find(line => 
      line.includes('at ') && 
      !line.includes('node_modules') &&
      !line.includes('internal/')
    );

    if (meaningfulLine) {
      // Extract file and line number
      const match = meaningfulLine.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
      if (match) {
        return `${error.name}:${match[2]}:${match[3]}`;
      }
    }

    return error.name || 'UnknownError';
  }

  // Wedding-specific error tracking
  trackWeddingError(weddingId, error, context = {}) {
    this.captureException(error, {
      ...context,
      wedding: { id: weddingId },
      feature: 'wedding',
      fingerprint: ['wedding', error.name, weddingId]
    });
  }

  // Vendor-specific error tracking
  trackVendorError(vendorId, vendorType, error, context = {}) {
    this.captureException(error, {
      ...context,
      vendor: { id: vendorId, type: vendorType },
      feature: 'vendor',
      fingerprint: ['vendor', error.name, vendorType]
    });
  }

  // Payment error tracking
  trackPaymentError(paymentId, error, context = {}) {
    this.captureException(error, {
      ...context,
      payment: { id: paymentId },
      feature: 'payment',
      severity: 'critical',
      fingerprint: ['payment', error.name]
    });
  }

  // Track performance issues
  trackPerformanceIssue(operation, duration, threshold, context = {}) {
    if (duration > threshold) {
      this.captureMessage(
        `Performance issue: ${operation} took ${duration}ms (threshold: ${threshold}ms)`,
        'warning',
        {
          operation,
          duration,
          threshold,
          ...context
        }
      );
    }
  }

  // Get error statistics
  getErrorStats() {
    const stats = {
      totalErrors: 0,
      errorTypes: {},
      patterns: {},
      topErrors: []
    };

    // Count by error type
    this.errorCounts.forEach((count, errorKey) => {
      stats.totalErrors += count;
      const [errorType] = errorKey.split(':');
      stats.errorTypes[errorType] = (stats.errorTypes[errorType] || 0) + count;
    });

    // Get top errors
    const sortedErrors = Array.from(this.errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    stats.topErrors = sortedErrors.map(([errorKey, count]) => ({
      error: errorKey,
      count
    }));

    // Pattern analysis
    this.errorPatterns.forEach((data, pattern) => {
      stats.patterns[pattern] = {
        count: data.count,
        firstSeen: data.firstSeen,
        lastSeen: data.lastSeen
      };
    });

    return stats;
  }

  // Express error handler middleware
  errorHandler() {
    return (err, req, res, next) => {
      // Capture the error
      this.captureException(err, {
        user: req.user,
        extra: {
          url: req.url,
          method: req.method,
          ip: req.ip,
          userAgent: req.get('user-agent')
        },
        tags: {
          handled: false
        }
      });

      // Log locally
      console.error('Unhandled error:', err);

      // Send error response
      const statusCode = err.statusCode || 500;
      const message = process.env.NODE_ENV === 'production' 
        ? 'An error occurred' 
        : err.message;

      res.status(statusCode).json({
        error: {
          message,
          code: err.code || 'INTERNAL_ERROR',
          statusCode
        }
      });
    };
  }

  // Async error wrapper
  asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  async shutdown() {
    if (this.config.enabled) {
      await Sentry.close(2000);
    }
  }
}

module.exports = ErrorTracker;