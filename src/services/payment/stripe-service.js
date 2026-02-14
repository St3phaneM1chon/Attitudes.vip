const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../database/db-service');
const logger = require('../../utils/logger');

class StripeService {
  constructor() {
    this.stripe = stripe;
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  }

  /**
   * Créer un client Stripe
   */
  async createCustomer(userId, email, metadata = {}) {
    try {
      const customer = await this.stripe.customers.create({
        email,
        metadata: {
          userId,
          ...metadata
        }
      });

      // Sauvegarder l'ID client Stripe
      await db.query(
        'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
        [customer.id, userId]
      );

      return customer;
    } catch (error) {
      logger.error('Error creating Stripe customer:', error);
      throw error;
    }
  }

  /**
   * Créer une session de paiement pour un mariage
   */
  async createWeddingPaymentSession(weddingId, vendorId, amount, description, metadata = {}) {
    try {
      // Récupérer les détails
      const weddingResult = await db.query(
        'SELECT * FROM weddings WHERE id = $1',
        [weddingId]
      );
      const wedding = weddingResult.rows[0];

      const vendorResult = await db.query(
        'SELECT * FROM vendors WHERE id = $1',
        [vendorId]
      );
      const vendor = vendorResult.rows[0];

      // Créer la session Stripe Checkout
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card', 'sepa_debit'],
        line_items: [{
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${vendor.name} - ${description}`,
              description: `Paiement pour ${wedding.partner1_name} & ${wedding.partner2_name}`,
              metadata: {
                weddingId,
                vendorId,
                vendorCategory: vendor.category
              }
            },
            unit_amount: Math.round(amount * 100) // Stripe utilise les centimes
          },
          quantity: 1
        }],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL}/dashboard/customer?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/dashboard/customer?payment=cancelled`,
        metadata: {
          weddingId,
          vendorId,
          type: 'vendor_payment',
          ...metadata
        },
        payment_intent_data: {
          metadata: {
            weddingId,
            vendorId
          }
        }
      });

      // Enregistrer la session en base
      await db.query(`
        INSERT INTO payment_sessions (
          wedding_id, vendor_id, stripe_session_id, 
          amount, status, created_at
        ) VALUES ($1, $2, $3, $4, 'pending', CURRENT_TIMESTAMP)
      `, [weddingId, vendorId, session.id, amount]);

      return session;
    } catch (error) {
      logger.error('Error creating payment session:', error);
      throw error;
    }
  }

  /**
   * Créer un plan d'abonnement pour les clients (marque blanche)
   */
  async createSubscriptionPlan(clientId, planType = 'standard') {
    try {
      const plans = {
        standard: {
          name: 'Attitudes.vip Standard',
          amount: 9900, // 99€/mois
          interval: 'month',
          features: ['5 mariages actifs', 'Support email', 'Rapports basiques']
        },
        premium: {
          name: 'Attitudes.vip Premium',
          amount: 19900, // 199€/mois
          interval: 'month',
          features: ['Mariages illimités', 'Support prioritaire', 'Rapports avancés', 'API access']
        },
        enterprise: {
          name: 'Attitudes.vip Enterprise',
          amount: 49900, // 499€/mois
          interval: 'month',
          features: ['Tout Premium', 'SLA garanti', 'Formation équipe', 'Personnalisation']
        }
      };

      const plan = plans[planType];

      // Créer le produit
      const product = await this.stripe.products.create({
        name: plan.name,
        metadata: {
          clientId,
          planType,
          features: JSON.stringify(plan.features)
        }
      });

      // Créer le prix
      const price = await this.stripe.prices.create({
        product: product.id,
        unit_amount: plan.amount,
        currency: 'eur',
        recurring: {
          interval: plan.interval
        }
      });

      return { product, price, plan };
    } catch (error) {
      logger.error('Error creating subscription plan:', error);
      throw error;
    }
  }

  /**
   * Créer un lien de paiement réutilisable
   */
  async createPaymentLink(vendorId, presetAmounts = [50, 100, 200, 500]) {
    try {
      const vendorResult = await db.query(
        'SELECT * FROM vendors WHERE id = $1',
        [vendorId]
      );
      const vendor = vendorResult.rows[0];

      // Créer plusieurs prix pour le vendeur
      const prices = await Promise.all(
        presetAmounts.map(amount => 
          this.stripe.prices.create({
            currency: 'eur',
            unit_amount: amount * 100,
            product_data: {
              name: `Acompte ${vendor.name}`,
              metadata: {
                vendorId,
                type: 'deposit'
              }
            }
          })
        )
      );

      // Créer le lien de paiement
      const paymentLink = await this.stripe.paymentLinks.create({
        line_items: prices.map(price => ({
          price: price.id,
          quantity: 1
        })),
        metadata: {
          vendorId,
          vendorName: vendor.name
        },
        after_completion: {
          type: 'redirect',
          redirect: {
            url: `${process.env.FRONTEND_URL}/payment/success`
          }
        }
      });

      // Sauvegarder le lien
      await db.query(
        'UPDATE vendors SET stripe_payment_link = $1 WHERE id = $2',
        [paymentLink.url, vendorId]
      );

      return paymentLink;
    } catch (error) {
      logger.error('Error creating payment link:', error);
      throw error;
    }
  }

  /**
   * Gérer les webhooks Stripe
   */
  async handleWebhook(signature, payload) {
    let event;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret
      );
    } catch (error) {
      logger.error('Webhook signature verification failed:', error);
      throw new Error('Invalid signature');
    }

    // Traiter l'événement
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutComplete(event.data.object);
        break;

      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionChange(event.data.object);
        break;

      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object);
        break;

      default:
        logger.info(`Unhandled webhook event: ${event.type}`);
    }

    return { received: true };
  }

  /**
   * Traiter une session de checkout complétée
   */
  async handleCheckoutComplete(session) {
    try {
      const { weddingId, vendorId } = session.metadata;

      // Mettre à jour le statut du paiement
      await db.query(`
        UPDATE payment_sessions 
        SET status = 'completed', completed_at = CURRENT_TIMESTAMP
        WHERE stripe_session_id = $1
      `, [session.id]);

      // Créer l'enregistrement du paiement
      await db.query(`
        INSERT INTO payments (
          wedding_id, vendor_id, amount, currency,
          stripe_payment_intent_id, status, paid_at
        ) VALUES ($1, $2, $3, $4, $5, 'paid', CURRENT_TIMESTAMP)
      `, [
        weddingId,
        vendorId,
        session.amount_total / 100,
        session.currency,
        session.payment_intent
      ]);

      // Mettre à jour le statut du vendeur
      await db.query(`
        UPDATE wedding_vendors 
        SET payment_status = 'partial', last_payment_date = CURRENT_TIMESTAMP
        WHERE wedding_id = $1 AND vendor_id = $2
      `, [weddingId, vendorId]);

      // Envoyer une notification
      const io = require('../../app').get('io');
      io.to(`wedding:${weddingId}`).emit('payment_completed', {
        vendorId,
        amount: session.amount_total / 100,
        currency: session.currency
      });

      logger.info(`Payment completed for wedding ${weddingId}, vendor ${vendorId}`);
    } catch (error) {
      logger.error('Error handling checkout complete:', error);
      throw error;
    }
  }

  /**
   * Traiter un paiement réussi
   */
  async handlePaymentSuccess(paymentIntent) {
    try {
      const { weddingId, vendorId } = paymentIntent.metadata;

      // Mettre à jour les dépenses du mariage
      await db.query(`
        INSERT INTO expenses (
          wedding_id, vendor_id, amount, description,
          payment_method, transaction_id, date
        ) VALUES ($1, $2, $3, $4, 'stripe', $5, CURRENT_TIMESTAMP)
      `, [
        weddingId,
        vendorId,
        paymentIntent.amount / 100,
        paymentIntent.description || 'Paiement vendeur',
        paymentIntent.id
      ]);

      // Notifier via WebSocket
      const io = require('../../app').get('io');
      io.to(`wedding:${weddingId}`).emit('expense_added', {
        vendorId,
        amount: paymentIntent.amount / 100,
        paymentIntentId: paymentIntent.id
      });
    } catch (error) {
      logger.error('Error handling payment success:', error);
    }
  }

  /**
   * Traiter un paiement échoué
   */
  async handlePaymentFailed(paymentIntent) {
    try {
      const { weddingId, vendorId } = paymentIntent.metadata;

      // Enregistrer l'échec
      await db.query(`
        INSERT INTO payment_failures (
          wedding_id, vendor_id, amount, 
          stripe_payment_intent_id, error_message, failed_at
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      `, [
        weddingId,
        vendorId,
        paymentIntent.amount / 100,
        paymentIntent.id,
        paymentIntent.last_payment_error?.message
      ]);

      // Notifier
      const io = require('../../app').get('io');
      io.to(`wedding:${weddingId}`).emit('payment_failed', {
        vendorId,
        amount: paymentIntent.amount / 100,
        error: paymentIntent.last_payment_error?.message
      });
    } catch (error) {
      logger.error('Error handling payment failure:', error);
    }
  }

  /**
   * Obtenir l'historique des paiements
   */
  async getPaymentHistory(weddingId, limit = 20) {
    try {
      const result = await db.query(`
        SELECT 
          p.*,
          v.name as vendor_name,
          v.category as vendor_category
        FROM payments p
        LEFT JOIN vendors v ON p.vendor_id = v.id
        WHERE p.wedding_id = $1
        ORDER BY p.paid_at DESC
        LIMIT $2
      `, [weddingId, limit]);

      return result.rows;
    } catch (error) {
      logger.error('Error fetching payment history:', error);
      throw error;
    }
  }

  /**
   * Obtenir les métriques de paiement
   */
  async getPaymentMetrics(weddingId) {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(*) as total_payments,
          SUM(amount) as total_paid,
          COUNT(DISTINCT vendor_id) as vendors_paid,
          AVG(amount) as average_payment,
          MAX(amount) as largest_payment,
          MIN(paid_at) as first_payment,
          MAX(paid_at) as last_payment
        FROM payments
        WHERE wedding_id = $1 AND status = 'paid'
      `, [weddingId]);

      const metrics = result.rows[0];

      // Ajouter la répartition par catégorie
      const categoryResult = await db.query(`
        SELECT 
          v.category,
          COUNT(p.*) as payment_count,
          SUM(p.amount) as total_amount
        FROM payments p
        JOIN vendors v ON p.vendor_id = v.id
        WHERE p.wedding_id = $1 AND p.status = 'paid'
        GROUP BY v.category
        ORDER BY total_amount DESC
      `, [weddingId]);

      metrics.byCategory = categoryResult.rows;

      return metrics;
    } catch (error) {
      logger.error('Error fetching payment metrics:', error);
      throw error;
    }
  }

  /**
   * Créer une facture
   */
  async createInvoice(weddingId, vendorId, items, dueDate) {
    try {
      // Récupérer les informations nécessaires
      const vendorResult = await db.query(
        'SELECT * FROM vendors WHERE id = $1',
        [vendorId]
      );
      const vendor = vendorResult.rows[0];

      const weddingResult = await db.query(
        'SELECT * FROM weddings WHERE id = $1',
        [weddingId]
      );
      const wedding = weddingResult.rows[0];

      const userResult = await db.query(`
        SELECT u.*, u.stripe_customer_id 
        FROM users u
        JOIN user_weddings uw ON u.id = uw.user_id
        WHERE uw.wedding_id = $1 AND uw.role = 'owner'
        LIMIT 1
      `, [weddingId]);
      const user = userResult.rows[0];

      // Créer ou récupérer le client Stripe
      let customerId = user.stripe_customer_id;
      if (!customerId) {
        const customer = await this.createCustomer(user.id, user.email, {
          weddingId,
          name: `${user.first_name} ${user.last_name}`
        });
        customerId = customer.id;
      }

      // Créer la facture Stripe
      const invoice = await this.stripe.invoices.create({
        customer: customerId,
        collection_method: 'send_invoice',
        due_date: Math.floor(new Date(dueDate).getTime() / 1000),
        metadata: {
          weddingId,
          vendorId,
          vendorName: vendor.name
        }
      });

      // Ajouter les lignes de facture
      for (const item of items) {
        await this.stripe.invoiceItems.create({
          customer: customerId,
          invoice: invoice.id,
          description: item.description,
          amount: Math.round(item.amount * 100),
          currency: 'eur',
          metadata: {
            category: item.category || vendor.category
          }
        });
      }

      // Finaliser la facture
      const finalizedInvoice = await this.stripe.invoices.finalizeInvoice(invoice.id);

      // Envoyer la facture
      await this.stripe.invoices.sendInvoice(finalizedInvoice.id);

      // Enregistrer en base
      await db.query(`
        INSERT INTO invoices (
          wedding_id, vendor_id, stripe_invoice_id,
          amount, due_date, status, sent_at
        ) VALUES ($1, $2, $3, $4, $5, 'sent', CURRENT_TIMESTAMP)
      `, [
        weddingId,
        vendorId,
        finalizedInvoice.id,
        finalizedInvoice.amount_due / 100,
        dueDate
      ]);

      return finalizedInvoice;
    } catch (error) {
      logger.error('Error creating invoice:', error);
      throw error;
    }
  }
}

module.exports = new StripeService();