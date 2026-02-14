/**
 * Service Email/SMS avec Templates Avancés
 * Support multi-langue, personnalisation et tracking
 */

const nodemailer = require('nodemailer')
const twilio = require('twilio')
const { createClient } = require('@supabase/supabase-js')
const EventEmitter = require('events')
const fs = require('fs').promises
const path = require('path')
const handlebars = require('handlebars')

class EmailSMSService extends EventEmitter {
  constructor (config = {}) {
    super()

    this.config = {
      // Configuration Email
      smtp: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      },

      // Configuration SMS
      twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER
      },

      // Configuration générale
      fromEmail: config.fromEmail || 'noreply@attitudes.vip',
      fromName: config.fromName || 'Attitudes.vip',

      // Templates
      templatesPath: config.templatesPath || path.join(__dirname, 'templates'),
      enableTemplateCache: config.enableTemplateCache !== false,
      defaultLanguage: config.defaultLanguage || 'fr',
      supportedLanguages: config.supportedLanguages || ['fr', 'en', 'es', 'de'],

      // Tracking
      enableTracking: config.enableTracking !== false,
      trackingDomain: config.trackingDomain || 'https://attitudes.vip',

      // Limites et queues
      emailRateLimit: config.emailRateLimit || 100, // emails par minute
      smsRateLimit: config.smsRateLimit || 50, // SMS par minute

      // Retry
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 5000,

      ...config
    }

    // Initialiser les services
    this.initializeServices()

    // Cache des templates
    this.templateCache = new Map()

    // Queues de messages
    this.emailQueue = []
    this.smsQueue = []

    // Statistiques
    this.stats = {
      emailsSent: 0,
      emailsFailed: 0,
      smsSent: 0,
      smsFailed: 0,
      templatesLoaded: 0,
      trackingEvents: 0
    }

    // Types de messages prédéfinis
    this.messageTypes = {
      wedding: {
        invitation: { priority: 'high', channels: ['email'] },
        rsvp_reminder: { priority: 'normal', channels: ['email', 'sms'] },
        rsvp_confirmation: { priority: 'high', channels: ['email'] },
        final_details: { priority: 'high', channels: ['email', 'sms'] },
        thank_you: { priority: 'low', channels: ['email'] }
      },
      vendor: {
        contract_sent: { priority: 'high', channels: ['email'] },
        payment_reminder: { priority: 'normal', channels: ['email', 'sms'] },
        payment_received: { priority: 'high', channels: ['email'] },
        coordination_update: { priority: 'normal', channels: ['email'] }
      },
      system: {
        welcome: { priority: 'high', channels: ['email'] },
        password_reset: { priority: 'high', channels: ['email'] },
        account_verification: { priority: 'high', channels: ['email'] },
        security_alert: { priority: 'high', channels: ['email', 'sms'] }
      }
    }

    this.startProcessing()
    console.log('[Communication] Email/SMS service initialized')
  }

  /**
   * Initialiser les services externes
   */
  async initializeServices () {
    try {
      // Configurer Nodemailer
      this.emailTransporter = nodemailer.createTransporter(this.config.smtp)
      await this.emailTransporter.verify()
      console.log('[Communication] Email transporter ready')

      // Configurer Twilio
      if (this.config.twilio.accountSid) {
        this.twilioClient = twilio(
          this.config.twilio.accountSid,
          this.config.twilio.authToken
        )
        console.log('[Communication] SMS service ready')
      }

      // Initialiser Supabase
      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )

      // Charger les templates
      await this.loadTemplates()

      // Configurer les helpers Handlebars
      this.setupHandlebarsHelpers()
    } catch (error) {
      console.error('[Communication] Service initialization failed:', error)
      throw error
    }
  }

  /**
   * Charger tous les templates
   */
  async loadTemplates () {
    try {
      const templateDirs = await fs.readdir(this.config.templatesPath)

      for (const lang of templateDirs) {
        const langPath = path.join(this.config.templatesPath, lang)
        const stat = await fs.stat(langPath)

        if (stat.isDirectory()) {
          const templateFiles = await fs.readdir(langPath)

          for (const file of templateFiles) {
            if (file.endsWith('.hbs')) {
              const templateName = file.replace('.hbs', '')
              const templatePath = path.join(langPath, file)
              const templateContent = await fs.readFile(templatePath, 'utf8')

              const compiled = handlebars.compile(templateContent)
              this.templateCache.set(`${templateName}_${lang}`, compiled)
              this.stats.templatesLoaded++
            }
          }
        }
      }

      console.log(`[Communication] Loaded ${this.stats.templatesLoaded} templates`)
    } catch (error) {
      console.error('[Communication] Error loading templates:', error)
      // Continuer sans templates si erreur
    }
  }

  /**
   * Configurer les helpers Handlebars
   */
  setupHandlebarsHelpers () {
    // Helper pour formater les dates
    handlebars.registerHelper('formatDate', (date, format) => {
      if (!date) return ''
      const d = new Date(date)

      switch (format) {
        case 'long':
          return d.toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        case 'short':
          return d.toLocaleDateString('fr-FR')
        case 'time':
          return d.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
          })
        default:
          return d.toLocaleDateString('fr-FR')
      }
    })

    // Helper pour formater les montants
    handlebars.registerHelper('formatAmount', (amount, currency = 'EUR') => {
      if (!amount) return '0'
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency
      }).format(amount / 100) // Montants en centimes
    })

    // Helper conditionnel
    handlebars.registerHelper('if_eq', function (a, b, options) {
      if (a === b) {
        return options.fn(this)
      } else {
        return options.inverse(this)
      }
    })

    // Helper pour les liens de tracking
    handlebars.registerHelper('trackingLink', (url, messageId, action) => {
      const trackingUrl = `${this.config.trackingDomain}/track/${messageId}/${action}?redirect=${encodeURIComponent(url)}`
      return new handlebars.SafeString(trackingUrl)
    })

    // Helper pour les images
    handlebars.registerHelper('cdnImage', (imagePath, size) => {
      const baseUrl = 'https://cdn.attitudes.vip'
      return `${baseUrl}/${imagePath}${size ? `?size=${size}` : ''}`
    })
  }

  /**
   * Envoyer un message avec template
   */
  async sendTemplatedMessage (messageData) {
    try {
      const message = this.processMessageData(messageData)

      // Obtenir la configuration du type de message
      const typeConfig = this.getMessageTypeConfig(message.type, message.category)

      // Déterminer les canaux à utiliser
      const channels = message.channels || typeConfig.channels || ['email']

      // Préparer le contenu selon les canaux
      const content = await this.prepareMessageContent(message, channels)

      // Ajouter aux queues appropriées
      const results = await Promise.allSettled(
        channels.map(channel => this.queueMessage(message, content, channel))
      )

      // Analyser les résultats
      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      console.log(`[Communication] Queued message ${message.id}: ${successful} successful, ${failed} failed`)

      return {
        success: successful > 0,
        messageId: message.id,
        channels: successful,
        errors: results.filter(r => r.status === 'rejected').map(r => r.reason)
      }
    } catch (error) {
      console.error('[Communication] Error sending templated message:', error)
      throw new Error(`Failed to send message: ${error.message}`)
    }
  }

  /**
   * Traiter les données du message
   */
  processMessageData (data) {
    return {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: data.type,
      category: data.category || 'system',
      templateName: data.template,

      // Destinataires
      recipients: Array.isArray(data.recipients) ? data.recipients : [data.recipients],

      // Contenu
      subject: data.subject,
      variables: data.variables || {},

      // Configuration
      language: data.language || this.config.defaultLanguage,
      channels: data.channels,
      priority: data.priority || 'normal',

      // Tracking
      enableTracking: data.enableTracking !== false,
      trackingData: data.trackingData || {},

      // Contexte
      weddingId: data.weddingId,
      userId: data.userId,

      // Timing
      scheduledFor: data.scheduledFor || new Date(),
      expiresAt: data.expiresAt,

      // Métadonnées
      metadata: data.metadata || {},
      createdAt: new Date()
    }
  }

  /**
   * Obtenir la configuration d'un type de message
   */
  getMessageTypeConfig (type, category) {
    return this.messageTypes[category]?.[type] || { priority: 'normal', channels: ['email'] }
  }

  /**
   * Préparer le contenu du message
   */
  async prepareMessageContent (message, channels) {
    const content = {}

    for (const channel of channels) {
      switch (channel) {
        case 'email':
          content.email = await this.prepareEmailContent(message)
          break
        case 'sms':
          content.sms = await this.prepareSMSContent(message)
          break
      }
    }

    return content
  }

  /**
   * Préparer le contenu email
   */
  async prepareEmailContent (message) {
    try {
      // Récupérer le template
      const templateKey = `${message.templateName}_${message.language}`
      let template = this.templateCache.get(templateKey)

      if (!template) {
        // Fallback sur langue par défaut
        const fallbackKey = `${message.templateName}_${this.config.defaultLanguage}`
        template = this.templateCache.get(fallbackKey)
      }

      if (!template) {
        throw new Error(`Template not found: ${templateKey}`)
      }

      // Préparer les variables avec tracking si activé
      const variables = { ...message.variables }

      if (message.enableTracking) {
        variables.trackingPixel = `${this.config.trackingDomain}/track/${message.id}/open`
        variables.messageId = message.id
      }

      // Générer le contenu
      const html = template(variables)

      // Extraire le sujet si défini dans le template
      const subjectMatch = html.match(/<!--\s*SUBJECT:\s*(.+?)\s*-->/)
      const subject = subjectMatch ? subjectMatch[1] : message.subject

      return {
        subject,
        html: html.replace(/<!--\s*SUBJECT:.*?-->/, ''),
        text: this.htmlToText(html)
      }
    } catch (error) {
      console.error('[Communication] Error preparing email content:', error)
      throw error
    }
  }

  /**
   * Préparer le contenu SMS
   */
  async prepareSMSContent (message) {
    try {
      // Templates SMS plus simples
      const templateKey = `${message.templateName}_sms_${message.language}`
      const template = this.templateCache.get(templateKey)

      if (!template) {
        // Fallback sur template email simplifié
        const emailContent = await this.prepareEmailContent(message)
        return {
          text: this.htmlToText(emailContent.html).substring(0, 160)
        }
      }

      const text = template(message.variables)

      return {
        text: text.substring(0, 160) // Limite SMS
      }
    } catch (error) {
      console.error('[Communication] Error preparing SMS content:', error)
      throw error
    }
  }

  /**
   * Ajouter un message à la queue
   */
  async queueMessage (message, content, channel) {
    const queueItem = {
      message,
      content: content[channel],
      channel,
      attempts: 0,
      queuedAt: new Date()
    }

    if (channel === 'email') {
      this.emailQueue.push(queueItem)
    } else if (channel === 'sms') {
      this.smsQueue.push(queueItem)
    }

    return { channel, queued: true }
  }

  /**
   * Démarrer le traitement des queues
   */
  startProcessing () {
    // Traiter les emails
    setInterval(() => {
      this.processEmailQueue()
    }, 60000 / this.config.emailRateLimit) // Respecter rate limit

    // Traiter les SMS
    setInterval(() => {
      this.processSMSQueue()
    }, 60000 / this.config.smsRateLimit) // Respecter rate limit

    // Nettoyage périodique
    setInterval(() => {
      this.cleanupExpiredMessages()
    }, 300000) // 5 minutes
  }

  /**
   * Traiter la queue des emails
   */
  async processEmailQueue () {
    if (this.emailQueue.length === 0) return

    const item = this.emailQueue.shift()

    try {
      await this.sendEmail(item)
      this.stats.emailsSent++

      // Log de succès
      await this.logMessage(item, 'sent')
    } catch (error) {
      console.error('[Communication] Email sending failed:', error)

      item.attempts++
      if (item.attempts < this.config.maxRetries) {
        // Remettre en queue avec délai
        setTimeout(() => {
          this.emailQueue.push(item)
        }, this.config.retryDelay)
      } else {
        this.stats.emailsFailed++
        await this.logMessage(item, 'failed', error.message)
      }
    }
  }

  /**
   * Traiter la queue des SMS
   */
  async processSMSQueue () {
    if (this.smsQueue.length === 0 || !this.twilioClient) return

    const item = this.smsQueue.shift()

    try {
      await this.sendSMS(item)
      this.stats.smsSent++

      // Log de succès
      await this.logMessage(item, 'sent')
    } catch (error) {
      console.error('[Communication] SMS sending failed:', error)

      item.attempts++
      if (item.attempts < this.config.maxRetries) {
        // Remettre en queue avec délai
        setTimeout(() => {
          this.smsQueue.push(item)
        }, this.config.retryDelay)
      } else {
        this.stats.smsFailed++
        await this.logMessage(item, 'failed', error.message)
      }
    }
  }

  /**
   * Envoyer un email
   */
  async sendEmail (item) {
    const { message, content } = item

    // Préparer les destinataires
    const recipients = await this.getRecipientEmails(message.recipients)

    if (recipients.length === 0) {
      throw new Error('No valid email recipients')
    }

    const mailOptions = {
      from: `${this.config.fromName} <${this.config.fromEmail}>`,
      to: recipients.join(', '),
      subject: content.subject,
      html: content.html,
      text: content.text,

      // Headers pour tracking
      headers: {
        'X-Message-ID': message.id,
        'X-Wedding-ID': message.weddingId || '',
        'X-Category': message.category
      }
    }

    const result = await this.emailTransporter.sendMail(mailOptions)

    console.log(`[Communication] Email sent: ${message.id} to ${recipients.length} recipients`)

    return result
  }

  /**
   * Envoyer un SMS
   */
  async sendSMS (item) {
    const { message, content } = item

    // Préparer les destinataires
    const recipients = await this.getRecipientPhones(message.recipients)

    if (recipients.length === 0) {
      throw new Error('No valid SMS recipients')
    }

    const results = []

    for (const phone of recipients) {
      const result = await this.twilioClient.messages.create({
        body: content.text,
        from: this.config.twilio.phoneNumber,
        to: phone
      })

      results.push(result)
    }

    console.log(`[Communication] SMS sent: ${message.id} to ${recipients.length} recipients`)

    return results
  }

  /**
   * Obtenir les emails des destinataires
   */
  async getRecipientEmails (recipientIds) {
    try {
      const { data: users } = await this.supabase
        .from('users')
        .select('email')
        .in('id', recipientIds)
        .not('email', 'is', null)

      return users?.map(user => user.email).filter(email => email) || []
    } catch (error) {
      console.error('[Communication] Error getting recipient emails:', error)
      return []
    }
  }

  /**
   * Obtenir les téléphones des destinataires
   */
  async getRecipientPhones (recipientIds) {
    try {
      const { data: users } = await this.supabase
        .from('users')
        .select('phone')
        .in('id', recipientIds)
        .not('phone', 'is', null)

      return users?.map(user => user.phone).filter(phone => phone) || []
    } catch (error) {
      console.error('[Communication] Error getting recipient phones:', error)
      return []
    }
  }

  /**
   * Logger un message
   */
  async logMessage (item, status, errorMessage = null) {
    try {
      await this.supabase
        .from('communication_logs')
        .insert({
          message_id: item.message.id,
          channel: item.channel,
          status,
          error_message: errorMessage,
          attempts: item.attempts,
          sent_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('[Communication] Error logging message:', error)
    }
  }

  /**
   * Convertir HTML en texte simple
   */
  htmlToText (html) {
    return html
      .replace(/<[^>]*>/g, '') // Supprimer tags HTML
      .replace(/&nbsp;/g, ' ') // Remplacer &nbsp;
      .replace(/&amp;/g, '&') // Remplacer &amp;
      .replace(/&lt;/g, '<') // Remplacer &lt;
      .replace(/&gt;/g, '>') // Remplacer &gt;
      .replace(/\s+/g, ' ') // Normaliser espaces
      .trim()
  }

  /**
   * Nettoyer les messages expirés
   */
  cleanupExpiredMessages () {
    const now = new Date()

    // Nettoyer email queue
    const initialEmailCount = this.emailQueue.length
    this.emailQueue = this.emailQueue.filter(item =>
      !item.message.expiresAt || new Date(item.message.expiresAt) > now
    )

    // Nettoyer SMS queue
    const initialSMSCount = this.smsQueue.length
    this.smsQueue = this.smsQueue.filter(item =>
      !item.message.expiresAt || new Date(item.message.expiresAt) > now
    )

    const emailCleaned = initialEmailCount - this.emailQueue.length
    const smsCleaned = initialSMSCount - this.smsQueue.length

    if (emailCleaned + smsCleaned > 0) {
      console.log(`[Communication] Cleaned ${emailCleaned} emails and ${smsCleaned} SMS from queues`)
    }
  }

  /**
   * API publique
   */

  async sendWeddingInvitation (weddingData, guestData) {
    return this.sendTemplatedMessage({
      type: 'invitation',
      category: 'wedding',
      template: 'wedding_invitation',
      recipients: [guestData.userId],
      channels: ['email'],
      weddingId: weddingData.id,
      variables: {
        coupleName: weddingData.coupleName,
        weddingDate: weddingData.eventDate,
        venue: weddingData.venue,
        guestName: guestData.name,
        rsvpLink: `${this.config.trackingDomain}/rsvp/${guestData.invitationToken}`
      }
    })
  }

  async sendRSVPReminder (weddingData, guestData) {
    return this.sendTemplatedMessage({
      type: 'rsvp_reminder',
      category: 'wedding',
      template: 'rsvp_reminder',
      recipients: [guestData.userId],
      channels: ['email', 'sms'],
      weddingId: weddingData.id,
      variables: {
        coupleName: weddingData.coupleName,
        weddingDate: weddingData.eventDate,
        guestName: guestData.name,
        rsvpLink: `${this.config.trackingDomain}/rsvp/${guestData.invitationToken}`
      }
    })
  }

  async sendVendorContract (contractData) {
    return this.sendTemplatedMessage({
      type: 'contract_sent',
      category: 'vendor',
      template: 'vendor_contract',
      recipients: [contractData.vendorUserId],
      channels: ['email'],
      weddingId: contractData.weddingId,
      variables: {
        vendorName: contractData.vendorName,
        coupleName: contractData.coupleName,
        contractAmount: contractData.amount,
        contractLink: `${this.config.trackingDomain}/contract/${contractData.contractId}`
      }
    })
  }

  async sendPaymentConfirmation (paymentData) {
    return this.sendTemplatedMessage({
      type: 'payment_received',
      category: 'vendor',
      template: 'payment_confirmation',
      recipients: [paymentData.vendorUserId],
      channels: ['email'],
      weddingId: paymentData.weddingId,
      variables: {
        vendorName: paymentData.vendorName,
        amount: paymentData.amount,
        paymentDate: new Date(),
        transactionId: paymentData.transactionId
      }
    })
  }

  getStats () {
    return {
      ...this.stats,
      queueSizes: {
        email: this.emailQueue.length,
        sms: this.smsQueue.length
      }
    }
  }

  async reloadTemplates () {
    this.templateCache.clear()
    this.stats.templatesLoaded = 0
    await this.loadTemplates()
    console.log('[Communication] Templates reloaded')
  }

  async shutdown () {
    // Vider les queues
    this.emailQueue = []
    this.smsQueue = []

    // Fermer les connexions
    if (this.emailTransporter) {
      this.emailTransporter.close()
    }

    console.log('[Communication] Email/SMS service shut down')
  }
}

module.exports = EmailSMSService
