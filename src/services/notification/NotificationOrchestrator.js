/**
 * NotificationOrchestrator - Gestionnaire avancé de notifications
 * Gère les priorités, règles, et orchestration multicanal
 */

import EventEmitter from 'events'
import { createClient } from '@supabase/supabase-js'
import Bull from 'bull'
import { WebSocketService } from '../websocket/websocket-service'
import { PushNotificationService } from './push-notification-service'
import { EmailSmsService } from '../communication/email-sms-service'
import { PerformanceMonitor } from '../../utils/performance'
import { logger } from '../../utils/logger'

// Configuration Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

// Priorités de notification
const PRIORITIES = {
  CRITICAL: 1, // Urgences, alertes sécurité
  HIGH: 2, // Confirmations importantes, rappels J-1
  MEDIUM: 3, // Mises à jour standards
  LOW: 4 // Informations générales
}

// Types de notification
const NOTIFICATION_TYPES = {
  // Urgences
  EMERGENCY: 'emergency',
  PAYMENT_FAILED: 'payment_failed',
  VENDOR_CANCELLED: 'vendor_cancelled',

  // Rappels
  REMINDER_24H: 'reminder_24h',
  REMINDER_1H: 'reminder_1h',
  TASK_DUE: 'task_due',

  // Confirmations
  BOOKING_CONFIRMED: 'booking_confirmed',
  PAYMENT_SUCCESS: 'payment_success',
  RSVP_RECEIVED: 'rsvp_received',

  // Mises à jour
  SCHEDULE_CHANGE: 'schedule_change',
  NEW_MESSAGE: 'new_message',
  VENDOR_UPDATE: 'vendor_update',

  // Informations
  WEEKLY_SUMMARY: 'weekly_summary',
  TIP_OF_DAY: 'tip_of_day',
  FEATURE_ANNOUNCEMENT: 'feature_announcement'
}

export class NotificationOrchestrator extends EventEmitter {
  constructor () {
    super()

    // Services
    this.wsService = new WebSocketService()
    this.pushService = new PushNotificationService()
    this.emailSmsService = new EmailSmsService()

    // Files de priorité
    this.queues = {
      critical: new Bull('notifications-critical', process.env.REDIS_URL),
      high: new Bull('notifications-high', process.env.REDIS_URL),
      medium: new Bull('notifications-medium', process.env.REDIS_URL),
      low: new Bull('notifications-low', process.env.REDIS_URL)
    }

    // Configuration
    this.rules = new Map()
    this.templates = new Map()
    this.userPreferences = new Map()
    this.performanceMonitor = new PerformanceMonitor('NotificationOrchestrator')

    // État
    this.stats = {
      sent: 0,
      failed: 0,
      queued: 0,
      delivered: 0
    }

    this.initialize()
  }

  async initialize () {
    try {
      // Charger les règles
      await this.loadNotificationRules()

      // Charger les templates
      await this.loadTemplates()

      // Configurer les processeurs de queue
      this.setupQueueProcessors()

      // Configurer les listeners
      this.setupEventListeners()

      logger.info('NotificationOrchestrator initialized')
    } catch (error) {
      logger.error('Failed to initialize NotificationOrchestrator:', error)
      throw error
    }
  }

  /**
   * Envoyer une notification
   */
  async send (notification) {
    this.performanceMonitor.mark('send-start')

    try {
      // Valider la notification
      const validated = await this.validateNotification(notification)

      // Appliquer les règles
      const processed = await this.applyRules(validated)

      // Déterminer les canaux
      const channels = await this.determineChannels(processed)

      // Ajouter à la queue appropriée
      const queueName = this.getQueueByPriority(processed.priority)
      const job = await this.queues[queueName].add('send', {
        ...processed,
        channels
      })

      this.stats.queued++

      this.performanceMonitor.mark('send-end')
      this.performanceMonitor.measure('send-notification', 'send-start', 'send-end')

      return {
        id: job.id,
        status: 'queued',
        priority: processed.priority,
        channels
      }
    } catch (error) {
      logger.error('Failed to send notification:', error)
      this.stats.failed++
      throw error
    }
  }

  /**
   * Envoyer des notifications en masse
   */
  async sendBulk (notifications) {
    const results = await Promise.allSettled(
      notifications.map(n => this.send(n))
    )

    return {
      total: notifications.length,
      successful: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      results: results.map((r, i) => ({
        notification: notifications[i],
        result: r.status === 'fulfilled' ? r.value : { error: r.reason.message }
      }))
    }
  }

  /**
   * Valider une notification
   */
  async validateNotification (notification) {
    const required = ['userId', 'type', 'title']

    for (const field of required) {
      if (!notification[field]) {
        throw new Error(`Missing required field: ${field}`)
      }
    }

    // Ajouter les valeurs par défaut
    return {
      ...notification,
      id: notification.id || this.generateId(),
      priority: notification.priority || this.getPriorityByType(notification.type),
      timestamp: notification.timestamp || new Date(),
      metadata: notification.metadata || {},
      status: 'pending'
    }
  }

  /**
   * Appliquer les règles de notification
   */
  async applyRules (notification) {
    const rules = this.rules.get(notification.type) || []
    let processed = { ...notification }

    for (const rule of rules) {
      if (await this.evaluateRule(rule, processed)) {
        processed = await this.applyRuleActions(rule, processed)
      }
    }

    return processed
  }

  /**
   * Évaluer une règle
   */
  async evaluateRule (rule, notification) {
    try {
      // Règles basées sur le temps
      if (rule.conditions.time) {
        const now = new Date()
        const { start, end } = rule.conditions.time

        if (start && now < new Date(start)) return false
        if (end && now > new Date(end)) return false
      }

      // Règles basées sur les préférences utilisateur
      if (rule.conditions.userPreference) {
        const prefs = await this.getUserPreferences(notification.userId)
        const prefKey = rule.conditions.userPreference.key
        const prefValue = rule.conditions.userPreference.value

        if (prefs[prefKey] !== prefValue) return false
      }

      // Règles basées sur la fréquence
      if (rule.conditions.frequency) {
        const count = await this.getNotificationCount(
          notification.userId,
          notification.type,
          rule.conditions.frequency.window
        )

        if (count >= rule.conditions.frequency.max) return false
      }

      return true
    } catch (error) {
      logger.error('Error evaluating rule:', error)
      return false
    }
  }

  /**
   * Appliquer les actions d'une règle
   */
  async applyRuleActions (rule, notification) {
    let processed = { ...notification }

    for (const action of rule.actions) {
      switch (action.type) {
        case 'SET_PRIORITY':
          processed.priority = action.value
          break

        case 'ADD_CHANNEL':
          processed.forceChannels = processed.forceChannels || []
          processed.forceChannels.push(action.value)
          break

        case 'REMOVE_CHANNEL':
          processed.excludeChannels = processed.excludeChannels || []
          processed.excludeChannels.push(action.value)
          break

        case 'DELAY':
          processed.scheduledFor = new Date(Date.now() + action.value)
          break

        case 'AGGREGATE':
          processed.aggregate = {
            window: action.window,
            key: action.key
          }
          break

        case 'TRANSFORM':
          processed = await this.transformNotification(processed, action.transformer)
          break
      }
    }

    return processed
  }

  /**
   * Déterminer les canaux de notification
   */
  async determineChannels (notification) {
    const channels = []

    // Canaux forcés par les règles
    if (notification.forceChannels) {
      channels.push(...notification.forceChannels)
    }

    // Préférences utilisateur
    const prefs = await this.getUserPreferences(notification.userId)

    // Logique par priorité et type
    if (notification.priority === PRIORITIES.CRITICAL) {
      // Critiques : tous les canaux disponibles
      channels.push('websocket', 'push', 'email', 'sms')
    } else if (notification.priority === PRIORITIES.HIGH) {
      // Haute : temps réel + un canal persistant
      channels.push('websocket', 'push')
      if (prefs.emailNotifications) channels.push('email')
    } else if (notification.priority === PRIORITIES.MEDIUM) {
      // Moyenne : selon préférences
      if (prefs.realtimeNotifications) channels.push('websocket')
      if (prefs.pushNotifications) channels.push('push')
      if (prefs.emailDigest) channels.push('email')
    } else {
      // Basse : minimal
      if (prefs.realtimeNotifications) channels.push('websocket')
    }

    // Exclure les canaux interdits
    if (notification.excludeChannels) {
      return channels.filter(c => !notification.excludeChannels.includes(c))
    }

    // Dédupliquer
    return [...new Set(channels)]
  }

  /**
   * Configuration des processeurs de queue
   */
  setupQueueProcessors () {
    // Processeur pour chaque niveau de priorité
    Object.entries(this.queues).forEach(([priority, queue]) => {
      queue.process('send', async (job) => {
        return this.processNotification(job.data)
      })

      // Configuration selon la priorité
      const concurrency = priority === 'critical'
        ? 10
        : priority === 'high'
          ? 5
          : priority === 'medium' ? 3 : 1

      queue.concurrency = concurrency

      // Événements
      queue.on('completed', (job, result) => {
        this.stats.sent++
        this.emit('notification:sent', { job: job.data, result })
      })

      queue.on('failed', (job, error) => {
        this.stats.failed++
        logger.error(`Notification failed [${priority}]:`, error)
        this.emit('notification:failed', { job: job.data, error })
      })
    })
  }

  /**
   * Traiter une notification
   */
  async processNotification (notification) {
    const results = {}

    // Envoyer sur chaque canal
    for (const channel of notification.channels) {
      try {
        results[channel] = await this.sendToChannel(channel, notification)
      } catch (error) {
        results[channel] = { success: false, error: error.message }
      }
    }

    // Enregistrer dans la base de données
    await this.saveNotification({
      ...notification,
      results,
      sentAt: new Date()
    })

    // Mettre à jour les statistiques
    const successful = Object.values(results).filter(r => r.success).length
    if (successful > 0) {
      this.stats.delivered++
    }

    return results
  }

  /**
   * Envoyer sur un canal spécifique
   */
  async sendToChannel (channel, notification) {
    switch (channel) {
      case 'websocket':
        return this.sendWebSocket(notification)

      case 'push':
        return this.sendPush(notification)

      case 'email':
        return this.sendEmail(notification)

      case 'sms':
        return this.sendSms(notification)

      default:
        throw new Error(`Unknown channel: ${channel}`)
    }
  }

  /**
   * Envoyer via WebSocket
   */
  async sendWebSocket (notification) {
    try {
      const template = await this.renderTemplate(notification, 'websocket')

      await this.wsService.sendToUser(notification.userId, {
        type: 'notification',
        data: {
          id: notification.id,
          type: notification.type,
          priority: notification.priority,
          ...template
        }
      })

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Envoyer via Push
   */
  async sendPush (notification) {
    try {
      const template = await this.renderTemplate(notification, 'push')

      const result = await this.pushService.send({
        userId: notification.userId,
        title: template.title,
        body: template.body,
        data: notification.metadata,
        priority: notification.priority === PRIORITIES.CRITICAL ? 'high' : 'normal'
      })

      return { success: true, messageId: result.messageId }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Envoyer via Email
   */
  async sendEmail (notification) {
    try {
      const template = await this.renderTemplate(notification, 'email')
      const user = await this.getUser(notification.userId)

      const result = await this.emailSmsService.sendEmail({
        to: user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        category: notification.type
      })

      return { success: true, messageId: result.messageId }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Envoyer via SMS
   */
  async sendSms (notification) {
    try {
      const template = await this.renderTemplate(notification, 'sms')
      const user = await this.getUser(notification.userId)

      if (!user.phone) {
        return { success: false, error: 'No phone number' }
      }

      const result = await this.emailSmsService.sendSms({
        to: user.phone,
        body: template.body
      })

      return { success: true, messageId: result.messageId }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Rendre un template
   */
  async renderTemplate (notification, channel) {
    const templateKey = `${notification.type}:${channel}`
    const template = this.templates.get(templateKey)

    if (!template) {
      // Template par défaut
      return this.getDefaultTemplate(notification, channel)
    }

    // Préparer les données du template
    const data = {
      ...notification,
      user: await this.getUser(notification.userId),
      wedding: notification.weddingId ? await this.getWedding(notification.weddingId) : null,
      formatDate: (date) => new Date(date).toLocaleDateString('fr-FR'),
      formatTime: (date) => new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    }

    // Rendre le template
    return template(data)
  }

  /**
   * Charger les règles de notification
   */
  async loadNotificationRules () {
    try {
      const { data: rules } = await supabase
        .from('notification_rules')
        .select('*')
        .eq('active', true)

      // Grouper par type
      for (const rule of rules) {
        if (!this.rules.has(rule.notification_type)) {
          this.rules.set(rule.notification_type, [])
        }
        this.rules.get(rule.notification_type).push(rule)
      }

      logger.info(`Loaded ${rules.length} notification rules`)
    } catch (error) {
      logger.error('Failed to load notification rules:', error)
    }
  }

  /**
   * Charger les templates
   */
  async loadTemplates () {
    // Templates intégrés
    this.templates.set('reminder_24h:email', (data) => ({
      subject: `Rappel : ${data.wedding.name} - J-1 🎉`,
      html: `
        <h2>Plus qu'une journée avant votre grand jour !</h2>
        <p>Bonjour ${data.user.name},</p>
        <p>Votre mariage approche à grands pas. Voici quelques rappels importants :</p>
        <ul>
          ${data.reminders.map(r => `<li>${r}</li>`).join('')}
        </ul>
        <p>Nous vous souhaitons une merveilleuse journée !</p>
      `,
      text: `Plus qu'une journée avant ${data.wedding.name}! ${data.reminders.join('. ')}`
    }))

    this.templates.set('payment_failed:push', (data) => ({
      title: '⚠️ Échec de paiement',
      body: `Le paiement de ${data.amount}€ pour ${data.vendor} a échoué. Veuillez mettre à jour vos informations de paiement.`
    }))

    // Charger les templates personnalisés depuis la DB
    try {
      const { data: customTemplates } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('active', true)

      for (const template of customTemplates) {
        const key = `${template.notification_type}:${template.channel}`
        // Compiler le template (utiliser un moteur de template comme Handlebars)
        this.templates.set(key, this.compileTemplate(template.content))
      }
    } catch (error) {
      logger.error('Failed to load custom templates:', error)
    }
  }

  /**
   * Obtenir les préférences utilisateur
   */
  async getUserPreferences (userId) {
    // Vérifier le cache
    if (this.userPreferences.has(userId)) {
      return this.userPreferences.get(userId)
    }

    try {
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

      const preferences = {
        realtimeNotifications: prefs?.realtime_notifications ?? true,
        pushNotifications: prefs?.push_notifications ?? true,
        emailNotifications: prefs?.email_notifications ?? true,
        smsNotifications: prefs?.sms_notifications ?? false,
        emailDigest: prefs?.email_digest ?? false,
        quietHours: prefs?.quiet_hours ?? null,
        ...prefs
      }

      // Mettre en cache
      this.userPreferences.set(userId, preferences)

      return preferences
    } catch (error) {
      logger.error('Failed to get user preferences:', error)
      return this.getDefaultPreferences()
    }
  }

  /**
   * Obtenir le nombre de notifications
   */
  async getNotificationCount (userId, type, window) {
    const since = new Date(Date.now() - window)

    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('type', type)
      .gte('created_at', since.toISOString())

    return count || 0
  }

  /**
   * Sauvegarder une notification
   */
  async saveNotification (notification) {
    try {
      await supabase
        .from('notifications')
        .insert({
          id: notification.id,
          user_id: notification.userId,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          priority: notification.priority,
          channels: notification.channels,
          results: notification.results,
          metadata: notification.metadata,
          sent_at: notification.sentAt
        })
    } catch (error) {
      logger.error('Failed to save notification:', error)
    }
  }

  /**
   * Obtenir les statistiques
   */
  getStats () {
    return {
      ...this.stats,
      queues: Object.entries(this.queues).reduce((acc, [priority, queue]) => {
        acc[priority] = {
          waiting: queue.getWaitingCount(),
          active: queue.getActiveCount(),
          completed: queue.getCompletedCount(),
          failed: queue.getFailedCount()
        }
        return acc
      }, {})
    }
  }

  /**
   * Utilitaires
   */
  generateId () {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  getPriorityByType (type) {
    const criticalTypes = ['emergency', 'payment_failed', 'vendor_cancelled']
    const highTypes = ['reminder_24h', 'reminder_1h', 'task_due']
    const mediumTypes = ['booking_confirmed', 'payment_success', 'rsvp_received']

    if (criticalTypes.includes(type)) return PRIORITIES.CRITICAL
    if (highTypes.includes(type)) return PRIORITIES.HIGH
    if (mediumTypes.includes(type)) return PRIORITIES.MEDIUM
    return PRIORITIES.LOW
  }

  getQueueByPriority (priority) {
    switch (priority) {
      case PRIORITIES.CRITICAL: return 'critical'
      case PRIORITIES.HIGH: return 'high'
      case PRIORITIES.MEDIUM: return 'medium'
      default: return 'low'
    }
  }

  getDefaultTemplate (notification, channel) {
    const defaults = {
      websocket: {
        title: notification.title,
        body: notification.body,
        icon: notification.icon || 'bell'
      },
      push: {
        title: notification.title,
        body: notification.body
      },
      email: {
        subject: notification.title,
        html: `<p>${notification.body}</p>`,
        text: notification.body
      },
      sms: {
        body: `${notification.title}: ${notification.body}`
      }
    }

    return defaults[channel] || defaults.websocket
  }

  getDefaultPreferences () {
    return {
      realtimeNotifications: true,
      pushNotifications: true,
      emailNotifications: true,
      smsNotifications: false,
      emailDigest: false,
      quietHours: null
    }
  }

  async getUser (userId) {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    return user
  }

  async getWedding (weddingId) {
    const { data: wedding } = await supabase
      .from('weddings')
      .select('*')
      .eq('id', weddingId)
      .single()

    return wedding
  }

  compileTemplate (templateString) {
    // Simple template compilation (pourrait utiliser Handlebars)
    return (data) => {
      let result = templateString

      // Remplacer les variables {{variable}}
      result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return data[key] || ''
      })

      return result
    }
  }

  /**
   * Listeners d'événements
   */
  setupEventListeners () {
    // Écouter les changements de préférences
    supabase
      .channel('user_preferences_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_preferences'
      }, (payload) => {
        // Invalider le cache
        this.userPreferences.delete(payload.record.user_id)
      })
      .subscribe()

    // Écouter les nouvelles règles
    supabase
      .channel('notification_rules_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notification_rules'
      }, () => {
        // Recharger les règles
        this.loadNotificationRules()
      })
      .subscribe()
  }
}

// Instance singleton
export const notificationOrchestrator = new NotificationOrchestrator()
