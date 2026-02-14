/**
 * Service de Notifications Multi-canal
 * Gère les notifications Email, SMS, Push et In-App
 */

const { EventEmitter } = require('events')

class NotificationService extends EventEmitter {
  constructor () {
    super()

    this.queue = []
    this.processing = false
    this.retryAttempts = 3
    this.retryDelay = 1000

    // Templates de notifications
    this.templates = {
      // Invités
      invitation: {
        channels: ['email', 'sms'],
        email: {
          subject: 'Vous êtes invité au mariage de {{couple}}',
          template: 'invitation'
        },
        sms: {
          message: '{{couple}} vous invite à leur mariage le {{date}}. RSVP: {{link}}'
        }
      },

      rsvp_confirmation: {
        channels: ['email', 'inApp'],
        email: {
          subject: 'Confirmation de votre présence',
          template: 'rsvp-confirmation'
        },
        inApp: {
          type: 'success',
          message: 'Votre réponse a été enregistrée'
        }
      },

      // Vendors
      new_booking: {
        channels: ['email', 'sms', 'push', 'inApp'],
        email: {
          subject: 'Nouvelle réservation pour {{date}}',
          template: 'vendor-booking'
        },
        sms: {
          message: 'Nouvelle réservation de {{couple}} pour le {{date}}'
        },
        push: {
          title: 'Nouvelle réservation',
          body: '{{couple}} - {{date}}',
          icon: '/icons/booking.png'
        },
        inApp: {
          type: 'info',
          message: 'Nouvelle réservation reçue'
        }
      },

      payment_received: {
        channels: ['email', 'push', 'inApp'],
        email: {
          subject: 'Paiement reçu de {{amount}}€',
          template: 'payment-received'
        },
        push: {
          title: 'Paiement reçu',
          body: '{{amount}}€ de {{couple}}',
          icon: '/icons/payment.png'
        },
        inApp: {
          type: 'success',
          message: 'Paiement de {{amount}}€ reçu'
        }
      },

      // Couples
      vendor_message: {
        channels: ['email', 'push', 'inApp'],
        email: {
          subject: 'Message de {{vendor}}',
          template: 'vendor-message'
        },
        push: {
          title: '{{vendor}}',
          body: '{{preview}}',
          icon: '/icons/message.png'
        },
        inApp: {
          type: 'message',
          message: 'Nouveau message de {{vendor}}'
        }
      },

      task_reminder: {
        channels: ['email', 'push'],
        email: {
          subject: 'Rappel: {{task}}',
          template: 'task-reminder'
        },
        push: {
          title: 'Tâche à faire',
          body: '{{task}} - Échéance: {{deadline}}',
          icon: '/icons/task.png'
        }
      },

      // Système
      welcome: {
        channels: ['email'],
        email: {
          subject: 'Bienvenue sur Attitudes.vip',
          template: 'welcome'
        }
      },

      password_reset: {
        channels: ['email'],
        email: {
          subject: 'Réinitialisation de votre mot de passe',
          template: 'password-reset'
        }
      }
    }

    // Initialiser les canaux (mock pour l'instant)
    this.channels = {
      email: { send: this.mockEmailSend.bind(this) },
      sms: { send: this.mockSmsSend.bind(this) },
      push: { send: this.mockPushSend.bind(this) },
      inApp: {
        isConnected: true,
        emit: this.mockInAppSend.bind(this)
      }
    }
  }

  /**
   * Envoyer une notification
   * @param {string} type - Type de notification (clé du template)
   * @param {object} recipient - Destinataire {id, email, phone, devices}
   * @param {object} data - Données pour le template
   * @param {object} options - Options {channels, priority, schedule}
   */
  async send (type, recipient, data, options = {}) {
    // Support de l'ancienne API pour compatibilité
    if (typeof type === 'object' && !recipient) {
      const notification = type
      console.log('📧 Notification envoyée:', notification)
      return {
        sent: true,
        timestamp: new Date(),
        method: notification.type || 'email'
      }
    }

    try {
      const template = this.templates[type]
      if (!template) {
        // Si pas de template, utiliser l'ancienne méthode
        console.log('📧 Notification custom:', { type, recipient, data })
        return {
          sent: true,
          timestamp: new Date(),
          method: 'custom'
        }
      }

      // Déterminer les canaux à utiliser
      const channels = options.channels || template.channels
      const enabledChannels = channels.filter(channel => {
        // Vérifier que le canal est disponible pour ce destinataire
        if (channel === 'email' && !recipient.email) return false
        if (channel === 'sms' && !recipient.phone) return false
        if (channel === 'push' && (!recipient.devices || recipient.devices.length === 0)) return false
        return true
      })

      // Préparer la notification
      const notification = {
        id: this.generateId(),
        type,
        recipient,
        data,
        channels: enabledChannels,
        priority: options.priority || 'normal',
        scheduledFor: options.schedule || null,
        createdAt: new Date(),
        attempts: 0,
        status: 'pending',
        results: {}
      }

      // Ajouter à la queue
      this.queue.push(notification)

      // Traiter immédiatement si priorité haute
      if (notification.priority === 'high' || !this.queueInterval) {
        await this.processQueue()
      }

      return notification.id
    } catch (error) {
      console.error('[NotificationService] Send error:', error)
      throw error
    }
  }

  /**
   * Traiter la queue de notifications
   */
  async processQueue () {
    if (this.processing || this.queue.length === 0) return

    this.processing = true

    while (this.queue.length > 0) {
      // Trier par priorité et date
      this.queue.sort((a, b) => {
        if (a.priority !== b.priority) {
          const priorities = { high: 3, normal: 2, low: 1 }
          return priorities[b.priority] - priorities[a.priority]
        }
        return a.createdAt - b.createdAt
      })

      const notification = this.queue.shift()

      // Vérifier si planifiée
      if (notification.scheduledFor && new Date(notification.scheduledFor) > new Date()) {
        this.queue.push(notification)
        continue
      }

      await this.processNotification(notification)
    }

    this.processing = false
  }

  /**
   * Traiter une notification
   */
  async processNotification (notification) {
    try {
      notification.attempts++
      notification.status = 'processing'

      const template = this.templates[notification.type]
      const results = {}

      // Envoyer sur chaque canal
      for (const channel of notification.channels) {
        try {
          const channelConfig = template[channel]
          const channelService = this.channels[channel]

          if (!channelService) {
            console.warn(`[NotificationService] Channel ${channel} not available`)
            continue
          }

          // Remplacer les variables dans le template
          const processedConfig = this.processTemplate(channelConfig, notification.data)

          // Envoyer selon le canal
          switch (channel) {
            case 'email':
              results[channel] = await channelService.send({
                to: notification.recipient.email,
                subject: processedConfig.subject,
                template: processedConfig.template,
                data: notification.data
              })
              break

            case 'sms':
              results[channel] = await channelService.send({
                to: notification.recipient.phone,
                message: processedConfig.message
              })
              break

            case 'push':
              results[channel] = await channelService.send({
                devices: notification.recipient.devices,
                notification: processedConfig
              })
              break

            case 'inApp':
              if (channelService.isConnected) {
                channelService.emit('notification', {
                  userId: notification.recipient.id,
                  ...processedConfig,
                  data: notification.data
                })
                results[channel] = { success: true }
              }
              break
          }

          results[channel] = { ...results[channel], success: true }
        } catch (error) {
          console.error(`[NotificationService] Channel ${channel} error:`, error)
          results[channel] = { success: false, error: error.message }
        }
      }

      notification.results = results

      // Vérifier si au moins un canal a réussi
      const hasSuccess = Object.values(results).some(r => r.success)

      if (hasSuccess) {
        notification.status = 'sent'
        notification.sentAt = new Date()
        this.emit('notification:sent', notification)
      } else if (notification.attempts < this.retryAttempts) {
        notification.status = 'retry'
        // Remettre en queue avec délai
        setTimeout(() => {
          this.queue.push(notification)
          this.processQueue()
        }, this.retryDelay * notification.attempts)
      } else {
        notification.status = 'failed'
        this.emit('notification:failed', notification)
      }

      // Sauvegarder en base
      await this.saveNotification(notification)
    } catch (error) {
      console.error('[NotificationService] Process error:', error)
      notification.status = 'error'
      notification.error = error.message
      this.emit('notification:error', notification)
    }
  }

  /**
   * Remplacer les variables dans un template
   */
  processTemplate (template, data) {
    const processed = {}

    for (const [key, value] of Object.entries(template)) {
      if (typeof value === 'string') {
        processed[key] = value.replace(/{{(\w+)}}/g, (match, variable) => {
          return data[variable] || match
        })
      } else {
        processed[key] = value
      }
    }

    return processed
  }

  /**
   * Mock des envois
   */
  async mockEmailSend (config) {
    console.log('📧 Email:', config)
    return { success: true, messageId: `email_${Date.now()}` }
  }

  async mockSmsSend (config) {
    console.log('📱 SMS:', config)
    return { success: true, messageId: `sms_${Date.now()}` }
  }

  async mockPushSend (config) {
    console.log('🔔 Push:', config)
    return { success: true, messageId: `push_${Date.now()}` }
  }

  mockInAppSend (event, data) {
    console.log('💬 In-App:', event, data)
  }

  /**
   * Sauvegarder une notification en base
   */
  async saveNotification (notification) {
    try {
      // TODO: Implémenter la sauvegarde en base
      console.log('[NotificationService] Save notification:', notification.id)
    } catch (error) {
      console.error('[NotificationService] Save error:', error)
    }
  }

  /**
   * Générer un ID unique
   */
  generateId () {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Démarrer le service
   */
  start () {
    console.log('[NotificationService] Starting...')

    // Traiter la queue toutes les 10 secondes
    this.queueInterval = setInterval(() => {
      this.processQueue()
    }, 10000)

    console.log('[NotificationService] Started')
  }

  /**
   * Arrêter le service
   */
  stop () {
    console.log('[NotificationService] Stopping...')

    if (this.queueInterval) {
      clearInterval(this.queueInterval)
    }

    console.log('[NotificationService] Stopped')
  }
}

// Instance singleton
const notificationService = new NotificationService()

module.exports = notificationService
