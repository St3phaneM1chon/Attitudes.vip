const request = require('supertest');
const app = require('../../../src/auth/auth-service');
const { 
  createUser,
  createWedding,
  createPayment,
  createVendorBooking
} = require('./factories');
const { 
  generateTestToken, 
  setupTestEnvironment,
  wait
} = require('./setup');

setupTestEnvironment();

describe('Payment Flow Integration Tests', () => {
  let authToken;
  let userId;
  let weddingId;
  
  beforeEach(async () => {
    // Create user, authenticate, and create wedding
    const user = createUser();
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(user);
    
    userId = registerResponse.body.data.user.id;
    authToken = registerResponse.body.data.token;
    
    const wedding = createWedding(userId);
    const weddingResponse = await request(app)
      .post('/api/weddings')
      .set('Authorization', `Bearer ${authToken}`)
      .send(wedding);
    
    weddingId = weddingResponse.body.data.id;
  });

  describe('POST /api/payments/create-intent', () => {
    it('should create payment intent for wedding services', async () => {
      const paymentData = {
        amount: 5000, // $50.00
        currency: 'USD',
        description: 'Wedding planning services',
        metadata: {
          weddingId,
          type: 'planning_fee'
        }
      };
      
      const response = await request(app)
        .post('/api/payments/create-intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('clientSecret');
      expect(response.body.data).toHaveProperty('paymentIntentId');
      expect(response.body.data.amount).toBe(5000);
    });

    it('should validate minimum payment amount', async () => {
      const response = await request(app)
        .post('/api/payments/create-intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 50, // Too low - $0.50
          currency: 'USD'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('minimum');
    });

    it('should support different currencies', async () => {
      const currencies = ['USD', 'EUR', 'GBP', 'CAD'];
      
      for (const currency of currencies) {
        const response = await request(app)
          .post('/api/payments/create-intent')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            amount: 10000,
            currency,
            description: `Test payment in ${currency}`
          })
          .expect(200);

        expect(response.body.data.currency).toBe(currency.toLowerCase());
      }
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/payments/create-intent')
        .send({
          amount: 5000,
          currency: 'USD'
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/payments/confirm', () => {
    let paymentIntentId;
    
    beforeEach(async () => {
      // Create payment intent first
      const intentResponse = await request(app)
        .post('/api/payments/create-intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 10000,
          currency: 'USD',
          description: 'Vendor booking payment'
        });
      
      paymentIntentId = intentResponse.body.data.paymentIntentId;
    });

    it('should confirm payment and update status', async () => {
      const response = await request(app)
        .post('/api/payments/confirm')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentIntentId,
          paymentMethodId: 'pm_card_visa' // Test payment method
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('status');
      expect(['processing', 'succeeded']).toContain(response.body.data.status);
    });

    it('should handle payment failures gracefully', async () => {
      const response = await request(app)
        .post('/api/payments/confirm')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentIntentId,
          paymentMethodId: 'pm_card_declined' // Test declined card
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('declined');
    });

    it('should prevent confirming already confirmed payments', async () => {
      // First confirmation
      await request(app)
        .post('/api/payments/confirm')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentIntentId,
          paymentMethodId: 'pm_card_visa'
        })
        .expect(200);

      // Second confirmation attempt
      const response = await request(app)
        .post('/api/payments/confirm')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentIntentId,
          paymentMethodId: 'pm_card_visa'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('already');
    });
  });

  describe('GET /api/payments', () => {
    beforeEach(async () => {
      // Create some test payments
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/payments/create-intent')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            amount: (i + 1) * 1000,
            currency: 'USD',
            description: `Test payment ${i + 1}`
          });
      }
    });

    it('should list user payments', async () => {
      const response = await request(app)
        .get('/api/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(5);
    });

    it('should filter payments by status', async () => {
      const response = await request(app)
        .get('/api/payments?status=requires_payment_method')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      if (response.body.data.length > 0) {
        expect(response.body.data.every(p => p.status === 'requires_payment_method')).toBe(true);
      }
    });

    it('should filter payments by date range', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();
      
      const response = await request(app)
        .get(`/api/payments?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      response.body.data.forEach(payment => {
        const paymentDate = new Date(payment.createdAt);
        expect(paymentDate >= startDate).toBe(true);
        expect(paymentDate <= endDate).toBe(true);
      });
    });

    it('should not show other users payments', async () => {
      // Create another user with payments
      const otherUser = createUser();
      const otherRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send(otherUser);
      
      const otherToken = otherRegisterResponse.body.data.token;
      
      await request(app)
        .post('/api/payments/create-intent')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          amount: 99999,
          currency: 'USD',
          description: 'Other user payment'
        });

      // Get first user's payments
      const response = await request(app)
        .get('/api/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should not contain the 99999 amount payment
      expect(response.body.data.some(p => p.amount === 99999)).toBe(false);
    });
  });

  describe('GET /api/payments/:id', () => {
    let paymentId;
    
    beforeEach(async () => {
      const paymentResponse = await request(app)
        .post('/api/payments/create-intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 7500,
          currency: 'USD',
          description: 'Venue booking'
        });
      
      paymentId = paymentResponse.body.data.id;
    });

    it('should get payment details', async () => {
      const response = await request(app)
        .get(`/api/payments/${paymentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.id).toBe(paymentId);
      expect(response.body.data.amount).toBe(7500);
      expect(response.body.data.description).toBe('Venue booking');
    });

    it('should not allow access to other users payment', async () => {
      const otherUser = createUser();
      const otherRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send(otherUser);
      
      const otherToken = otherRegisterResponse.body.data.token;
      
      const response = await request(app)
        .get(`/api/payments/${paymentId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('Payment Webhooks', () => {
    it('should handle successful payment webhook', async () => {
      const webhookPayload = {
        id: 'evt_test123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test123',
            amount: 10000,
            currency: 'usd',
            status: 'succeeded',
            metadata: {
              userId,
              weddingId
            }
          }
        }
      };
      
      const response = await request(app)
        .post('/api/payments/webhook')
        .set('stripe-signature', 'test_signature')
        .send(webhookPayload)
        .expect(200);

      expect(response.body).toHaveProperty('received', true);
    });

    it('should handle failed payment webhook', async () => {
      const webhookPayload = {
        id: 'evt_test456',
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_test456',
            amount: 5000,
            currency: 'usd',
            status: 'failed',
            last_payment_error: {
              message: 'Card declined'
            },
            metadata: {
              userId,
              weddingId
            }
          }
        }
      };
      
      const response = await request(app)
        .post('/api/payments/webhook')
        .set('stripe-signature', 'test_signature')
        .send(webhookPayload)
        .expect(200);

      expect(response.body).toHaveProperty('received', true);
    });

    it('should validate webhook signatures', async () => {
      const response = await request(app)
        .post('/api/payments/webhook')
        .send({ type: 'payment_intent.succeeded' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('signature');
    });
  });

  describe('Refunds', () => {
    let paymentId;
    
    beforeEach(async () => {
      // Create and confirm a payment
      const intentResponse = await request(app)
        .post('/api/payments/create-intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 15000,
          currency: 'USD',
          description: 'Catering service'
        });
      
      paymentId = intentResponse.body.data.id;
      const paymentIntentId = intentResponse.body.data.paymentIntentId;
      
      // Confirm payment
      await request(app)
        .post('/api/payments/confirm')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentIntentId,
          paymentMethodId: 'pm_card_visa'
        });
    });

    it('should process full refund', async () => {
      const response = await request(app)
        .post(`/api/payments/${paymentId}/refund`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'Event cancelled'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('refundId');
      expect(response.body.data.amount).toBe(15000);
      expect(response.body.data.status).toBe('pending');
    });

    it('should process partial refund', async () => {
      const response = await request(app)
        .post(`/api/payments/${paymentId}/refund`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 5000, // Refund $50 of $150
          reason: 'Service partially delivered'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.amount).toBe(5000);
    });

    it('should not refund more than payment amount', async () => {
      const response = await request(app)
        .post(`/api/payments/${paymentId}/refund`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 20000, // More than original payment
          reason: 'Test'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('exceeds');
    });

    it('should track refund history', async () => {
      // Process multiple partial refunds
      await request(app)
        .post(`/api/payments/${paymentId}/refund`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 3000, reason: 'Refund 1' });
      
      await request(app)
        .post(`/api/payments/${paymentId}/refund`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 2000, reason: 'Refund 2' });
      
      // Get payment with refund history
      const response = await request(app)
        .get(`/api/payments/${paymentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('refunds');
      expect(response.body.data.refunds).toHaveLength(2);
      expect(response.body.data.totalRefunded).toBe(5000);
    });
  });

  describe('Payment Methods', () => {
    it('should save payment method for future use', async () => {
      const response = await request(app)
        .post('/api/payments/methods')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentMethodId: 'pm_card_visa',
          setAsDefault: true
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.isDefault).toBe(true);
    });

    it('should list saved payment methods', async () => {
      // Save a payment method first
      await request(app)
        .post('/api/payments/methods')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ paymentMethodId: 'pm_card_visa' });
      
      const response = await request(app)
        .get('/api/payments/methods')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('last4');
      expect(response.body.data[0]).toHaveProperty('brand');
    });

    it('should delete payment method', async () => {
      // Save a payment method
      const saveResponse = await request(app)
        .post('/api/payments/methods')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ paymentMethodId: 'pm_card_mastercard' });
      
      const methodId = saveResponse.body.data.id;
      
      const response = await request(app)
        .delete(`/api/payments/methods/${methodId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      
      // Verify it's deleted
      const listResponse = await request(app)
        .get('/api/payments/methods')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(listResponse.body.data.find(m => m.id === methodId)).toBeUndefined();
    });
  });

  describe('Invoice Generation', () => {
    it('should generate invoice for payment', async () => {
      // Create a confirmed payment
      const intentResponse = await request(app)
        .post('/api/payments/create-intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 25000,
          currency: 'USD',
          description: 'Wedding package'
        });
      
      const paymentId = intentResponse.body.data.id;
      
      const response = await request(app)
        .get(`/api/payments/${paymentId}/invoice`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('application/pdf');
      expect(response.headers['content-disposition']).toContain('invoice');
    });
  });

  describe('Payment Summary and Statistics', () => {
    beforeEach(async () => {
      // Create various payments
      const payments = [
        { amount: 5000, status: 'succeeded' },
        { amount: 10000, status: 'succeeded' },
        { amount: 3000, status: 'failed' },
        { amount: 7500, status: 'pending' }
      ];
      
      for (const payment of payments) {
        await request(app)
          .post('/api/payments/create-intent')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            amount: payment.amount,
            currency: 'USD',
            description: `Test ${payment.status}`
          });
      }
    });

    it('should get payment summary for wedding', async () => {
      const response = await request(app)
        .get(`/api/weddings/${weddingId}/payment-summary`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('totalPaid');
      expect(response.body.data).toHaveProperty('totalPending');
      expect(response.body.data).toHaveProperty('totalFailed');
      expect(response.body.data).toHaveProperty('paymentsByCategory');
    });
  });
});