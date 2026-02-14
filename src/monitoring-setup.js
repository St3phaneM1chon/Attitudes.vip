const MonitoringService = require('./services/monitoring');
const { setupMonitoring, trackWeddingMetrics, trackVendorMetrics, trackUserMetrics, trackPaymentMetrics } = require('./routes/monitoring');

// Initialize monitoring service
async function initializeMonitoring(app) {
  const monitoring = new MonitoringService({
    prometheusPort: process.env.PROMETHEUS_PORT || 9090,
    enableTracing: process.env.ENABLE_TRACING === 'true',
    enableAPM: process.env.ENABLE_APM === 'true',
    errorTrackingDSN: process.env.SENTRY_DSN
  });

  await monitoring.initialize();

  // Setup monitoring routes and middleware
  const monitoringRouter = setupMonitoring(app, monitoring);
  app.use('/api/monitoring', monitoringRouter);

  // Create metric tracking helpers
  const metrics = {
    wedding: trackWeddingMetrics(monitoring),
    vendor: trackVendorMetrics(monitoring),
    user: trackUserMetrics(monitoring),
    payment: trackPaymentMetrics(monitoring)
  };

  // Example: Track a wedding creation
  app.post('/api/weddings', async (req, res, next) => {
    try {
      // Your wedding creation logic here
      const wedding = await createWedding(req.body);
      
      // Track the metric
      metrics.wedding.weddingCreated(
        wedding.region,
        wedding.religion,
        wedding.packageType
      );
      
      // Track budget if provided
      if (wedding.budget) {
        metrics.wedding.weddingBudgetSet(
          wedding.budget,
          wedding.region,
          wedding.packageType
        );
      }

      res.json(wedding);
    } catch (error) {
      monitoring.trackError(error, {
        feature: 'wedding_creation',
        user: req.user
      });
      next(error);
    }
  });

  // Example: Track user login
  app.post('/api/auth/login', async (req, res, next) => {
    try {
      const result = await authenticateUser(req.body);
      
      // Track the metric
      metrics.user.userLoggedIn(
        result.user.type,
        result.authProvider
      );

      res.json(result);
    } catch (error) {
      monitoring.trackError(error, {
        feature: 'authentication',
        severity: 'warning'
      });
      next(error);
    }
  });

  // Example: Track vendor booking
  app.post('/api/vendors/:vendorId/book', async (req, res, next) => {
    const apmTransaction = monitoring.apm.trackVendorOperation(
      'booking',
      req.params.vendorType,
      req.params.vendorId
    );

    try {
      const booking = await createVendorBooking(req.params.vendorId, req.body);
      
      // Track the metric
      metrics.vendor.vendorBooked(
        booking.vendorType,
        'success'
      );

      apmTransaction.end('success');
      res.json(booking);
    } catch (error) {
      metrics.vendor.vendorBooked(
        req.body.vendorType,
        'failed'
      );

      monitoring.trackError(error, {
        feature: 'vendor_booking',
        vendor: { id: req.params.vendorId }
      });
      
      apmTransaction.end('failure');
      next(error);
    }
  });

  // Example: Track payment
  app.post('/api/payments', async (req, res, next) => {
    const span = monitoring.tracing.startSpan('payment.process', {
      attributes: {
        'payment.amount': req.body.amount,
        'payment.currency': req.body.currency
      }
    });

    try {
      const payment = await processPayment(req.body);
      
      // Track the metric
      metrics.payment.paymentProcessed(
        payment.type,
        payment.status,
        payment.amount
      );

      span.setTag('payment.status', payment.status);
      span.finish();
      
      res.json(payment);
    } catch (error) {
      monitoring.trackPaymentError(req.body.paymentId, error, {
        amount: req.body.amount,
        user: req.user
      });
      
      span.setTag('error', true);
      span.log({ event: 'error', message: error.message });
      span.finish();
      
      next(error);
    }
  });

  // Database query monitoring example
  const monitoredQuery = async (query, table) => {
    const dbSpan = monitoring.metrics.trackDatabaseQuery.bind(monitoring.metrics);
    const start = Date.now();
    
    try {
      const result = await db.query(query);
      dbSpan('query', table, Date.now() - start);
      return result;
    } catch (error) {
      dbSpan('query', table, Date.now() - start);
      throw error;
    }
  };

  // Cache monitoring example
  const monitoredCacheGet = async (key) => {
    const cacheTracker = monitoring.metrics.trackCacheOperation.bind(monitoring.metrics);
    
    try {
      const value = await redis.get(key);
      cacheTracker('redis', value !== null);
      return value;
    } catch (error) {
      cacheTracker('redis', false);
      throw error;
    }
  };

  // Error handler middleware (should be last)
  app.use(monitoring.errorTracker.errorHandler());

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down monitoring...');
    await monitoring.shutdown();
  });

  return { monitoring, metrics };
}

// Example usage in your main app.js:
/*
const express = require('express');
const app = express();

// ... other middleware ...

// Initialize monitoring
const { monitoring, metrics } = await initializeMonitoring(app);

// Now you can use monitoring throughout your app
app.locals.monitoring = monitoring;
app.locals.metrics = metrics;

// ... rest of your app ...
*/

module.exports = { initializeMonitoring };