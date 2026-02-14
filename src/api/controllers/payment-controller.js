/**
 * Payment Controller - Gestion des paiements
 * Intégration Stripe complète avec webhooks
 */

const { Pool } = require('pg')
const Joi = require('joi')
const { v4: uuidv4 } = require('uuid')
const stripe = require('stripe')(process.env.STRIPE_API_KEY)
const crypto = require('crypto')

// Configuration base de données
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

// Schémas de validation
const paymentIntentSchema = Joi.object({
  booking_id: Joi.string().uuid().required(),
  payment_type: Joi.string().valid('deposit', 'balance', 'full').required(),
  amount: Joi.number().precision(2).min(0.50).optional(), // Min 50 centimes
  currency: Joi.string().valid('eur', 'usd', 'cad').default('eur'),
  payment_method_types: Joi.array().items(Joi.string().valid('card', 'sepa_debit')).default(['card']),
  automatic_payment_methods: Joi.object({
    enabled: Joi.boolean().default(true)
  }).default({ enabled: true })
})

const confirmPaymentSchema = Joi.object({
  payment_intent_id: Joi.string().required(),
  payment_method_id: Joi.string().optional()
})

const refundSchema = Joi.object({
  payment_id: Joi.string().uuid().required(),
  amount: Joi.number().precision(2).min(0).optional(),
  reason: Joi.string().valid('requested_by_customer', 'duplicate', 'fraudulent').default('requested_by_customer')
})

class PaymentController {
  // Créer un Payment Intent
  async createPaymentIntent (req, res) {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const { error, value } = paymentIntentSchema.validate(req.body)
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.details[0].message
        })
      }

      const { customer_id } = req.user

      // Récupérer les informations de réservation
      const bookingQuery = `
        SELECT b.*, w.customer_id, w.partner_name, v.name as vendor_name
        FROM bookings b
        JOIN weddings w ON b.wedding_id = w.id
        JOIN vendors v ON b.vendor_id = v.id
        WHERE b.id = $1 AND w.customer_id = $2
      `

      const bookingResult = await client.query(bookingQuery, [value.booking_id, customer_id])

      if (bookingResult.rows.length === 0) {
        await client.query('ROLLBACK')
        return res.status(404).json({
          success: false,
          error: 'Booking not found'
        })
      }

      const booking = bookingResult.rows[0]

      // Calculer le montant à payer
      let paymentAmount
      let description

      switch (value.payment_type) {
        case 'deposit':
          paymentAmount = booking.deposit_amount
          description = `Deposit for ${booking.vendor_name} - ${booking.partner_name} wedding`

          if (booking.deposit_paid) {
            await client.query('ROLLBACK')
            return res.status(400).json({
              success: false,
              error: 'Deposit already paid'
            })
          }
          break

        case 'balance':
          paymentAmount = booking.full_payment_amount
          description = `Balance payment for ${booking.vendor_name} - ${booking.partner_name} wedding`

          if (!booking.deposit_paid) {
            await client.query('ROLLBACK')
            return res.status(400).json({
              success: false,
              error: 'Deposit must be paid before balance'
            })
          }

          if (booking.full_payment_paid) {
            await client.query('ROLLBACK')
            return res.status(400).json({
              success: false,
              error: 'Balance already paid'
            })
          }
          break

        case 'full':
          paymentAmount = booking.booking_amount
          description = `Full payment for ${booking.vendor_name} - ${booking.partner_name} wedding`

          if (booking.deposit_paid || booking.full_payment_paid) {
            await client.query('ROLLBACK')
            return res.status(400).json({
              success: false,
              error: 'Payment already made for this booking'
            })
          }
          break

        default:
          await client.query('ROLLBACK')
          return res.status(400).json({
            success: false,
            error: 'Invalid payment type'
          })
      }

      // Utiliser le montant fourni ou celui calculé
      const finalAmount = value.amount || paymentAmount

      // Convertir en centimes pour Stripe
      const amountInCents = Math.round(finalAmount * 100)

      // Récupérer le customer Stripe ou en créer un
      const userQuery = 'SELECT email, first_name, last_name FROM users WHERE id = $1'
      const userResult = await client.query(userQuery, [customer_id])
      const user = userResult.rows[0]

      let stripeCustomer
      try {
        // Chercher un customer existant
        const customers = await stripe.customers.list({
          email: user.email,
          limit: 1
        })

        if (customers.data.length > 0) {
          stripeCustomer = customers.data[0]
        } else {
          // Créer un nouveau customer
          stripeCustomer = await stripe.customers.create({
            email: user.email,
            name: `${user.first_name} ${user.last_name}`,
            metadata: {
              user_id: customer_id,
              wedding_id: booking.wedding_id
            }
          })
        }
      } catch (stripeError) {
        console.error('Stripe customer error:', stripeError)
        await client.query('ROLLBACK')
        return res.status(500).json({
          success: false,
          error: 'Payment service error'
        })
      }

      // Créer le Payment Intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: value.currency,
        customer: stripeCustomer.id,
        payment_method_types: value.payment_method_types,
        automatic_payment_methods: value.automatic_payment_methods,
        description,
        metadata: {
          booking_id: value.booking_id,
          wedding_id: booking.wedding_id,
          customer_id,
          payment_type: value.payment_type,
          vendor_name: booking.vendor_name
        }
      })

      // Enregistrer le paiement en base
      const paymentId = uuidv4()
      const paymentQuery = `
        INSERT INTO payments (
          id, booking_id, wedding_id, payer_id, stripe_payment_intent_id,
          amount, currency, payment_type, status, description, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `

      const paymentValues = [
        paymentId,
        value.booking_id,
        booking.wedding_id,
        customer_id,
        paymentIntent.id,
        finalAmount,
        value.currency.toUpperCase(),
        value.payment_type,
        'pending',
        description,
        JSON.stringify({
          stripe_customer_id: stripeCustomer.id,
          vendor_name: booking.vendor_name
        })
      ]

      const paymentResult = await client.query(paymentQuery, paymentValues)

      await client.query('COMMIT')

      res.status(201).json({
        success: true,
        data: {
          payment_id: paymentId,
          payment_intent: {
            id: paymentIntent.id,
            client_secret: paymentIntent.client_secret,
            amount: finalAmount,
            currency: value.currency,
            status: paymentIntent.status
          },
          booking: {
            id: booking.id,
            vendor_name: booking.vendor_name,
            service_date: booking.service_date
          }
        },
        message: 'Payment intent created successfully'
      })
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('Error creating payment intent:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    } finally {
      client.release()
    }
  }

  // Confirmer un paiement
  async confirmPayment (req, res) {
    try {
      const { error, value } = confirmPaymentSchema.validate(req.body)
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.details[0].message
        })
      }

      const { customer_id } = req.user

      // Récupérer le Payment Intent depuis Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(value.payment_intent_id)

      // Vérifier que le paiement appartient à l'utilisateur
      if (paymentIntent.metadata.customer_id !== customer_id) {
        return res.status(403).json({
          success: false,
          error: 'Payment not found or access denied'
        })
      }

      // Confirmer le paiement si nécessaire
      if (paymentIntent.status === 'requires_confirmation') {
        const confirmedPaymentIntent = await stripe.paymentIntents.confirm(
          value.payment_intent_id,
          value.payment_method_id ? { payment_method: value.payment_method_id } : {}
        )

        res.json({
          success: true,
          data: {
            payment_intent: confirmedPaymentIntent,
            status: confirmedPaymentIntent.status,
            requires_action: confirmedPaymentIntent.status === 'requires_action'
          }
        })
      } else {
        res.json({
          success: true,
          data: {
            payment_intent: paymentIntent,
            status: paymentIntent.status,
            requires_action: paymentIntent.status === 'requires_action'
          }
        })
      }
    } catch (error) {
      console.error('Error confirming payment:', error)

      if (error.type === 'StripeCardError') {
        return res.status(400).json({
          success: false,
          error: 'Card error',
          details: error.message
        })
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  // Obtenir l'historique des paiements d'un mariage
  async getWeddingPayments (req, res) {
    try {
      const { wedding_id } = req.params
      const { customer_id } = req.user
      const { status, payment_type } = req.query

      // Vérifier que le wedding appartient à l'utilisateur
      const weddingCheck = await pool.query(
        'SELECT id FROM weddings WHERE id = $1 AND customer_id = $2',
        [wedding_id, customer_id]
      )

      if (weddingCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Wedding not found'
        })
      }

      let query = `
        SELECT p.*,
               b.service_date,
               v.name as vendor_name,
               v.vendor_type
        FROM payments p
        JOIN bookings b ON p.booking_id = b.id
        JOIN vendors v ON b.vendor_id = v.id
        WHERE p.wedding_id = $1
      `

      const values = [wedding_id]
      let paramCount = 1

      if (status) {
        paramCount++
        query += ` AND p.status = $${paramCount}`
        values.push(status)
      }

      if (payment_type) {
        paramCount++
        query += ` AND p.payment_type = $${paramCount}`
        values.push(payment_type)
      }

      query += ' ORDER BY p.created_at DESC'

      const result = await pool.query(query, values)

      // Calculer les totaux
      const totalPaid = result.rows
        .filter(p => p.status === 'succeeded')
        .reduce((sum, p) => sum + parseFloat(p.amount), 0)

      const totalPending = result.rows
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + parseFloat(p.amount), 0)

      res.json({
        success: true,
        data: result.rows,
        summary: {
          total_paid: totalPaid,
          total_pending: totalPending,
          payment_count: result.rows.length
        }
      })
    } catch (error) {
      console.error('Error fetching wedding payments:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  // Créer un remboursement
  async createRefund (req, res) {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const { error, value } = refundSchema.validate(req.body)
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.details[0].message
        })
      }

      const { customer_id } = req.user

      // Récupérer le paiement
      const paymentQuery = `
        SELECT p.*, b.vendor_id, v.name as vendor_name
        FROM payments p
        JOIN bookings b ON p.booking_id = b.id
        JOIN weddings w ON p.wedding_id = w.id
        JOIN vendors v ON b.vendor_id = v.id
        WHERE p.id = $1 AND w.customer_id = $2 AND p.status = 'succeeded'
      `

      const paymentResult = await client.query(paymentQuery, [value.payment_id, customer_id])

      if (paymentResult.rows.length === 0) {
        await client.query('ROLLBACK')
        return res.status(404).json({
          success: false,
          error: 'Payment not found or not eligible for refund'
        })
      }

      const payment = paymentResult.rows[0]

      // Calculer le montant du remboursement
      const refundAmount = value.amount || payment.amount
      const refundAmountInCents = Math.round(refundAmount * 100)

      // Créer le remboursement dans Stripe
      const refund = await stripe.refunds.create({
        charge: payment.stripe_charge_id,
        amount: refundAmountInCents,
        reason: value.reason,
        metadata: {
          original_payment_id: payment.id,
          booking_id: payment.booking_id,
          customer_id
        }
      })

      // Enregistrer le remboursement en base
      const refundId = uuidv4()
      const refundQuery = `
        INSERT INTO payments (
          id, booking_id, wedding_id, payer_id, stripe_charge_id,
          amount, currency, payment_type, status, description, metadata, processed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `

      const refundValues = [
        refundId,
        payment.booking_id,
        payment.wedding_id,
        customer_id,
        refund.id,
        -refundAmount, // Montant négatif
        payment.currency,
        'refund',
        refund.status,
        `Refund for ${payment.vendor_name} - ${value.reason}`,
        JSON.stringify({
          original_payment_id: payment.id,
          stripe_refund_id: refund.id,
          reason: value.reason
        }),
        new Date()
      ]

      const refundResult = await client.query(refundQuery, refundValues)

      await client.query('COMMIT')

      res.status(201).json({
        success: true,
        data: {
          refund: refundResult.rows[0],
          stripe_refund: refund,
          original_payment: {
            id: payment.id,
            amount: payment.amount,
            vendor_name: payment.vendor_name
          }
        },
        message: 'Refund created successfully'
      })
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('Error creating refund:', error)

      if (error.type === 'StripeInvalidRequestError') {
        return res.status(400).json({
          success: false,
          error: 'Refund error',
          details: error.message
        })
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    } finally {
      client.release()
    }
  }

  // Webhook Stripe
  async handleWebhook (req, res) {
    const sig = req.headers['stripe-signature']
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

    let event

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message)
      return res.status(400).send(`Webhook Error: ${err.message}`)
    }

    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(client, event.data.object)
          break

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(client, event.data.object)
          break

        case 'charge.dispute.created':
          await this.handleChargeDispute(client, event.data.object)
          break

        default:
          console.log(`Unhandled event type ${event.type}`)
      }

      await client.query('COMMIT')

      res.json({ received: true })
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('Error handling webhook:', error)
      res.status(500).json({ error: 'Webhook processing failed' })
    } finally {
      client.release()
    }
  }

  // Gérer le succès d'un paiement
  async handlePaymentSuccess (client, paymentIntent) {
    try {
      // Mettre à jour le paiement en base
      const updatePaymentQuery = `
        UPDATE payments 
        SET status = 'succeeded', 
            stripe_charge_id = $1,
            processed_at = CURRENT_TIMESTAMP
        WHERE stripe_payment_intent_id = $2
        RETURNING *
      `

      const paymentResult = await client.query(updatePaymentQuery, [
        paymentIntent.latest_charge,
        paymentIntent.id
      ])

      if (paymentResult.rows.length > 0) {
        const payment = paymentResult.rows[0]

        // Mettre à jour le statut de la réservation
        if (payment.payment_type === 'deposit') {
          await client.query(
            'UPDATE bookings SET deposit_paid = true WHERE id = $1',
            [payment.booking_id]
          )
        } else if (payment.payment_type === 'balance' || payment.payment_type === 'full') {
          await client.query(
            'UPDATE bookings SET full_payment_paid = true, status = $1 WHERE id = $2',
            ['confirmed', payment.booking_id]
          )
        }

        // Créer une notification
        await client.query(
          `INSERT INTO notifications 
           (id, user_id, wedding_id, type, title, content, channel)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            uuidv4(),
            payment.payer_id,
            payment.wedding_id,
            'payment',
            'Payment Successful',
            `Your ${payment.payment_type} payment of ${payment.amount} ${payment.currency} has been processed successfully`,
            'email'
          ]
        )
      }
    } catch (error) {
      console.error('Error handling payment success:', error)
      throw error
    }
  }

  // Gérer l'échec d'un paiement
  async handlePaymentFailure (client, paymentIntent) {
    try {
      // Mettre à jour le paiement en base
      const updatePaymentQuery = `
        UPDATE payments 
        SET status = 'failed'
        WHERE stripe_payment_intent_id = $1
        RETURNING *
      `

      const paymentResult = await client.query(updatePaymentQuery, [paymentIntent.id])

      if (paymentResult.rows.length > 0) {
        const payment = paymentResult.rows[0]

        // Créer une notification
        await client.query(
          `INSERT INTO notifications 
           (id, user_id, wedding_id, type, title, content, channel)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            uuidv4(),
            payment.payer_id,
            payment.wedding_id,
            'payment',
            'Payment Failed',
            `Your ${payment.payment_type} payment of ${payment.amount} ${payment.currency} could not be processed. Please try again.`,
            'email'
          ]
        )
      }
    } catch (error) {
      console.error('Error handling payment failure:', error)
      throw error
    }
  }

  // Gérer les contestations
  async handleChargeDispute (client, dispute) {
    try {
      // Créer une notification pour l'équipe
      await client.query(
        `INSERT INTO notifications 
         (id, user_id, type, title, content, channel)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          uuidv4(),
          null, // Notification système
          'dispute',
          'Payment Dispute Created',
          `A dispute has been created for charge ${dispute.charge}. Amount: ${dispute.amount / 100} ${dispute.currency}`,
          'email'
        ]
      )
    } catch (error) {
      console.error('Error handling charge dispute:', error)
      throw error
    }
  }
}

module.exports = new PaymentController()
