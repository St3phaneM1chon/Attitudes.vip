const express = require('express');
const router = express.Router();

// Monitoring middleware to attach to app
function setupMonitoring(app, monitoringService) {
  // Request monitoring middleware
  app.use(monitoringService.requestMonitoring());

  // APM middleware
  if (monitoringService.apm) {
    app.use(monitoringService.apm.middleware());
  }

  // Health check endpoints
  router.get('/health', monitoringService.healthCheck.getHealthCheckRoute());
  router.get('/health/live', (req, res) => res.status(200).json({ status: 'ok' }));
  router.get('/health/ready', async (req, res) => {
    const status = await monitoringService.healthCheck.getStatus();
    const isReady = status.status === 'healthy' || status.status === 'degraded';
    res.status(isReady ? 200 : 503).json({ ready: isReady });
  });

  // Metrics endpoint (handled by metrics collector on separate port)
  router.get('/metrics/business', async (req, res) => {
    try {
      const metrics = await monitoringService.businessMetrics.getMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Error stats endpoint
  router.get('/metrics/errors', (req, res) => {
    const stats = monitoringService.errorTracker.getErrorStats();
    res.json(stats);
  });

  // APM status
  router.get('/metrics/apm', async (req, res) => {
    const metrics = await monitoringService.apm.getMetrics();
    res.json(metrics);
  });

  // Tracing status
  router.get('/metrics/tracing', (req, res) => {
    const metrics = monitoringService.tracing.getMetrics();
    res.json(metrics);
  });

  // Combined monitoring status
  router.get('/monitoring/status', async (req, res) => {
    const [health, businessMetrics, apmMetrics, tracingMetrics, errorStats] = await Promise.all([
      monitoringService.healthCheck.getStatus(),
      monitoringService.businessMetrics.getMetrics(),
      monitoringService.apm.getMetrics(),
      monitoringService.tracing.getMetrics(),
      monitoringService.errorTracker.getErrorStats()
    ]);

    res.json({
      health,
      business: businessMetrics,
      apm: apmMetrics,
      tracing: tracingMetrics,
      errors: errorStats
    });
  });

  return router;
}

// Helper functions for manual metric tracking
const trackWeddingMetrics = (monitoringService) => {
  return {
    weddingCreated: (region, religion, packageType) => {
      monitoringService.businessMetrics.trackWeddingCreated(region, religion, packageType);
      monitoringService.trackEvent('wedding_created', { region, religion, packageType });
    },

    weddingBudgetSet: (amount, region, packageType) => {
      monitoringService.businessMetrics.trackWeddingBudget(amount, region, packageType);
    },

    guestInvited: (weddingSize) => {
      monitoringService.businessMetrics.trackGuestInvited(weddingSize);
    },

    guestResponded: (responseType) => {
      monitoringService.businessMetrics.trackEvent('guest_response', { responseType });
    }
  };
};

const trackVendorMetrics = (monitoringService) => {
  return {
    vendorRegistered: (vendorType, region) => {
      monitoringService.businessMetrics.trackVendorRegistration(vendorType, region);
      monitoringService.trackEvent('vendor_registered', { vendorType, region });
    },

    vendorRated: (vendorType, rating) => {
      monitoringService.businessMetrics.trackVendorRating(vendorType, rating);
    },

    vendorBooked: (vendorType, status) => {
      monitoringService.businessMetrics.trackVendorBooking(vendorType, status);
      monitoringService.trackEvent('vendor_booking', { vendorType, status });
    },

    vendorRevenue: (vendorType, region, amount) => {
      monitoringService.businessMetrics.trackVendorRevenue(vendorType, region, amount);
    }
  };
};

const trackUserMetrics = (monitoringService) => {
  return {
    userRegistered: (userType, source) => {
      monitoringService.businessMetrics.trackUserRegistration(userType, source);
      monitoringService.trackEvent('user_registered', { userType, source });
    },

    userLoggedIn: (userType, authProvider) => {
      monitoringService.businessMetrics.trackUserLogin(userType, authProvider);
    },

    dashboardViewed: (dashboardType, userType) => {
      monitoringService.businessMetrics.trackDashboardView(dashboardType, userType);
    },

    featureUsed: (featureName, userType) => {
      monitoringService.businessMetrics.trackFeatureUsage(featureName, userType);
    }
  };
};

const trackPaymentMetrics = (monitoringService) => {
  return {
    paymentProcessed: (paymentType, status, amount) => {
      monitoringService.businessMetrics.trackPayment(paymentType, status, amount);
      monitoringService.trackEvent('payment_processed', { paymentType, status, amount });
    },

    mrrUpdated: (planType, amount) => {
      monitoringService.businessMetrics.updateMRR(planType, amount);
    }
  };
};

const trackCommunicationMetrics = (monitoringService) => {
  return {
    messageSent: (messageType, channel) => {
      monitoringService.businessMetrics.trackMessage(messageType, channel);
    },

    notificationSent: (notificationType, deliveryStatus) => {
      monitoringService.businessMetrics.trackNotification(notificationType, deliveryStatus);
    }
  };
};

module.exports = {
  setupMonitoring,
  trackWeddingMetrics,
  trackVendorMetrics,
  trackUserMetrics,
  trackPaymentMetrics,
  trackCommunicationMetrics
};