/**
 * Service de Notifications Push Temps Réel
 * Support multi-platform avec WebSocket, email, SMS, et push notifications
 */

const EventEmitter = require('events')
const webpush = require('web-push')
const nodemailer = require('nodemailer')
const twilio = require('twilio')
const { createClient } = require('@supabase/supabase-js')

class PushNotificationService extends EventEmitter {
  constructor (config = {}) {
    super()

    this.config = {
      // Configuration Web Push
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
      vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
      vapidEmail: process.env.VAPID_EMAIL || 'noreply@attitudes.vip',

      // Configuration Email
      emailService: config.emailService || 'smtp',
      smtpConfig: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      },

      // Configuration SMS
      twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
      twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
      twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER,

      // Limites et retries
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      batchSize: config.batchSize || 100,

      // Templates
      enableTemplates: config.enableTemplates !== false,
      defaultLanguage: config.defaultLanguage || 'fr',

      ...config
    }

    // Initialiser les services
    this.initializeServices()

    // Queues de notifications
    this.notificationQueues = {
      high: [], // Urgences, alertes
      normal: [], // Notifications standard
      low: [] // Newsletters, rappels
    }

    // État des notifications
    this.notificationStats = {
      sent: 0,
      delivered: 0,
      failed: 0,
      pending: 0
    }

    // Cache des subscriptions
    this.subscriptionsCache = new Map()

    // Templates de notifications
    this.templates = new Map()

    this.startProcessing()
    console.log('[Notifications] Push notification service initialized')
  }

  /**
   * Initialiser les services externes
   */
  initializeServices () {
    // Configurer Web Push
    if (this.config.vapidPublicKey && this.config.vapidPrivateKey) {
      webpush.setVapidDetails(
        this.config.vapidEmail,
        this.config.vapidPublicKey,
        this.config.vapidPrivateKey
      )
      console.log('[Notifications] Web Push configured')
    }

    // Configurer Nodemailer
    if (this.config.smtpConfig.host) {
      this.emailTransporter = nodemailer.createTransporter(this.config.smtpConfig)
      console.log('[Notifications] Email transporter configured')
    }

    // Configurer Twilio
    if (this.config.twilioAccountSid && this.config.twilioAuthToken) {
      this.twilioClient = twilio(
        this.config.twilioAccountSid,
        this.config.twilioAuthToken
      )
      console.log('[Notifications] SMS service configured')
    }

    // Initialiser Supabase
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Charger les templates
    if (this.config.enableTemplates) {
      this.loadNotificationTemplates()
    }
  }

  /**
   * Charger les templates de notifications
   */
  async loadNotificationTemplates () {
    try {
      const { data: templates } = await this.supabase
        .from('notification_templates')
        .select('*')
        .eq('active', true)

      templates?.forEach(template => {
        this.templates.set(`${template.type}_${template.language}`, {
          subject: template.subject,
          body: template.body,
          sms: template.sms_text,
          push: template.push_text,
          variables: template.variables || []
        })
      })

      console.log(`[Notifications] Loaded ${templates?.length || 0} templates`)
    } catch (error) {
      console.error('[Notifications] Error loading templates:', error)
    }
  }

  /**
   * Envoyer une notification multi-canal
   */
  async sendNotification (notificationData) {
    try {
      const notification = this.processNotificationData(notificationData)

      // Ajouter à la queue appropriée
      const priority = notification.priority || 'normal'
      this.notificationQueues[priority].push(notification)
      this.notificationStats.pending++

      console.log(`[Notifications] Queued ${priority} priority notification for ${notification.recipients.length} recipients`)

      return {
        success: true,
        notificationId: notification.id,
        queuePosition: this.notificationQueues[priority].length
      }
    } catch (error) {
      console.error('[Notifications] Error queueing notification:', error)
      throw new Error(`Failed to queue notification: ${error.message}`)
    }
  }

  /**
   * Traiter les données de notification
   */
  processNotificationData (data) {
    const notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: data.type,
      priority: data.priority || 'normal',
      channels: data.channels || ['push', 'websocket'],

      // Contenu
      title: data.title,
      body: data.body,
      icon: data.icon,
      image: data.image,
      url: data.url,

      // Destinataires
      recipients: Array.isArray(data.recipients) ? data.recipients : [data.recipients],

      // Contexte
      weddingId: data.weddingId,
      userId: data.userId,

      // Personnalisation
      variables: data.variables || {},
      language: data.language || this.config.defaultLanguage,

      // Configuration
      retry: 0,
      maxRetries: data.maxRetries || this.config.maxRetries,

      // Timing
      scheduledFor: data.scheduledFor || new Date(),
      expiresAt: data.expiresAt,

      // Métadonnées
      metadata: data.metadata || {},
      createdAt: new Date()
    }

    // Appliquer un template si spécifié
    if (data.template) {
      this.applyTemplate(notification, data.template)
    }

    return notification
  }

  /**
   * Appliquer un template de notification
   */
  applyTemplate (notification, templateName) {
    const templateKey = `${templateName}_${notification.language}`
    const template = this.templates.get(templateKey)

    if (!template) {
      console.warn(`[Notifications] Template not found: ${templateKey}`)
      return
    }

    // Remplacer les variables dans le template
    notification.title = this.replaceVariables(template.subject, notification.variables)
    notification.body = this.replaceVariables(template.body, notification.variables)

    // Contenu spécifique par canal
    if (template.sms) {
      notification.smsText = this.replaceVariables(template.sms, notification.variables)
    }

    if (template.push) {
      notification.pushText = this.replaceVariables(template.push, notification.variables)
    }
  }

  /**
   * Remplacer les variables dans un texte
   */
  replaceVariables (text, variables) {
    let result = text

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g')
      result = result.replace(regex, value)
    })

    return result
  }

  /**
   * Démarrer le traitement des queues
   */
  startProcessing () {
    // Traiter les notifications par priorité
    setInterval(() => {
      this.processQueue('high')
    }, 100)

    setInterval(() => {
      this.processQueue('normal')
    }, 1000)

    setInterval(() => {
      this.processQueue('low')
    }, 5000)

    // Nettoyage périodique
    setInterval(() => {
      this.cleanupExpiredNotifications()
    }, 60000)
  }

  /**
   * Traiter une queue de notifications
   */
  async processQueue (priority) {
    const queue = this.notificationQueues[priority]

    if (queue.length === 0) return

    // Traiter par batch
    const batch = queue.splice(0, this.config.batchSize)

    for (const notification of batch) {
      try {
        await this.processNotification(notification)
      } catch (error) {
        console.error(`[Notifications] Error processing notification ${notification.id}:`, error)

        // Retry si possible
        if (notification.retry < notification.maxRetries) {
          notification.retry++
          queue.push(notification)
        } else {
          this.notificationStats.failed++
          await this.logNotificationError(notification, error)
        }
      }
    }
  }

  /**
   * Traiter une notification individuelle
   */
  async processNotification (notification) {
    const now = new Date()

    // Vérifier si elle est programmée
    if (notification.scheduledFor > now) {
      this.notificationQueues[notification.priority].push(notification)
      return
    }

    // Vérifier si elle a expiré
    if (notification.expiresAt && notification.expiresAt < now) {
      console.log(`[Notifications] Notification ${notification.id} expired`)
      return
    }

    // Obtenir les destinataires avec leurs préférences
    const recipients = await this.getRecipientsWithPreferences(notification.recipients)

    // Envoyer sur chaque canal demandé
    const promises = notification.channels.map(channel =>
      this.sendOnChannel(notification, recipients, channel)
    )

    const results = await Promise.allSettled(promises)

    // Analyser les résultats
    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    // Mettre à jour les statistiques
    this.notificationStats.sent++
    if (successful > 0) {
      this.notificationStats.delivered++
    }
    if (failed > 0) {
      this.notificationStats.failed++
    }

    this.notificationStats.pending--

    // Enregistrer en base
    await this.logNotification(notification, results)

    console.log(`[Notifications] Processed ${notification.id}: ${successful} successful, ${failed} failed`)
  }

  /**
   * Envoyer une notification sur un canal spécifique
   */
  async sendOnChannel (notification, recipients, channel) {
    switch (channel) {
      case 'websocket':
        return this.sendWebSocketNotification(notification, recipients)

      case 'push':
        return this.sendPushNotification(notification, recipients)

      case 'email':
        return this.sendEmailNotification(notification, recipients)

      case 'sms':
        return this.sendSMSNotification(notification, recipients)

      default:
        throw new Error(`Unknown notification channel: ${channel}`)
    }
  }

  /**
   * Envoyer via WebSocket
   */
  async sendWebSocketNotification (notification, recipients) {
    const webSocketData = {
      type: 'notification',
      id: notification.id,
      title: notification.title,
      body: notification.body,
      icon: notification.icon,
      url: notification.url,
      priority: notification.priority,
      timestamp: new Date().toISOString(),
      metadata: notification.metadata
    }

    // Émettre via le service WebSocket
    this.emit('websocket_notification', {
      recipients: recipients.map(r => r.userId),
      weddingId: notification.weddingId,
      data: webSocketData
    })

    return { channel: 'websocket', sent: recipients.length }
  }

  /**
   * Envoyer des push notifications
   */
  async sendPushNotification (notification, recipients) {
    const pushData = {
      title: notification.title,
      body: notification.pushText || notification.body,
      icon: notification.icon || '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      image: notification.image,
      data: {
        url: notification.url,
        notificationId: notification.id,
        weddingId: notification.weddingId
      },
      actions: notification.actions || [],
      requireInteraction: notification.priority === 'high',
      silent: notification.priority === 'low'
    }

    const results = await Promise.allSettled(
      recipients
        .filter(r => r.pushSubscriptions && r.pushSubscriptions.length > 0)
        .flatMap(recipient =>
          recipient.pushSubscriptions.map(subscription =>
            this.sendWebPush(subscription, pushData)
          )
        )
    )

    const successful = results.filter(r => r.status === 'fulfilled').length

    return { channel: 'push', sent: successful }
  }

  /**
   * Envoyer un web push
   */
  async sendWebPush (subscription, payload) {
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload))
      return { success: true }
    } catch (error) {
      // Nettoyer les subscriptions invalides
      if (error.statusCode === 410) {
        await this.removeInvalidSubscription(subscription)
      }
      throw error
    }
  }

  /**
   * Envoyer des emails
   */
  async sendEmailNotification (notification, recipients) {
    if (!this.emailTransporter) {
      throw new Error('Email service not configured')
    }

    const emailRecipients = recipients.filter(r => r.email && r.emailEnabled)

    if (emailRecipients.length === 0) {
      return { channel: 'email', sent: 0 }
    }

    const emailData = {
      from: `Attitudes.vip <${this.config.vapidEmail}>`,
      subject: notification.title,
      html: this.generateEmailHTML(notification),
      text: notification.body
    }

    // Envoyer en batch pour éviter les limites
    const batches = this.chunkArray(emailRecipients, 50)
    let totalSent = 0

    for (const batch of batches) {
      try {
        await this.emailTransporter.sendMail({
          ...emailData,
          bcc: batch.map(r => r.email)
        })

        totalSent += batch.length
      } catch (error) {
        console.error('[Notifications] Email batch error:', error)
      }
    }

    return { channel: 'email', sent: totalSent }
  }

  /**
   * Envoyer des SMS
   */
  async sendSMSNotification (notification, recipients) {
    if (!this.twilioClient) {
      throw new Error('SMS service not configured')
    }

    const smsRecipients = recipients.filter(r => r.phone && r.smsEnabled)

    if (smsRecipients.length === 0) {
      return { channel: 'sms', sent: 0 }
    }

    const smsText = notification.smsText ||
                   `${notification.title}: ${notification.body}`.substring(0, 160)

    const results = await Promise.allSettled(
      smsRecipients.map(recipient =>
        this.twilioClient.messages.create({
          body: smsText,
          from: this.config.twilioPhoneNumber,
          to: recipient.phone
        })
      )
    )

    const successful = results.filter(r => r.status === 'fulfilled').length

    return { channel: 'sms', sent: successful }
  }

  /**
   * Obtenir les destinataires avec leurs préférences
   */
  async getRecipientsWithPreferences (recipientIds) {
    try {
      const { data: users } = await this.supabase
        .from('users')
        .select(`
          id,
          email,
          phone,
          notification_preferences,
          push_subscriptions
        `)
        .in('id', recipientIds)

      return users?.map(user => ({
        userId: user.id,
        email: user.email,
        phone: user.phone,
        emailEnabled: user.notification_preferences?.email !== false,
        smsEnabled: user.notification_preferences?.sms !== false,
        pushEnabled: user.notification_preferences?.push !== false,
        pushSubscriptions: user.push_subscriptions || []
      })) || []
    } catch (error) {
      console.error('[Notifications] Error getting recipients:', error)
      return []
    }
  }

  /**
   * Générer HTML pour email
   */
  generateEmailHTML (notification) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${notification.title}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
            .content { background: white; padding: 30px; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${notification.title}</h1>
            </div>
            <div class="content">
              <p>${notification.body}</p>
              ${notification.url ? `<a href="${notification.url}" class="button">Voir les détails</a>` : ''}
            </div>
            <div class="footer">
              <p>Attitudes.vip - Votre mariage parfait commence ici</p>
              <p><small>Pour modifier vos préférences de notification, connectez-vous à votre compte.</small></p>
            </div>
          </div>
        </body>
      </html>
    `
  }

  /**
   * Méthodes utilitaires
   */

  chunkArray (array, size) {
    const chunks = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  async removeInvalidSubscription (subscription) {
    try {
      await this.supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', subscription.endpoint)
    } catch (error) {
      console.error('[Notifications] Error removing invalid subscription:', error)
    }
  }

  async logNotification (notification, results) {
    try {
      await this.supabase
        .from('notification_logs')
        .insert({
          notification_id: notification.id,
          type: notification.type,
          priority: notification.priority,
          channels: notification.channels,
          recipient_count: notification.recipients.length,
          results: results.map(r => ({
            status: r.status,
            value: r.value,
            reason: r.reason
          })),
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('[Notifications] Error logging notification:', error)
    }
  }

  async logNotificationError (notification, error) {
    try {
      await this.supabase
        .from('notification_errors')
        .insert({
          notification_id: notification.id,
          error_message: error.message,
          retry_count: notification.retry,
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('[Notifications] Error logging notification error:', error)
    }
  }

  cleanupExpiredNotifications () {
    const now = new Date()

    Object.keys(this.notificationQueues).forEach(priority => {
      const queue = this.notificationQueues[priority]
      const initialLength = queue.length

      this.notificationQueues[priority] = queue.filter(notification =>
        !notification.expiresAt || notification.expiresAt > now
      )

      const removed = initialLength - this.notificationQueues[priority].length
      if (removed > 0) {
        console.log(`[Notifications] Cleaned ${removed} expired notifications from ${priority} queue`)
      }
    })
  }

  /**
   * API publique
   */

  async sendWeddingAlert (weddingId, alertData) {
    return this.sendNotification({
      type: 'wedding_alert',
      priority: 'high',
      channels: ['websocket', 'push', 'email'],
      weddingId,
      recipients: await this.getWeddingMembers(weddingId),
      ...alertData
    })
  }

  async sendTaskReminder (taskData) {
    return this.sendNotification({
      type: 'task_reminder',
      template: 'task_reminder',
      priority: 'normal',
      channels: ['websocket', 'push'],
      recipients: [taskData.assignedTo],
      variables: {
        taskTitle: taskData.title,
        dueDate: taskData.dueDate,
        weddingName: taskData.weddingName
      }
    })
  }

  async sendPaymentNotification (paymentData) {
    return this.sendNotification({
      type: 'payment_status',
      template: 'payment_notification',
      priority: 'high',
      channels: ['websocket', 'push', 'email'],
      recipients: [paymentData.userId],
      variables: {
        amount: paymentData.amount,
        vendorName: paymentData.vendorName,
        status: paymentData.status
      }
    })
  }

  async getWeddingMembers (weddingId) {
    const { data: members } = await this.supabase
      .from('wedding_members')
      .select('user_id')
      .eq('wedding_id', weddingId)

    return members?.map(m => m.user_id) || []
  }

  getStats () {
    return {
      ...this.notificationStats,
      queueSizes: {
        high: this.notificationQueues.high.length,
        normal: this.notificationQueues.normal.length,
        low: this.notificationQueues.low.length
      }
    }
  }
}

module.exports = PushNotificationService
