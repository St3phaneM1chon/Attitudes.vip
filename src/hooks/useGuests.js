/**
 * Hook pour la gestion des invités avec données temps réel
 * Connecté à Supabase et WebSocket
 */

import { useState, useEffect, useCallback } from 'react'
import { useSupabase } from './useSupabase'
import { useWebSocket } from './useWebSocket'

export const useGuests = (weddingId) => {
  const { supabase } = useSupabase()
  const { socket } = useWebSocket()

  const [guests, setGuests] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    confirmed: 0,
    pending: 0,
    declined: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Charger tous les invités
  const loadGuests = useCallback(async () => {
    if (!weddingId) return

    setLoading(true)
    try {
      const { data: guestsData, error: guestsError } = await supabase
        .from('guests')
        .select(`
          *,
          guest_dietary_restrictions (
            restriction_type,
            notes
          )
        `)
        .eq('wedding_id', weddingId)
        .order('created_at', { ascending: false })

      if (guestsError) throw guestsError

      setGuests(guestsData || [])
      calculateStats(guestsData || [])
    } catch (err) {
      console.error('Error loading guests:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [weddingId, supabase])

  // Calculer les statistiques
  const calculateStats = (guestsData) => {
    const stats = guestsData.reduce((acc, guest) => {
      acc.total++
      if (guest.rsvp_status === 'confirmed') acc.confirmed++
      else if (guest.rsvp_status === 'pending') acc.pending++
      else if (guest.rsvp_status === 'declined') acc.declined++
      return acc
    }, { total: 0, confirmed: 0, pending: 0, declined: 0 })

    setStats(stats)
  }

  // Ajouter un nouvel invité
  const addGuest = async (guestData) => {
    try {
      const { data, error } = await supabase
        .from('guests')
        .insert({
          wedding_id: weddingId,
          first_name: guestData.firstName,
          last_name: guestData.lastName,
          email: guestData.email,
          phone: guestData.phone,
          guest_type: guestData.guestType || 'adult',
          rsvp_status: 'pending',
          plus_one_allowed: guestData.plusOneAllowed || false,
          dietary_restrictions: guestData.dietaryRestrictions,
          notes: guestData.notes
        })
        .select()
        .single()

      if (error) throw error

      // Mettre à jour la liste locale
      setGuests(prev => [data, ...prev])
      calculateStats([data, ...guests])

      // Envoyer notification WebSocket
      if (socket) {
        socket.emit('guest_added', {
          weddingId,
          guest: data
        })
      }

      return { success: true, data }
    } catch (err) {
      console.error('Error adding guest:', err)
      return { success: false, error: err.message }
    }
  }

  // Mettre à jour un invité
  const updateGuest = async (guestId, updates) => {
    try {
      const { data, error } = await supabase
        .from('guests')
        .update(updates)
        .eq('id', guestId)
        .eq('wedding_id', weddingId)
        .select()
        .single()

      if (error) throw error

      // Mettre à jour la liste locale
      setGuests(prev => prev.map(guest =>
        guest.id === guestId ? { ...guest, ...data } : guest
      ))

      // Recalculer stats si nécessaire
      if (updates.rsvp_status) {
        const updatedGuests = guests.map(guest =>
          guest.id === guestId ? { ...guest, ...data } : guest
        )
        calculateStats(updatedGuests)
      }

      // Notification WebSocket
      if (socket) {
        socket.emit('guest_updated', {
          weddingId,
          guestId,
          updates: data
        })
      }

      return { success: true, data }
    } catch (err) {
      console.error('Error updating guest:', err)
      return { success: false, error: err.message }
    }
  }

  // Supprimer un invité
  const deleteGuest = async (guestId) => {
    try {
      const { error } = await supabase
        .from('guests')
        .delete()
        .eq('id', guestId)
        .eq('wedding_id', weddingId)

      if (error) throw error

      // Mettre à jour la liste locale
      const updatedGuests = guests.filter(guest => guest.id !== guestId)
      setGuests(updatedGuests)
      calculateStats(updatedGuests)

      // Notification WebSocket
      if (socket) {
        socket.emit('guest_deleted', {
          weddingId,
          guestId
        })
      }

      return { success: true }
    } catch (err) {
      console.error('Error deleting guest:', err)
      return { success: false, error: err.message }
    }
  }

  // Envoyer des invitations
  const sendInvitations = async (guestIds = null) => {
    try {
      const targetGuests = guestIds
        ? guests.filter(g => guestIds.includes(g.id))
        : guests.filter(g => g.rsvp_status === 'pending')

      const { data, error } = await supabase.functions.invoke('send-invitations', {
        body: {
          weddingId,
          guests: targetGuests
        }
      })

      if (error) throw error

      // Marquer les invitations comme envoyées
      const guestIdsToUpdate = targetGuests.map(g => g.id)
      await supabase
        .from('guests')
        .update({ invitation_sent_at: new Date().toISOString() })
        .in('id', guestIdsToUpdate)
        .eq('wedding_id', weddingId)

      // Mettre à jour la liste locale
      setGuests(prev => prev.map(guest =>
        guestIdsToUpdate.includes(guest.id)
          ? { ...guest, invitation_sent_at: new Date().toISOString() }
          : guest
      ))

      return { success: true, sent: targetGuests.length }
    } catch (err) {
      console.error('Error sending invitations:', err)
      return { success: false, error: err.message }
    }
  }

  // Filtrer les invités
  const filterGuests = useCallback((searchTerm, statusFilter) => {
    return guests.filter(guest => {
      const matchesSearch = !searchTerm ||
        `${guest.first_name} ${guest.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guest.email.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = !statusFilter || guest.rsvp_status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [guests])

  // Exporter la liste des invités
  const exportGuestList = async (format = 'csv') => {
    try {
      const { data, error } = await supabase.functions.invoke('export-guests', {
        body: {
          weddingId,
          format,
          guests
        }
      })

      if (error) throw error

      // Créer un lien de téléchargement
      const blob = new Blob([data.content], { type: data.mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invites-${weddingId}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      return { success: true }
    } catch (err) {
      console.error('Error exporting guest list:', err)
      return { success: false, error: err.message }
    }
  }

  // Écouter les mises à jour temps réel via WebSocket
  useEffect(() => {
    if (!socket || !weddingId) return

    const handleGuestUpdate = (data) => {
      if (data.weddingId === weddingId) {
        loadGuests() // Recharger pour avoir les données fraîches
      }
    }

    socket.on('guest_added', handleGuestUpdate)
    socket.on('guest_updated', handleGuestUpdate)
    socket.on('guest_deleted', handleGuestUpdate)
    socket.on('rsvp_received', handleGuestUpdate)

    return () => {
      socket.off('guest_added', handleGuestUpdate)
      socket.off('guest_updated', handleGuestUpdate)
      socket.off('guest_deleted', handleGuestUpdate)
      socket.off('rsvp_received', handleGuestUpdate)
    }
  }, [socket, weddingId, loadGuests])

  // Écouter les changements via Supabase Real-time
  useEffect(() => {
    if (!weddingId) return

    const subscription = supabase
      .channel(`guests:${weddingId}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guests',
          filter: `wedding_id=eq.${weddingId}`
        },
        (payload) => {
          console.log('Real-time guest update:', payload)

          if (payload.eventType === 'INSERT') {
            setGuests(prev => [payload.new, ...prev])
            calculateStats([payload.new, ...guests])
          } else if (payload.eventType === 'UPDATE') {
            setGuests(prev => prev.map(guest =>
              guest.id === payload.new.id ? payload.new : guest
            ))
            const updatedGuests = guests.map(guest =>
              guest.id === payload.new.id ? payload.new : guest
            )
            calculateStats(updatedGuests)
          } else if (payload.eventType === 'DELETE') {
            const updatedGuests = guests.filter(guest => guest.id !== payload.old.id)
            setGuests(updatedGuests)
            calculateStats(updatedGuests)
          }
        }
      )
      .subscribe()

    return () => subscription.unsubscribe()
  }, [weddingId, supabase])

  // Charger les données au montage
  useEffect(() => {
    loadGuests()
  }, [loadGuests])

  return {
    guests,
    stats,
    loading,
    error,
    actions: {
      addGuest,
      updateGuest,
      deleteGuest,
      sendInvitations,
      filterGuests,
      exportGuestList,
      reload: loadGuests
    }
  }
}
