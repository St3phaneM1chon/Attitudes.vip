/**
 * Serveur WebSocket pour les communications temps réel
 * Gère les connexions multi-tenant avec authentification JWT
 */

const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')
const { createClient } = require('@supabase/supabase-js')
const Redis = require('ioredis')

class WebSocketServer {
  constructor (httpServer, config = {}) {
    this.config = {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      transports: ['websocket', 'polling'],
      ...config
    }

    // Initialiser Socket.IO
    this.io = new Server(httpServer, this.config)

    // Initialiser Redis pour la scalabilité
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => Math.min(times * 50, 2000)
    })

    // Initialiser Supabase
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Stockage des connexions
    this.connections = new Map() // userId -> Set of socket IDs
    this.weddingSockets = new Map() // weddingId -> Set of socket IDs

    // Métriques
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      messagesPerMinute: 0,
      reconnections: 0
    }

    this.setupMiddleware()
    this.setupEventHandlers()
    this.startMetricsCollection()
  }

  setupMiddleware () {
    // Middleware d'authentification
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token
        if (!token) {
          return next(new Error('Authentication required'))
        }

        // Vérifier le JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        // Récupérer les infos utilisateur
        const { data: user, error } = await this.supabase
          .from('users')
          .select('id, name, role, wedding_id')
          .eq('id', decoded.sub)
          .single()

        if (error || !user) {
          return next(new Error('User not found'))
        }

        // Attacher les infos au socket
        socket.userId = user.id
        socket.userName = user.name
        socket.userRole = user.role
        socket.weddingId = user.wedding_id

        // Log de connexion
        console.log(`[WS] User connected: ${user.name} (${user.role})`)

        next()
      } catch (error) {
        console.error('[WS] Auth error:', error.message)
        next(new Error('Invalid token'))
      }
    })

    // Middleware de rate limiting
    this.io.use((socket, next) => {
      const clientId = socket.handshake.address
      const key = `ratelimit:${clientId}`

      this.redis.incr(key).then((count) => {
        if (count === 1) {
          this.redis.expire(key, 60) // 60 secondes
        }

        if (count > 100) { // Max 100 connexions par minute
          next(new Error('Rate limit exceeded'))
        } else {
          next()
        }
      })
    })
  }

  setupEventHandlers () {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket)

      // Événements généraux
      socket.on('disconnect', () => this.handleDisconnect(socket))
      socket.on('error', (error) => this.handleError(socket, error))

      // Événements de mariage
      socket.on('join_wedding', () => this.joinWedding(socket))
      socket.on('leave_wedding', () => this.leaveWedding(socket))

      // Messages
      socket.on('send_message', (data) => this.handleMessage(socket, data))
      socket.on('typing', (data) => this.handleTyping(socket, data))

      // Événements DJ
      socket.on('music_request', (data) => this.handleMusicRequest(socket, data))
      socket.on('mic_request', (data) => this.handleMicRequest(socket, data))
      socket.on('accept_music_request', (data) => this.acceptMusicRequest(socket, data))
      socket.on('reject_music_request', (data) => this.rejectMusicRequest(socket, data))

      // Photos
      socket.on('new_photo', (data) => this.handleNewPhoto(socket, data))

      // Tâches (Taskmaster)
      socket.on('task_update', (data) => this.handleTaskUpdate(socket, data))
      socket.on('task_assigned', (data) => this.handleTaskAssigned(socket, data))

      // Présence
      socket.on('update_presence', (data) => this.updatePresence(socket, data))

      // Admin
      if (socket.userRole === 'admin') {
        socket.on('broadcast_announcement', (data) => this.broadcastAnnouncement(socket, data))
      }
    })
  }

  handleConnection (socket) {
    // Mettre à jour les métriques
    this.metrics.totalConnections++
    this.metrics.activeConnections++

    // Ajouter aux maps de connexion
    if (!this.connections.has(socket.userId)) {
      this.connections.set(socket.userId, new Set())
    }
    this.connections.get(socket.userId).add(socket.id)

    // Auto-join wedding room
    if (socket.weddingId) {
      this.joinWedding(socket)
    }

    // Envoyer l'état initial
    socket.emit('connected', {
      userId: socket.userId,
      userName: socket.userName,
      weddingId: socket.weddingId,
      serverTime: new Date().toISOString()
    })

    // Notifier les autres membres du mariage
    if (socket.weddingId) {
      socket.to(`wedding:${socket.weddingId}`).emit('user_online', {
        userId: socket.userId,
        userName: socket.userName,
        role: socket.userRole
      })
    }
  }

  handleDisconnect (socket) {
    console.log(`[WS] User disconnected: ${socket.userName}`)

    // Mettre à jour les métriques
    this.metrics.activeConnections--

    // Retirer des maps
    const userSockets = this.connections.get(socket.userId)
    if (userSockets) {
      userSockets.delete(socket.id)
      if (userSockets.size === 0) {
        this.connections.delete(socket.userId)

        // Notifier que l'utilisateur est vraiment offline
        if (socket.weddingId) {
          socket.to(`wedding:${socket.weddingId}`).emit('user_offline', {
            userId: socket.userId,
            userName: socket.userName
          })
        }
      }
    }

    // Retirer du wedding
    if (socket.weddingId) {
      const weddingSockets = this.weddingSockets.get(socket.weddingId)
      if (weddingSockets) {
        weddingSockets.delete(socket.id)
      }
    }
  }

  joinWedding (socket) {
    if (!socket.weddingId) return

    const room = `wedding:${socket.weddingId}`
    socket.join(room)

    // Ajouter à la map wedding
    if (!this.weddingSockets.has(socket.weddingId)) {
      this.weddingSockets.set(socket.weddingId, new Set())
    }
    this.weddingSockets.get(socket.weddingId).add(socket.id)

    // Obtenir la liste des utilisateurs en ligne
    const onlineUsers = this.getWeddingOnlineUsers(socket.weddingId)

    socket.emit('wedding_joined', {
      weddingId: socket.weddingId,
      onlineUsers,
      totalMembers: this.weddingSockets.get(socket.weddingId).size
    })
  }

  leaveWedding (socket) {
    if (!socket.weddingId) return

    const room = `wedding:${socket.weddingId}`
    socket.leave(room)

    const weddingSockets = this.weddingSockets.get(socket.weddingId)
    if (weddingSockets) {
      weddingSockets.delete(socket.id)
    }
  }

  async handleMessage (socket, data) {
    try {
      const { recipientId, content, channel = 'direct' } = data

      // Valider les données
      if (!content || content.trim().length === 0) {
        socket.emit('error', { message: 'Message vide' })
        return
      }

      // Sauvegarder en base
      const { data: message, error } = await this.supabase
        .from('messages')
        .insert({
          wedding_id: socket.weddingId,
          sender_id: socket.userId,
          recipient_id: recipientId,
          channel,
          content: content.trim()
        })
        .select()
        .single()

      if (error) throw error

      // Enrichir le message
      const enrichedMessage = {
        ...message,
        senderName: socket.userName,
        senderRole: socket.userRole
      }

      // Envoyer au destinataire
      if (recipientId && this.connections.has(recipientId)) {
        const recipientSockets = this.connections.get(recipientId)
        recipientSockets.forEach(socketId => {
          this.io.to(socketId).emit('new_message', enrichedMessage)
        })
      }

      // Envoyer dans le canal si broadcast
      if (channel === 'wedding' && socket.weddingId) {
        socket.to(`wedding:${socket.weddingId}`).emit('new_message', enrichedMessage)
      }

      // Confirmation à l'expéditeur
      socket.emit('message_sent', enrichedMessage)

      // Mettre à jour les métriques
      this.metrics.messagesPerMinute++
    } catch (error) {
      console.error('[WS] Message error:', error)
      socket.emit('error', { message: 'Erreur envoi message' })
    }
  }

  handleTyping (socket, data) {
    const { recipientId, isTyping } = data

    if (recipientId && this.connections.has(recipientId)) {
      const recipientSockets = this.connections.get(recipientId)
      recipientSockets.forEach(socketId => {
        this.io.to(socketId).emit('user_typing', {
          userId: socket.userId,
          userName: socket.userName,
          isTyping
        })
      })
    }
  }

  async handleMusicRequest (socket, data) {
    try {
      const { songTitle, artist, dedicatedTo } = data

      // Vérifier que l'utilisateur est un invité
      if (!['guest', 'couple'].includes(socket.userRole)) {
        socket.emit('error', { message: 'Non autorisé' })
        return
      }

      // Sauvegarder la demande
      const { data: request, error } = await this.supabase
        .from('music_requests')
        .insert({
          wedding_id: socket.weddingId,
          guest_name: socket.userName,
          song_title: songTitle,
          artist: artist || 'Artiste inconnu',
          dedicated_to: dedicatedTo
        })
        .select()
        .single()

      if (error) throw error

      // Notifier tous les DJs du mariage
      const djSockets = await this.getDJSockets(socket.weddingId)
      djSockets.forEach(djSocketId => {
        this.io.to(djSocketId).emit('music_request', {
          ...request,
          guestName: socket.userName
        })
      })

      // Confirmation à l'invité
      socket.emit('music_request_sent', {
        message: 'Votre demande a été envoyée au DJ',
        requestId: request.id
      })
    } catch (error) {
      console.error('[WS] Music request error:', error)
      socket.emit('error', { message: 'Erreur demande musicale' })
    }
  }

  async handleMicRequest (socket, data) {
    try {
      const { purpose, duration = 5 } = data

      // Sauvegarder la demande
      const { data: request, error } = await this.supabase
        .from('mic_requests')
        .insert({
          wedding_id: socket.weddingId,
          guest_name: socket.userName,
          purpose,
          duration_minutes: duration
        })
        .select()
        .single()

      if (error) throw error

      // Notifier TOUS les DJs avec alerte prioritaire
      const djSockets = await this.getDJSockets(socket.weddingId)
      djSockets.forEach(djSocketId => {
        this.io.to(djSocketId).emit('mic_request', {
          ...request,
          urgent: true,
          guestName: socket.userName
        })
      })

      socket.emit('mic_request_sent', {
        message: 'Demande de micro envoyée',
        requestId: request.id
      })
    } catch (error) {
      console.error('[WS] Mic request error:', error)
      socket.emit('error', { message: 'Erreur demande micro' })
    }
  }

  async acceptMusicRequest (socket, data) {
    if (socket.userRole !== 'dj') {
      socket.emit('error', { message: 'Non autorisé' })
      return
    }

    const { requestId } = data

    try {
      // Mettre à jour le statut
      const { error } = await this.supabase
        .from('music_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId)
        .eq('wedding_id', socket.weddingId)

      if (error) throw error

      // Notifier les autres DJs
      socket.to(`wedding:${socket.weddingId}:dj`).emit('music_request_accepted', {
        requestId,
        acceptedBy: socket.userName
      })
    } catch (error) {
      console.error('[WS] Accept music error:', error)
      socket.emit('error', { message: 'Erreur acceptation' })
    }
  }

  async handleNewPhoto (socket, data) {
    try {
      const { url, caption } = data

      // Sauvegarder la photo
      const { data: photo, error } = await this.supabase
        .from('photos')
        .insert({
          wedding_id: socket.weddingId,
          uploaded_by: socket.userId,
          url,
          caption
        })
        .select()
        .single()

      if (error) throw error

      // Diffuser à tous les membres du mariage
      this.io.to(`wedding:${socket.weddingId}`).emit('new_photo', {
        ...photo,
        uploaderName: socket.userName
      })

      // Notification spéciale pour les photographes
      const photographerSockets = await this.getPhotographerSockets(socket.weddingId)
      photographerSockets.forEach(socketId => {
        this.io.to(socketId).emit('guest_photo_uploaded', {
          ...photo,
          uploaderName: socket.userName
        })
      })
    } catch (error) {
      console.error('[WS] Photo upload error:', error)
      socket.emit('error', { message: 'Erreur upload photo' })
    }
  }

  async handleTaskUpdate (socket, data) {
    try {
      const { taskId, updates } = data

      // Vérifier les permissions
      const canUpdate = await this.canUpdateTask(socket.userId, taskId)
      if (!canUpdate) {
        socket.emit('error', { message: 'Non autorisé' })
        return
      }

      // Mettre à jour la tâche
      const { data: task, error } = await this.supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single()

      if (error) throw error

      // Notifier tous les membres concernés
      this.io.to(`wedding:${socket.weddingId}`).emit('task_updated', {
        task,
        updatedBy: socket.userName
      })

      // Si la tâche est assignée, notifier spécifiquement
      if (task.assigned_to) {
        this.notifyUser(task.assigned_to, 'task_updated_assigned', {
          task,
          updatedBy: socket.userName
        })
      }
    } catch (error) {
      console.error('[WS] Task update error:', error)
      socket.emit('error', { message: 'Erreur mise à jour tâche' })
    }
  }

  async handleTaskAssigned (socket, data) {
    const { taskId, assignedTo } = data

    try {
      // Notifier la personne assignée
      this.notifyUser(assignedTo, 'task_assigned', {
        taskId,
        assignedBy: socket.userName,
        message: `${socket.userName} vous a assigné une nouvelle tâche`
      })
    } catch (error) {
      console.error('[WS] Task assignment error:', error)
    }
  }

  updatePresence (socket, data) {
    const { status = 'online', customStatus } = data

    // Diffuser le statut aux membres du mariage
    if (socket.weddingId) {
      socket.to(`wedding:${socket.weddingId}`).emit('presence_update', {
        userId: socket.userId,
        userName: socket.userName,
        status,
        customStatus,
        lastSeen: new Date().toISOString()
      })
    }
  }

  async broadcastAnnouncement (socket, data) {
    const { message, priority = 'info', targetWedding } = data

    const announcement = {
      id: `announcement_${Date.now()}`,
      message,
      priority,
      from: 'Système',
      timestamp: new Date().toISOString()
    }

    if (targetWedding) {
      // Annonce ciblée
      this.io.to(`wedding:${targetWedding}`).emit('announcement', announcement)
    } else {
      // Annonce globale
      this.io.emit('announcement', announcement)
    }

    // Log
    console.log(`[WS] Announcement broadcasted by ${socket.userName}`)
  }

  // Méthodes utilitaires

  getWeddingOnlineUsers (weddingId) {
    const onlineUsers = []
    const weddingSockets = this.weddingSockets.get(weddingId)

    if (weddingSockets) {
      const processedUsers = new Set()

      weddingSockets.forEach(socketId => {
        const socket = this.io.sockets.sockets.get(socketId)
        if (socket && !processedUsers.has(socket.userId)) {
          onlineUsers.push({
            userId: socket.userId,
            userName: socket.userName,
            role: socket.userRole
          })
          processedUsers.add(socket.userId)
        }
      })
    }

    return onlineUsers
  }

  async getDJSockets (weddingId) {
    const djSockets = []
    const weddingSockets = this.weddingSockets.get(weddingId)

    if (weddingSockets) {
      weddingSockets.forEach(socketId => {
        const socket = this.io.sockets.sockets.get(socketId)
        if (socket && socket.userRole === 'dj') {
          djSockets.push(socketId)
        }
      })
    }

    return djSockets
  }

  async getPhotographerSockets (weddingId) {
    const photographerSockets = []
    const weddingSockets = this.weddingSockets.get(weddingId)

    if (weddingSockets) {
      weddingSockets.forEach(socketId => {
        const socket = this.io.sockets.sockets.get(socketId)
        if (socket && ['photographer', 'videographer'].includes(socket.userRole)) {
          photographerSockets.push(socketId)
        }
      })
    }

    return photographerSockets
  }

  async canUpdateTask (userId, taskId) {
    const { data: task } = await this.supabase
      .from('tasks')
      .select('assigned_to, created_by')
      .eq('id', taskId)
      .single()

    return task && (task.assigned_to === userId || task.created_by === userId)
  }

  notifyUser (userId, event, data) {
    const userSockets = this.connections.get(userId)
    if (userSockets) {
      userSockets.forEach(socketId => {
        this.io.to(socketId).emit(event, data)
      })
    }
  }

  handleError (socket, error) {
    console.error(`[WS] Socket error for ${socket.userName}:`, error)
    this.metrics.errors = (this.metrics.errors || 0) + 1
  }

  // Métriques et monitoring

  startMetricsCollection () {
    setInterval(() => {
      // Reset messages per minute
      this.metrics.messagesPerMinute = 0

      // Publier les métriques
      this.publishMetrics()
    }, 60000) // Toutes les minutes
  }

  publishMetrics () {
    const metrics = {
      ...this.metrics,
      timestamp: new Date().toISOString(),
      connectedUsers: this.connections.size,
      activeWeddings: this.weddingSockets.size
    }

    // Publier sur Redis pour monitoring
    this.redis.publish('websocket:metrics', JSON.stringify(metrics))

    // Log périodique
    console.log('[WS] Metrics:', metrics)
  }

  // Méthodes publiques

  getMetrics () {
    return {
      ...this.metrics,
      connectedUsers: this.connections.size,
      activeWeddings: this.weddingSockets.size
    }
  }

  isUserOnline (userId) {
    return this.connections.has(userId)
  }

  getWeddingConnections (weddingId) {
    return this.weddingSockets.get(weddingId)?.size || 0
  }

  // Cleanup

  async shutdown () {
    console.log('[WS] Shutting down WebSocket server...')

    // Notifier tous les clients
    this.io.emit('server_shutdown', {
      message: 'Le serveur va redémarrer',
      reconnectDelay: 5000
    })

    // Fermer les connexions
    await this.io.close()
    await this.redis.quit()

    console.log('[WS] WebSocket server shut down')
  }
}

module.exports = WebSocketServer
