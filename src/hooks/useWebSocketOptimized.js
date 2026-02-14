/**
 * Hook WebSocket Optimisé avec Reconnexion Automatique
 * Support de la haute disponibilité et resilience
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'

export const useWebSocketOptimized = (url, options = {}) => {
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState(null)
  const [metrics, setMetrics] = useState({
    latency: 0,
    reconnectCount: 0,
    messageCount: 0,
    uptime: 0
  })

  // Configuration de reconnexion
  const reconnectConfig = useRef({
    enabled: options.reconnect !== false,
    attempts: 0,
    maxAttempts: options.maxReconnectAttempts || 10,
    delay: options.reconnectDelay || 1000,
    maxDelay: options.maxReconnectDelay || 30000,
    factor: options.reconnectFactor || 1.5,
    jitter: options.reconnectJitter || 0.1
  })

  // État de connexion
  const connectionState = useRef({
    url,
    token: options.token,
    reconnectToken: null,
    lastConnected: null,
    startTime: Date.now(),
    heartbeatInterval: null,
    latencyInterval: null
  })

  // Queue de messages hors ligne
  const messageQueue = useRef([])
  const maxQueueSize = options.maxQueueSize || 100

  // Callbacks des événements
  const eventCallbacks = useRef(new Map())

  /**
   * Calculer le délai de reconnexion avec exponential backoff
   */
  const calculateReconnectDelay = useCallback(() => {
    const config = reconnectConfig.current
    const baseDelay = config.delay * Math.pow(config.factor, config.attempts)
    const maxDelay = Math.min(baseDelay, config.maxDelay)

    // Ajouter jitter pour éviter thundering herd
    const jitter = maxDelay * config.jitter * Math.random()

    return Math.floor(maxDelay + jitter)
  }, [])

  /**
   * Créer une nouvelle connexion WebSocket
   */
  const createConnection = useCallback(async () => {
    if (connecting || connected) return

    setConnecting(true)
    setError(null)

    try {
      const socketConfig = {
        transports: ['websocket'],
        upgrade: true,
        rememberUpgrade: true,

        // Authentification
        auth: {
          token: connectionState.current.reconnectToken || connectionState.current.token
        },

        // Optimisations de connexion
        forceNew: false,
        reconnection: false, // Géré manuellement
        timeout: options.timeout || 10000,

        // Compression
        compression: true,

        // Auto-ping désactivé (géré manuellement)
        autoConnect: false,

        ...options.socketOptions
      }

      console.log('[WS] Creating optimized connection...')
      const newSocket = io(url, socketConfig)

      // Configurer les gestionnaires d'événements
      setupSocketHandlers(newSocket)

      // Connecter manuellement
      newSocket.connect()

      // Timeout de connexion
      const connectTimeout = setTimeout(() => {
        if (!connected) {
          console.error('[WS] Connection timeout')
          newSocket.disconnect()
          handleConnectionError(new Error('Connection timeout'))
        }
      }, socketConfig.timeout)

      // Nettoyer le timeout si connexion réussie
      newSocket.on('connect', () => {
        clearTimeout(connectTimeout)
      })
    } catch (err) {
      console.error('[WS] Connection creation error:', err)
      handleConnectionError(err)
    }
  }, [connected, connecting, url, options])

  /**
   * Configurer les gestionnaires d'événements du socket
   */
  const setupSocketHandlers = useCallback((newSocket) => {
    // Connexion réussie
    newSocket.on('connect', () => {
      console.log('[WS] Connected successfully')

      setSocket(newSocket)
      setConnected(true)
      setConnecting(false)
      setError(null)

      connectionState.current.lastConnected = Date.now()
      reconnectConfig.current.attempts = 0

      // Démarrer le heartbeat
      startHeartbeat(newSocket)

      // Démarrer le monitoring de latence
      startLatencyMonitoring(newSocket)

      // Traiter la queue de messages hors ligne
      processOfflineQueue(newSocket)

      // Mettre à jour les métriques
      setMetrics(prev => ({
        ...prev,
        reconnectCount: prev.reconnectCount + (prev.reconnectCount > 0 ? 1 : 0),
        uptime: Date.now() - connectionState.current.startTime
      }))
    })

    // Données de connexion du serveur
    newSocket.on('connected', (data) => {
      console.log('[WS] Server connection data:', data)

      // Stocker le token de reconnexion
      if (data.reconnectToken) {
        connectionState.current.reconnectToken = data.reconnectToken
      }

      // Capacités du serveur
      if (data.serverCapabilities) {
        console.log('[WS] Server capabilities:', data.serverCapabilities)
      }
    })

    // Déconnexion
    newSocket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason)

      setConnected(false)
      setConnecting(false)

      // Arrêter le monitoring
      stopHeartbeat()
      stopLatencyMonitoring()

      // Reconnecter automatiquement si nécessaire
      if (shouldReconnect(reason)) {
        scheduleReconnect()
      }
    })

    // Erreurs de connexion
    newSocket.on('connect_error', (err) => {
      console.error('[WS] Connection error:', err.message)
      handleConnectionError(err)
    })

    // Erreurs générales
    newSocket.on('error', (err) => {
      console.error('[WS] Socket error:', err)
      setError(err.message)
    })

    // Pong pour latence
    newSocket.on('pong', (latency) => {
      setMetrics(prev => ({
        ...prev,
        latency
      }))
    })

    // Arrêt du serveur
    newSocket.on('server_shutdown', (data) => {
      console.log('[WS] Server shutdown:', data.message)

      // Reconnecter après le délai spécifié
      setTimeout(() => {
        if (reconnectConfig.current.enabled) {
          createConnection()
        }
      }, data.reconnectDelay || 10000)
    })

    // Relayer tous les autres événements
    const originalOn = newSocket.on.bind(newSocket)
    newSocket.on = (event, callback) => {
      // Stocker le callback pour le relayer
      if (!eventCallbacks.current.has(event)) {
        eventCallbacks.current.set(event, new Set())
      }
      eventCallbacks.current.get(event).add(callback)

      return originalOn(event, callback)
    }
  }, [])

  /**
   * Démarrer le heartbeat manuel
   */
  const startHeartbeat = useCallback((socket) => {
    const interval = options.heartbeatInterval || 30000 // 30 secondes

    connectionState.current.heartbeatInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('ping')
      }
    }, interval)
  }, [options.heartbeatInterval])

  /**
   * Arrêter le heartbeat
   */
  const stopHeartbeat = useCallback(() => {
    if (connectionState.current.heartbeatInterval) {
      clearInterval(connectionState.current.heartbeatInterval)
      connectionState.current.heartbeatInterval = null
    }
  }, [])

  /**
   * Démarrer le monitoring de latence
   */
  const startLatencyMonitoring = useCallback((socket) => {
    const interval = options.latencyInterval || 60000 // 1 minute

    connectionState.current.latencyInterval = setInterval(() => {
      const start = Date.now()
      socket.emit('ping', start)
    }, interval)
  }, [options.latencyInterval])

  /**
   * Arrêter le monitoring de latence
   */
  const stopLatencyMonitoring = useCallback(() => {
    if (connectionState.current.latencyInterval) {
      clearInterval(connectionState.current.latencyInterval)
      connectionState.current.latencyInterval = null
    }
  }, [])

  /**
   * Déterminer si on doit reconnecter
   */
  const shouldReconnect = useCallback((reason) => {
    if (!reconnectConfig.current.enabled) return false
    if (reconnectConfig.current.attempts >= reconnectConfig.current.maxAttempts) return false

    // Ne pas reconnecter pour certaines raisons
    const noReconnectReasons = [
      'io server disconnect',
      'io client disconnect',
      'forced close'
    ]

    return !noReconnectReasons.includes(reason)
  }, [])

  /**
   * Planifier une reconnexion
   */
  const scheduleReconnect = useCallback(() => {
    const delay = calculateReconnectDelay()
    reconnectConfig.current.attempts++

    console.log(`[WS] Scheduling reconnect #${reconnectConfig.current.attempts} in ${delay}ms`)

    setTimeout(() => {
      if (reconnectConfig.current.enabled && !connected) {
        createConnection()
      }
    }, delay)
  }, [calculateReconnectDelay, connected, createConnection])

  /**
   * Gérer les erreurs de connexion
   */
  const handleConnectionError = useCallback((err) => {
    setError(err.message)
    setConnecting(false)

    // Reconnecter si activé
    if (reconnectConfig.current.enabled) {
      scheduleReconnect()
    }
  }, [scheduleReconnect])

  /**
   * Traiter la queue de messages hors ligne
   */
  const processOfflineQueue = useCallback((socket) => {
    console.log(`[WS] Processing ${messageQueue.current.length} queued messages`)

    while (messageQueue.current.length > 0) {
      const { event, data } = messageQueue.current.shift()
      socket.emit(event, data)
    }
  }, [])

  /**
   * Emit avec gestion hors ligne
   */
  const emit = useCallback((event, data) => {
    if (connected && socket) {
      socket.emit(event, data)

      setMetrics(prev => ({
        ...prev,
        messageCount: prev.messageCount + 1
      }))
    } else {
      // Ajouter à la queue si hors ligne
      if (messageQueue.current.length < maxQueueSize) {
        messageQueue.current.push({ event, data, timestamp: Date.now() })
        console.log(`[WS] Queued message: ${event} (${messageQueue.current.length} in queue)`)
      } else {
        console.warn('[WS] Message queue full, dropping message')
      }
    }
  }, [connected, socket, maxQueueSize])

  /**
   * Écouter un événement
   */
  const on = useCallback((event, callback) => {
    if (socket) {
      socket.on(event, callback)
    } else {
      // Stocker pour l'attacher quand le socket sera prêt
      if (!eventCallbacks.current.has(event)) {
        eventCallbacks.current.set(event, new Set())
      }
      eventCallbacks.current.get(event).add(callback)
    }
  }, [socket])

  /**
   * Arrêter d'écouter un événement
   */
  const off = useCallback((event, callback) => {
    if (socket) {
      socket.off(event, callback)
    }

    if (eventCallbacks.current.has(event)) {
      eventCallbacks.current.get(event).delete(callback)
    }
  }, [socket])

  /**
   * Déconnecter manuellement
   */
  const disconnect = useCallback(() => {
    reconnectConfig.current.enabled = false

    if (socket) {
      socket.disconnect()
    }

    stopHeartbeat()
    stopLatencyMonitoring()

    setSocket(null)
    setConnected(false)
    setConnecting(false)
  }, [socket, stopHeartbeat, stopLatencyMonitoring])

  /**
   * Reconnecter manuellement
   */
  const reconnect = useCallback(() => {
    reconnectConfig.current.enabled = true
    reconnectConfig.current.attempts = 0

    if (socket) {
      socket.disconnect()
    }

    createConnection()
  }, [socket, createConnection])

  /**
   * Obtenir le statut de la connexion
   */
  const getStatus = useCallback(() => {
    return {
      connected,
      connecting,
      error,
      metrics: {
        ...metrics,
        uptime: Date.now() - connectionState.current.startTime,
        queueSize: messageQueue.current.length
      },
      reconnectAttempts: reconnectConfig.current.attempts,
      maxReconnectAttempts: reconnectConfig.current.maxAttempts
    }
  }, [connected, connecting, error, metrics])

  // Initialiser la connexion au montage
  useEffect(() => {
    createConnection()

    return () => {
      disconnect()
    }
  }, [])

  // Mettre à jour le token si changé
  useEffect(() => {
    if (options.token !== connectionState.current.token) {
      connectionState.current.token = options.token

      // Reconnecter avec le nouveau token
      if (connected) {
        reconnect()
      }
    }
  }, [options.token, connected, reconnect])

  return {
    socket,
    connected,
    connecting,
    error,
    metrics,
    emit,
    on,
    off,
    disconnect,
    reconnect,
    getStatus
  }
}
