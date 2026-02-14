/**
 * Client WebSocket pour l'application React
 * Gère la connexion, reconnexion automatique et les événements
 */

import { io } from 'socket.io-client'
import { EventEmitter } from 'events'

class WebSocketClient extends EventEmitter {
  constructor (config = {}) {
    super()

    this.config = {
      url: process.env.REACT_APP_WS_URL || 'http://localhost:3001',
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      timeout: 20000,
      transports: ['websocket', 'polling'],
      ...config
    }

    this.socket = null
    this.isConnected = false
    this.reconnectAttempts = 0
    this.messageQueue = []
    this.eventHandlers = new Map()
    this.presenceInterval = null
  }

  // Connexion

  connect (token, userData = {}) {
    if (this.isConnected) {
      console.warn('[WS] Already connected')
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.config.url, {
          ...this.config,
          auth: {
            token
          },
          query: {
            ...userData
          }
        })

        this.setupEventListeners()

        // Timeout de connexion
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'))
        }, this.config.timeout)

        this.socket.once('connected', (data) => {
          clearTimeout(timeout)
          this.isConnected = true
          this.reconnectAttempts = 0

          console.log('[WS] Connected:', data)
          this.emit('connected', data)

          // Traiter la queue de messages
          this.processMessageQueue()

          // Démarrer le heartbeat
          this.startPresenceUpdates()

          resolve(data)
        })

        this.socket.once('connect_error', (error) => {
          clearTimeout(timeout)
          console.error('[WS] Connection error:', error.message)
          reject(error)
        })

        this.socket.connect()
      } catch (error) {
        reject(error)
      }
    })
  }

  disconnect () {
    if (!this.socket) return

    this.stopPresenceUpdates()
    this.socket.disconnect()
    this.isConnected = false
    this.socket = null
    this.emit('disconnected')
  }

  // Configuration des écouteurs

  setupEventListeners () {
    // Événements de connexion
    this.socket.on('connect', () => {
      console.log('[WS] Socket connected')
    })

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false
      console.log('[WS] Disconnected:', reason)
      this.emit('disconnected', reason)

      if (reason === 'io server disconnect') {
        // Le serveur a fermé la connexion, tenter de reconnecter
        this.attemptReconnect()
      }
    })

    this.socket.on('connect_error', (error) => {
      console.error('[WS] Connection error:', error.message)
      this.emit('error', error)
    })

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('[WS] Reconnected after', attemptNumber, 'attempts')
      this.emit('reconnected')
    })

    // Événements de l'application
    this.socket.on('error', (error) => {
      console.error('[WS] Server error:', error)
      this.emit('server_error', error)
    })

    // Messages
    this.socket.on('new_message', (message) => {
      this.emit('message', message)
    })

    this.socket.on('message_sent', (message) => {
      this.emit('message_sent', message)
    })

    this.socket.on('user_typing', (data) => {
      this.emit('typing', data)
    })

    // Présence
    this.socket.on('user_online', (user) => {
      this.emit('user_online', user)
    })

    this.socket.on('user_offline', (user) => {
      this.emit('user_offline', user)
    })

    this.socket.on('presence_update', (data) => {
      this.emit('presence_update', data)
    })

    // Wedding
    this.socket.on('wedding_joined', (data) => {
      this.emit('wedding_joined', data)
    })

    // DJ Events
    this.socket.on('music_request', (request) => {
      this.emit('music_request', request)
    })

    this.socket.on('mic_request', (request) => {
      this.emit('mic_request', request)
    })

    this.socket.on('music_request_accepted', (data) => {
      this.emit('music_request_accepted', data)
    })

    // Photos
    this.socket.on('new_photo', (photo) => {
      this.emit('new_photo', photo)
    })

    this.socket.on('guest_photo_uploaded', (photo) => {
      this.emit('guest_photo_uploaded', photo)
    })

    // Tâches
    this.socket.on('task_updated', (data) => {
      this.emit('task_updated', data)
    })

    this.socket.on('task_assigned', (data) => {
      this.emit('task_assigned', data)
    })

    this.socket.on('task_updated_assigned', (data) => {
      this.emit('task_updated_assigned', data)
    })

    // Annonces
    this.socket.on('announcement', (announcement) => {
      this.emit('announcement', announcement)
    })

    // Serveur
    this.socket.on('server_shutdown', (data) => {
      this.emit('server_shutdown', data)
      // Reconnecter après le délai
      setTimeout(() => {
        this.attemptReconnect()
      }, data.reconnectDelay || 5000)
    })
  }

  // Envoi de messages

  sendMessage (recipientId, content, channel = 'direct') {
    const data = { recipientId, content, channel }

    if (!this.isConnected) {
      this.messageQueue.push({ event: 'send_message', data })
      return Promise.reject(new Error('Not connected'))
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('send_message', data)

      // Écouter la confirmation
      const timeout = setTimeout(() => {
        reject(new Error('Message send timeout'))
      }, 5000)

      this.socket.once('message_sent', (message) => {
        clearTimeout(timeout)
        resolve(message)
      })

      this.socket.once('error', (error) => {
        clearTimeout(timeout)
        reject(error)
      })
    })
  }

  sendTyping (recipientId, isTyping = true) {
    if (!this.isConnected) return
    this.socket.emit('typing', { recipientId, isTyping })
  }

  // Événements DJ

  requestMusic (songTitle, artist, dedicatedTo) {
    if (!this.isConnected) {
      return Promise.reject(new Error('Not connected'))
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('music_request', { songTitle, artist, dedicatedTo })

      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'))
      }, 5000)

      this.socket.once('music_request_sent', (data) => {
        clearTimeout(timeout)
        resolve(data)
      })

      this.socket.once('error', (error) => {
        clearTimeout(timeout)
        reject(error)
      })
    })
  }

  requestMic (purpose, duration = 5) {
    if (!this.isConnected) {
      return Promise.reject(new Error('Not connected'))
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('mic_request', { purpose, duration })

      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'))
      }, 5000)

      this.socket.once('mic_request_sent', (data) => {
        clearTimeout(timeout)
        resolve(data)
      })

      this.socket.once('error', (error) => {
        clearTimeout(timeout)
        reject(error)
      })
    })
  }

  acceptMusicRequest (requestId) {
    if (!this.isConnected) return
    this.socket.emit('accept_music_request', { requestId })
  }

  rejectMusicRequest (requestId) {
    if (!this.isConnected) return
    this.socket.emit('reject_music_request', { requestId })
  }

  // Photos

  uploadPhoto (url, caption) {
    if (!this.isConnected) {
      return Promise.reject(new Error('Not connected'))
    }

    this.socket.emit('new_photo', { url, caption })
    return Promise.resolve()
  }

  // Tâches

  updateTask (taskId, updates) {
    if (!this.isConnected) {
      return Promise.reject(new Error('Not connected'))
    }

    this.socket.emit('task_update', { taskId, updates })
    return Promise.resolve()
  }

  assignTask (taskId, assignedTo) {
    if (!this.isConnected) {
      return Promise.reject(new Error('Not connected'))
    }

    this.socket.emit('task_assigned', { taskId, assignedTo })
    return Promise.resolve()
  }

  // Présence

  updatePresence (status, customStatus) {
    if (!this.isConnected) return
    this.socket.emit('update_presence', { status, customStatus })
  }

  startPresenceUpdates () {
    // Envoyer un heartbeat toutes les 30 secondes
    this.presenceInterval = setInterval(() => {
      this.updatePresence('online')
    }, 30000)
  }

  stopPresenceUpdates () {
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval)
      this.presenceInterval = null
    }
  }

  // Wedding

  joinWedding () {
    if (!this.isConnected) return
    this.socket.emit('join_wedding')
  }

  leaveWedding () {
    if (!this.isConnected) return
    this.socket.emit('leave_wedding')
  }

  // Admin

  broadcastAnnouncement (message, priority = 'info', targetWedding = null) {
    if (!this.isConnected) {
      return Promise.reject(new Error('Not connected'))
    }

    this.socket.emit('broadcast_announcement', { message, priority, targetWedding })
    return Promise.resolve()
  }

  // Utilitaires

  processMessageQueue () {
    while (this.messageQueue.length > 0) {
      const { event, data } = this.messageQueue.shift()
      this.socket.emit(event, data)
    }
  }

  attemptReconnect () {
    if (this.reconnectAttempts >= this.config.reconnectionAttempts) {
      console.error('[WS] Max reconnection attempts reached')
      this.emit('reconnect_failed')
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(
      this.config.reconnectionDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.config.reconnectionDelayMax
    )

    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)

    setTimeout(() => {
      if (this.socket && !this.isConnected) {
        this.socket.connect()
      }
    }, delay)
  }

  // État

  isConnected () {
    return this.isConnected && this.socket?.connected
  }

  getSocketId () {
    return this.socket?.id
  }
}

// Instance singleton
let wsClient = null

export const getWebSocketClient = (config) => {
  if (!wsClient) {
    wsClient = new WebSocketClient(config)
  }
  return wsClient
}

export default WebSocketClient
