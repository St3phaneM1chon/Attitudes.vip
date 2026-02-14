/**
 * Booking Controller - Gestion des réservations
 * Workflow complet de réservation avec vendors
 */

const { Pool } = require('pg')
const Joi = require('joi')
const { v4: uuidv4 } = require('uuid')
const stripeService = require('../../services/payment/stripe-integration')
const notificationService = require('../../services/notification/notification-service')

// Configuration base de données
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

// Schémas de validation
const bookingSchema = Joi.object({
  vendor_id: Joi.string().uuid().required(),
  wedding_id: Joi.string().uuid().required(),
  service_date: Joi.date().min('now').required(),
  start_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  end_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  package_id: Joi.string().uuid().optional(),
  booking_amount: Joi.number().precision(2).min(0).required(),
  deposit_percentage: Joi.number().integer().min(0).max(100).default(30),
  notes: Joi.string().max(1000).optional()
})

const updateBookingSchema = Joi.object({
  service_date: Joi.date().min('now').optional(),
  start_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  end_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  status: Joi.string().valid('pending', 'confirmed', 'cancelled', 'completed').optional(),
  booking_amount: Joi.number().precision(2).min(0).optional(),
  deposit_amount: Joi.number().precision(2).min(0).optional(),
  full_payment_amount: Joi.number().precision(2).min(0).optional(),
  notes: Joi.string().max(1000).optional()
})

class BookingController {
  // Créer une nouvelle réservation
  async createBooking (req, res) {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const { error, value } = bookingSchema.validate(req.body)
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.details[0].message
        })
      }

      const { customer_id } = req.user
      const id = uuidv4()

      // Vérifier que le wedding appartient à l'utilisateur
      const weddingCheck = await client.query(
        'SELECT id FROM weddings WHERE id = $1 AND customer_id = $2',
        [value.wedding_id, customer_id]
      )

      if (weddingCheck.rows.length === 0) {
        await client.query('ROLLBACK')
        return res.status(403).json({
          success: false,
          error: 'Wedding not found or access denied'
        })
      }

      // Vérifier que le vendor existe
      const vendorCheck = await client.query(
        'SELECT * FROM vendors WHERE id = $1',
        [value.vendor_id]
      )

      if (vendorCheck.rows.length === 0) {
        await client.query('ROLLBACK')
        return res.status(404).json({
          success: false,
          error: 'Vendor not found'
        })
      }

      const vendor = vendorCheck.rows[0]

      // Vérifier disponibilité
      const availabilityCheck = await this.checkVendorAvailability(
        client,
        value.vendor_id,
        value.service_date,
        value.start_time,
        value.end_time
      )

      if (!availabilityCheck.isAvailable) {
        await client.query('ROLLBACK')
        return res.status(409).json({
          success: false,
          error: 'Vendor not available for selected date/time',
          details: availabilityCheck.conflicts
        })
      }

      // Calculer les montants
      const depositAmount = (value.booking_amount * value.deposit_percentage) / 100
      const fullPaymentAmount = value.booking_amount - depositAmount

      // Créer la réservation
      const bookingQuery = `
        INSERT INTO bookings (
          id, wedding_id, vendor_id, customer_id, service_date, 
          start_time, end_time, booking_amount, deposit_amount, 
          full_payment_amount, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `

      const bookingValues = [
        id,
        value.wedding_id,
        value.vendor_id,
        customer_id,
        value.service_date,
        value.start_time,
        value.end_time,
        value.booking_amount,
        depositAmount,
        fullPaymentAmount,
        value.notes
      ]

      const bookingResult = await client.query(bookingQuery, bookingValues)

      // Mettre à jour le statut du vendor
      await client.query(
        'UPDATE vendors SET status = $1 WHERE id = $2',
        ['booked', value.vendor_id]
      )

      // Créer une tâche de suivi
      const taskQuery = `
        INSERT INTO tasks (
          id, wedding_id, assigned_to, title, description, 
          due_date, priority, category
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `

      const taskDueDate = new Date(value.service_date)
      taskDueDate.setDate(taskDueDate.getDate() - 7) // 7 jours avant

      await client.query(taskQuery, [
        uuidv4(),
        value.wedding_id,
        customer_id,
        `Confirmer réservation ${vendor.name}`,
        `Confirmer les détails finaux avec ${vendor.name} pour le ${value.service_date}`,
        taskDueDate,
        'medium',
        'vendor'
      ])

      await client.query('COMMIT')

      // Envoyer notifications
      await this.sendBookingNotifications(bookingResult.rows[0], vendor, 'created')

      res.status(201).json({
        success: true,
        data: {
          ...bookingResult.rows[0],
          vendor,
          deposit_amount: depositAmount,
          full_payment_amount: fullPaymentAmount
        },
        message: 'Booking created successfully'
      })
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('Error creating booking:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    } finally {
      client.release()
    }
  }

  // Obtenir toutes les réservations d'un mariage
  async getWeddingBookings (req, res) {
    try {
      const { wedding_id } = req.params
      const { customer_id } = req.user
      const { status, vendor_type } = req.query

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
        SELECT b.*,
               v.name as vendor_name,
               v.vendor_type,
               v.email as vendor_email,
               v.phone as vendor_phone,
               json_agg(DISTINCT jsonb_build_object(
                 'id', p.id,
                 'amount', p.amount,
                 'status', p.status,
                 'payment_type', p.payment_type,
                 'processed_at', p.processed_at
               )) FILTER (WHERE p.id IS NOT NULL) as payments,
               json_agg(DISTINCT jsonb_build_object(
                 'id', c.id,
                 'title', c.title,
                 'status', c.status,
                 'contract_pdf_url', c.contract_pdf_url
               )) FILTER (WHERE c.id IS NOT NULL) as contracts
        FROM bookings b
        JOIN vendors v ON b.vendor_id = v.id
        LEFT JOIN payments p ON b.id = p.booking_id
        LEFT JOIN contracts c ON b.id = c.booking_id
        WHERE b.wedding_id = $1
      `

      const values = [wedding_id]
      let paramCount = 1

      if (status) {
        paramCount++
        query += ` AND b.status = $${paramCount}`
        values.push(status)
      }

      if (vendor_type) {
        paramCount++
        query += ` AND v.vendor_type = $${paramCount}`
        values.push(vendor_type)
      }

      query += `
        GROUP BY b.id, v.id, v.name, v.vendor_type, v.email, v.phone
        ORDER BY b.service_date ASC
      `

      const result = await pool.query(query, values)

      res.json({
        success: true,
        data: result.rows
      })
    } catch (error) {
      console.error('Error fetching wedding bookings:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  // Obtenir une réservation spécifique
  async getBooking (req, res) {
    try {
      const { id } = req.params
      const { customer_id } = req.user

      const query = `
        SELECT b.*,
               v.name as vendor_name,
               v.vendor_type,
               v.email as vendor_email,
               v.phone as vendor_phone,
               v.address as vendor_address,
               w.partner_name,
               w.wedding_date,
               json_agg(DISTINCT jsonb_build_object(
                 'id', p.id,
                 'amount', p.amount,
                 'status', p.status,
                 'payment_type', p.payment_type,
                 'stripe_payment_intent_id', p.stripe_payment_intent_id,
                 'processed_at', p.processed_at
               )) FILTER (WHERE p.id IS NOT NULL) as payments,
               json_agg(DISTINCT jsonb_build_object(
                 'id', c.id,
                 'title', c.title,
                 'status', c.status,
                 'total_amount', c.total_amount,
                 'contract_pdf_url', c.contract_pdf_url,
                 'customer_signed_at', c.customer_signed_at,
                 'vendor_signed_at', c.vendor_signed_at
               )) FILTER (WHERE c.id IS NOT NULL) as contracts
        FROM bookings b
        JOIN vendors v ON b.vendor_id = v.id
        JOIN weddings w ON b.wedding_id = w.id
        LEFT JOIN payments p ON b.id = p.booking_id
        LEFT JOIN contracts c ON b.id = c.booking_id
        WHERE b.id = $1 AND w.customer_id = $2
        GROUP BY b.id, v.id, v.name, v.vendor_type, v.email, v.phone, v.address,
                 w.partner_name, w.wedding_date
      `

      const result = await pool.query(query, [id, customer_id])

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Booking not found'
        })
      }

      res.json({
        success: true,
        data: result.rows[0]
      })
    } catch (error) {
      console.error('Error fetching booking:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  // Mettre à jour une réservation
  async updateBooking (req, res) {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const { id } = req.params
      const { customer_id } = req.user

      const { error, value } = updateBookingSchema.validate(req.body)
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.details[0].message
        })
      }

      // Vérifier que la réservation appartient à l'utilisateur
      const checkQuery = `
        SELECT b.*, v.name as vendor_name FROM bookings b
        JOIN weddings w ON b.wedding_id = w.id
        JOIN vendors v ON b.vendor_id = v.id
        WHERE b.id = $1 AND w.customer_id = $2
      `
      const checkResult = await client.query(checkQuery, [id, customer_id])

      if (checkResult.rows.length === 0) {
        await client.query('ROLLBACK')
        return res.status(404).json({
          success: false,
          error: 'Booking not found'
        })
      }

      const currentBooking = checkResult.rows[0]

      // Vérifier disponibilité si la date/heure change
      if (value.service_date || value.start_time || value.end_time) {
        const newDate = value.service_date || currentBooking.service_date
        const newStartTime = value.start_time || currentBooking.start_time
        const newEndTime = value.end_time || currentBooking.end_time

        const availabilityCheck = await this.checkVendorAvailability(
          client,
          currentBooking.vendor_id,
          newDate,
          newStartTime,
          newEndTime,
          id // Exclure la réservation actuelle
        )

        if (!availabilityCheck.isAvailable) {
          await client.query('ROLLBACK')
          return res.status(409).json({
            success: false,
            error: 'Vendor not available for selected date/time',
            details: availabilityCheck.conflicts
          })
        }
      }

      // Construire la requête de mise à jour
      const updates = []
      const values = [id]
      let paramCount = 1

      Object.keys(value).forEach(key => {
        if (value[key] !== undefined) {
          paramCount++
          updates.push(`${key} = $${paramCount}`)
          values.push(value[key])
        }
      })

      if (updates.length === 0) {
        await client.query('ROLLBACK')
        return res.status(400).json({
          success: false,
          error: 'No valid fields to update'
        })
      }

      const query = `
        UPDATE bookings 
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `

      const result = await client.query(query, values)

      // Gérer les changements de statut
      if (value.status && value.status !== currentBooking.status) {
        await this.handleStatusChange(client, result.rows[0], currentBooking, value.status)
      }

      await client.query('COMMIT')

      // Envoyer notifications si statut changé
      if (value.status && value.status !== currentBooking.status) {
        await this.sendBookingNotifications(result.rows[0], { name: currentBooking.vendor_name }, 'status_changed')
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Booking updated successfully'
      })
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('Error updating booking:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    } finally {
      client.release()
    }
  }

  // Annuler une réservation
  async cancelBooking (req, res) {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const { id } = req.params
      const { customer_id } = req.user
      const { reason } = req.body

      // Vérifier que la réservation appartient à l'utilisateur
      const checkQuery = `
        SELECT b.*, v.name as vendor_name FROM bookings b
        JOIN weddings w ON b.wedding_id = w.id
        JOIN vendors v ON b.vendor_id = v.id
        WHERE b.id = $1 AND w.customer_id = $2
      `
      const checkResult = await client.query(checkQuery, [id, customer_id])

      if (checkResult.rows.length === 0) {
        await client.query('ROLLBACK')
        return res.status(404).json({
          success: false,
          error: 'Booking not found'
        })
      }

      const booking = checkResult.rows[0]

      if (booking.status === 'cancelled') {
        await client.query('ROLLBACK')
        return res.status(400).json({
          success: false,
          error: 'Booking is already cancelled'
        })
      }

      // Mettre à jour le statut
      const updateQuery = `
        UPDATE bookings 
        SET status = 'cancelled', 
            notes = COALESCE(notes || E'\n\n', '') || 'Cancelled: ' || $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `

      const result = await client.query(updateQuery, [id, reason || 'Cancelled by customer'])

      // Libérer la disponibilité du vendor
      await client.query(
        'UPDATE vendors SET status = $1 WHERE id = $2',
        ['contacted', booking.vendor_id]
      )

      // Gérer les remboursements si des paiements ont été effectués
      const paymentsQuery = `
        SELECT * FROM payments 
        WHERE booking_id = $1 AND status = 'succeeded'
        ORDER BY created_at DESC
      `
      const paymentsResult = await client.query(paymentsQuery, [id])

      if (paymentsResult.rows.length > 0) {
        // Créer des remboursements via Stripe
        for (const payment of paymentsResult.rows) {
          try {
            const refund = await stripeService.createRefund(payment.stripe_charge_id)

            // Enregistrer le remboursement
            await client.query(
              `INSERT INTO payments 
               (id, booking_id, wedding_id, payer_id, stripe_charge_id, amount, 
                currency, payment_type, status, description, processed_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
              [
                uuidv4(),
                id,
                booking.wedding_id,
                customer_id,
                refund.id,
                -payment.amount, // Montant négatif pour le remboursement
                payment.currency,
                'refund',
                'succeeded',
                `Refund for cancelled booking - ${reason}`,
                new Date()
              ]
            )
          } catch (stripeError) {
            console.error('Error creating refund:', stripeError)
            // Continue avec l'annulation même si le remboursement échoue
          }
        }
      }

      await client.query('COMMIT')

      // Envoyer notifications
      await this.sendBookingNotifications(result.rows[0], { name: booking.vendor_name }, 'cancelled')

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Booking cancelled successfully'
      })
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('Error cancelling booking:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    } finally {
      client.release()
    }
  }

  // Vérifier disponibilité vendor
  async checkVendorAvailability (client, vendorId, date, startTime, endTime, excludeBookingId = null) {
    try {
      const query = `
        SELECT 
          CASE 
            WHEN EXISTS (
              SELECT 1 FROM vendor_availability va 
              WHERE va.vendor_id = $1 
              AND va.date = $2 
              AND va.is_available = false
            ) THEN false
            WHEN EXISTS (
              SELECT 1 FROM bookings b 
              WHERE b.vendor_id = $1 
              AND b.service_date = $2 
              AND b.status IN ('confirmed', 'pending')
              ${excludeBookingId ? 'AND b.id != $5' : ''}
              ${startTime && endTime
? `
                AND (
                  (b.start_time, b.end_time) OVERLAPS ($3::time, $4::time)
                )
              `
: ''}
            ) THEN false
            ELSE true
          END as is_available,
          json_agg(DISTINCT jsonb_build_object(
            'booking_id', b.id,
            'start_time', b.start_time,
            'end_time', b.end_time,
            'status', b.status
          )) FILTER (WHERE b.id IS NOT NULL) as conflicts
        FROM vendors v
        LEFT JOIN bookings b ON v.id = b.vendor_id 
          AND b.service_date = $2 
          AND b.status IN ('confirmed', 'pending')
          ${excludeBookingId ? 'AND b.id != $5' : ''}
        WHERE v.id = $1
        GROUP BY v.id
      `

      const values = [vendorId, date]
      if (startTime && endTime) {
        values.push(startTime, endTime)
      }
      if (excludeBookingId) {
        values.push(excludeBookingId)
      }

      const result = await client.query(query, values)

      return {
        isAvailable: result.rows[0]?.is_available || false,
        conflicts: result.rows[0]?.conflicts || []
      }
    } catch (error) {
      console.error('Error checking vendor availability:', error)
      return { isAvailable: false, conflicts: [] }
    }
  }

  // Gérer changement de statut
  async handleStatusChange (client, booking, oldBooking, newStatus) {
    try {
      switch (newStatus) {
        case 'confirmed':
          // Créer un contrat automatiquement
          const contractId = uuidv4()
          await client.query(
            `INSERT INTO contracts 
             (id, booking_id, vendor_id, customer_id, contract_type, title, 
              description, total_amount, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              contractId,
              booking.id,
              booking.vendor_id,
              booking.customer_id,
              'service',
              `Contract for ${booking.service_date}`,
              'Service contract generated automatically upon booking confirmation',
              booking.booking_amount,
              'draft'
            ]
          )

          // Créer une tâche de rappel de paiement
          const paymentReminderDate = new Date(booking.service_date)
          paymentReminderDate.setDate(paymentReminderDate.getDate() - 30)

          await client.query(
            `INSERT INTO tasks 
             (id, wedding_id, assigned_to, title, description, 
              due_date, priority, category)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              uuidv4(),
              booking.wedding_id,
              booking.customer_id,
              'Payment Reminder',
              `Reminder to complete payment for ${booking.vendor_name}`,
              paymentReminderDate,
              'high',
              'payment'
            ]
          )
          break

        case 'completed':
          // Créer une tâche pour laisser un avis
          await client.query(
            `INSERT INTO tasks 
             (id, wedding_id, assigned_to, title, description, 
              due_date, priority, category)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              uuidv4(),
              booking.wedding_id,
              booking.customer_id,
              'Leave Review',
              `Please leave a review for ${booking.vendor_name}`,
              new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
              'low',
              'review'
            ]
          )
          break
      }
    } catch (error) {
      console.error('Error handling status change:', error)
    }
  }

  // Envoyer notifications
  async sendBookingNotifications (booking, vendor, action) {
    try {
      const notifications = []

      switch (action) {
        case 'created':
          notifications.push({
            user_id: booking.customer_id,
            wedding_id: booking.wedding_id,
            type: 'booking',
            title: 'Booking Created',
            content: `Your booking with ${vendor.name} for ${booking.service_date} has been created`,
            channel: 'email'
          })
          break

        case 'confirmed':
          notifications.push({
            user_id: booking.customer_id,
            wedding_id: booking.wedding_id,
            type: 'booking',
            title: 'Booking Confirmed',
            content: `Your booking with ${vendor.name} has been confirmed`,
            channel: 'email'
          })
          break

        case 'cancelled':
          notifications.push({
            user_id: booking.customer_id,
            wedding_id: booking.wedding_id,
            type: 'booking',
            title: 'Booking Cancelled',
            content: `Your booking with ${vendor.name} has been cancelled`,
            channel: 'email'
          })
          break
      }

      for (const notification of notifications) {
        await notificationService.sendNotification(notification)
      }
    } catch (error) {
      console.error('Error sending booking notifications:', error)
    }
  }
}

module.exports = new BookingController()
