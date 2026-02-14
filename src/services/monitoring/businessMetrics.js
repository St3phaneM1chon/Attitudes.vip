const promClient = require('prom-client');

class BusinessMetrics {
  constructor(config = {}) {
    this.config = config;
    this.register = new promClient.Registry();

    // Wedding-specific metrics
    this.weddingsCreated = new promClient.Counter({
      name: 'weddings_created_total',
      help: 'Total number of weddings created',
      labelNames: ['region', 'religion', 'package_type'],
      registers: [this.register]
    });

    this.activeWeddings = new promClient.Gauge({
      name: 'active_weddings',
      help: 'Number of active weddings',
      labelNames: ['status', 'region'],
      registers: [this.register]
    });

    this.weddingBudget = new promClient.Histogram({
      name: 'wedding_budget_usd',
      help: 'Wedding budget distribution in USD',
      labelNames: ['region', 'package_type'],
      buckets: [1000, 5000, 10000, 25000, 50000, 100000, 250000],
      registers: [this.register]
    });

    // Guest metrics
    this.guestsInvited = new promClient.Counter({
      name: 'guests_invited_total',
      help: 'Total number of guests invited',
      labelNames: ['wedding_size'],
      registers: [this.register]
    });

    this.guestResponseRate = new promClient.Gauge({
      name: 'guest_response_rate',
      help: 'Guest RSVP response rate',
      labelNames: ['response_type'],
      registers: [this.register]
    });

    // Vendor metrics
    this.vendorsRegistered = new promClient.Counter({
      name: 'vendors_registered_total',
      help: 'Total number of vendors registered',
      labelNames: ['vendor_type', 'region'],
      registers: [this.register]
    });

    this.vendorRatings = new promClient.Histogram({
      name: 'vendor_ratings',
      help: 'Vendor rating distribution',
      labelNames: ['vendor_type'],
      buckets: [1, 2, 3, 4, 5],
      registers: [this.register]
    });

    this.vendorBookings = new promClient.Counter({
      name: 'vendor_bookings_total',
      help: 'Total number of vendor bookings',
      labelNames: ['vendor_type', 'booking_status'],
      registers: [this.register]
    });

    this.vendorRevenue = new promClient.Counter({
      name: 'vendor_revenue_usd_total',
      help: 'Total vendor revenue in USD',
      labelNames: ['vendor_type', 'region'],
      registers: [this.register]
    });

    // User engagement metrics
    this.userRegistrations = new promClient.Counter({
      name: 'user_registrations_total',
      help: 'Total number of user registrations',
      labelNames: ['user_type', 'registration_source'],
      registers: [this.register]
    });

    this.userLogins = new promClient.Counter({
      name: 'user_logins_total',
      help: 'Total number of user logins',
      labelNames: ['user_type', 'auth_provider'],
      registers: [this.register]
    });

    this.dashboardViews = new promClient.Counter({
      name: 'dashboard_views_total',
      help: 'Total number of dashboard views',
      labelNames: ['dashboard_type', 'user_type'],
      registers: [this.register]
    });

    this.featureUsage = new promClient.Counter({
      name: 'feature_usage_total',
      help: 'Feature usage tracking',
      labelNames: ['feature_name', 'user_type'],
      registers: [this.register]
    });

    // Payment metrics
    this.paymentsProcessed = new promClient.Counter({
      name: 'payments_processed_total',
      help: 'Total number of payments processed',
      labelNames: ['payment_type', 'status'],
      registers: [this.register]
    });

    this.paymentAmount = new promClient.Histogram({
      name: 'payment_amount_usd',
      help: 'Payment amount distribution in USD',
      labelNames: ['payment_type'],
      buckets: [10, 50, 100, 500, 1000, 5000, 10000],
      registers: [this.register]
    });

    this.subscriptionMRR = new promClient.Gauge({
      name: 'subscription_mrr_usd',
      help: 'Monthly Recurring Revenue in USD',
      labelNames: ['plan_type'],
      registers: [this.register]
    });

    // Communication metrics
    this.messagessSent = new promClient.Counter({
      name: 'messages_sent_total',
      help: 'Total number of messages sent',
      labelNames: ['message_type', 'channel'],
      registers: [this.register]
    });

    this.notificationsSent = new promClient.Counter({
      name: 'notifications_sent_total',
      help: 'Total number of notifications sent',
      labelNames: ['notification_type', 'delivery_status'],
      registers: [this.register]
    });

    // Performance metrics
    this.taskCompletionTime = new promClient.Histogram({
      name: 'task_completion_time_hours',
      help: 'Time to complete wedding planning tasks',
      labelNames: ['task_type'],
      buckets: [1, 6, 12, 24, 48, 168, 720],
      registers: [this.register]
    });

    this.customerSatisfaction = new promClient.Gauge({
      name: 'customer_satisfaction_score',
      help: 'Customer satisfaction score (1-10)',
      labelNames: ['survey_type'],
      registers: [this.register]
    });

    // Regional metrics
    this.regionalActivity = new promClient.Counter({
      name: 'regional_activity_total',
      help: 'Activity by region',
      labelNames: ['region', 'activity_type'],
      registers: [this.register]
    });

    // Custom event tracking
    this.customEvents = new promClient.Counter({
      name: 'custom_events_total',
      help: 'Custom business events',
      labelNames: ['event_name', 'category'],
      registers: [this.register]
    });
  }

  async initialize() {
    console.log('Business metrics initialized');
  }

  // Wedding metrics methods
  trackWeddingCreated(region, religion, packageType) {
    this.weddingsCreated.inc({ region, religion, package_type: packageType });
    this.updateActiveWeddings();
  }

  trackWeddingBudget(amount, region, packageType) {
    this.weddingBudget.observe({ region, package_type: packageType }, amount);
  }

  async updateActiveWeddings() {
    // This would query the database for actual counts
    const mockData = {
      planning: { 'north-america': 150, 'europe': 120, 'asia': 200 },
      active: { 'north-america': 50, 'europe': 40, 'asia': 80 },
      completed: { 'north-america': 500, 'europe': 400, 'asia': 600 }
    };

    for (const [status, regions] of Object.entries(mockData)) {
      for (const [region, count] of Object.entries(regions)) {
        this.activeWeddings.set({ status, region }, count);
      }
    }
  }

  // Guest metrics methods
  trackGuestInvited(weddingSize) {
    this.guestsInvited.inc({ wedding_size: weddingSize });
  }

  updateGuestResponseRate(accepted, declined, pending) {
    const total = accepted + declined + pending;
    if (total > 0) {
      this.guestResponseRate.set({ response_type: 'accepted' }, (accepted / total) * 100);
      this.guestResponseRate.set({ response_type: 'declined' }, (declined / total) * 100);
      this.guestResponseRate.set({ response_type: 'pending' }, (pending / total) * 100);
    }
  }

  // Vendor metrics methods
  trackVendorRegistration(vendorType, region) {
    this.vendorsRegistered.inc({ vendor_type: vendorType, region });
  }

  trackVendorRating(vendorType, rating) {
    this.vendorRatings.observe({ vendor_type: vendorType }, rating);
  }

  trackVendorBooking(vendorType, status) {
    this.vendorBookings.inc({ vendor_type: vendorType, booking_status: status });
  }

  trackVendorRevenue(vendorType, region, amount) {
    this.vendorRevenue.inc({ vendor_type: vendorType, region }, amount);
  }

  // User engagement methods
  trackUserRegistration(userType, source) {
    this.userRegistrations.inc({ user_type: userType, registration_source: source });
  }

  trackUserLogin(userType, authProvider) {
    this.userLogins.inc({ user_type: userType, auth_provider: authProvider });
  }

  trackDashboardView(dashboardType, userType) {
    this.dashboardViews.inc({ dashboard_type: dashboardType, user_type: userType });
  }

  trackFeatureUsage(featureName, userType) {
    this.featureUsage.inc({ feature_name: featureName, user_type: userType });
  }

  // Payment metrics methods
  trackPayment(paymentType, status, amount) {
    this.paymentsProcessed.inc({ payment_type: paymentType, status });
    if (status === 'success') {
      this.paymentAmount.observe({ payment_type: paymentType }, amount);
    }
  }

  updateMRR(planType, amount) {
    this.subscriptionMRR.set({ plan_type: planType }, amount);
  }

  // Communication metrics methods
  trackMessage(messageType, channel) {
    this.messagessSent.inc({ message_type: messageType, channel });
  }

  trackNotification(notificationType, deliveryStatus) {
    this.notificationsSent.inc({ notification_type: notificationType, delivery_status: deliveryStatus });
  }

  // Performance metrics methods
  trackTaskCompletion(taskType, hoursToComplete) {
    this.taskCompletionTime.observe({ task_type: taskType }, hoursToComplete);
  }

  updateCustomerSatisfaction(surveyType, score) {
    this.customerSatisfaction.set({ survey_type: surveyType }, score);
  }

  // Regional metrics methods
  trackRegionalActivity(region, activityType) {
    this.regionalActivity.inc({ region, activity_type: activityType });
  }

  // Custom event tracking
  trackEvent(eventName, properties = {}) {
    const category = properties.category || 'general';
    this.customEvents.inc({ event_name: eventName, category });
  }

  async getMetrics() {
    return {
      weddings: {
        created: await this.weddingsCreated.get(),
        active: await this.activeWeddings.get(),
        avgBudget: await this.weddingBudget.get()
      },
      vendors: {
        registered: await this.vendorsRegistered.get(),
        bookings: await this.vendorBookings.get(),
        revenue: await this.vendorRevenue.get()
      },
      users: {
        registrations: await this.userRegistrations.get(),
        logins: await this.userLogins.get(),
        engagement: await this.dashboardViews.get()
      },
      payments: {
        processed: await this.paymentsProcessed.get(),
        mrr: await this.subscriptionMRR.get()
      }
    };
  }
}

module.exports = BusinessMetrics;