/**
 * Service Stripe Multi-Vendor pour AttitudesFramework
 * Gestion des paiements distribués entre fournisseurs avec commissions
 */

const Stripe = require('stripe')
const EventEmitter = require('events')
const { createClient } = require('@supabase/supabase-js')

class StripeMultiVendorService extends EventEmitter {
  constructor (config = {}) {
    super()

    this.config = {
      // Configuration Stripe
      secretKey: process.env.STRIPE_SECRET_KEY,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,

      // Configuration multi-vendor
      platformCommissionRate: config.platformCommissionRate || 0.05, // 5%
      minimumCommission: config.minimumCommission || 100, // 1€ en centimes

      // Délais de transfert
      transferDelay: config.transferDelay || 7, // 7 jours
      instantTransferFee: config.instantTransferFee || 100, // 1€

      // Devises supportées
      supportedCurrencies: config.supportedCurrencies || ['eur', 'usd'],
      defaultCurrency: config.defaultCurrency || 'eur',

      // Limites
      maxAmount: config.maxAmount || 999999, // 9999.99€
      minAmount: config.minAmount || 50, // 0.50€

      ...config
    }

    // Initialiser Stripe
    this.stripe = new Stripe(this.config.secretKey, {
      apiVersion: '2023-10-16',
      appInfo: {
        name: 'AttitudesFramework',
        version: '1.0.0'
      }
    })

    // Initialiser Supabase
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Cache des comptes connectés
    this.connectedAccounts = new Map()

    // Queue des paiements en attente
    this.pendingPayments = new Map()

    console.log('[Stripe] Multi-vendor service initialized')
  }

  /**
   * Créer ou récupérer un compte Connect pour un fournisseur
   */
  async createOrGetVendorAccount (vendorData) {
    try {
      const { data: existingAccount } = await this.supabase
        .from('vendor_stripe_accounts')
        .select('stripe_account_id, account_status')
        .eq('vendor_id', vendorData.vendorId)
        .single()

      if (existingAccount && existingAccount.stripe_account_id) {
        return {
          accountId: existingAccount.stripe_account_id,
          status: existingAccount.account_status,
          isNew: false
        }
      }

      // Créer un nouveau compte Express
      const account = await this.stripe.accounts.create({
        type: 'express',
        country: vendorData.country || 'FR',
        email: vendorData.email,
        business_type: vendorData.businessType || 'individual',

        // Informations business
        business_profile: {
          name: vendorData.businessName || vendorData.name,
          product_description: vendorData.description,
          support_email: vendorData.email,
          url: vendorData.website
        },

        // Capacités requises
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true }
        },

        // Paramètres
        settings: {
          payouts: {
            schedule: {
              delay_days: this.config.transferDelay,
              interval: 'weekly'
            }
          }
        }
      })

      // Sauvegarder en base
      await this.supabase
        .from('vendor_stripe_accounts')
        .insert({
          vendor_id: vendorData.vendorId,
          stripe_account_id: account.id,
          account_status: 'pending',
          created_at: new Date().toISOString()
        })

      // Cache
      this.connectedAccounts.set(vendorData.vendorId, account.id)

      console.log(`[Stripe] Created Express account: ${account.id} for vendor ${vendorData.vendorId}`)

      return {
        accountId: account.id,
        status: 'pending',
        isNew: true
      }
    } catch (error) {
      console.error('[Stripe] Error creating vendor account:', error)
      throw new Error(`Failed to create vendor account: ${error.message}`)
    }
  }

  /**
   * Créer un lien d'onboarding pour un fournisseur
   */
  async createOnboardingLink (vendorId, returnUrl, refreshUrl) {
    try {
      const { accountId } = await this.getVendorAccount(vendorId)

      const accountLink = await this.stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding'
      })

      console.log(`[Stripe] Created onboarding link for vendor ${vendorId}`)

      return accountLink.url
    } catch (error) {
      console.error('[Stripe] Error creating onboarding link:', error)
      throw new Error(`Failed to create onboarding link: ${error.message}`)
    }
  }

  /**
   * Créer un PaymentIntent multi-vendor
   */
  async createMultiVendorPayment (paymentData) {
    try {
      this.validatePaymentData(paymentData)

      const { weddingId, vendors, totalAmount, currency, metadata } = paymentData

      // Calculer les montants et commissions
      const paymentBreakdown = await this.calculatePaymentBreakdown(vendors, totalAmount)

      // Vérifier que tous les vendors ont des comptes valides
      await this.validateVendorAccounts(vendors)

      // Créer le PaymentIntent principal
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: totalAmount,
        currency: currency || this.config.defaultCurrency,
        automatic_payment_methods: {
          enabled: true
        },

        // Métadonnées
        metadata: {
          wedding_id: weddingId,
          payment_type: 'multi_vendor',
          vendor_count: vendors.length.toString(),
          ...metadata
        },

        // Configuration de transfert
        transfer_group: `wedding_${weddingId}_${Date.now()}`,

        // Description
        description: `Paiement mariage ${weddingId} - ${vendors.length} fournisseurs`
      })

      // Sauvegarder en base
      await this.supabase
        .from('stripe_payments')
        .insert({
          payment_intent_id: paymentIntent.id,
          wedding_id: weddingId,
          total_amount: totalAmount,
          currency,
          status: 'pending',
          payment_breakdown: paymentBreakdown,
          vendor_data: vendors,
          created_at: new Date().toISOString()
        })

      // Stocker en cache pour traitement ultérieur
      this.pendingPayments.set(paymentIntent.id, {
        vendors,
        breakdown: paymentBreakdown,
        weddingId
      })

      console.log(`[Stripe] Created multi-vendor payment: ${paymentIntent.id}`)

      return {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        breakdown: paymentBreakdown
      }
    } catch (error) {
      console.error('[Stripe] Error creating multi-vendor payment:', error)
      throw new Error(`Failed to create payment: ${error.message}`)
    }
  }

  /**
   * Calculer la répartition des paiements
   */
  async calculatePaymentBreakdown (vendors, totalAmount) {
    const breakdown = {
      platformCommission: 0,
      vendors: [],
      totalVendorAmount: 0
    }

    for (const vendor of vendors) {
      const vendorAmount = vendor.amount
      const commission = Math.max(
        Math.round(vendorAmount * this.config.platformCommissionRate),
        this.config.minimumCommission
      )
      const netAmount = vendorAmount - commission

      breakdown.vendors.push({
        vendorId: vendor.vendorId,
        vendorName: vendor.name,
        grossAmount: vendorAmount,
        commission,
        netAmount,
        accountId: await this.getVendorAccountId(vendor.vendorId),
        description: vendor.description || `Paiement ${vendor.name}`
      })

      breakdown.platformCommission += commission
      breakdown.totalVendorAmount += vendorAmount
    }

    // Vérification de cohérence
    if (breakdown.totalVendorAmount !== totalAmount) {
      throw new Error('Payment amount mismatch')
    }

    return breakdown
  }

  /**
   * Traiter un paiement réussi (webhook)
   */
  async processSuccessfulPayment (paymentIntentId) {
    try {
      const paymentData = this.pendingPayments.get(paymentIntentId)

      if (!paymentData) {
        // Récupérer depuis la base si pas en cache
        const { data: dbPayment } = await this.supabase
          .from('stripe_payments')
          .select('*')
          .eq('payment_intent_id', paymentIntentId)
          .single()

        if (!dbPayment) {
          throw new Error('Payment data not found')
        }

        paymentData = {
          vendors: dbPayment.vendor_data,
          breakdown: dbPayment.payment_breakdown,
          weddingId: dbPayment.wedding_id
        }
      }

      // Créer les transferts vers les fournisseurs
      const transfers = await Promise.allSettled(
        paymentData.breakdown.vendors.map(vendor =>
          this.createVendorTransfer(paymentIntentId, vendor)
        )
      )

      // Analyser les résultats
      const successfulTransfers = transfers.filter(t => t.status === 'fulfilled')
      const failedTransfers = transfers.filter(t => t.status === 'rejected')

      // Mettre à jour le statut en base
      await this.supabase
        .from('stripe_payments')
        .update({
          status: failedTransfers.length > 0 ? 'partially_transferred' : 'completed',
          transfers_completed: successfulTransfers.length,
          transfers_failed: failedTransfers.length,
          processed_at: new Date().toISOString()
        })
        .eq('payment_intent_id', paymentIntentId)

      // Enregistrer les transferts
      const transferRecords = successfulTransfers.map(transfer => ({
        payment_intent_id: paymentIntentId,
        vendor_id: transfer.value.vendorId,
        transfer_id: transfer.value.transferId,
        amount: transfer.value.amount,
        status: 'completed',
        created_at: new Date().toISOString()
      }))

      if (transferRecords.length > 0) {
        await this.supabase
          .from('vendor_transfers')
          .insert(transferRecords)
      }

      // Notifier les fournisseurs
      await this.notifyVendors(paymentData.weddingId, successfulTransfers)

      // Nettoyer le cache
      this.pendingPayments.delete(paymentIntentId)

      console.log(`[Stripe] Processed payment ${paymentIntentId}: ${successfulTransfers.length} successful, ${failedTransfers.length} failed`)

      this.emit('payment_processed', {
        paymentIntentId,
        weddingId: paymentData.weddingId,
        successfulTransfers: successfulTransfers.length,
        failedTransfers: failedTransfers.length
      })

      return {
        success: true,
        transfersCompleted: successfulTransfers.length,
        transfersFailed: failedTransfers.length
      }
    } catch (error) {
      console.error('[Stripe] Error processing successful payment:', error)

      // Marquer comme erreur
      await this.supabase
        .from('stripe_payments')
        .update({
          status: 'error',
          error_message: error.message,
          processed_at: new Date().toISOString()
        })
        .eq('payment_intent_id', paymentIntentId)

      throw error
    }
  }

  /**
   * Créer un transfert vers un fournisseur
   */
  async createVendorTransfer (paymentIntentId, vendorData) {
    try {
      const transfer = await this.stripe.transfers.create({
        amount: vendorData.netAmount,
        currency: 'eur',
        destination: vendorData.accountId,
        transfer_group: `payment_${paymentIntentId}`,
        description: vendorData.description,
        metadata: {
          vendor_id: vendorData.vendorId,
          payment_intent_id: paymentIntentId
        }
      })

      console.log(`[Stripe] Created transfer ${transfer.id} for vendor ${vendorData.vendorId}`)

      return {
        transferId: transfer.id,
        vendorId: vendorData.vendorId,
        amount: vendorData.netAmount,
        status: 'completed'
      }
    } catch (error) {
      console.error(`[Stripe] Error creating transfer for vendor ${vendorData.vendorId}:`, error)

      // Enregistrer l'erreur
      await this.supabase
        .from('vendor_transfers')
        .insert({
          payment_intent_id: paymentIntentId,
          vendor_id: vendorData.vendorId,
          amount: vendorData.netAmount,
          status: 'failed',
          error_message: error.message,
          created_at: new Date().toISOString()
        })

      throw error
    }
  }

  /**
   * Créer un paiement instantané (avec frais)
   */
  async createInstantTransfer (vendorId, amount, description) {
    try {
      const { accountId } = await this.getVendorAccount(vendorId)

      // Vérifier les capacités instant transfer
      const account = await this.stripe.accounts.retrieve(accountId)

      if (!account.capabilities.transfers || account.capabilities.transfers !== 'active') {
        throw new Error('Instant transfers not available for this vendor')
      }

      const netAmount = amount - this.config.instantTransferFee

      const transfer = await this.stripe.transfers.create({
        amount: netAmount,
        currency: 'eur',
        destination: accountId,
        description: `Transfert instantané: ${description}`,
        metadata: {
          vendor_id: vendorId,
          transfer_type: 'instant',
          fee_charged: this.config.instantTransferFee.toString()
        }
      })

      // Enregistrer en base
      await this.supabase
        .from('vendor_transfers')
        .insert({
          vendor_id: vendorId,
          transfer_id: transfer.id,
          amount: netAmount,
          fee_amount: this.config.instantTransferFee,
          transfer_type: 'instant',
          status: 'completed',
          created_at: new Date().toISOString()
        })

      console.log(`[Stripe] Created instant transfer ${transfer.id} for vendor ${vendorId}`)

      return {
        transferId: transfer.id,
        amount: netAmount,
        fee: this.config.instantTransferFee
      }
    } catch (error) {
      console.error('[Stripe] Error creating instant transfer:', error)
      throw new Error(`Failed to create instant transfer: ${error.message}`)
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
        this.config.webhookSecret
      )

      console.log(`[Stripe] Webhook received: ${event.type}`)

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.processSuccessfulPayment(event.data.object.id)
          break

        case 'payment_intent.payment_failed':
          await this.handleFailedPayment(event.data.object)
          break

        case 'account.updated':
          await this.handleAccountUpdate(event.data.object)
          break

        case 'transfer.created':
          await this.handleTransferCreated(event.data.object)
          break

        case 'transfer.failed':
          await this.handleTransferFailed(event.data.object)
          break

        default:
          console.log(`[Stripe] Unhandled webhook: ${event.type}`)
      }

      return { received: true }
    } catch (error) {
      console.error('[Stripe] Webhook error:', error)
      throw new Error(`Webhook handling failed: ${error.message}`)
    }
  }

  /**
   * Obtenir les métriques des paiements
   */
  async getPaymentMetrics (weddingId, period = '30d') {
    try {
      const { data: payments } = await this.supabase
        .from('stripe_payments')
        .select('*')
        .eq('wedding_id', weddingId)
        .gte('created_at', this.getDateRange(period))

      const { data: transfers } = await this.supabase
        .from('vendor_transfers')
        .select('*')
        .in('payment_intent_id', payments.map(p => p.payment_intent_id))

      const metrics = {
        totalAmount: payments.reduce((sum, p) => sum + p.total_amount, 0),
        totalCommissions: payments.reduce((sum, p) => sum + p.payment_breakdown.platformCommission, 0),
        successfulPayments: payments.filter(p => p.status === 'completed').length,
        failedPayments: payments.filter(p => p.status === 'error').length,
        totalTransfers: transfers.filter(t => t.status === 'completed').length,
        failedTransfers: transfers.filter(t => t.status === 'failed').length,

        // Détails par fournisseur
        vendorBreakdown: this.calculateVendorBreakdown(payments, transfers)
      }

      return metrics
    } catch (error) {
      console.error('[Stripe] Error getting payment metrics:', error)
      throw error
    }
  }

  /**
   * Méthodes utilitaires
   */

  validatePaymentData (data) {
    const required = ['weddingId', 'vendors', 'totalAmount']
    const missing = required.filter(field => !data[field])

    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`)
    }

    if (data.totalAmount < this.config.minAmount || data.totalAmount > this.config.maxAmount) {
      throw new Error(`Amount out of range: ${data.totalAmount}`)
    }

    if (!Array.isArray(data.vendors) || data.vendors.length === 0) {
      throw new Error('At least one vendor required')
    }
  }

  async validateVendorAccounts (vendors) {
    for (const vendor of vendors) {
      const { accountId } = await this.getVendorAccount(vendor.vendorId)

      const account = await this.stripe.accounts.retrieve(accountId)

      if (!account.capabilities.transfers || account.capabilities.transfers !== 'active') {
        throw new Error(`Vendor ${vendor.vendorId} cannot receive transfers`)
      }
    }
  }

  async getVendorAccount (vendorId) {
    // Check cache first
    if (this.connectedAccounts.has(vendorId)) {
      return { accountId: this.connectedAccounts.get(vendorId) }
    }

    const { data: account } = await this.supabase
      .from('vendor_stripe_accounts')
      .select('stripe_account_id, account_status')
      .eq('vendor_id', vendorId)
      .single()

    if (!account) {
      throw new Error(`No Stripe account found for vendor ${vendorId}`)
    }

    // Cache it
    this.connectedAccounts.set(vendorId, account.stripe_account_id)

    return {
      accountId: account.stripe_account_id,
      status: account.account_status
    }
  }

  async getVendorAccountId (vendorId) {
    const { accountId } = await this.getVendorAccount(vendorId)
    return accountId
  }

  getDateRange (period) {
    const now = new Date()
    const days = parseInt(period.replace('d', ''))
    return new Date(now.setDate(now.getDate() - days)).toISOString()
  }

  calculateVendorBreakdown (payments, transfers) {
    const breakdown = new Map()

    payments.forEach(payment => {
      payment.payment_breakdown.vendors.forEach(vendor => {
        if (!breakdown.has(vendor.vendorId)) {
          breakdown.set(vendor.vendorId, {
            vendorName: vendor.vendorName,
            totalGross: 0,
            totalNet: 0,
            totalCommissions: 0,
            transferCount: 0
          })
        }

        const vendorData = breakdown.get(vendor.vendorId)
        vendorData.totalGross += vendor.grossAmount
        vendorData.totalNet += vendor.netAmount
        vendorData.totalCommissions += vendor.commission
      })
    })

    transfers.forEach(transfer => {
      if (breakdown.has(transfer.vendor_id)) {
        breakdown.get(transfer.vendor_id).transferCount++
      }
    })

    return Object.fromEntries(breakdown)
  }

  async notifyVendors (weddingId, transfers) {
    // TODO: Implémenter les notifications aux fournisseurs
    console.log(`[Stripe] Notifying vendors for wedding ${weddingId}`)
  }

  async handleFailedPayment (paymentIntent) {
    console.log(`[Stripe] Payment failed: ${paymentIntent.id}`)

    await this.supabase
      .from('stripe_payments')
      .update({
        status: 'failed',
        error_message: paymentIntent.last_payment_error?.message,
        processed_at: new Date().toISOString()
      })
      .eq('payment_intent_id', paymentIntent.id)
  }

  async handleAccountUpdate (account) {
    console.log(`[Stripe] Account updated: ${account.id}`)

    await this.supabase
      .from('vendor_stripe_accounts')
      .update({
        account_status: account.capabilities.transfers || 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_account_id', account.id)
  }

  async handleTransferCreated (transfer) {
    console.log(`[Stripe] Transfer created: ${transfer.id}`)
  }

  async handleTransferFailed (transfer) {
    console.log(`[Stripe] Transfer failed: ${transfer.id}`)

    await this.supabase
      .from('vendor_transfers')
      .update({
        status: 'failed',
        error_message: transfer.failure_message,
        updated_at: new Date().toISOString()
      })
      .eq('transfer_id', transfer.id)
  }
}

module.exports = StripeMultiVendorService
