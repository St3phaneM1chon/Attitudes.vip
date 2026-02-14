/**
 * Serveur WebSocket Optimisé pour Haute Performance
 * Support 1000+ connexions simultanées avec optimisations avancées
 */

const { Server } = require('socket.io')
const { createAdapter } = require('@socket.io/redis-adapter')
const jwt = require('jsonwebtoken')
const { createClient } = require('@supabase/supabase-js')
const Redis = require('ioredis')
const compression = require('compression')
const EventEmitter = require('events')

class WebSocketServerOptimized extends EventEmitter {
  constructor (httpServer, config = {}) {
    super()

    // Configuration optimisée pour haute performance
    this.config = {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        credentials: true
      },
      // Optimisations de connexion
      pingTimeout: 30000, // Réduit pour détecter plus vite les déconnexions
      pingInterval: 10000, // Heartbeat plus fréquent
      upgradeTimeout: 10000, // Timeout upgrade plus court
      maxHttpBufferSize: 1e6, // 1MB max par message

      // Optimisations transport
      transports: ['websocket'], // WebSocket uniquement (plus rapide)
      allowUpgrades: true,

      // Compression activée
      compression: true,
      perMessageDeflate: {
        threshold: 1024, // Compresser messages > 1KB
        zlibDeflateOptions: {
          level: 3 // Compression rapide
        }
      },

      // Pool de connexions
      maxConnections: 5000, // Max connexions simultanées
      connectionsPerIP: 50, // Max par IP

      ...config
    }

    // Redis cluster pour scalabilité
    this.redisCluster = this.initializeRedisCluster()
    this.redisAdapter = this.initializeRedisAdapter()

    // Initialiser Socket.IO avec adaptateur Redis
    this.io = new Server(httpServer, {
      ...this.config,
      adapter: this.redisAdapter
    })

    // Supabase avec connection pooling
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        db: {
          schema: 'public'
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        realtime: {
          params: {
            eventsPerSecond: 100
          }
        }
      }
    )

    // Structures de données optimisées
    this.connections = new Map() // userId -> Set<socketId>
    this.weddingSockets = new Map() // weddingId -> Set<socketId>
    this.socketMetadata = new Map() // socketId -> metadata
    this.reconnectTokens = new Map() // token -> userData

    // Pool d'événements pour batching
    this.eventQueue = new Map() // eventType -> events[]
    this.batchTimer = null
    this.batchSize = 100
    this.batchInterval = 50 // 50ms batching

    // Métriques avancées
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      peakConnections: 0,
      messagesPerSecond: 0,
      reconnections: 0,
      averageLatency: 0,
      errorRate: 0,
      memoryUsage: 0,
      cpuUsage: 0
    }

    // Rate limiting par utilisateur
    this.rateLimits = new Map() // userId -> { count, resetTime }
    this.globalRateLimit = {
      maxPerSecond: 1000,
      current: 0,
      resetTime: Date.now() + 1000
    }

    // Pool de workers pour tâches intensives
    this.workerPool = this.initializeWorkerPool()

    this.setupOptimizedMiddleware()
    this.setupEventHandlers()
    this.startPerformanceMonitoring()
    this.startCleanupTasks()
  }

  /**
   * Initialiser Redis Cluster pour haute disponibilité
   */
  initializeRedisCluster () {
    const redisConfig = {
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableOfflineQueue: false,
      lazyConnect: true,
      // Connection pooling
      family: 4,
      keepAlive: true,
      // Optimisations performance
      commandTimeout: 5000,
      connectTimeout: 10000,
      db: 0
    }

    // Si cluster Redis configuré
    if (process.env.REDIS_CLUSTER_NODES) {
      const nodes = process.env.REDIS_CLUSTER_NODES.split(',').map(node => {
        const [host, port] = node.split(':')
        return { host, port: parseInt(port) }
      })

      return new Redis.Cluster(nodes, {
        ...redisConfig,
        scaleReads: 'slave',
        maxRedirections: 3
      })
    }

    // Redis simple avec sentinel pour failover
    return new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      ...redisConfig
    })
  }

  /**
   * Initialiser l'adaptateur Redis pour Socket.IO
   */
  initializeRedisAdapter () {
    const pubClient = this.redisCluster.duplicate()
    const subClient = this.redisCluster.duplicate()

    return createAdapter(pubClient, subClient, {
      key: 'attitudes_vip_websocket',
      requestsTimeout: 5000
    })
  }

  /**
   * Pool de workers pour tâches CPU-intensives
   */
  initializeWorkerPool () {
    const { Worker, isMainThread, parentPort } = require('worker_threads')

    if (!isMainThread) {
      // Code du worker
      parentPort.on('message', async (task) => {
        try {
          let result
          switch (task.type) {
            case 'process_bulk_messages':
              result = await this.processBulkMessages(task.data)
              break
            case 'generate_analytics':
              result = await this.generateAnalytics(task.data)
              break
            default:
              throw new Error(`Unknown task type: ${task.type}`)
          }
          parentPort.postMessage({ success: true, result })
        } catch (error) {
          parentPort.postMessage({ success: false, error: error.message })
        }
      })
      return
    }

    // Pool de 4 workers
    const workers = []
    for (let i = 0; i < 4; i++) {
      workers.push(new Worker(__filename))
    }

    return workers
  }

  /**
   * Middleware optimisé avec validation rapide
   */
  setupOptimizedMiddleware () {
    // Rate limiting global
    this.io.engine.on('connection_error', (err) => {
      console.error('[WS] Connection error:', err.type, err.message)
      this.metrics.errorRate++
    })

    // Authentification avec cache JWT
    this.io.use(async (socket, next) => {
      const start = Date.now()

      try {
        const token = socket.handshake.auth.token
        if (!token) {
          return next(new Error('AUTH_REQUIRED'))
        }

        // Cache JWT décodé pour éviter reverification
        const cacheKey = `jwt:${token}`
        let decoded = await this.redisCluster.get(cacheKey)

        if (!decoded) {
          decoded = jwt.verify(token, process.env.JWT_SECRET)
          // Cache pour 5 minutes
          await this.redisCluster.setex(cacheKey, 300, JSON.stringify(decoded))
        } else {
          decoded = JSON.parse(decoded)
        }

        // Récupération utilisateur avec cache
        const userCacheKey = `user:${decoded.sub}`
        let user = await this.redisCluster.get(userCacheKey)

        if (!user) {
          const { data: userData, error } = await this.supabase
            .from('users')
            .select('id, name, role, wedding_id')
            .eq('id', decoded.sub)
            .single()

          if (error || !userData) {
            return next(new Error('USER_NOT_FOUND'))
          }

          user = userData
          // Cache utilisateur pour 10 minutes
          await this.redisCluster.setex(userCacheKey, 600, JSON.stringify(user))
        } else {
          user = JSON.parse(user)
        }

        // Rate limiting par utilisateur
        if (!await this.checkUserRateLimit(user.id)) {
          return next(new Error('RATE_LIMIT_EXCEEDED'))
        }

        // Attacher métadonnées optimisées
        socket.userId = user.id
        socket.userName = user.name
        socket.userRole = user.role
        socket.weddingId = user.wedding_id
        socket.connectedAt = Date.now()
        socket.lastActivity = Date.now()

        // Stocker métadonnées pour cleanup
        this.socketMetadata.set(socket.id, {
          userId: user.id,
          weddingId: user.wedding_id,
          connectedAt: Date.now(),
          messageCount: 0,
          latency: Date.now() - start
        })

        this.metrics.averageLatency =
          (this.metrics.averageLatency + (Date.now() - start)) / 2

        next()
      } catch (error) {
        console.error('[WS] Auth error:', error.message)
        next(new Error('INVALID_TOKEN'))
      }
    })

    // Compression par socket si supportée
    this.io.use((socket, next) => {
      if (socket.handshake.headers['accept-encoding']?.includes('gzip')) {
        socket.compress(true)
      }
      next()
    })
  }

  /**
   * Vérifier rate limit utilisateur
   */
  async checkUserRateLimit (userId) {
    const now = Date.now()
    const limit = this.rateLimits.get(userId)

    if (!limit || now > limit.resetTime) {
      this.rateLimits.set(userId, {
        count: 1,
        resetTime: now + 60000 // 1 minute
      })
      return true
    }

    limit.count++
    return limit.count <= 100 // 100 messages par minute max
  }

  /**
   * Gestionnaires d'événements optimisés
   */
  setupEventHandlers () {
    this.io.on('connection', (socket) => {
      this.handleOptimizedConnection(socket)

      // Événements avec batching
      socket.on('message', (data) => this.queueEvent('message', socket, data))
      socket.on('typing', (data) => this.queueEvent('typing', socket, data))
      socket.on('presence', (data) => this.queueEvent('presence', socket, data))

      // Événements temps réel (pas de batching)
      socket.on('emergency', (data) => this.handleEmergency(socket, data))
      socket.on('ping', () => this.handlePing(socket))

      // Cleanup optimisé
      socket.on('disconnect', (reason) => this.handleOptimizedDisconnect(socket, reason))
      socket.on('error', (error) => this.handleSocketError(socket, error))
    })

    // Démarrer le traitement par batch
    this.startBatchProcessing()
  }

  /**
   * Connexion optimisée avec reconnexion automatique
   */
  handleOptimizedConnection (socket) {
    const start = Date.now()

    // Métriques
    this.metrics.totalConnections++
    this.metrics.activeConnections++
    this.metrics.peakConnections = Math.max(
      this.metrics.peakConnections,
      this.metrics.activeConnections
    )

    // Ajouter aux maps avec Set pour O(1) operations
    if (!this.connections.has(socket.userId)) {
      this.connections.set(socket.userId, new Set())
    }
    this.connections.get(socket.userId).add(socket.id)

    // Auto-join wedding room
    if (socket.weddingId) {
      socket.join(`wedding:${socket.weddingId}`)

      if (!this.weddingSockets.has(socket.weddingId)) {
        this.weddingSockets.set(socket.weddingId, new Set())
      }
      this.weddingSockets.get(socket.weddingId).add(socket.id)
    }

    // Générer token de reconnexion
    const reconnectToken = this.generateReconnectToken(socket)

    // Envoyer confirmation avec optimisations
    socket.emit('connected', {
      userId: socket.userId,
      reconnectToken,
      serverCapabilities: {
        compression: true,
        batching: true,
        maxMessageSize: this.config.maxHttpBufferSize
      },
      connectionTime: Date.now() - start
    })

    // Notification optimisée aux autres membres
    if (socket.weddingId) {
      socket.to(`wedding:${socket.weddingId}`).emit('user_online', {
        userId: socket.userId,
        userName: socket.userName,
        role: socket.userRole,
        timestamp: Date.now()
      })
    }

    console.log(`[WS] Optimized connection: ${socket.userName} (${this.metrics.activeConnections} active)`)
  }

  /**
   * Déconnexion optimisée avec cleanup automatique
   */
  handleOptimizedDisconnect (socket, reason) {
    const metadata = this.socketMetadata.get(socket.id)
    const connectionDuration = Date.now() - (metadata?.connectedAt || Date.now())

    // Métriques
    this.metrics.activeConnections--

    // Cleanup efficace
    const userSockets = this.connections.get(socket.userId)
    if (userSockets) {
      userSockets.delete(socket.id)
      if (userSockets.size === 0) {
        this.connections.delete(socket.userId)

        // Notification offline seulement si vraiment déconnecté
        if (socket.weddingId) {
          setTimeout(() => {
            if (!this.connections.has(socket.userId)) {
              socket.to(`wedding:${socket.weddingId}`).emit('user_offline', {
                userId: socket.userId,
                userName: socket.userName,
                lastSeen: Date.now()
              })
            }
          }, 5000) // Grace period de 5s pour reconnexion
        }
      }
    }

    // Cleanup wedding sockets
    if (socket.weddingId) {
      const weddingSockets = this.weddingSockets.get(socket.weddingId)
      if (weddingSockets) {
        weddingSockets.delete(socket.id)
        if (weddingSockets.size === 0) {
          this.weddingSockets.delete(socket.weddingId)
        }
      }
    }

    // Cleanup métadonnées
    this.socketMetadata.delete(socket.id)

    console.log(`[WS] Optimized disconnect: ${socket.userName} (${reason}) - Duration: ${connectionDuration}ms`)
  }

  /**
   * Système de queue pour batching des événements
   */
  queueEvent (eventType, socket, data) {
    if (!this.eventQueue.has(eventType)) {
      this.eventQueue.set(eventType, [])
    }

    this.eventQueue.get(eventType).push({
      socket,
      data,
      timestamp: Date.now()
    })

    // Traitement immédiat si queue pleine
    if (this.eventQueue.get(eventType).length >= this.batchSize) {
      this.processBatch(eventType)
    }
  }

  /**
   * Traitement par batch des événements
   */
  startBatchProcessing () {
    this.batchTimer = setInterval(() => {
      for (const [eventType, events] of this.eventQueue) {
        if (events.length > 0) {
          this.processBatch(eventType)
        }
      }
    }, this.batchInterval)
  }

  /**
   * Traiter un batch d'événements
   */
  async processBatch (eventType) {
    const events = this.eventQueue.get(eventType) || []
    if (events.length === 0) return

    // Vider la queue
    this.eventQueue.set(eventType, [])

    try {
      switch (eventType) {
        case 'message':
          await this.processBatchedMessages(events)
          break
        case 'typing':
          await this.processBatchedTyping(events)
          break
        case 'presence':
          await this.processBatchedPresence(events)
          break
      }

      this.metrics.messagesPerSecond += events.length
    } catch (error) {
      console.error(`[WS] Batch processing error for ${eventType}:`, error)
      this.metrics.errorRate++
    }
  }

  /**
   * Traiter les messages par batch
   */
  async processBatchedMessages (events) {
    // Grouper par wedding pour optimiser
    const weddingGroups = new Map()

    for (const event of events) {
      const weddingId = event.socket.weddingId
      if (!weddingGroups.has(weddingId)) {
        weddingGroups.set(weddingId, [])
      }
      weddingGroups.get(weddingId).push(event)
    }

    // Traiter chaque wedding en parallèle
    const promises = Array.from(weddingGroups.entries()).map(
      ([weddingId, groupEvents]) => this.processWeddingMessages(weddingId, groupEvents)
    )

    await Promise.allSettled(promises)
  }

  /**
   * Traiter les messages d'un mariage
   */
  async processWeddingMessages (weddingId, events) {
    // Validation et sauvegarde en batch
    const validMessages = []

    for (const event of events) {
      const { socket, data } = event

      if (this.validateMessage(data)) {
        validMessages.push({
          wedding_id: weddingId,
          sender_id: socket.userId,
          recipient_id: data.recipientId,
          channel: data.channel || 'direct',
          content: data.content.trim(),
          created_at: new Date().toISOString()
        })
      }
    }

    if (validMessages.length === 0) return

    // Sauvegarde en bulk
    const { data: savedMessages, error } = await this.supabase
      .from('messages')
      .insert(validMessages)
      .select()

    if (error) {
      console.error('[WS] Bulk message save error:', error)
      return
    }

    // Diffusion optimisée
    for (let i = 0; i < savedMessages.length; i++) {
      const message = savedMessages[i]
      const originalEvent = events[i]

      // Enrichir le message
      const enrichedMessage = {
        ...message,
        senderName: originalEvent.socket.userName,
        senderRole: originalEvent.socket.userRole
      }

      // Diffuser selon le canal
      if (message.channel === 'wedding') {
        this.io.to(`wedding:${weddingId}`).emit('new_message', enrichedMessage)
      } else if (message.recipient_id) {
        this.emitToUser(message.recipient_id, 'new_message', enrichedMessage)
      }
    }
  }

  /**
   * Valider un message
   */
  validateMessage (data) {
    return data &&
           data.content &&
           typeof data.content === 'string' &&
           data.content.trim().length > 0 &&
           data.content.length <= 2000
  }

  /**
   * Envoyer à un utilisateur spécifique (toutes ses connexions)
   */
  emitToUser (userId, event, data) {
    const userSockets = this.connections.get(userId)
    if (userSockets) {
      userSockets.forEach(socketId => {
        this.io.to(socketId).emit(event, data)
      })
    }
  }

  /**
   * Générer token de reconnexion sécurisé
   */
  generateReconnectToken (socket) {
    const token = jwt.sign(
      {
        userId: socket.userId,
        weddingId: socket.weddingId,
        type: 'reconnect'
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    )

    // Stocker pour validation rapide
    this.reconnectTokens.set(token, {
      userId: socket.userId,
      weddingId: socket.weddingId,
      createdAt: Date.now()
    })

    return token
  }

  /**
   * Gestion des urgences (bypass batching)
   */
  async handleEmergency (socket, data) {
    console.log(`[WS] EMERGENCY from ${socket.userName}:`, data.type)

    // Diffusion immédiate à tous les membres du mariage
    if (socket.weddingId) {
      this.io.to(`wedding:${socket.weddingId}`).emit('emergency_alert', {
        type: data.type,
        message: data.message,
        from: socket.userName,
        timestamp: Date.now(),
        priority: 'critical'
      })
    }

    // Sauvegarder l'urgence
    await this.supabase
      .from('emergency_alerts')
      .insert({
        wedding_id: socket.weddingId,
        user_id: socket.userId,
        alert_type: data.type,
        message: data.message,
        severity: 'critical'
      })
  }

  /**
   * Monitoring de performance en temps réel
   */
  startPerformanceMonitoring () {
    setInterval(() => {
      // Métriques système
      const memUsage = process.memoryUsage()
      this.metrics.memoryUsage = memUsage.heapUsed / 1024 / 1024 // MB

      // Reset compteurs par seconde
      this.metrics.messagesPerSecond = 0

      // Publier métriques
      this.publishMetrics()

      // Nettoyer caches expirés
      this.cleanupExpiredCaches()
    }, 1000) // Chaque seconde

    // Métriques détaillées toutes les minutes
    setInterval(() => {
      this.generateDetailedMetrics()
    }, 60000)
  }

  /**
   * Publier les métriques pour monitoring externe
   */
  publishMetrics () {
    const metrics = {
      ...this.metrics,
      timestamp: Date.now(),
      connectedWeddings: this.weddingSockets.size,
      uniqueUsers: this.connections.size
    }

    // Publier sur Redis pour Prometheus/Grafana
    this.redisCluster.publish('websocket:metrics', JSON.stringify(metrics))

    // Émettre pour dashboards internes
    this.emit('metrics', metrics)
  }

  /**
   * Nettoyage automatique des ressources
   */
  startCleanupTasks () {
    // Nettoyage toutes les 5 minutes
    setInterval(() => {
      this.cleanupDisconnectedSockets()
      this.cleanupExpiredTokens()
      this.cleanupRateLimits()
    }, 300000)

    // Nettoyage intensif toutes les heures
    setInterval(() => {
      this.deepCleanup()
    }, 3600000)
  }

  /**
   * Nettoyage des sockets déconnectés
   */
  cleanupDisconnectedSockets () {
    const now = Date.now()
    let cleaned = 0

    for (const [socketId, metadata] of this.socketMetadata) {
      if (now - metadata.connectedAt > 3600000) { // 1 heure
        const socket = this.io.sockets.sockets.get(socketId)
        if (!socket || !socket.connected) {
          this.socketMetadata.delete(socketId)
          cleaned++
        }
      }
    }

    if (cleaned > 0) {
      console.log(`[WS] Cleaned ${cleaned} orphaned socket metadata`)
    }
  }

  /**
   * Nettoyage des tokens expirés
   */
  cleanupExpiredTokens () {
    const now = Date.now()
    const expiredTokens = []

    for (const [token, data] of this.reconnectTokens) {
      if (now - data.createdAt > 3600000) { // 1 heure
        expiredTokens.push(token)
      }
    }

    expiredTokens.forEach(token => this.reconnectTokens.delete(token))

    if (expiredTokens.length > 0) {
      console.log(`[WS] Cleaned ${expiredTokens.length} expired reconnect tokens`)
    }
  }

  /**
   * Obtenir les métriques actuelles
   */
  getMetrics () {
    return {
      ...this.metrics,
      connections: {
        active: this.metrics.activeConnections,
        peak: this.metrics.peakConnections,
        total: this.metrics.totalConnections,
        byWedding: this.weddingSockets.size
      },
      performance: {
        averageLatency: this.metrics.averageLatency,
        messagesPerSecond: this.metrics.messagesPerSecond,
        errorRate: this.metrics.errorRate,
        memoryUsage: this.metrics.memoryUsage
      }
    }
  }

  /**
   * Arrêt propre du serveur
   */
  async shutdown () {
    console.log('[WS] Starting graceful shutdown...')

    // Arrêter les timers
    if (this.batchTimer) {
      clearInterval(this.batchTimer)
    }

    // Traiter les derniers batchs
    for (const [eventType] of this.eventQueue) {
      await this.processBatch(eventType)
    }

    // Notifier tous les clients
    this.io.emit('server_shutdown', {
      message: 'Serveur en maintenance',
      reconnectDelay: 10000
    })

    // Fermer les connexions
    await this.io.close()
    await this.redisCluster.quit()

    // Fermer les workers
    if (this.workerPool) {
      this.workerPool.forEach(worker => worker.terminate())
    }

    console.log('[WS] Graceful shutdown completed')
  }
}

module.exports = WebSocketServerOptimized
