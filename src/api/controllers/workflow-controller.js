/**
 * Workflow Controller - Gestion des workflows de réservation
 * API pour orchestrer les processus end-to-end
 */

const { Pool } = require('pg')
const Joi = require('joi')
const reservationWorkflow = require('../../services/workflows/reservation-workflow')

// Configuration base de données
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

// Schémas de validation
const initiateWorkflowSchema = Joi.object({
  vendor_id: Joi.string().uuid().required(),
  wedding_id: Joi.string().uuid().required(),
  service_date: Joi.date().min('now').required(),
  package_id: Joi.string().uuid().optional(),
  special_requests: Joi.string().max(1000).optional(),
  preferred_time: Joi.string().optional(),
  budget_range: Joi.object({
    min: Joi.number().min(0),
    max: Joi.number().min(0)
  }).optional()
})

const quoteResponseSchema = Joi.object({
  workflow_id: Joi.string().uuid().required(),
  vendor_id: Joi.string().uuid().required(),
  quote_amount: Joi.number().precision(2).min(0).required(),
  deposit_percentage: Joi.number().integer().min(0).max(100).default(30),
  service_details: Joi.object().required(),
  terms_and_conditions: Joi.string().required(),
  valid_until: Joi.date().min('now').required(),
  notes: Joi.string().max(1000).optional()
})

const acceptQuoteSchema = Joi.object({
  workflow_id: Joi.string().uuid().required(),
  quote_id: Joi.string().uuid().required(),
  accepted_terms: Joi.boolean().valid(true).required(),
  customer_notes: Joi.string().max(500).optional()
})

const signContractSchema = Joi.object({
  workflow_id: Joi.string().uuid().required(),
  contract_id: Joi.string().uuid().required(),
  signature_data: Joi.string().required(),
  ip_address: Joi.string().ip().required(),
  signed_at: Joi.date().default('now')
})

class WorkflowController {
  // Initier un nouveau workflow de réservation
  async initiateReservationWorkflow (req, res) {
    try {
      const { error, value } = initiateWorkflowSchema.validate(req.body)
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.details[0].message
        })
      }

      const { customer_id } = req.user

      // Démarrer le workflow
      const result = await reservationWorkflow.initiateWorkflow({
        customerId: customer_id,
        weddingId: value.wedding_id,
        vendorId: value.vendor_id,
        serviceDate: value.service_date,
        packageId: value.package_id,
        specialRequests: value.special_requests,
        preferredTime: value.preferred_time,
        budgetRange: value.budget_range
      })

      res.status(201).json({
        success: true,
        data: {
          workflow_id: result.workflowId,
          state: result.workflow.state,
          next_steps: this.getNextSteps(result.workflow.state),
          estimated_completion: this.estimateCompletion(value.service_date)
        },
        message: 'Workflow de réservation initié avec succès'
      })
    } catch (error) {
      console.error('Error initiating workflow:', error)

      if (error.message.includes('not available')) {
        return res.status(409).json({
          success: false,
          error: 'Conflict',
          message: error.message
        })
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  // Soumettre un devis (vendor)
  async submitQuote (req, res) {
    try {
      const { error, value } = quoteResponseSchema.validate(req.body)
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.details[0].message
        })
      }

      const { vendor_id } = req.user // Assuming vendor authentication

      // Vérifier que le vendor peut répondre à ce workflow
      const workflow = await this.getWorkflowDetails(value.workflow_id)

      if (workflow.vendor_id !== vendor_id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        })
      }

      if (workflow.state !== 'vendor_contacted') {
        return res.status(400).json({
          success: false,
          error: 'Invalid workflow state for quote submission'
        })
      }

      // Traiter le devis
      await reservationWorkflow.handleVendorQuote(value.workflow_id, {
        vendorId: vendor_id,
        quoteAmount: value.quote_amount,
        depositPercentage: value.deposit_percentage,
        serviceDetails: value.service_details,
        termsAndConditions: value.terms_and_conditions,
        validUntil: value.valid_until,
        notes: value.notes,
        vendorName: req.user.business_name || req.user.name
      })

      res.json({
        success: true,
        message: 'Devis soumis avec succès',
        next_steps: [
          'Le client va réviser votre devis',
          'Vous recevrez une notification de sa décision',
          'Si accepté, un contrat sera généré automatiquement'
        ]
      })
    } catch (error) {
      console.error('Error submitting quote:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  // Accepter un devis (customer)
  async acceptQuote (req, res) {
    try {
      const { error, value } = acceptQuoteSchema.validate(req.body)
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.details[0].message
        })
      }

      const { customer_id } = req.user

      // Vérifier que le workflow appartient au customer
      const workflow = await this.getWorkflowDetails(value.workflow_id)

      if (workflow.customer_id !== customer_id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        })
      }

      // Récupérer les détails du devis
      const quote = await this.getQuoteDetails(value.quote_id)

      // Traiter l'acceptation
      await reservationWorkflow.handleQuoteAcceptance(value.workflow_id, {
        quoteId: value.quote_id,
        totalAmount: quote.quote_amount,
        depositAmount: (quote.quote_amount * quote.deposit_percentage) / 100,
        acceptedTerms: value.accepted_terms,
        customerNotes: value.customer_notes
      })

      res.json({
        success: true,
        message: 'Devis accepté avec succès',
        next_steps: [
          'Un contrat va être généré automatiquement',
          'Vous devrez le réviser et le signer',
          'Puis effectuer le paiement d\'acompte pour confirmer'
        ],
        contract_generation_eta: '2-4 heures'
      })
    } catch (error) {
      console.error('Error accepting quote:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  // Signer un contrat
  async signContract (req, res) {
    try {
      const { error, value } = signContractSchema.validate({
        ...req.body,
        ip_address: req.ip
      })

      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.details[0].message
        })
      }

      const { customer_id } = req.user

      // Vérifier que le workflow et le contrat appartiennent au customer
      const workflow = await this.getWorkflowDetails(value.workflow_id)

      if (workflow.customer_id !== customer_id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        })
      }

      // Traiter la signature
      await reservationWorkflow.handleContractSigning(value.workflow_id, {
        contractId: value.contract_id,
        signatureData: value.signature_data,
        ipAddress: value.ip_address,
        signedAt: new Date(),
        customerId: customer_id
      })

      res.json({
        success: true,
        message: 'Contrat signé avec succès',
        next_steps: [
          'Un paiement d\'acompte est maintenant requis',
          'Vous allez recevoir un lien de paiement sécurisé',
          'La réservation sera confirmée après paiement'
        ]
      })
    } catch (error) {
      console.error('Error signing contract:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  // Obtenir l'état d'un workflow
  async getWorkflowStatus (req, res) {
    try {
      const { workflow_id } = req.params
      const { customer_id, vendor_id } = req.user

      const workflow = await this.getWorkflowDetails(workflow_id)

      // Vérifier l'accès
      if (workflow.customer_id !== customer_id && workflow.vendor_id !== vendor_id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        })
      }

      // Enrichir avec les détails selon le rôle
      const enrichedWorkflow = await this.enrichWorkflowData(workflow, req.user.role)

      res.json({
        success: true,
        data: {
          workflow_id: workflow.id,
          state: workflow.state,
          progress_percentage: this.calculateProgress(workflow.state),
          timeline: await this.getWorkflowTimeline(workflow_id),
          current_step: this.getCurrentStepDescription(workflow.state),
          next_steps: this.getNextSteps(workflow.state),
          documents: await this.getWorkflowDocuments(workflow_id),
          ...enrichedWorkflow
        }
      })
    } catch (error) {
      console.error('Error getting workflow status:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  // Obtenir tous les workflows d'un utilisateur
  async getUserWorkflows (req, res) {
    try {
      const { customer_id, vendor_id, role } = req.user
      const { status, limit = 20, offset = 0 } = req.query

      let query, values

      if (role === 'customer') {
        query = `
          SELECT w.*, v.name as vendor_name, v.vendor_type,
                 wed.partner_name, wed.wedding_date
          FROM reservation_workflows w
          JOIN vendors v ON w.vendor_id = v.id
          JOIN weddings wed ON w.wedding_id = wed.id
          WHERE w.customer_id = $1
        `
        values = [customer_id]
      } else if (role === 'vendor') {
        query = `
          SELECT w.*, u.first_name, u.last_name,
                 wed.partner_name, wed.wedding_date
          FROM reservation_workflows w
          JOIN users u ON w.customer_id = u.id
          JOIN weddings wed ON w.wedding_id = wed.id
          WHERE w.vendor_id = $1
        `
        values = [vendor_id]
      } else {
        return res.status(403).json({
          success: false,
          error: 'Invalid role for workflow access'
        })
      }

      if (status) {
        query += ` AND w.state = $${values.length + 1}`
        values.push(status)
      }

      query += ` ORDER BY w.created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`
      values.push(parseInt(limit), parseInt(offset))

      const result = await pool.query(query, values)

      res.json({
        success: true,
        data: result.rows.map(workflow => ({
          ...workflow,
          progress_percentage: this.calculateProgress(workflow.state),
          estimated_completion: this.estimateCompletion(workflow.service_date)
        })),
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: result.rows.length
        }
      })
    } catch (error) {
      console.error('Error getting user workflows:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  // Annuler un workflow
  async cancelWorkflow (req, res) {
    try {
      const { workflow_id } = req.params
      const { reason } = req.body
      const { customer_id } = req.user

      if (!reason) {
        return res.status(400).json({
          success: false,
          error: 'Cancellation reason is required'
        })
      }

      // Vérifier l'accès
      const workflow = await this.getWorkflowDetails(workflow_id)

      if (workflow.customer_id !== customer_id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        })
      }

      // Annuler le workflow
      await reservationWorkflow.cancelWorkflow(workflow_id, reason)

      res.json({
        success: true,
        message: 'Workflow annulé avec succès',
        cancellation_details: {
          refund_processing: workflow.state === 'booking_confirmed',
          vendor_notified: true,
          reason
        }
      })
    } catch (error) {
      console.error('Error cancelling workflow:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  // Méthodes utilitaires privées

  async getWorkflowDetails (workflowId) {
    const result = await pool.query(
      'SELECT * FROM reservation_workflows WHERE id = $1',
      [workflowId]
    )

    if (result.rows.length === 0) {
      throw new Error('Workflow not found')
    }

    return result.rows[0]
  }

  async getQuoteDetails (quoteId) {
    const result = await pool.query(
      'SELECT * FROM vendor_quotes WHERE id = $1',
      [quoteId]
    )

    if (result.rows.length === 0) {
      throw new Error('Quote not found')
    }

    return result.rows[0]
  }

  async enrichWorkflowData (workflow, userRole) {
    const enriched = {}

    if (userRole === 'customer') {
      // Ajouter infos vendor
      const vendorResult = await pool.query(
        'SELECT name, vendor_type, email, phone, average_rating FROM vendors WHERE id = $1',
        [workflow.vendor_id]
      )
      enriched.vendor = vendorResult.rows[0]
    } else if (userRole === 'vendor') {
      // Ajouter infos customer
      const customerResult = await pool.query(
        'SELECT first_name, last_name, email FROM users WHERE id = $1',
        [workflow.customer_id]
      )
      enriched.customer = customerResult.rows[0]
    }

    return enriched
  }

  async getWorkflowTimeline (workflowId) {
    const result = await pool.query(
      `SELECT from_state, to_state, transitioned_at 
       FROM workflow_state_log 
       WHERE workflow_id = $1 
       ORDER BY transitioned_at`,
      [workflowId]
    )

    return result.rows.map(log => ({
      state: log.to_state,
      timestamp: log.transitioned_at,
      description: this.getStateDescription(log.to_state)
    }))
  }

  async getWorkflowDocuments (workflowId) {
    const result = await pool.query(
      `SELECT type, name, url, created_at 
       FROM workflow_documents 
       WHERE workflow_id = $1 
       ORDER BY created_at`,
      [workflowId]
    )

    return result.rows
  }

  calculateProgress (state) {
    const stateProgress = {
      initiated: 10,
      vendor_contacted: 20,
      quote_received: 30,
      quote_accepted: 40,
      contract_generated: 50,
      contract_signed: 60,
      deposit_pending: 70,
      deposit_paid: 80,
      booking_confirmed: 90,
      service_delivered: 95,
      completed: 100,
      cancelled: 0
    }

    return stateProgress[state] || 0
  }

  getNextSteps (state) {
    const nextSteps = {
      initiated: ['Attendre la réponse du prestataire'],
      vendor_contacted: ['Le prestataire prépare votre devis'],
      quote_received: ['Réviser et accepter/rejeter le devis'],
      quote_accepted: ['Attendre la génération du contrat'],
      contract_generated: ['Réviser et signer le contrat'],
      contract_signed: ['Effectuer le paiement d\'acompte'],
      deposit_pending: ['Finaliser le paiement'],
      booking_confirmed: ['Préparer le service', 'Contacter le prestataire si nécessaire'],
      service_delivered: ['Effectuer le paiement final', 'Laisser un avis'],
      completed: ['Workflow terminé'],
      cancelled: ['Workflow annulé']
    }

    return nextSteps[state] || []
  }

  getCurrentStepDescription (state) {
    const descriptions = {
      initiated: 'Demande envoyée au prestataire',
      vendor_contacted: 'En attente de devis',
      quote_received: 'Devis à réviser',
      quote_accepted: 'Génération du contrat',
      contract_generated: 'Contrat à signer',
      contract_signed: 'Paiement d\'acompte requis',
      deposit_pending: 'Traitement du paiement',
      booking_confirmed: 'Réservation confirmée',
      service_delivered: 'Service livré',
      completed: 'Terminé',
      cancelled: 'Annulé'
    }

    return descriptions[state] || 'État inconnu'
  }

  getStateDescription (state) {
    const descriptions = {
      initiated: 'Workflow initié',
      vendor_contacted: 'Prestataire contacté',
      quote_received: 'Devis reçu',
      quote_accepted: 'Devis accepté',
      contract_generated: 'Contrat généré',
      contract_signed: 'Contrat signé',
      deposit_pending: 'Acompte en attente',
      deposit_paid: 'Acompte payé',
      booking_confirmed: 'Réservation confirmée',
      service_delivered: 'Service livré',
      completed: 'Terminé',
      cancelled: 'Annulé'
    }

    return descriptions[state] || state
  }

  estimateCompletion (serviceDate) {
    const now = new Date()
    const service = new Date(serviceDate)
    const daysUntilService = Math.ceil((service - now) / (1000 * 60 * 60 * 24))

    if (daysUntilService > 60) {
      return 'Dans 2-3 semaines'
    } else if (daysUntilService > 30) {
      return 'Dans 1-2 semaines'
    } else if (daysUntilService > 7) {
      return 'Dans quelques jours'
    } else {
      return 'Urgent - Sous 48h'
    }
  }
}

module.exports = new WorkflowController()
