const socketIO = require('socket.io')
const jwt = require('jsonwebtoken')
const redis = require('redis')
const logger = require('../../utils/logger')

class WebSocketService {
  constructor() {
    this.io = null
    this.redisClient = null
    this.redisSubscriber = null
    this.namespaces = {}
    this.rooms = new Map()
  }

  async initialize(server) {
    try {
      // Initialiser Socket.io
      this.io = socketIO(server, {
        cors: {
          origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
          credentials: true
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000
      })

      // Initialiser Redis pour la pub/sub
      this.redisClient = redis.createClient({
        url: process.env.REDIS_URL
      })
      
      this.redisSubscriber = redis.createClient({
        url: process.env.REDIS_URL
      })

      await this.redisClient.connect()
      await this.redisSubscriber.connect()

      // Configuration de l'authentification
      this.io.use(this.authenticateSocket.bind(this))

      // Configuration des namespaces
      this.setupNamespaces()

      // Gestion des connexions principales
      this.io.on('connection', this.handleConnection.bind(this))

      // Configuration Redis pub/sub pour multi-serveurs
      await this.setupRedisPubSub()

      logger.info('✅ WebSocket service initialisé')
    } catch (error) {
      logger.error('Erreur initialisation WebSocket:', error)
      throw error
    }
  }

  async authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token

      if (!token) {
        return next(new Error('Authentication required'))
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      socket.userId = decoded.id
      socket.userRole = decoded.role
      socket.clientId = decoded.clientId

      // Stocker les infos dans Redis
      await this.redisClient.set(
        `socket:${socket.id}`,
        JSON.stringify({
          userId: decoded.id,
          role: decoded.role,
          clientId: decoded.clientId,
          connectedAt: new Date()
        }),
        { EX: 86400 } // 24h
      )

      next()
    } catch (err) {
      logger.error('Socket authentication failed:', err)
      next(new Error('Authentication failed'))
    }
  }

  setupNamespaces() {
    // Namespace Wedding
    this.namespaces.wedding = this.io.of('/wedding')
    this.namespaces.wedding.use(this.authenticateSocket.bind(this))
    this.namespaces.wedding.on('connection', (socket) => {
      this.handleWeddingNamespace(socket)
    })

    // Namespace Vendor
    this.namespaces.vendor = this.io.of('/vendor')
    this.namespaces.vendor.use(this.authenticateSocket.bind(this))
    this.namespaces.vendor.on('connection', (socket) => {
      this.handleVendorNamespace(socket)
    })

    // Namespace Admin
    this.namespaces.admin = this.io.of('/admin')
    this.namespaces.admin.use(this.authenticateSocket.bind(this))
    this.namespaces.admin.on('connection', (socket) => {
      this.handleAdminNamespace(socket)
    })

    // Namespace Notifications
    this.namespaces.notifications = this.io.of('/notifications')
    this.namespaces.notifications.use(this.authenticateSocket.bind(this))
    this.namespaces.notifications.on('connection', (socket) => {
      this.handleNotificationsNamespace(socket)
    })
  }

  async handleConnection(socket) {
    logger.info(`Nouvelle connexion: ${socket.id} - User: ${socket.userId}`)

    // Rejoindre les rooms personnelles
    socket.join(`user:${socket.userId}`)
    if (socket.clientId) {
      socket.join(`client:${socket.clientId}`)
    }

    // Gérer la déconnexion
    socket.on('disconnect', async (reason) => {
      logger.info(`Déconnexion: ${socket.id} - Raison: ${reason}`)
      await this.redisClient.del(`socket:${socket.id}`)
    })

    // Gérer la reconnexion
    socket.on('reconnect', async () => {
      logger.info(`Reconnexion: ${socket.id}`)
      socket.emit('reconnected', { timestamp: new Date() })
    })

    // Heartbeat
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date() })
    })
  }

  handleWeddingNamespace(socket) {
    // Rejoindre un mariage spécifique
    socket.on('join-wedding', async (weddingId) => {
      try {
        // Vérifier les permissions
        const hasAccess = await this.checkWeddingAccess(socket.userId, weddingId)
        if (!hasAccess) {
          return socket.emit('error', { message: 'Accès refusé' })
        }

        socket.join(`wedding:${weddingId}`)
        socket.emit('joined-wedding', { weddingId })

        // Notifier les autres participants
        socket.to(`wedding:${weddingId}`).emit('user-joined', {
          userId: socket.userId,
          timestamp: new Date()
        })
      } catch (error) {
        logger.error('Erreur join-wedding:', error)
        socket.emit('error', { message: 'Erreur lors de la connexion' })
      }
    })

    // Quitter un mariage
    socket.on('leave-wedding', (weddingId) => {
      socket.leave(`wedding:${weddingId}`)
      socket.to(`wedding:${weddingId}`).emit('user-left', {
        userId: socket.userId,
        timestamp: new Date()
      })
    })

    // Mise à jour en temps réel
    socket.on('wedding-update', async (data) => {
      const { weddingId, type, payload } = data
      
      // Émettre aux participants du mariage
      this.namespaces.wedding.to(`wedding:${weddingId}`).emit('update', {
        type,
        payload,
        userId: socket.userId,
        timestamp: new Date()
      })

      // Publier sur Redis pour les autres serveurs
      await this.publishToRedis('wedding-update', data)
    })

    // Chat de mariage
    socket.on('wedding-message', async (data) => {
      const { weddingId, message } = data
      
      const messageData = {
        id: Date.now().toString(),
        userId: socket.userId,
        message,
        timestamp: new Date()
      }

      // Émettre à tous les participants
      this.namespaces.wedding.to(`wedding:${weddingId}`).emit('new-message', messageData)
    })
  }

  handleVendorNamespace(socket) {
    // Connexion vendor
    socket.on('vendor-online', async (vendorId) => {
      socket.join(`vendor:${vendorId}`)
      
      // Mettre à jour le statut en ligne
      await this.redisClient.set(
        `vendor:online:${vendorId}`,
        JSON.stringify({ socketId: socket.id, timestamp: new Date() }),
        { EX: 3600 }
      )

      socket.emit('vendor-connected', { vendorId })
    })

    // Nouvelle réservation
    socket.on('new-booking', async (data) => {
      const { vendorId, bookingData } = data
      
      // Notifier le vendor
      this.namespaces.vendor.to(`vendor:${vendorId}`).emit('booking-request', {
        ...bookingData,
        timestamp: new Date()
      })
    })

    // Mise à jour disponibilité
    socket.on('availability-update', async (data) => {
      const { vendorId, availability } = data
      
      // Diffuser la mise à jour
      this.namespaces.vendor.emit('vendor-availability-changed', {
        vendorId,
        availability,
        timestamp: new Date()
      })
    })
  }

  handleAdminNamespace(socket) {
    // Vérifier que l'utilisateur est admin
    if (!['admin', 'cio'].includes(socket.userRole)) {
      socket.disconnect()
      return
    }

    // Monitoring en temps réel
    socket.on('monitor-start', () => {
      socket.join('admin:monitoring')
      this.sendSystemMetrics(socket)
    })

    // Broadcast admin
    socket.on('admin-broadcast', async (data) => {
      const { message, target } = data
      
      switch (target) {
        case 'all':
          this.io.emit('admin-message', message)
          break
        case 'vendors':
          this.namespaces.vendor.emit('admin-message', message)
          break
        case 'customers':
          this.namespaces.wedding.emit('admin-message', message)
          break
      }
    })
  }

  handleNotificationsNamespace(socket) {
    // S'abonner aux notifications personnelles
    socket.join(`notifications:${socket.userId}`)

    // Marquer comme lue
    socket.on('notification-read', async (notificationId) => {
      // Émettre à tous les appareils de l'utilisateur
      this.namespaces.notifications
        .to(`notifications:${socket.userId}`)
        .emit('notification-marked-read', { notificationId })
    })

    // Demander le compte de notifications
    socket.on('get-unread-count', async () => {
      const count = await this.getUnreadNotificationCount(socket.userId)
      socket.emit('unread-count', { count })
    })
  }

  async setupRedisPubSub() {
    // S'abonner aux canaux Redis
    await this.redisSubscriber.subscribe('wedding-updates', (message) => {
      const data = JSON.parse(message)
      this.namespaces.wedding.to(`wedding:${data.weddingId}`).emit('update', data)
    })

    await this.redisSubscriber.subscribe('vendor-updates', (message) => {
      const data = JSON.parse(message)
      this.namespaces.vendor.to(`vendor:${data.vendorId}`).emit('update', data)
    })

    await this.redisSubscriber.subscribe('notifications', (message) => {
      const data = JSON.parse(message)
      this.namespaces.notifications
        .to(`notifications:${data.userId}`)
        .emit('new-notification', data)
    })
  }

  async publishToRedis(channel, data) {
    await this.redisClient.publish(channel, JSON.stringify(data))
  }

  // Méthodes utilitaires
  async checkWeddingAccess(userId, weddingId) {
    // TODO: Implémenter la vérification d'accès réelle
    return true
  }

  async getUnreadNotificationCount(userId) {
    // TODO: Implémenter le comptage réel
    return 0
  }

  async sendSystemMetrics(socket) {
    const interval = setInterval(async () => {
      if (!socket.connected) {
        clearInterval(interval)
        return
      }

      const metrics = {
        connectedClients: this.io.engine.clientsCount,
        namespaces: {
          wedding: this.namespaces.wedding.sockets.size,
          vendor: this.namespaces.vendor.sockets.size,
          admin: this.namespaces.admin.sockets.size,
          notifications: this.namespaces.notifications.sockets.size
        },
        timestamp: new Date()
      }

      socket.emit('system-metrics', metrics)
    }, 5000)
  }

  // API publique
  emit(namespace, event, data) {
    if (this.namespaces[namespace]) {
      this.namespaces[namespace].emit(event, data)
    }
  }

  emitToRoom(namespace, room, event, data) {
    if (this.namespaces[namespace]) {
      this.namespaces[namespace].to(room).emit(event, data)
    }
  }

  emitToUser(userId, event, data) {
    this.io.to(`user:${userId}`).emit(event, data)
  }

  async getOnlineUsers() {
    const keys = await this.redisClient.keys('socket:*')
    const users = []

    for (const key of keys) {
      const data = await this.redisClient.get(key)
      if (data) {
        users.push(JSON.parse(data))
      }
    }

    return users
  }

  async disconnect() {
    if (this.io) {
      this.io.close()
    }
    if (this.redisClient) {
      await this.redisClient.quit()
    }
    if (this.redisSubscriber) {
      await this.redisSubscriber.quit()
    }
  }
}

module.exports = new WebSocketService()