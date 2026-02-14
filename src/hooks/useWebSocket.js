/**
 * Hook React pour utiliser WebSocket dans les composants
 * Gère la connexion, les événements et le cleanup automatique
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { getWebSocketClient } from '../services/websocket/websocket-client'
import { useAuth } from './useAuth'
import { toast } from 'react-toastify'

export const useWebSocket = (options = {}) => {
  const { user, token } = useAuth()
  const [isConnected, setIsConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState([])
  const [connectionError, setConnectionError] = useState(null)
  const wsClient = useRef(null)
  const eventListeners = useRef(new Map())

  // Initialiser le client WebSocket
  useEffect(() => {
    if (!token || !user) return

    wsClient.current = getWebSocketClient(options)

    // Connecter
    const connect = async () => {
      try {
        await wsClient.current.connect(token, {
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          weddingId: user.wedding_id
        })
        setIsConnected(true)
        setConnectionError(null)
      } catch (error) {
        console.error('[useWebSocket] Connection error:', error)
        setConnectionError(error.message)
        toast.error('Erreur de connexion au serveur temps réel')
      }
    }

    connect()

    // Écouteurs globaux
    const handleConnected = (data) => {
      console.log('[useWebSocket] Connected:', data)
      setIsConnected(true)
    }

    const handleDisconnected = () => {
      console.log('[useWebSocket] Disconnected')
      setIsConnected(false)
    }

    const handleError = (error) => {
      console.error('[useWebSocket] Error:', error)
      toast.error(`Erreur WebSocket: ${error.message}`)
    }

    const handleReconnected = () => {
      console.log('[useWebSocket] Reconnected')
      setIsConnected(true)
      toast.success('Connexion rétablie')
    }

    const handleWeddingJoined = (data) => {
      setOnlineUsers(data.onlineUsers || [])
    }

    const handleUserOnline = (user) => {
      setOnlineUsers(prev => [...prev.filter(u => u.userId !== user.userId), user])
    }

    const handleUserOffline = (user) => {
      setOnlineUsers(prev => prev.filter(u => u.userId !== user.userId))
    }

    const handleServerShutdown = (data) => {
      toast.warning(data.message || 'Le serveur va redémarrer')
    }

    // Ajouter les écouteurs
    wsClient.current.on('connected', handleConnected)
    wsClient.current.on('disconnected', handleDisconnected)
    wsClient.current.on('error', handleError)
    wsClient.current.on('reconnected', handleReconnected)
    wsClient.current.on('wedding_joined', handleWeddingJoined)
    wsClient.current.on('user_online', handleUserOnline)
    wsClient.current.on('user_offline', handleUserOffline)
    wsClient.current.on('server_shutdown', handleServerShutdown)

    // Cleanup
    return () => {
      wsClient.current.off('connected', handleConnected)
      wsClient.current.off('disconnected', handleDisconnected)
      wsClient.current.off('error', handleError)
      wsClient.current.off('reconnected', handleReconnected)
      wsClient.current.off('wedding_joined', handleWeddingJoined)
      wsClient.current.off('user_online', handleUserOnline)
      wsClient.current.off('user_offline', handleUserOffline)
      wsClient.current.off('server_shutdown', handleServerShutdown)

      // Déconnecter si plus aucun composant n'utilise
      if (eventListeners.current.size === 0) {
        wsClient.current.disconnect()
      }
    }
  }, [token, user])

  // Fonction pour écouter un événement
  const on = useCallback((event, handler) => {
    if (!wsClient.current) return

    // Stocker la référence pour cleanup
    if (!eventListeners.current.has(event)) {
      eventListeners.current.set(event, new Set())
    }
    eventListeners.current.get(event).add(handler)

    // Ajouter l'écouteur
    wsClient.current.on(event, handler)

    // Retourner fonction de cleanup
    return () => {
      if (wsClient.current) {
        wsClient.current.off(event, handler)
      }
      const handlers = eventListeners.current.get(event)
      if (handlers) {
        handlers.delete(handler)
        if (handlers.size === 0) {
          eventListeners.current.delete(event)
        }
      }
    }
  }, [])

  // Fonction pour émettre un événement
  const emit = useCallback((event, data) => {
    if (!wsClient.current || !isConnected) {
      console.warn('[useWebSocket] Not connected, cannot emit:', event)
      return Promise.reject(new Error('Not connected'))
    }

    return wsClient.current.emit(event, data)
  }, [isConnected])

  // Fonctions spécifiques

  const sendMessage = useCallback((recipientId, content, channel = 'direct') => {
    if (!wsClient.current) return Promise.reject(new Error('Not initialized'))
    return wsClient.current.sendMessage(recipientId, content, channel)
  }, [])

  const sendTyping = useCallback((recipientId, isTyping = true) => {
    if (!wsClient.current) return
    wsClient.current.sendTyping(recipientId, isTyping)
  }, [])

  const requestMusic = useCallback((songTitle, artist, dedicatedTo) => {
    if (!wsClient.current) return Promise.reject(new Error('Not initialized'))
    return wsClient.current.requestMusic(songTitle, artist, dedicatedTo)
  }, [])

  const requestMic = useCallback((purpose, duration) => {
    if (!wsClient.current) return Promise.reject(new Error('Not initialized'))
    return wsClient.current.requestMic(purpose, duration)
  }, [])

  const acceptMusicRequest = useCallback((requestId) => {
    if (!wsClient.current) return
    wsClient.current.acceptMusicRequest(requestId)
  }, [])

  const rejectMusicRequest = useCallback((requestId) => {
    if (!wsClient.current) return
    wsClient.current.rejectMusicRequest(requestId)
  }, [])

  const uploadPhoto = useCallback((url, caption) => {
    if (!wsClient.current) return Promise.reject(new Error('Not initialized'))
    return wsClient.current.uploadPhoto(url, caption)
  }, [])

  const updateTask = useCallback((taskId, updates) => {
    if (!wsClient.current) return Promise.reject(new Error('Not initialized'))
    return wsClient.current.updateTask(taskId, updates)
  }, [])

  const assignTask = useCallback((taskId, assignedTo) => {
    if (!wsClient.current) return Promise.reject(new Error('Not initialized'))
    return wsClient.current.assignTask(taskId, assignedTo)
  }, [])

  const updatePresence = useCallback((status, customStatus) => {
    if (!wsClient.current) return
    wsClient.current.updatePresence(status, customStatus)
  }, [])

  const broadcastAnnouncement = useCallback((message, priority, targetWedding) => {
    if (!wsClient.current) return Promise.reject(new Error('Not initialized'))
    return wsClient.current.broadcastAnnouncement(message, priority, targetWedding)
  }, [])

  return {
    // État
    isConnected,
    onlineUsers,
    connectionError,

    // Événements
    on,
    emit,

    // Messages
    sendMessage,
    sendTyping,

    // DJ
    requestMusic,
    requestMic,
    acceptMusicRequest,
    rejectMusicRequest,

    // Photos
    uploadPhoto,

    // Tâches
    updateTask,
    assignTask,

    // Présence
    updatePresence,

    // Admin
    broadcastAnnouncement
  }
}

// Hook spécialisé pour les messages
export const useMessages = (recipientId = null) => {
  const { on, sendMessage, sendTyping } = useWebSocket()
  const [messages, setMessages] = useState([])
  const [typing, setTyping] = useState({})

  useEffect(() => {
    const unsubscribeMessage = on('message', (message) => {
      if (!recipientId || message.sender_id === recipientId || message.recipient_id === recipientId) {
        setMessages(prev => [...prev, message])
      }
    })

    const unsubscribeTyping = on('typing', (data) => {
      if (!recipientId || data.userId === recipientId) {
        setTyping(prev => ({
          ...prev,
          [data.userId]: data.isTyping
        }))

        // Auto-clear après 3 secondes
        if (data.isTyping) {
          setTimeout(() => {
            setTyping(prev => ({
              ...prev,
              [data.userId]: false
            }))
          }, 3000)
        }
      }
    })

    return () => {
      unsubscribeMessage()
      unsubscribeTyping()
    }
  }, [on, recipientId])

  return {
    messages,
    typing,
    sendMessage: (content, channel) => sendMessage(recipientId, content, channel),
    sendTyping: (isTyping) => sendTyping(recipientId, isTyping)
  }
}

// Hook spécialisé pour DJ
export const useDJWebSocket = () => {
  const { on, acceptMusicRequest, rejectMusicRequest } = useWebSocket()
  const [musicRequests, setMusicRequests] = useState([])
  const [micRequests, setMicRequests] = useState([])

  useEffect(() => {
    const unsubscribeMusicRequest = on('music_request', (request) => {
      setMusicRequests(prev => [...prev, request])

      // Notification sonore
      playNotificationSound()
    })

    const unsubscribeMicRequest = on('mic_request', (request) => {
      setMicRequests(prev => [...prev, request])

      // Alerte urgente
      playUrgentAlert()
    })

    const unsubscribeMusicAccepted = on('music_request_accepted', (data) => {
      setMusicRequests(prev => prev.filter(r => r.id !== data.requestId))
    })

    return () => {
      unsubscribeMusicRequest()
      unsubscribeMicRequest()
      unsubscribeMusicAccepted()
    }
  }, [on])

  const handleAcceptMusic = useCallback((requestId) => {
    acceptMusicRequest(requestId)
    setMusicRequests(prev => prev.filter(r => r.id !== requestId))
  }, [acceptMusicRequest])

  const handleRejectMusic = useCallback((requestId) => {
    rejectMusicRequest(requestId)
    setMusicRequests(prev => prev.filter(r => r.id !== requestId))
  }, [rejectMusicRequest])

  const handleApproveMic = useCallback((requestId) => {
    // Implémenter l'approbation micro
    setMicRequests(prev => prev.filter(r => r.id !== requestId))
  }, [])

  return {
    musicRequests,
    micRequests,
    acceptMusic: handleAcceptMusic,
    rejectMusic: handleRejectMusic,
    approveMic: handleApproveMic
  }
}

// Hook pour les photos
export const usePhotoStream = () => {
  const { on, uploadPhoto } = useWebSocket()
  const [photos, setPhotos] = useState([])
  const [newPhotoCount, setNewPhotoCount] = useState(0)

  useEffect(() => {
    const unsubscribeNewPhoto = on('new_photo', (photo) => {
      setPhotos(prev => [photo, ...prev].slice(0, 50)) // Garder max 50 photos
      setNewPhotoCount(prev => prev + 1)
    })

    return () => {
      unsubscribeNewPhoto()
    }
  }, [on])

  const resetPhotoCount = useCallback(() => {
    setNewPhotoCount(0)
  }, [])

  return {
    photos,
    newPhotoCount,
    uploadPhoto,
    resetPhotoCount
  }
}

// Fonctions utilitaires
function playNotificationSound () {
  const audio = new Audio('/sounds/notification.mp3')
  audio.play().catch(e => console.log('Audio play failed:', e))
}

function playUrgentAlert () {
  const audio = new Audio('/sounds/urgent-alert.mp3')
  audio.play().catch(e => console.log('Audio play failed:', e))
}
