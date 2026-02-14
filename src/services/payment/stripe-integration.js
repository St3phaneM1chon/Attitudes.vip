/**
 * Intégration Stripe - Service de Paiement
 * Gère les paiements, abonnements et factures
 */

const Stripe = require('stripe')
const { EventEmitter } = require('events')

class StripeIntegration extends EventEmitter {
  constructor () {
    super()

    // Initialiser Stripe avec la clé API
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      appInfo: {
        name: 'Attitudes.vip',
        version: '1.0.0'
      }
    })

    // Configuration des prix et produits
    this.products = {
      // Abonnements vendors
      vendor_basic: {
        name: 'Vendor Basic',
        description: 'Abonnement basique pour vendors',
        price: 4900, // 49€/mois
        interval: 'month',
        features: [
          'Jusqu\'à 5 mariages par mois',
          'Dashboard personnalisé',
          'Messagerie intégrée',
          'Paiements sécurisés'
        ]
      },
      vendor_pro: {
        name: 'Vendor Pro',
        description: 'Abonnement pro pour vendors',
        price: 9900, // 99€/mois
        interval: 'month',
        features: [
          'Mariages illimités',
          'Analytics avancés',
          'API access',
          'Support prioritaire',
          'Multi-utilisateurs'
        ]
      },

      // Abonnements couples
      wedding_standard: {
        name: 'Mariage Standard',
        description: 'Organisation de mariage standard',
        price: 19900, // 199€ one-time
        type: 'one_time',
        features: [
          'Jusqu\'à 100 invités',
          'Outils de planification',
          'Site web personnalisé',
          'Gestion RSVP'
        ]
      },
      wedding_premium: {
        name: 'Mariage Premium',
        description: 'Organisation de mariage premium',
        price: 49900, // 499€ one-time
        type: 'one_time',
        features: [
          'Invités illimités',
          'Domaine personnalisé',
          'App mobile',
          'Live streaming',
          'Conciergerie 24/7'
        ]
      }
    }

    // Cache des produits et prix Stripe
    this.stripeProducts = {}
    this.stripePrices = {}
  }

  /**
   * Initialiser les produits et prix dans Stripe
   */
  async initializeProducts () {
    try {
      console.log('[Stripe] Initializing products...')

      for (const [key, product] of Object.entries(this.products)) {
        // Vérifier si le produit existe déjà
        const existingProducts = await this.stripe.products.search({
          query: `metadata['key']:'${key}'`
        })

        let stripeProduct

        if (existingProducts.data.length > 0) {
          stripeProduct = existingProducts.data[0]
          console.log(`[Stripe] Product ${key} already exists`)
        } else {
          // Créer le produit
          stripeProduct = await this.stripe.products.create({
            name: product.name,
            description: product.description,
            metadata: {
              key,
              features: JSON.stringify(product.features)
            }
          })
          console.log(`[Stripe] Created product ${key}`)
        }

        this.stripeProducts[key] = stripeProduct

        // Créer ou récupérer le prix
        const priceData = {
          product: stripeProduct.id,
          unit_amount: product.price,
          currency: 'eur'
        }

        if (product.interval) {
          priceData.recurring = { interval: product.interval }
        }

        const existingPrices = await this.stripe.prices.list({
          product: stripeProduct.id,
          active: true
        })

        let stripePrice

        if (existingPrices.data.length > 0) {
          stripePrice = existingPrices.data[0]
          console.log(`[Stripe] Price for ${key} already exists`)
        } else {
          stripePrice = await this.stripe.prices.create(priceData)
          console.log(`[Stripe] Created price for ${key}`)
        }

        this.stripePrices[key] = stripePrice
      }

      console.log('[Stripe] Products initialization complete')
      return true
    } catch (error) {
      console.error('[Stripe] Initialize products error:', error)
      throw error
    }
  }

  /**
   * Créer ou récupérer un client Stripe
   */
  async createOrGetCustomer (userData) {
    try {
      // Vérifier si le client existe déjà
      if (userData.stripeCustomerId) {
        const customer = await this.stripe.customers.retrieve(userData.stripeCustomerId)
        if (!customer.deleted) {
          return customer
        }
      }

      // Chercher par email
      const existingCustomers = await this.stripe.customers.list({
        email: userData.email,
        limit: 1
      })

      if (existingCustomers.data.length > 0) {
        return existingCustomers.data[0]
      }

      // Créer un nouveau client
      const customer = await this.stripe.customers.create({
        email: userData.email,
        name: userData.name,
        phone: userData.phone,
        metadata: {
          userId: userData.id,
          userType: userData.role,
          weddingId: userData.weddingId || ''
        }
      })

      console.log(`[Stripe] Created customer ${customer.id} for user ${userData.id}`)
      return customer
    } catch (error) {
      console.error('[Stripe] Create customer error:', error)
      throw error
    }
  }

  /**
   * Créer une session de paiement
   */
  async createCheckoutSession (options) {
    try {
      const {
        customerId,
        priceId,
        mode = 'payment', // payment, setup, subscription
        successUrl,
        cancelUrl,
        metadata = {},
        quantity = 1
      } = options

      const sessionData = {
        customer: customerId,
        payment_method_types: ['card'],
        mode,
        success_url: successUrl || `${process.env.APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl || `${process.env.APP_URL}/payment/cancel`,
        metadata,
        locale: 'fr',
        billing_address_collection: 'required'
      }

      if (mode === 'subscription' || mode === 'payment') {
        sessionData.line_items = [{
          price: priceId,
          quantity
        }]
      }

      if (mode === 'subscription') {
        sessionData.subscription_data = {
          trial_period_days: 14,
          metadata
        }
      }

      if (mode === 'payment') {
        sessionData.payment_intent_data = {
          metadata
        }
        sessionData.invoice_creation = {
          enabled: true
        }
      }

      const session = await this.stripe.checkout.sessions.create(sessionData)

      console.log(`[Stripe] Created checkout session ${session.id}`)
      return session
    } catch (error) {
      console.error('[Stripe] Create checkout session error:', error)
      throw error
    }
  }

  /**
   * Créer un payment intent pour paiement direct
   */
  async createPaymentIntent (options) {
    try {
      const {
        amount,
        currency = 'eur',
        customerId,
        description,
        metadata = {},
        paymentMethodId,
        confirm = false
      } = options

      const intentData = {
        amount: Math.round(amount * 100), // Convertir en centimes
        currency,
        customer: customerId,
        description,
        metadata,
        automatic_payment_methods: {
          enabled: true
        }
      }

      if (paymentMethodId) {
        intentData.payment_method = paymentMethodId
        intentData.confirm = confirm
      }

      const paymentIntent = await this.stripe.paymentIntents.create(intentData)

      console.log(`[Stripe] Created payment intent ${paymentIntent.id}`)
      return paymentIntent
    } catch (error) {
      console.error('[Stripe] Create payment intent error:', error)
      throw error
    }
  }

  /**
   * Créer une facture
   */
  async createInvoice (options) {
    try {
      const {
        customerId,
        items, // [{price, quantity, description}]
        description,
        dueDate,
        metadata = {}
      } = options

      const invoice = await this.stripe.invoices.create({
        customer: customerId,
        description,
        collection_method: 'send_invoice',
        days_until_due: dueDate ? Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24)) : 30,
        metadata
      })

      // Ajouter les items
      for (const item of items) {
        if (item.price) {
          await this.stripe.invoiceItems.create({
            customer: customerId,
            invoice: invoice.id,
            price: item.price,
            quantity: item.quantity || 1
          })
        } else {
          await this.stripe.invoiceItems.create({
            customer: customerId,
            invoice: invoice.id,
            amount: Math.round(item.amount * 100),
            currency: 'eur',
            description: item.description,
            quantity: item.quantity || 1
          })
        }
      }

      // Finaliser et envoyer la facture
      await this.stripe.invoices.finalizeInvoice(invoice.id)
      await this.stripe.invoices.sendInvoice(invoice.id)

      console.log(`[Stripe] Created and sent invoice ${invoice.id}`)
      return invoice
    } catch (error) {
      console.error('[Stripe] Create invoice error:', error)
      throw error
    }
  }

  /**
   * Créer un remboursement
   */
  async createRefund (paymentIntentId, amount, reason) {
    try {
      const refundData = {
        payment_intent: paymentIntentId,
        reason: reason || 'requested_by_customer'
      }

      if (amount) {
        refundData.amount = Math.round(amount * 100)
      }

      const refund = await this.stripe.refunds.create(refundData)

      console.log(`[Stripe] Created refund ${refund.id}`)
      return refund
    } catch (error) {
      console.error('[Stripe] Create refund error:', error)
      throw error
    }
  }

  /**
   * Récupérer les paiements d'un client
   */
  async getCustomerPayments (customerId, limit = 10) {
    try {
      const payments = await this.stripe.paymentIntents.list({
        customer: customerId,
        limit
      })

      return payments.data
    } catch (error) {
      console.error('[Stripe] Get customer payments error:', error)
      throw error
    }
  }

  /**
   * Récupérer les abonnements d'un client
   */
  async getCustomerSubscriptions (customerId) {
    try {
      const subscriptions = await this.stripe.subscriptions.list({
        customer: customerId,
        status: 'all'
      })

      return subscriptions.data
    } catch (error) {
      console.error('[Stripe] Get customer subscriptions error:', error)
      throw error
    }
  }

  /**
   * Annuler un abonnement
   */
  async cancelSubscription (subscriptionId, immediately = false) {
    try {
      if (immediately) {
        const subscription = await this.stripe.subscriptions.del(subscriptionId)
        console.log(`[Stripe] Cancelled subscription ${subscriptionId} immediately`)
        return subscription
      } else {
        const subscription = await this.stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true
        })
        console.log(`[Stripe] Scheduled subscription ${subscriptionId} cancellation`)
        return subscription
      }
    } catch (error) {
      console.error('[Stripe] Cancel subscription error:', error)
      throw error
    }
  }

  /**
   * Gérer les webhooks Stripe
   */
  async handleWebhook (rawBody, signature) {
    try {
      const event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      )

      console.log(`[Stripe] Received webhook: ${event.type}`)

      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object)
          break

        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object)
          break

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object)
          break

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          await this.handleSubscriptionChange(event.type, event.data.object)
          break

        case 'invoice.payment_succeeded':
        case 'invoice.payment_failed':
          await this.handleInvoiceEvent(event.type, event.data.object)
          break

        default:
          console.log(`[Stripe] Unhandled webhook type: ${event.type}`)
      }

      return { received: true }
    } catch (error) {
      console.error('[Stripe] Webhook error:', error)
      throw error
    }
  }

  /**
   * Gérer la complétion d'un checkout
   */
  async handleCheckoutCompleted (session) {
    try {
      // Récupérer les détails complets
      const fullSession = await this.stripe.checkout.sessions.retrieve(session.id, {
        expand: ['line_items', 'customer']
      })

      this.emit('checkout:completed', {
        sessionId: session.id,
        customerId: session.customer,
        mode: session.mode,
        amount: session.amount_total / 100,
        metadata: session.metadata
      })

      // TODO: Mettre à jour la base de données
    } catch (error) {
      console.error('[Stripe] Handle checkout completed error:', error)
    }
  }

  /**
   * Gérer un paiement réussi
   */
  async handlePaymentSucceeded (paymentIntent) {
    try {
      this.emit('payment:succeeded', {
        paymentIntentId: paymentIntent.id,
        customerId: paymentIntent.customer,
        amount: paymentIntent.amount / 100,
        metadata: paymentIntent.metadata
      })

      // TODO: Mettre à jour la base de données
    } catch (error) {
      console.error('[Stripe] Handle payment succeeded error:', error)
    }
  }

  /**
   * Gérer un paiement échoué
   */
  async handlePaymentFailed (paymentIntent) {
    try {
      this.emit('payment:failed', {
        paymentIntentId: paymentIntent.id,
        customerId: paymentIntent.customer,
        amount: paymentIntent.amount / 100,
        error: paymentIntent.last_payment_error,
        metadata: paymentIntent.metadata
      })

      // TODO: Notifier l'utilisateur
    } catch (error) {
      console.error('[Stripe] Handle payment failed error:', error)
    }
  }

  /**
   * Gérer les changements d'abonnement
   */
  async handleSubscriptionChange (type, subscription) {
    try {
      const eventType = type.replace('customer.subscription.', '')

      this.emit(`subscription:${eventType}`, {
        subscriptionId: subscription.id,
        customerId: subscription.customer,
        status: subscription.status,
        priceId: subscription.items.data[0]?.price.id,
        metadata: subscription.metadata
      })

      // TODO: Mettre à jour la base de données
    } catch (error) {
      console.error('[Stripe] Handle subscription change error:', error)
    }
  }

  /**
   * Gérer les événements de facture
   */
  async handleInvoiceEvent (type, invoice) {
    try {
      const eventType = type.replace('invoice.', '')

      this.emit(`invoice:${eventType}`, {
        invoiceId: invoice.id,
        customerId: invoice.customer,
        amount: invoice.amount_paid / 100,
        subscriptionId: invoice.subscription,
        metadata: invoice.metadata
      })

      // TODO: Mettre à jour la base de données
    } catch (error) {
      console.error('[Stripe] Handle invoice event error:', error)
    }
  }

  /**
   * Calculer les frais de commission
   */
  calculateCommission (amount, vendorType) {
    // Commission selon le type de vendor
    const commissionRates = {
      dj: 0.10, // 10%
      photographer: 0.12, // 12%
      caterer: 0.08, // 8%
      baker: 0.10, // 10%
      venue: 0.15, // 15%
      wedding_planner: 0.12, // 12%
      default: 0.10 // 10%
    }

    const rate = commissionRates[vendorType] || commissionRates.default
    const commission = amount * rate
    const vendorAmount = amount - commission

    return {
      total: amount,
      commission: Math.round(commission * 100) / 100,
      vendorAmount: Math.round(vendorAmount * 100) / 100,
      rate: rate * 100
    }
  }
}

// Instance singleton
let stripeIntegration = null

const getStripeIntegration = () => {
  if (!stripeIntegration) {
    stripeIntegration = new StripeIntegration()
  }
  return stripeIntegration
}

module.exports = {
  getStripeIntegration,
  StripeIntegration
}
