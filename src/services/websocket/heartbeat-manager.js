/**
 * Gestionnaire de Heartbeat Avancé pour WebSocket
 * Détection proactive des connexions mortes et optimisation réseau
 */

const EventEmitter = require('events')

class HeartbeatManager extends EventEmitter {
  constructor (io, config = {}) {
    super()

    this.io = io
    this.config = {
      // Intervalles de heartbeat
      heartbeatInterval: config.heartbeatInterval || 30000, // 30s
      heartbeatTimeout: config.heartbeatTimeout || 60000, // 60s

      // Détection de latence
      latencyCheckInterval: config.latencyCheckInterval || 60000, // 1 min
      maxLatency: config.maxLatency || 5000, // 5s

      // Détection de connexions mortes
      zombieCheckInterval: config.zombieCheckInterval || 300000, // 5 min
      maxInactiveTime: config.maxInactiveTime || 600000, // 10 min

      // Adaptation dynamique
      adaptiveHeartbeat: config.adaptiveHeartbeat !== false,
      minHeartbeatInterval: config.minHeartbeatInterval || 10000, // 10s
      maxHeartbeatInterval: config.maxHeartbeatInterval || 120000, // 2 min

      // Métriques
      enableMetrics: config.enableMetrics !== false,
      metricsInterval: config.metricsInterval || 60000, // 1 min

      ...config
    }

    // État des connexions
    this.connections = new Map() // socketId -> connectionState
    this.globalMetrics = {
      totalHeartbeats: 0,
      missedHeartbeats: 0,
      averageLatency: 0,
      activeConnections: 0,
      zombieConnections: 0,
      networkQuality: 'good'
    }

    // Timers
    this.timers = {
      heartbeat: null,
      latencyCheck: null,
      zombieCheck: null,
      metrics: null,
      adaptation: null
    }

    this.initialize()
  }

  /**
   * Initialiser le gestionnaire de heartbeat
   */
  initialize () {
    console.log('[Heartbeat] Initializing advanced heartbeat manager')

    // Écouter les nouvelles connexions
    this.io.on('connection', (socket) => {
      this.registerConnection(socket)
    })

    // Démarrer les processus de monitoring
    this.startHeartbeatProcess()
    this.startLatencyMonitoring()
    this.startZombieDetection()

    if (this.config.enableMetrics) {
      this.startMetricsCollection()
    }

    if (this.config.adaptiveHeartbeat) {
      this.startAdaptiveManagement()
    }

    console.log('[Heartbeat] Manager initialized with config:', {
      heartbeatInterval: this.config.heartbeatInterval,
      adaptiveHeartbeat: this.config.adaptiveHeartbeat,
      enableMetrics: this.config.enableMetrics
    })
  }

  /**
   * Enregistrer une nouvelle connexion
   */
  registerConnection (socket) {
    const connectionState = {
      socketId: socket.id,
      userId: socket.userId,
      connectedAt: Date.now(),
      lastHeartbeat: Date.now(),
      lastActivity: Date.now(),
      lastPong: null,

      // Métriques de latence
      latencyHistory: [],
      averageLatency: 0,
      maxLatency: 0,

      // Statistiques de heartbeat
      heartbeatsSent: 0,
      heartbeatsReceived: 0,
      missedHeartbeats: 0,
      consecutiveMisses: 0,

      // État de la connexion
      isAlive: true,
      isZombie: false,
      networkQuality: 'unknown',

      // Configuration adaptative
      currentHeartbeatInterval: this.config.heartbeatInterval,
      adaptationScore: 0
    }

    this.connections.set(socket.id, connectionState)
    this.globalMetrics.activeConnections++

    // Configurer les gestionnaires d'événements
    this.setupSocketHandlers(socket, connectionState)

    console.log(`[Heartbeat] Registered connection: ${socket.id} (user: ${socket.userId})`)
  }

  /**
   * Configurer les gestionnaires d'événements pour un socket
   */
  setupSocketHandlers (socket, connectionState) {
    // Réponse au ping
    socket.on('pong', (data) => {
      this.handlePong(socket, connectionState, data)
    })

    // Activité générale
    const activityEvents = [
      'message', 'typing', 'presence', 'music_request',
      'photo_upload', 'task_update'
    ]

    activityEvents.forEach(event => {
      socket.on(event, () => {
        this.updateActivity(connectionState)
      })
    })

    // Heartbeat manuel du client
    socket.on('heartbeat', (data) => {
      this.handleClientHeartbeat(socket, connectionState, data)
    })

    // Déconnexion
    socket.on('disconnect', () => {
      this.unregisterConnection(socket.id)
    })

    // Erreurs
    socket.on('error', (error) => {
      this.handleSocketError(socket, connectionState, error)
    })
  }

  /**
   * Démarrer le processus de heartbeat
   */
  startHeartbeatProcess () {
    this.timers.heartbeat = setInterval(() => {
      this.performHeartbeatRound()
    }, Math.min(...Array.from(this.connections.values())
      .map(conn => conn.currentHeartbeatInterval)) || this.config.heartbeatInterval)
  }

  /**
   * Effectuer un round de heartbeat
   */
  performHeartbeatRound () {
    const now = Date.now()
    const socketsToCheck = []

    for (const [socketId, connectionState] of this.connections) {
      // Vérifier si c'est le moment d'envoyer un heartbeat
      const timeSinceLastHeartbeat = now - connectionState.lastHeartbeat

      if (timeSinceLastHeartbeat >= connectionState.currentHeartbeatInterval) {
        socketsToCheck.push({ socketId, connectionState })
      }
    }

    // Traiter en parallèle pour optimiser
    Promise.all(socketsToCheck.map(({ socketId, connectionState }) =>
      this.sendHeartbeat(socketId, connectionState)
    ))

    this.globalMetrics.totalHeartbeats += socketsToCheck.length
  }

  /**
   * Envoyer un heartbeat à une connexion
   */
  async sendHeartbeat (socketId, connectionState) {
    const socket = this.io.sockets.sockets.get(socketId)

    if (!socket || !socket.connected) {
      this.markAsZombie(connectionState)
      return
    }

    const now = Date.now()
    const heartbeatData = {
      timestamp: now,
      sequence: connectionState.heartbeatsSent + 1,
      expectedResponse: now + this.config.heartbeatTimeout
    }

    try {
      // Envoyer le ping avec données
      socket.emit('ping', heartbeatData)

      connectionState.lastHeartbeat = now
      connectionState.heartbeatsSent++

      // Programmer la vérification du timeout
      setTimeout(() => {
        this.checkHeartbeatTimeout(socketId, heartbeatData.sequence)
      }, this.config.heartbeatTimeout)
    } catch (error) {
      console.error(`[Heartbeat] Error sending heartbeat to ${socketId}:`, error)
      this.handleSocketError(socket, connectionState, error)
    }
  }

  /**
   * Vérifier le timeout d'un heartbeat
   */
  checkHeartbeatTimeout (socketId, sequence) {
    const connectionState = this.connections.get(socketId)

    if (!connectionState) return

    // Vérifier si le pong a été reçu
    if (connectionState.heartbeatsReceived < sequence) {
      connectionState.missedHeartbeats++
      connectionState.consecutiveMisses++
      this.globalMetrics.missedHeartbeats++

      console.warn(`[Heartbeat] Missed heartbeat from ${socketId} (consecutive: ${connectionState.consecutiveMisses})`)

      // Marquer comme mort après plusieurs échecs consécutifs
      if (connectionState.consecutiveMisses >= 3) {
        this.markAsDead(socketId, connectionState)
      } else {
        // Adapter l'intervalle de heartbeat
        this.adaptHeartbeatInterval(connectionState, false)
      }
    }
  }

  /**
   * Gérer la réception d'un pong
   */
  handlePong (socket, connectionState, data) {
    const now = Date.now()
    const latency = now - (data?.timestamp || connectionState.lastHeartbeat)

    connectionState.lastPong = now
    connectionState.heartbeatsReceived++
    connectionState.consecutiveMisses = 0
    connectionState.isAlive = true

    // Enregistrer la latence
    this.recordLatency(connectionState, latency)

    // Adapter l'intervalle de heartbeat
    if (this.config.adaptiveHeartbeat) {
      this.adaptHeartbeatInterval(connectionState, true)
    }

    // Émettre l'événement de latence
    socket.emit('latency', latency)
  }

  /**
   * Enregistrer une mesure de latence
   */
  recordLatency (connectionState, latency) {
    // Ajouter à l'historique (garder seulement les 10 dernières)
    connectionState.latencyHistory.push(latency)
    if (connectionState.latencyHistory.length > 10) {
      connectionState.latencyHistory.shift()
    }

    // Calculer la moyenne
    connectionState.averageLatency =
      connectionState.latencyHistory.reduce((sum, lat) => sum + lat, 0) /
      connectionState.latencyHistory.length

    // Mettre à jour le maximum
    connectionState.maxLatency = Math.max(connectionState.maxLatency, latency)

    // Évaluer la qualité réseau
    this.evaluateNetworkQuality(connectionState)

    // Mettre à jour les métriques globales
    this.updateGlobalLatencyMetrics()
  }

  /**
   * Évaluer la qualité réseau d'une connexion
   */
  evaluateNetworkQuality (connectionState) {
    const avgLatency = connectionState.averageLatency
    const missRate = connectionState.missedHeartbeats /
                    Math.max(connectionState.heartbeatsSent, 1)

    let quality
    if (avgLatency < 100 && missRate < 0.05) {
      quality = 'excellent'
    } else if (avgLatency < 300 && missRate < 0.1) {
      quality = 'good'
    } else if (avgLatency < 1000 && missRate < 0.2) {
      quality = 'fair'
    } else {
      quality = 'poor'
    }

    connectionState.networkQuality = quality
  }

  /**
   * Adapter l'intervalle de heartbeat basé sur les performances
   */
  adaptHeartbeatInterval (connectionState, success) {
    if (!this.config.adaptiveHeartbeat) return

    const currentInterval = connectionState.currentHeartbeatInterval
    let newInterval = currentInterval

    if (success) {
      // Connexion stable, augmenter l'intervalle (moins de heartbeats)
      connectionState.adaptationScore = Math.min(connectionState.adaptationScore + 1, 10)

      if (connectionState.adaptationScore >= 5 &&
          connectionState.networkQuality === 'excellent') {
        newInterval = Math.min(currentInterval * 1.2, this.config.maxHeartbeatInterval)
      }
    } else {
      // Problème détecté, réduire l'intervalle (plus de heartbeats)
      connectionState.adaptationScore = Math.max(connectionState.adaptationScore - 2, -10)

      if (connectionState.adaptationScore <= -3) {
        newInterval = Math.max(currentInterval * 0.8, this.config.minHeartbeatInterval)
      }
    }

    if (newInterval !== currentInterval) {
      connectionState.currentHeartbeatInterval = newInterval
      console.log(`[Heartbeat] Adapted interval for ${connectionState.socketId}: ${currentInterval}ms -> ${newInterval}ms`)
    }
  }

  /**
   * Marquer une connexion comme morte
   */
  markAsDead (socketId, connectionState) {
    console.warn(`[Heartbeat] Marking connection as dead: ${socketId}`)

    connectionState.isAlive = false

    const socket = this.io.sockets.sockets.get(socketId)
    if (socket) {
      // Notifier le client avant de déconnecter
      socket.emit('connection_unstable', {
        reason: 'heartbeat_timeout',
        missedHeartbeats: connectionState.consecutiveMisses
      })

      // Déconnecter après un court délai
      setTimeout(() => {
        if (socket.connected) {
          socket.disconnect(true)
        }
      }, 5000)
    }

    this.emit('connection_dead', {
      socketId,
      userId: connectionState.userId,
      connectionState
    })
  }

  /**
   * Marquer comme connexion zombie
   */
  markAsZombie (connectionState) {
    if (!connectionState.isZombie) {
      connectionState.isZombie = true
      this.globalMetrics.zombieConnections++

      console.warn(`[Heartbeat] Zombie connection detected: ${connectionState.socketId}`)

      this.emit('zombie_connection', {
        socketId: connectionState.socketId,
        userId: connectionState.userId
      })
    }
  }

  /**
   * Mettre à jour l'activité d'une connexion
   */
  updateActivity (connectionState) {
    connectionState.lastActivity = Date.now()

    // Réactiver si c'était marqué comme zombie
    if (connectionState.isZombie) {
      connectionState.isZombie = false
      this.globalMetrics.zombieConnections = Math.max(0, this.globalMetrics.zombieConnections - 1)
    }
  }

  /**
   * Démarrer la détection de connexions zombies
   */
  startZombieDetection () {
    this.timers.zombieCheck = setInterval(() => {
      this.detectZombieConnections()
    }, this.config.zombieCheckInterval)
  }

  /**
   * Détecter les connexions zombies
   */
  detectZombieConnections () {
    const now = Date.now()
    const zombies = []

    for (const [socketId, connectionState] of this.connections) {
      const inactiveTime = now - connectionState.lastActivity

      if (inactiveTime > this.config.maxInactiveTime &&
          connectionState.consecutiveMisses >= 2) {
        zombies.push({ socketId, connectionState })
      }
    }

    // Nettoyer les zombies
    zombies.forEach(({ socketId, connectionState }) => {
      this.markAsZombie(connectionState)

      const socket = this.io.sockets.sockets.get(socketId)
      if (socket) {
        socket.disconnect(true)
      }
    })

    if (zombies.length > 0) {
      console.log(`[Heartbeat] Cleaned ${zombies.length} zombie connections`)
    }
  }

  /**
   * Démarrer la collecte de métriques
   */
  startMetricsCollection () {
    this.timers.metrics = setInterval(() => {
      this.updateGlobalMetrics()
      this.publishMetrics()
    }, this.config.metricsInterval)
  }

  /**
   * Mettre à jour les métriques globales
   */
  updateGlobalMetrics () {
    const connections = Array.from(this.connections.values())

    this.globalMetrics.activeConnections = connections.filter(c => c.isAlive).length
    this.globalMetrics.zombieConnections = connections.filter(c => c.isZombie).length

    // Qualité réseau globale
    const qualityScores = { excellent: 4, good: 3, fair: 2, poor: 1, unknown: 0 }
    const avgQuality = connections.reduce((sum, conn) =>
      sum + qualityScores[conn.networkQuality], 0) / connections.length

    if (avgQuality >= 3.5) this.globalMetrics.networkQuality = 'excellent'
    else if (avgQuality >= 2.5) this.globalMetrics.networkQuality = 'good'
    else if (avgQuality >= 1.5) this.globalMetrics.networkQuality = 'fair'
    else this.globalMetrics.networkQuality = 'poor'
  }

  /**
   * Mettre à jour les métriques de latence globales
   */
  updateGlobalLatencyMetrics () {
    const latencies = Array.from(this.connections.values())
      .map(conn => conn.averageLatency)
      .filter(lat => lat > 0)

    if (latencies.length > 0) {
      this.globalMetrics.averageLatency =
        latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length
    }
  }

  /**
   * Publier les métriques
   */
  publishMetrics () {
    this.emit('metrics', {
      ...this.globalMetrics,
      timestamp: Date.now(),
      connectionDetails: Array.from(this.connections.values()).map(conn => ({
        socketId: conn.socketId,
        userId: conn.userId,
        latency: conn.averageLatency,
        quality: conn.networkQuality,
        heartbeatInterval: conn.currentHeartbeatInterval,
        missedHeartbeats: conn.missedHeartbeats
      }))
    })
  }

  /**
   * Désenregistrer une connexion
   */
  unregisterConnection (socketId) {
    const connectionState = this.connections.get(socketId)

    if (connectionState) {
      this.connections.delete(socketId)
      this.globalMetrics.activeConnections--

      if (connectionState.isZombie) {
        this.globalMetrics.zombieConnections--
      }

      console.log(`[Heartbeat] Unregistered connection: ${socketId}`)
    }
  }

  /**
   * Obtenir les métriques actuelles
   */
  getMetrics () {
    return {
      ...this.globalMetrics,
      connections: this.connections.size,
      config: this.config
    }
  }

  /**
   * Obtenir les détails d'une connexion
   */
  getConnectionDetails (socketId) {
    return this.connections.get(socketId)
  }

  /**
   * Arrêter le gestionnaire de heartbeat
   */
  shutdown () {
    console.log('[Heartbeat] Shutting down heartbeat manager')

    // Arrêter tous les timers
    Object.values(this.timers).forEach(timer => {
      if (timer) clearInterval(timer)
    })

    // Nettoyer les connexions
    this.connections.clear()

    console.log('[Heartbeat] Heartbeat manager shut down')
  }
}

module.exports = HeartbeatManager
