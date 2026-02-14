/**
 * Service Twilio - Envoi de SMS
 * Gère l'envoi de SMS via l'API Twilio
 */

const twilio = require('twilio')
const { EventEmitter } = require('events')

class TwilioService extends EventEmitter {
  constructor () {
    super()

    // Configuration Twilio
    this.accountSid = process.env.TWILIO_ACCOUNT_SID
    this.authToken = process.env.TWILIO_AUTH_TOKEN
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER
    this.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID

    // Initialiser le client Twilio
    if (this.accountSid && this.authToken) {
      this.client = twilio(this.accountSid, this.authToken)
      this.initialized = true
    } else {
      console.warn('[TwilioService] Missing credentials, running in mock mode')
      this.initialized = false
    }

    // Statistiques
    this.stats = {
      sent: 0,
      failed: 0,
      queued: 0
    }

    // Templates SMS
    this.templates = {
      invitation: {
        fr: '{{couple}} vous invite à leur mariage le {{date}}. RSVP: {{link}}',
        en: '{{couple}} invites you to their wedding on {{date}}. RSVP: {{link}}'
      },
      rsvp_reminder: {
        fr: 'Rappel: Confirmez votre présence au mariage de {{couple}}. {{link}}',
        en: 'Reminder: Confirm your attendance for {{couple}}\'s wedding. {{link}}'
      },
      vendor_booking: {
        fr: 'Nouvelle réservation de {{couple}} pour le {{date}}. Détails: {{link}}',
        en: 'New booking from {{couple}} for {{date}}. Details: {{link}}'
      },
      payment_reminder: {
        fr: 'Rappel: Paiement de {{amount}}€ dû à {{vendor}}. {{link}}',
        en: 'Reminder: Payment of €{{amount}} due to {{vendor}}. {{link}}'
      },
      wedding_reminder: {
        fr: 'J-{{days}}! Le mariage de {{couple}} approche. Infos: {{link}}',
        en: '{{days}} days left! {{couple}}\'s wedding is coming. Info: {{link}}'
      },
      verification: {
        fr: 'Code de vérification Attitudes.vip: {{code}}',
        en: 'Attitudes.vip verification code: {{code}}'
      }
    }
  }

  /**
   * Envoyer un SMS
   * @param {Object} options - Options d'envoi
   * @param {string} options.to - Numéro de téléphone destinataire
   * @param {string} options.message - Message à envoyer
   * @param {string} options.template - Template à utiliser
   * @param {Object} options.data - Données pour le template
   * @param {string} options.lang - Langue (fr/en)
   */
  async send (options) {
    try {
      const { to, message, template, data = {}, lang = 'fr' } = options

      // Préparer le message
      let smsBody = message

      if (template && this.templates[template]) {
        smsBody = this.templates[template][lang] || this.templates[template].fr

        // Remplacer les variables
        smsBody = this.processTemplate(smsBody, data)
      }

      // Valider le numéro
      const formattedNumber = this.formatPhoneNumber(to)
      if (!formattedNumber) {
        throw new Error('Invalid phone number')
      }

      // Limiter la longueur du message
      if (smsBody.length > 160) {
        console.warn('[TwilioService] Message truncated to 160 characters')
        smsBody = smsBody.substring(0, 157) + '...'
      }

      // Envoyer le SMS
      if (this.initialized) {
        const messageOptions = {
          body: smsBody,
          to: formattedNumber
        }

        // Utiliser le service de messagerie ou le numéro from
        if (this.messagingServiceSid) {
          messageOptions.messagingServiceSid = this.messagingServiceSid
        } else {
          messageOptions.from = this.fromNumber
        }

        const result = await this.client.messages.create(messageOptions)

        this.stats.sent++

        this.emit('sms:sent', {
          sid: result.sid,
          to: formattedNumber,
          status: result.status,
          price: result.price,
          priceUnit: result.priceUnit
        })

        console.log(`[TwilioService] SMS sent: ${result.sid}`)

        return {
          success: true,
          messageId: result.sid,
          status: result.status,
          to: formattedNumber
        }
      } else {
        // Mode mock
        console.log(`[TwilioService] MOCK SMS to ${formattedNumber}: ${smsBody}`)

        this.stats.sent++

        return {
          success: true,
          messageId: `mock_${Date.now()}`,
          status: 'sent',
          to: formattedNumber,
          mock: true
        }
      }
    } catch (error) {
      console.error('[TwilioService] Send error:', error)

      this.stats.failed++

      this.emit('sms:failed', {
        error: error.message,
        to: options.to
      })

      throw error
    }
  }

  /**
   * Envoyer un SMS de vérification
   */
  async sendVerification (phoneNumber, code) {
    return this.send({
      to: phoneNumber,
      template: 'verification',
      data: { code },
      lang: 'fr'
    })
  }

  /**
   * Envoyer des SMS en masse
   */
  async sendBulk (recipients, options) {
    const results = []
    const batchSize = 10 // Envoyer par lots de 10

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize)

      const batchPromises = batch.map(recipient => {
        return this.send({
          ...options,
          to: recipient.phone || recipient,
          data: {
            ...options.data,
            name: recipient.name || ''
          }
        }).catch(error => ({
          success: false,
          error: error.message,
          to: recipient.phone || recipient
        }))
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      // Attendre un peu entre les lots pour éviter le rate limiting
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    console.log(`[TwilioService] Bulk SMS: ${successful} sent, ${failed} failed`)

    return {
      total: recipients.length,
      successful,
      failed,
      results
    }
  }

  /**
   * Récupérer le statut d'un message
   */
  async getMessageStatus (messageSid) {
    try {
      if (!this.initialized) {
        return { status: 'unknown', mock: true }
      }

      const message = await this.client.messages(messageSid).fetch()

      return {
        sid: message.sid,
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        price: message.price,
        priceUnit: message.priceUnit,
        direction: message.direction,
        from: message.from,
        to: message.to,
        dateCreated: message.dateCreated,
        dateUpdated: message.dateUpdated,
        dateSent: message.dateSent
      }
    } catch (error) {
      console.error('[TwilioService] Get status error:', error)
      throw error
    }
  }

  /**
   * Gérer les webhooks Twilio
   */
  async handleWebhook (body, signature) {
    try {
      // Vérifier la signature
      if (this.initialized) {
        const webhookUrl = process.env.TWILIO_WEBHOOK_URL
        const isValid = twilio.validateRequest(
          this.authToken,
          signature,
          webhookUrl,
          body
        )

        if (!isValid) {
          throw new Error('Invalid webhook signature')
        }
      }

      // Traiter l'événement
      const { MessageStatus, MessageSid, ErrorCode } = body

      console.log(`[TwilioService] Webhook: ${MessageStatus} for ${MessageSid}`)

      switch (MessageStatus) {
        case 'delivered':
          this.emit('sms:delivered', { sid: MessageSid })
          break

        case 'failed':
        case 'undelivered':
          this.emit('sms:failed', {
            sid: MessageSid,
            errorCode: ErrorCode
          })
          break

        default:
          console.log(`[TwilioService] Unhandled status: ${MessageStatus}`)
      }

      return { success: true }
    } catch (error) {
      console.error('[TwilioService] Webhook error:', error)
      throw error
    }
  }

  /**
   * Formater un numéro de téléphone
   */
  formatPhoneNumber (phone) {
    if (!phone) return null

    // Supprimer tous les caractères non numériques
    let cleaned = phone.replace(/\D/g, '')

    // Ajouter le code pays si nécessaire
    if (cleaned.startsWith('0')) {
      // Numéro français
      cleaned = '33' + cleaned.substring(1)
    }

    // Ajouter le +
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned
    }

    // Vérifier la longueur
    if (cleaned.length < 10 || cleaned.length > 15) {
      return null
    }

    return cleaned
  }

  /**
   * Remplacer les variables dans un template
   */
  processTemplate (template, data) {
    return template.replace(/{{(\w+)}}/g, (match, variable) => {
      return data[variable] || match
    })
  }

  /**
   * Obtenir les statistiques
   */
  getStats () {
    return {
      ...this.stats,
      initialized: this.initialized,
      hasCredentials: !!(this.accountSid && this.authToken)
    }
  }

  /**
   * Réinitialiser les statistiques
   */
  resetStats () {
    this.stats = {
      sent: 0,
      failed: 0,
      queued: 0
    }
  }

  /**
   * Vérifier le solde du compte
   */
  async getBalance () {
    try {
      if (!this.initialized) {
        return { balance: 0, currency: 'USD', mock: true }
      }

      const account = await this.client.api.accounts(this.accountSid).fetch()

      return {
        balance: account.balance,
        currency: account.currency || 'USD'
      }
    } catch (error) {
      console.error('[TwilioService] Get balance error:', error)
      throw error
    }
  }

  /**
   * Obtenir l'historique des messages
   */
  async getMessageHistory (options = {}) {
    try {
      if (!this.initialized) {
        return { messages: [], mock: true }
      }

      const { limit = 20, dateSentAfter, dateSentBefore, to, from } = options

      const filters = { limit }

      if (dateSentAfter) filters.dateSentAfter = dateSentAfter
      if (dateSentBefore) filters.dateSentBefore = dateSentBefore
      if (to) filters.to = this.formatPhoneNumber(to)
      if (from) filters.from = from

      const messages = await this.client.messages.list(filters)

      return {
        messages: messages.map(m => ({
          sid: m.sid,
          status: m.status,
          direction: m.direction,
          from: m.from,
          to: m.to,
          body: m.body,
          price: m.price,
          errorCode: m.errorCode,
          errorMessage: m.errorMessage,
          dateCreated: m.dateCreated,
          dateSent: m.dateSent
        })),
        hasMore: messages.length === limit
      }
    } catch (error) {
      console.error('[TwilioService] Get history error:', error)
      throw error
    }
  }
}

// Instance singleton
let twilioService = null

const getTwilioService = () => {
  if (!twilioService) {
    twilioService = new TwilioService()
  }
  return twilioService
}

module.exports = {
  getTwilioService,
  TwilioService
}
