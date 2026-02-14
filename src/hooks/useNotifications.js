/**
 * useNotifications - Hook pour gérer les notifications
 * Intégration avec WebSocket et système de toast
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { useWebSocket } from './useWebSocket'

export const useNotifications = () => {
  const { user } = useAuth()
  const { subscribe, emit } = useWebSocket()

  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Charger les notifications initiales
  useEffect(() => {
    if (!user) return

    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/notifications', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          setNotifications(data.notifications || [])
          setUnreadCount(data.unreadCount || 0)
        }
      } catch (error) {
        console.error('Erreur chargement notifications:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [user])

  // Écouter les nouvelles notifications via WebSocket
  useEffect(() => {
    if (!user) return

    const unsubscribe = subscribe('notification:new', (notification) => {
      setNotifications(prev => [notification, ...prev])
      setUnreadCount(prev => prev + 1)

      // Afficher une notification navigateur si autorisé
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/logo.png',
          tag: notification.id
        })
      }
    })

    return unsubscribe
  }, [user, subscribe])

  // Marquer une notification comme lue
  const markAsRead = useCallback(async (notificationId) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === notificationId
              ? { ...notif, read: true }
              : notif
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Erreur marquage notification:', error)
    }
  }, [])

  // Marquer toutes comme lues
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif => ({ ...notif, read: true }))
        )
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Erreur marquage notifications:', error)
    }
  }, [])

  // Supprimer une notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        setNotifications(prev =>
          prev.filter(notif => notif.id !== notificationId)
        )

        const notification = notifications.find(n => n.id === notificationId)
        if (notification && !notification.read) {
          setUnreadCount(prev => Math.max(0, prev - 1))
        }
      }
    } catch (error) {
      console.error('Erreur suppression notification:', error)
    }
  }, [notifications])

  // Créer une notification (pour test ou actions locales)
  const createNotification = useCallback((notification) => {
    const newNotif = {
      id: Date.now().toString(),
      ...notification,
      read: false,
      createdAt: new Date().toISOString(),
      time: 'À l\'instant'
    }

    setNotifications(prev => [newNotif, ...prev])
    setUnreadCount(prev => prev + 1)

    // Émettre via WebSocket pour synchronisation
    emit('notification:create', newNotif)
  }, [emit])

  // Demander permission notifications navigateur
  const requestPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }
    return Notification.permission === 'granted'
  }, [])

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createNotification,
    requestPermission
  }
}
