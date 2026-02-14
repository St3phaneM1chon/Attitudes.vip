/**
 * Hook pour la gestion des fournisseurs avec tracking des contrats et paiements
 * Intégré avec Stripe et communications temps réel
 */

import { useState, useEffect, useCallback } from 'react'
import { useSupabase } from './useSupabase'
import { useWebSocket } from './useWebSocket'

export const useVendors = (weddingId) => {
  const { supabase } = useSupabase()
  const { socket } = useWebSocket()

  const [vendors, setVendors] = useState([])
  const [contracts, setContracts] = useState([])
  const [payments, setPayments] = useState([])
  const [categories, setCategories] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    confirmed: 0,
    pending: 0,
    contracted: 0,
    totalValue: 0,
    paidAmount: 0,
    pendingAmount: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Catégories de fournisseurs par défaut
  const defaultCategories = [
    { name: 'Traiteur', icon: '🍽️', color: 'green', required: true },
    { name: 'Photographe', icon: '📸', color: 'purple', required: true },
    { name: 'DJ/Musique', icon: '🎵', color: 'blue', required: true },
    { name: 'Fleuriste', icon: '🌸', color: 'pink', required: true },
    { name: 'Location', icon: '🏛️', color: 'indigo', required: true },
    { name: 'Pâtissier', icon: '🎂', color: 'yellow', required: false },
    { name: 'Décorateur', icon: '🎨', color: 'red', required: false },
    { name: 'Transport', icon: '🚗', color: 'gray', required: false },
    { name: 'Coiffeur/Esthétique', icon: '💄', color: 'amber', required: false },
    { name: 'Wedding Planner', icon: '📋', color: 'emerald', required: false }
  ]

  // Charger tous les fournisseurs
  const loadVendors = useCallback(async () => {
    if (!weddingId) return

    setLoading(true)
    try {
      // Charger les fournisseurs avec leurs contrats et paiements
      const { data: vendorsData, error: vendorsError } = await supabase
        .from('vendors')
        .select(`
          *,
          vendor_contracts (
            id,
            contract_amount,
            contract_date,
            status,
            signed_date,
            payment_schedule,
            terms,
            document_url
          ),
          vendor_payments (
            id,
            amount,
            payment_date,
            payment_method,
            status,
            payment_type,
            stripe_payment_id
          )
        `)
        .eq('wedding_id', weddingId)
        .order('category', { ascending: true })

      if (vendorsError) throw vendorsError

      // Séparer les données
      const processedVendors = vendorsData?.map(vendor => ({
        ...vendor,
        totalContractValue: vendor.vendor_contracts?.reduce((sum, contract) =>
          sum + (contract.contract_amount || 0), 0) || 0,
        totalPaid: vendor.vendor_payments?.reduce((sum, payment) =>
          payment.status === 'completed' ? sum + payment.amount : sum, 0) || 0
      })) || []

      const allContracts = vendorsData?.flatMap(v => v.vendor_contracts || []) || []
      const allPayments = vendorsData?.flatMap(v => v.vendor_payments || []) || []

      setVendors(processedVendors)
      setContracts(allContracts)
      setPayments(allPayments)

      // Calculer les statistiques
      calculateStats(processedVendors)

      // Calculer les catégories avec compteurs
      calculateCategories(processedVendors)
    } catch (err) {
      console.error('Error loading vendors:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [weddingId, supabase])

  // Calculer les statistiques
  const calculateStats = (vendorsData) => {
    const stats = {
      total: vendorsData.length,
      confirmed: vendorsData.filter(v => v.status === 'confirmed').length,
      pending: vendorsData.filter(v => v.status === 'pending').length,
      contracted: vendorsData.filter(v => v.vendor_contracts?.some(c => c.status === 'signed')).length,
      totalValue: vendorsData.reduce((sum, v) => sum + v.totalContractValue, 0),
      paidAmount: vendorsData.reduce((sum, v) => sum + v.totalPaid, 0),
      pendingAmount: 0
    }

    stats.pendingAmount = stats.totalValue - stats.paidAmount
    setStats(stats)
  }

  // Calculer les catégories avec compteurs
  const calculateCategories = (vendorsData) => {
    const categoryStats = new Map()

    // Initialiser avec les catégories par défaut
    defaultCategories.forEach(cat => {
      categoryStats.set(cat.name, {
        ...cat,
        count: 0,
        totalValue: 0,
        vendors: []
      })
    })

    // Ajouter les données réelles
    vendorsData.forEach(vendor => {
      const categoryName = vendor.category || 'Autre'
      const category = categoryStats.get(categoryName) || {
        name: categoryName,
        icon: '🏢',
        color: 'gray',
        required: false,
        count: 0,
        totalValue: 0,
        vendors: []
      }

      category.count++
      category.totalValue += vendor.totalContractValue
      category.vendors.push(vendor)

      categoryStats.set(categoryName, category)
    })

    setCategories(Array.from(categoryStats.values()))
  }

  // Ajouter un nouveau fournisseur
  const addVendor = async (vendorData) => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .insert({
          wedding_id: weddingId,
          name: vendorData.name,
          category: vendorData.category,
          contact_person: vendorData.contactPerson,
          email: vendorData.email,
          phone: vendorData.phone,
          address: vendorData.address,
          website: vendorData.website,
          description: vendorData.description,
          estimated_cost: vendorData.estimatedCost,
          status: 'pending',
          notes: vendorData.notes
        })
        .select()
        .single()

      if (error) throw error

      // Mettre à jour l'état local
      const processedVendor = {
        ...data,
        totalContractValue: 0,
        totalPaid: 0,
        vendor_contracts: [],
        vendor_payments: []
      }

      setVendors(prev => [processedVendor, ...prev])

      // Notification WebSocket
      if (socket) {
        socket.emit('vendor_added', {
          weddingId,
          vendor: processedVendor
        })
      }

      return { success: true, data: processedVendor }
    } catch (err) {
      console.error('Error adding vendor:', err)
      return { success: false, error: err.message }
    }
  }

  // Mettre à jour un fournisseur
  const updateVendor = async (vendorId, updates) => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .update(updates)
        .eq('id', vendorId)
        .eq('wedding_id', weddingId)
        .select()
        .single()

      if (error) throw error

      // Mettre à jour l'état local
      setVendors(prev => prev.map(vendor =>
        vendor.id === vendorId ? { ...vendor, ...data } : vendor
      ))

      // Notification WebSocket
      if (socket) {
        socket.emit('vendor_updated', {
          weddingId,
          vendorId,
          updates: data
        })
      }

      return { success: true, data }
    } catch (err) {
      console.error('Error updating vendor:', err)
      return { success: false, error: err.message }
    }
  }

  // Supprimer un fournisseur
  const deleteVendor = async (vendorId) => {
    try {
      const { error } = await supabase
        .from('vendors')
        .delete()
        .eq('id', vendorId)
        .eq('wedding_id', weddingId)

      if (error) throw error

      // Mettre à jour l'état local
      setVendors(prev => prev.filter(vendor => vendor.id !== vendorId))

      // Notification WebSocket
      if (socket) {
        socket.emit('vendor_deleted', {
          weddingId,
          vendorId
        })
      }

      return { success: true }
    } catch (err) {
      console.error('Error deleting vendor:', err)
      return { success: false, error: err.message }
    }
  }

  // Créer un contrat
  const createContract = async (contractData) => {
    try {
      const { data, error } = await supabase
        .from('vendor_contracts')
        .insert({
          wedding_id: weddingId,
          vendor_id: contractData.vendorId,
          contract_amount: contractData.contractAmount,
          contract_date: contractData.contractDate || new Date().toISOString(),
          status: 'draft',
          payment_schedule: contractData.paymentSchedule,
          terms: contractData.terms,
          document_url: contractData.documentUrl
        })
        .select()
        .single()

      if (error) throw error

      // Mettre à jour l'état local
      setContracts(prev => [data, ...prev])

      // Recharger les fournisseurs pour avoir les totaux mis à jour
      await loadVendors()

      // Notification WebSocket
      if (socket) {
        socket.emit('contract_created', {
          weddingId,
          contract: data
        })
      }

      return { success: true, data }
    } catch (err) {
      console.error('Error creating contract:', err)
      return { success: false, error: err.message }
    }
  }

  // Signer un contrat
  const signContract = async (contractId) => {
    try {
      const { data, error } = await supabase
        .from('vendor_contracts')
        .update({
          status: 'signed',
          signed_date: new Date().toISOString()
        })
        .eq('id', contractId)
        .eq('wedding_id', weddingId)
        .select()
        .single()

      if (error) throw error

      // Mettre à jour l'état local
      setContracts(prev => prev.map(contract =>
        contract.id === contractId ? data : contract
      ))

      // Notification WebSocket
      if (socket) {
        socket.emit('contract_signed', {
          weddingId,
          contractId,
          contract: data
        })
      }

      return { success: true, data }
    } catch (err) {
      console.error('Error signing contract:', err)
      return { success: false, error: err.message }
    }
  }

  // Enregistrer un paiement
  const recordPayment = async (paymentData) => {
    try {
      const { data, error } = await supabase
        .from('vendor_payments')
        .insert({
          wedding_id: weddingId,
          vendor_id: paymentData.vendorId,
          amount: paymentData.amount,
          payment_method: paymentData.paymentMethod,
          payment_date: paymentData.paymentDate || new Date().toISOString(),
          payment_type: paymentData.paymentType || 'deposit',
          description: paymentData.description,
          status: 'completed'
        })
        .select()
        .single()

      if (error) throw error

      // Mettre à jour l'état local
      setPayments(prev => [data, ...prev])

      // Recharger les fournisseurs pour avoir les totaux mis à jour
      await loadVendors()

      // Notification WebSocket
      if (socket) {
        socket.emit('vendor_payment_recorded', {
          weddingId,
          payment: data
        })
      }

      return { success: true, data }
    } catch (err) {
      console.error('Error recording payment:', err)
      return { success: false, error: err.message }
    }
  }

  // Initier un paiement Stripe
  const initiateStripePayment = async (paymentData) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-vendor-payment', {
        body: {
          weddingId,
          vendorId: paymentData.vendorId,
          amount: paymentData.amount,
          description: paymentData.description,
          paymentType: paymentData.paymentType
        }
      })

      if (error) throw error

      return { success: true, data }
    } catch (err) {
      console.error('Error initiating Stripe payment:', err)
      return { success: false, error: err.message }
    }
  }

  // Envoyer une communication
  const sendCommunication = async (communicationData) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-vendor-communication', {
        body: {
          weddingId,
          vendorId: communicationData.vendorId,
          type: communicationData.type, // 'email', 'sms', 'call'
          subject: communicationData.subject,
          message: communicationData.message,
          urgent: communicationData.urgent || false
        }
      })

      if (error) throw error

      // Notification WebSocket
      if (socket) {
        socket.emit('vendor_communication_sent', {
          weddingId,
          vendorId: communicationData.vendorId,
          type: communicationData.type
        })
      }

      return { success: true, data }
    } catch (err) {
      console.error('Error sending communication:', err)
      return { success: false, error: err.message }
    }
  }

  // Filtrer les fournisseurs
  const filterVendors = useCallback((filters) => {
    return vendors.filter(vendor => {
      const matchesCategory = !filters.category || vendor.category === filters.category
      const matchesStatus = !filters.status || vendor.status === filters.status
      const matchesSearch = !filters.search ||
        vendor.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        vendor.contact_person?.toLowerCase().includes(filters.search.toLowerCase()) ||
        vendor.email?.toLowerCase().includes(filters.search.toLowerCase())

      return matchesCategory && matchesStatus && matchesSearch
    })
  }, [vendors])

  // Obtenir les fournisseurs manquants (catégories requises sans fournisseur)
  const getMissingVendors = useCallback(() => {
    return defaultCategories
      .filter(cat => cat.required)
      .filter(cat => !vendors.some(vendor => vendor.category === cat.name))
      .map(cat => ({
        ...cat,
        action: 'add_vendor'
      }))
  }, [vendors])

  // Obtenir les alertes fournisseurs
  const getVendorAlerts = useCallback(() => {
    const alerts = []

    // Fournisseurs sans contrat
    const vendorsWithoutContract = vendors.filter(vendor =>
      vendor.status === 'confirmed' &&
      (!vendor.vendor_contracts || vendor.vendor_contracts.length === 0)
    )

    if (vendorsWithoutContract.length > 0) {
      alerts.push({
        type: 'warning',
        title: 'Contrats manquants',
        message: `${vendorsWithoutContract.length} fournisseur(s) confirmé(s) sans contrat`,
        vendors: vendorsWithoutContract
      })
    }

    // Paiements en retard
    const overduePayments = payments.filter(payment => {
      if (payment.status !== 'pending') return false
      const dueDate = new Date(payment.due_date)
      return dueDate < new Date()
    })

    if (overduePayments.length > 0) {
      alerts.push({
        type: 'error',
        title: 'Paiements en retard',
        message: `${overduePayments.length} paiement(s) en retard`,
        payments: overduePayments
      })
    }

    // Fournisseurs manquants
    const missingVendors = getMissingVendors()
    if (missingVendors.length > 0) {
      alerts.push({
        type: 'info',
        title: 'Fournisseurs manquants',
        message: `${missingVendors.length} catégorie(s) de fournisseurs manquante(s)`,
        missing: missingVendors
      })
    }

    return alerts
  }, [vendors, payments, getMissingVendors])

  // Exporter la liste des fournisseurs
  const exportVendorList = async (format = 'pdf') => {
    try {
      const { data, error } = await supabase.functions.invoke('export-vendors', {
        body: {
          weddingId,
          format,
          vendors,
          contracts,
          payments,
          stats
        }
      })

      if (error) throw error

      // Créer un lien de téléchargement
      const blob = new Blob([data.content], { type: data.mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fournisseurs-${weddingId}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      return { success: true }
    } catch (err) {
      console.error('Error exporting vendor list:', err)
      return { success: false, error: err.message }
    }
  }

  // Écouter les mises à jour temps réel via WebSocket
  useEffect(() => {
    if (!socket || !weddingId) return

    const handleVendorUpdate = (data) => {
      if (data.weddingId === weddingId) {
        loadVendors() // Recharger pour avoir les données fraîches
      }
    }

    socket.on('vendor_added', handleVendorUpdate)
    socket.on('vendor_updated', handleVendorUpdate)
    socket.on('vendor_deleted', handleVendorUpdate)
    socket.on('contract_created', handleVendorUpdate)
    socket.on('contract_signed', handleVendorUpdate)
    socket.on('vendor_payment_recorded', handleVendorUpdate)

    return () => {
      socket.off('vendor_added', handleVendorUpdate)
      socket.off('vendor_updated', handleVendorUpdate)
      socket.off('vendor_deleted', handleVendorUpdate)
      socket.off('contract_created', handleVendorUpdate)
      socket.off('contract_signed', handleVendorUpdate)
      socket.off('vendor_payment_recorded', handleVendorUpdate)
    }
  }, [socket, weddingId, loadVendors])

  // Écouter les changements via Supabase Real-time
  useEffect(() => {
    if (!weddingId) return

    const vendorsSubscription = supabase
      .channel(`vendors:${weddingId}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vendors',
          filter: `wedding_id=eq.${weddingId}`
        },
        () => {
          loadVendors() // Recharger toutes les données
        }
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vendor_contracts',
          filter: `wedding_id=eq.${weddingId}`
        },
        () => {
          loadVendors() // Recharger toutes les données
        }
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vendor_payments',
          filter: `wedding_id=eq.${weddingId}`
        },
        () => {
          loadVendors() // Recharger toutes les données
        }
      )
      .subscribe()

    return () => vendorsSubscription.unsubscribe()
  }, [weddingId, supabase, loadVendors])

  // Charger les données au montage
  useEffect(() => {
    loadVendors()
  }, [loadVendors])

  return {
    vendors,
    contracts,
    payments,
    categories,
    stats,
    loading,
    error,
    alerts: getVendorAlerts(),
    missingVendors: getMissingVendors(),
    actions: {
      addVendor,
      updateVendor,
      deleteVendor,
      createContract,
      signContract,
      recordPayment,
      initiateStripePayment,
      sendCommunication,
      filterVendors,
      exportVendorList,
      reload: loadVendors
    }
  }
}
