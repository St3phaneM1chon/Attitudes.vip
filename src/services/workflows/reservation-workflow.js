/**
 * Workflow de réservation end-to-end
 * Orchestration complète du processus de réservation
 */

const { Pool } = require('pg')
const { v4: uuidv4 } = require('uuid')
const notificationService = require('../notification/notification-service')
const stripeService = require('../payment/stripe-integration')
const twilioService = require('../sms/twilio-service')
const EventEmitter = require('events')

// Configuration base de données
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

// États possibles du workflow
const WORKFLOW_STATES = {
  INITIATED: 'initiated',
  VENDOR_CONTACTED: 'vendor_contacted',
  QUOTE_RECEIVED: 'quote_received',
  QUOTE_ACCEPTED: 'quote_accepted',
  CONTRACT_GENERATED: 'contract_generated',
  CONTRACT_SIGNED: 'contract_signed',
  DEPOSIT_PENDING: 'deposit_pending',
  DEPOSIT_PAID: 'deposit_paid',
  BOOKING_CONFIRMED: 'booking_confirmed',
  SERVICE_DELIVERED: 'service_delivered',
  BALANCE_PENDING: 'balance_pending',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
}

// Types d'événements
const WORKFLOW_EVENTS = {
  STATE_CHANGED: 'state_changed',
  ACTION_REQUIRED: 'action_required',
  PAYMENT_REQUIRED: 'payment_required',
  NOTIFICATION_SENT: 'notification_sent',
  ERROR_OCCURRED: 'error_occurred'
}

class ReservationWorkflow extends EventEmitter {
  constructor () {
    super()
    this.activeWorkflows = new Map()
  }

  /**
   * Initier un nouveau workflow de réservation
   */
  async initiateWorkflow (params) {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const workflowId = uuidv4()
      const {
        customerId,
        weddingId,
        vendorId,
        serviceDate,
        packageId,
        specialRequests
      } = params

      // Valider les paramètres
      await this.validateWorkflowParams(client, params)

      // Créer l'enregistrement de workflow
      const workflow = await this.createWorkflowRecord(client, {
        id: workflowId,
        customerId,
        weddingId,
        vendorId,
        serviceDate,
        packageId,
        specialRequests,
        state: WORKFLOW_STATES.INITIATED
      })

      // Créer la tâche initiale
      await this.createWorkflowTask(client, {
        workflowId,
        title: 'Contacter le prestataire',
        description: 'Envoyer une demande de disponibilité et devis',
        assignedTo: customerId,
        priority: 'high',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
      })

      // Envoyer la demande initiale au vendor
      await this.sendVendorInquiry(client, workflow)

      // Transition vers l'état suivant
      await this.transitionState(client, workflowId, WORKFLOW_STATES.VENDOR_CONTACTED)

      await client.query('COMMIT')

      // Stocker le workflow actif
      this.activeWorkflows.set(workflowId, workflow)

      // Programmer les rappels automatiques
      this.scheduleAutomaticReminders(workflowId)

      this.emit(WORKFLOW_EVENTS.STATE_CHANGED, {
        workflowId,
        oldState: null,
        newState: WORKFLOW_STATES.VENDOR_CONTACTED,
        workflow
      })

      return { workflowId, workflow }
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('Error initiating workflow:', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Traiter une réponse de vendor (devis)
   */
  async handleVendorQuote (workflowId, quoteData) {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const workflow = await this.getWorkflow(client, workflowId)

      if (workflow.state !== WORKFLOW_STATES.VENDOR_CONTACTED) {
        throw new Error(`Invalid state for quote: ${workflow.state}`)
      }

      // Enregistrer le devis
      const quoteId = await this.saveQuote(client, {
        workflowId,
        vendorId: workflow.vendor_id,
        ...quoteData
      })

      // Notifier le client
      await this.notifyCustomerQuoteReceived(workflow, quoteData)

      // Créer tâche de révision pour le client
      await this.createWorkflowTask(client, {
        workflowId,
        title: 'Réviser le devis',
        description: `Réviser et accepter/rejeter le devis de ${quoteData.vendorName}`,
        assignedTo: workflow.customer_id,
        priority: 'high',
        dueDate: new Date(Date.now() + 72 * 60 * 60 * 1000) // 72h
      })

      // Transition d'état
      await this.transitionState(client, workflowId, WORKFLOW_STATES.QUOTE_RECEIVED)

      await client.query('COMMIT')

      this.emit(WORKFLOW_EVENTS.STATE_CHANGED, {
        workflowId,
        oldState: WORKFLOW_STATES.VENDOR_CONTACTED,
        newState: WORKFLOW_STATES.QUOTE_RECEIVED,
        quoteId
      })
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('Error handling vendor quote:', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Traiter l'acceptation d'un devis par le client
   */
  async handleQuoteAcceptance (workflowId, acceptanceData) {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const workflow = await this.getWorkflow(client, workflowId)

      if (workflow.state !== WORKFLOW_STATES.QUOTE_RECEIVED) {
        throw new Error(`Invalid state for quote acceptance: ${workflow.state}`)
      }

      // Marquer le devis comme accepté
      await this.updateQuoteStatus(client, workflow.quote_id, 'accepted')

      // Générer le contrat automatiquement
      const contractId = await this.generateContract(client, workflow, acceptanceData)

      // Créer la réservation
      const bookingId = await this.createBooking(client, {
        workflowId,
        weddingId: workflow.wedding_id,
        vendorId: workflow.vendor_id,
        customerId: workflow.customer_id,
        serviceDate: workflow.service_date,
        packageId: workflow.package_id,
        totalAmount: acceptanceData.totalAmount,
        depositAmount: acceptanceData.depositAmount
      })

      // Notifier le vendor
      await this.notifyVendorQuoteAccepted(workflow, acceptanceData)

      // Créer tâche de signature de contrat
      await this.createWorkflowTask(client, {
        workflowId,
        title: 'Signer le contrat',
        description: 'Réviser et signer le contrat de service',
        assignedTo: workflow.customer_id,
        priority: 'high',
        dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48h
      })

      // Transition d'état
      await this.transitionState(client, workflowId, WORKFLOW_STATES.CONTRACT_GENERATED)

      await client.query('COMMIT')

      this.emit(WORKFLOW_EVENTS.STATE_CHANGED, {
        workflowId,
        oldState: WORKFLOW_STATES.QUOTE_RECEIVED,
        newState: WORKFLOW_STATES.CONTRACT_GENERATED,
        contractId,
        bookingId
      })
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('Error handling quote acceptance:', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Traiter la signature de contrat
   */
  async handleContractSigning (workflowId, signatureData) {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const workflow = await this.getWorkflow(client, workflowId)

      if (workflow.state !== WORKFLOW_STATES.CONTRACT_GENERATED) {
        throw new Error(`Invalid state for contract signing: ${workflow.state}`)
      }

      // Enregistrer la signature
      await this.recordContractSignature(client, workflow.contract_id, signatureData)

      // Initier le processus de paiement d'acompte
      const paymentIntent = await this.initiateDepositPayment(workflow)

      // Créer tâche de paiement
      await this.createWorkflowTask(client, {
        workflowId,
        title: 'Effectuer le paiement d\'acompte',
        description: `Payer l'acompte de ${workflow.deposit_amount}€`,
        assignedTo: workflow.customer_id,
        priority: 'high',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
      })

      // Transition d'état
      await this.transitionState(client, workflowId, WORKFLOW_STATES.DEPOSIT_PENDING)

      await client.query('COMMIT')

      this.emit(WORKFLOW_EVENTS.PAYMENT_REQUIRED, {
        workflowId,
        paymentType: 'deposit',
        amount: workflow.deposit_amount,
        paymentIntent
      })
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('Error handling contract signing:', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Traiter la confirmation de paiement d'acompte
   */
  async handleDepositPayment (workflowId, paymentData) {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const workflow = await this.getWorkflow(client, workflowId)

      if (workflow.state !== WORKFLOW_STATES.DEPOSIT_PENDING) {
        throw new Error(`Invalid state for deposit payment: ${workflow.state}`)
      }

      // Enregistrer le paiement
      await this.recordPayment(client, {
        workflowId,
        bookingId: workflow.booking_id,
        amount: paymentData.amount,
        type: 'deposit',
        stripePaymentIntentId: paymentData.paymentIntentId
      })

      // Confirmer la réservation
      await this.confirmBooking(client, workflow.booking_id)

      // Notifier toutes les parties
      await this.notifyBookingConfirmed(workflow)

      // Créer les tâches de suivi
      await this.createFollowUpTasks(client, workflow)

      // Transition d'état
      await this.transitionState(client, workflowId, WORKFLOW_STATES.BOOKING_CONFIRMED)

      await client.query('COMMIT')

      this.emit(WORKFLOW_EVENTS.STATE_CHANGED, {
        workflowId,
        oldState: WORKFLOW_STATES.DEPOSIT_PENDING,
        newState: WORKFLOW_STATES.BOOKING_CONFIRMED
      })

      // Programmer le rappel de paiement du solde
      this.scheduleBalancePaymentReminder(workflowId, workflow.service_date)
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('Error handling deposit payment:', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Marquer le service comme livré
   */
  async markServiceDelivered (workflowId, deliveryData) {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const workflow = await this.getWorkflow(client, workflowId)

      // Enregistrer la livraison
      await this.recordServiceDelivery(client, workflow.booking_id, deliveryData)

      // Créer tâche de révision/avis
      await this.createWorkflowTask(client, {
        workflowId,
        title: 'Laisser un avis',
        description: `Partager votre expérience avec ${workflow.vendor_name}`,
        assignedTo: workflow.customer_id,
        priority: 'low',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 jours
      })

      // Initier le paiement du solde si nécessaire
      if (workflow.balance_amount > 0) {
        await this.initiateBalancePayment(workflow)
        await this.transitionState(client, workflowId, WORKFLOW_STATES.BALANCE_PENDING)
      } else {
        await this.transitionState(client, workflowId, WORKFLOW_STATES.COMPLETED)
      }

      await client.query('COMMIT')

      this.emit(WORKFLOW_EVENTS.STATE_CHANGED, {
        workflowId,
        oldState: WORKFLOW_STATES.BOOKING_CONFIRMED,
        newState: workflow.balance_amount > 0 ? WORKFLOW_STATES.BALANCE_PENDING : WORKFLOW_STATES.COMPLETED
      })
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('Error marking service delivered:', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Finaliser le workflow après paiement du solde
   */
  async completeWorkflow (workflowId) {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const workflow = await this.getWorkflow(client, workflowId)

      // Marquer comme complété
      await this.transitionState(client, workflowId, WORKFLOW_STATES.COMPLETED)

      // Marquer toutes les tâches comme terminées
      await this.completeAllWorkflowTasks(client, workflowId)

      // Générer la facture finale
      await this.generateFinalInvoice(client, workflow)

      // Envoyer notifications de clôture
      await this.sendCompletionNotifications(workflow)

      await client.query('COMMIT')

      // Nettoyer le workflow actif
      this.activeWorkflows.delete(workflowId)

      this.emit(WORKFLOW_EVENTS.STATE_CHANGED, {
        workflowId,
        oldState: WORKFLOW_STATES.BALANCE_PENDING,
        newState: WORKFLOW_STATES.COMPLETED
      })
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('Error completing workflow:', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Annuler un workflow
   */
  async cancelWorkflow (workflowId, reason) {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const workflow = await this.getWorkflow(client, workflowId)

      // Traiter les remboursements si nécessaire
      if (workflow.state === WORKFLOW_STATES.BOOKING_CONFIRMED ||
          workflow.state === WORKFLOW_STATES.DEPOSIT_PAID) {
        await this.processRefunds(client, workflow, reason)
      }

      // Annuler la réservation
      if (workflow.booking_id) {
        await this.cancelBooking(client, workflow.booking_id, reason)
      }

      // Notifier toutes les parties
      await this.sendCancellationNotifications(workflow, reason)

      // Transition vers état annulé
      await this.transitionState(client, workflowId, WORKFLOW_STATES.CANCELLED)

      await client.query('COMMIT')

      // Nettoyer le workflow actif
      this.activeWorkflows.delete(workflowId)

      this.emit(WORKFLOW_EVENTS.STATE_CHANGED, {
        workflowId,
        oldState: workflow.state,
        newState: WORKFLOW_STATES.CANCELLED,
        reason
      })
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('Error cancelling workflow:', error)
      throw error
    } finally {
      client.release()
    }
  }

  // Méthodes utilitaires privées

  async validateWorkflowParams (client, params) {
    // Vérifier que le mariage existe et appartient au client
    const weddingCheck = await client.query(
      'SELECT id FROM weddings WHERE id = $1 AND customer_id = $2',
      [params.weddingId, params.customerId]
    )

    if (weddingCheck.rows.length === 0) {
      throw new Error('Wedding not found or access denied')
    }

    // Vérifier que le vendor existe
    const vendorCheck = await client.query(
      'SELECT * FROM vendors WHERE id = $1',
      [params.vendorId]
    )

    if (vendorCheck.rows.length === 0) {
      throw new Error('Vendor not found')
    }

    // Vérifier la disponibilité
    const availabilityCheck = await client.query(
      `SELECT id FROM bookings 
       WHERE vendor_id = $1 AND service_date = $2 AND status IN ('confirmed', 'pending')`,
      [params.vendorId, params.serviceDate]
    )

    if (availabilityCheck.rows.length > 0) {
      throw new Error('Vendor not available for selected date')
    }
  }

  async createWorkflowRecord (client, data) {
    const query = `
      INSERT INTO reservation_workflows (
        id, customer_id, wedding_id, vendor_id, service_date,
        package_id, special_requests, state, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      RETURNING *
    `

    const result = await client.query(query, [
      data.id, data.customerId, data.weddingId, data.vendorId,
      data.serviceDate, data.packageId, data.specialRequests, data.state
    ])

    return result.rows[0]
  }

  async transitionState (client, workflowId, newState) {
    await client.query(
      'UPDATE reservation_workflows SET state = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newState, workflowId]
    )

    // Log de transition
    await client.query(
      `INSERT INTO workflow_state_log (workflow_id, from_state, to_state, transitioned_at)
       VALUES ($1, (SELECT state FROM reservation_workflows WHERE id = $1), $2, CURRENT_TIMESTAMP)`,
      [workflowId, newState]
    )
  }

  async createWorkflowTask (client, taskData) {
    const taskId = uuidv4()

    await client.query(
      `INSERT INTO tasks (
        id, workflow_id, title, description, assigned_to, 
        priority, due_date, category, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        taskId, taskData.workflowId, taskData.title, taskData.description,
        taskData.assignedTo, taskData.priority, taskData.dueDate,
        'workflow', 'pending'
      ]
    )

    return taskId
  }

  async getWorkflow (client, workflowId) {
    const result = await client.query(
      'SELECT * FROM reservation_workflows WHERE id = $1',
      [workflowId]
    )

    if (result.rows.length === 0) {
      throw new Error('Workflow not found')
    }

    return result.rows[0]
  }

  async sendVendorInquiry (client, workflow) {
    // Envoyer email au vendor
    await notificationService.sendNotification({
      user_id: workflow.vendor_user_id,
      type: 'inquiry',
      title: 'Nouvelle demande de réservation',
      content: `Nouvelle demande pour le ${workflow.service_date}`,
      channel: 'email'
    })

    // SMS si urgent
    if (this.isUrgentRequest(workflow.service_date)) {
      await twilioService.sendSMS(
        workflow.vendor_phone,
        `Nouvelle demande urgente de réservation pour le ${workflow.service_date}. Consultez votre dashboard.`
      )
    }
  }

  async scheduleAutomaticReminders (workflowId) {
    // Programmer des rappels automatiques selon l'état
    setTimeout(() => {
      this.checkWorkflowProgress(workflowId)
    }, 24 * 60 * 60 * 1000) // 24h
  }

  async checkWorkflowProgress (workflowId) {
    const workflow = this.activeWorkflows.get(workflowId)

    if (!workflow) return

    const timeInState = Date.now() - new Date(workflow.updated_at).getTime()
    const hoursInState = timeInState / (1000 * 60 * 60)

    // Rappels selon l'état et le temps
    if (workflow.state === WORKFLOW_STATES.VENDOR_CONTACTED && hoursInState > 48) {
      await this.sendVendorReminder(workflow)
    } else if (workflow.state === WORKFLOW_STATES.QUOTE_RECEIVED && hoursInState > 72) {
      await this.sendCustomerReminder(workflow)
    }
  }

  isUrgentRequest (serviceDate) {
    const daysUntilService = (new Date(serviceDate) - new Date()) / (1000 * 60 * 60 * 24)
    return daysUntilService <= 30 // Moins de 30 jours = urgent
  }

  // Implémentation des autres méthodes privées...
  // (saveQuote, generateContract, createBooking, etc.)
}

// Table de workflow à créer
const createWorkflowTables = async () => {
  const client = await pool.connect()

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS reservation_workflows (
        id UUID PRIMARY KEY,
        customer_id UUID REFERENCES users(id),
        wedding_id UUID REFERENCES weddings(id),
        vendor_id UUID REFERENCES vendors(id),
        service_date DATE,
        package_id UUID,
        special_requests TEXT,
        state VARCHAR(50),
        quote_id UUID,
        contract_id UUID,
        booking_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS workflow_state_log (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        workflow_id UUID REFERENCES reservation_workflows(id),
        from_state VARCHAR(50),
        to_state VARCHAR(50),
        transitioned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `)
  } finally {
    client.release()
  }
}

// Initialiser les tables au démarrage
createWorkflowTables().catch(console.error)

module.exports = new ReservationWorkflow()
