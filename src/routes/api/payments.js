const express = require('express');
const router = express.Router();
const { authenticate } = require('../../auth/middleware/security');
const { body, validationResult } = require('express-validator');
const stripeService = require('../../services/payment/stripe-service');
const db = require('../../services/database/db-service');

// POST /api/v1/payments/create-session
router.post('/create-session', authenticate, [
  body('weddingId').isUUID(),
  body('vendorId').isUUID(),
  body('amount').isFloat({ min: 1 }),
  body('description').trim().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { weddingId, vendorId, amount, description, metadata } = req.body;
    const userId = req.user.id;

    // Vérifier l'accès au mariage
    const hasAccess = await checkWeddingAccess(userId, weddingId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Créer la session de paiement
    const session = await stripeService.createWeddingPaymentSession(
      weddingId,
      vendorId,
      amount,
      description,
      metadata
    );

    res.json({
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('Error creating payment session:', error);
    res.status(500).json({ error: 'Failed to create payment session' });
  }
});

// GET /api/v1/payments/history/:weddingId
router.get('/history/:weddingId', authenticate, async (req, res) => {
  try {
    const { weddingId } = req.params;
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;

    const hasAccess = await checkWeddingAccess(userId, weddingId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const history = await stripeService.getPaymentHistory(weddingId, limit);
    res.json(history);
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

// GET /api/v1/payments/metrics/:weddingId
router.get('/metrics/:weddingId', authenticate, async (req, res) => {
  try {
    const { weddingId } = req.params;
    const userId = req.user.id;

    const hasAccess = await checkWeddingAccess(userId, weddingId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const metrics = await stripeService.getPaymentMetrics(weddingId);
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching payment metrics:', error);
    res.status(500).json({ error: 'Failed to fetch payment metrics' });
  }
});

// POST /api/v1/payments/create-invoice
router.post('/create-invoice', authenticate, [
  body('weddingId').isUUID(),
  body('vendorId').isUUID(),
  body('items').isArray().notEmpty(),
  body('items.*.description').trim().notEmpty(),
  body('items.*.amount').isFloat({ min: 0 }),
  body('dueDate').isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { weddingId, vendorId, items, dueDate } = req.body;
    const userId = req.user.id;

    const hasAccess = await checkWeddingAccess(userId, weddingId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const invoice = await stripeService.createInvoice(
      weddingId,
      vendorId,
      items,
      dueDate
    );

    res.json({
      invoiceId: invoice.id,
      url: invoice.hosted_invoice_url,
      pdf: invoice.invoice_pdf,
      amountDue: invoice.amount_due / 100
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// POST /api/v1/payments/create-subscription
router.post('/create-subscription', authenticate, [
  body('planType').isIn(['standard', 'premium', 'enterprise'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { planType } = req.body;
    const userId = req.user.id;

    // Vérifier que l'utilisateur est un client (marque blanche)
    if (req.user.role !== 'client') {
      return res.status(403).json({ error: 'Subscriptions are only for white-label clients' });
    }

    const subscription = await stripeService.createSubscriptionPlan(userId, planType);
    
    res.json({
      productId: subscription.product.id,
      priceId: subscription.price.id,
      plan: subscription.plan
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// POST /api/v1/payments/create-payment-link
router.post('/create-payment-link', authenticate, [
  body('vendorId').isUUID(),
  body('amounts').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { vendorId, amounts } = req.body;
    const userId = req.user.id;

    // Vérifier que l'utilisateur a accès au vendeur
    const vendorAccess = await db.query(`
      SELECT 1 FROM vendors v
      JOIN wedding_vendors wv ON v.id = wv.vendor_id
      JOIN user_weddings uw ON wv.wedding_id = uw.wedding_id
      WHERE v.id = $1 AND uw.user_id = $2
    `, [vendorId, userId]);

    if (vendorAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const paymentLink = await stripeService.createPaymentLink(vendorId, amounts);
    
    res.json({
      url: paymentLink.url,
      id: paymentLink.id
    });
  } catch (error) {
    console.error('Error creating payment link:', error);
    res.status(500).json({ error: 'Failed to create payment link' });
  }
});

// POST /api/v1/payments/webhook
router.post('/webhook', 
  express.raw({ type: 'application/json' }), 
  async (req, res) => {
    try {
      const signature = req.headers['stripe-signature'];
      
      if (!signature) {
        return res.status(400).json({ error: 'Missing signature' });
      }

      const result = await stripeService.handleWebhook(signature, req.body);
      res.json(result);
    } catch (error) {
      console.error('Webhook error:', error);
      
      if (error.message === 'Invalid signature') {
        return res.status(400).json({ error: 'Invalid signature' });
      }
      
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
);

// GET /api/v1/payments/session/:sessionId
router.get('/session/:sessionId', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await stripeService.stripe.checkout.sessions.retrieve(sessionId);
    
    // Vérifier l'accès
    const { weddingId } = session.metadata;
    const hasAccess = await checkWeddingAccess(req.user.id, weddingId);
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      status: session.payment_status,
      amount: session.amount_total / 100,
      currency: session.currency,
      customerEmail: session.customer_email
    });
  } catch (error) {
    console.error('Error retrieving session:', error);
    res.status(500).json({ error: 'Failed to retrieve session' });
  }
});

// Helper function
async function checkWeddingAccess(userId, weddingId) {
  const result = await db.query(`
    SELECT 1 FROM user_weddings 
    WHERE user_id = $1 AND wedding_id = $2 AND is_active = true
  `, [userId, weddingId]);
  
  return result.rows.length > 0;
}

module.exports = router;