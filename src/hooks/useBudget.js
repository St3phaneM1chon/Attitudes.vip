/**
 * Hook pour la gestion du budget avec données temps réel
 * Intégré avec Stripe et tracking des paiements
 */

import { useState, useEffect, useCallback } from 'react'
import { useSupabase } from './useSupabase'
import { useWebSocket } from './useWebSocket'

export const useBudget = (weddingId) => {
  const { supabase } = useSupabase()
  const { socket } = useWebSocket()

  const [budgetItems, setBudgetItems] = useState([])
  const [categories, setCategories] = useState([])
  const [transactions, setTransactions] = useState([])
  const [overview, setOverview] = useState({
    total: 0,
    spent: 0,
    remaining: 0,
    percentageSpent: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Catégories par défaut pour un mariage
  const defaultCategories = [
    { name: 'Réception', color: 'blue', icon: '🏛️', priority: 1 },
    { name: 'Traiteur', color: 'green', icon: '🍽️', priority: 2 },
    { name: 'Décoration', color: 'purple', icon: '💐', priority: 3 },
    { name: 'Musique/DJ', color: 'yellow', icon: '🎵', priority: 4 },
    { name: 'Photographie', color: 'pink', icon: '📸', priority: 5 },
    { name: 'Vêtements', color: 'indigo', icon: '👗', priority: 6 },
    { name: 'Transport', color: 'red', icon: '🚗', priority: 7 },
    { name: 'Fleurs', color: 'emerald', icon: '🌸', priority: 8 },
    { name: 'Alliances', color: 'amber', icon: '💍', priority: 9 },
    { name: 'Divers', color: 'gray', icon: '📋', priority: 10 }
  ]

  // Charger le budget complet
  const loadBudget = useCallback(async () => {
    if (!weddingId) return

    setLoading(true)
    try {
      // Charger les éléments du budget
      const { data: budgetData, error: budgetError } = await supabase
        .from('budget_items')
        .select(`
          *,
          budget_payments (
            id,
            amount,
            payment_date,
            payment_method,
            status,
            stripe_payment_id
          )
        `)
        .eq('wedding_id', weddingId)
        .order('category', { ascending: true })

      if (budgetError) throw budgetError

      // Charger les transactions récentes
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('budget_payments')
        .select(`
          *,
          budget_items (
            name,
            category
          )
        `)
        .eq('wedding_id', weddingId)
        .order('payment_date', { ascending: false })
        .limit(10)

      if (transactionsError) throw transactionsError

      setBudgetItems(budgetData || [])
      setTransactions(transactionsData || [])

      // Calculer les catégories avec totaux
      const categoriesWithTotals = calculateCategoriesStats(budgetData || [])
      setCategories(categoriesWithTotals)

      // Calculer l'aperçu général
      calculateOverview(budgetData || [])
    } catch (err) {
      console.error('Error loading budget:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [weddingId, supabase])

  // Calculer les statistiques par catégorie
  const calculateCategoriesStats = (budgetData) => {
    const categoryStats = new Map()

    // Initialiser avec les catégories par défaut
    defaultCategories.forEach(cat => {
      categoryStats.set(cat.name, {
        ...cat,
        budgeted: 0,
        spent: 0,
        remaining: 0,
        items: []
      })
    })

    // Ajouter les données réelles
    budgetData.forEach(item => {
      const categoryName = item.category || 'Divers'
      const category = categoryStats.get(categoryName) || {
        name: categoryName,
        color: 'gray',
        icon: '📋',
        budgeted: 0,
        spent: 0,
        remaining: 0,
        items: []
      }

      const totalPaid = item.budget_payments?.reduce((sum, payment) =>
        payment.status === 'completed' ? sum + payment.amount : sum, 0) || 0

      category.budgeted += item.estimated_cost
      category.spent += totalPaid
      category.remaining = category.budgeted - category.spent
      category.items.push({
        ...item,
        totalPaid
      })

      categoryStats.set(categoryName, category)
    })

    return Array.from(categoryStats.values())
      .filter(cat => cat.budgeted > 0 || cat.items.length > 0)
      .sort((a, b) => (a.priority || 999) - (b.priority || 999))
  }

  // Calculer l'aperçu général
  const calculateOverview = (budgetData) => {
    const total = budgetData.reduce((sum, item) => sum + item.estimated_cost, 0)
    const spent = budgetData.reduce((sum, item) => {
      const totalPaid = item.budget_payments?.reduce((paySum, payment) =>
        payment.status === 'completed' ? paySum + payment.amount : paySum, 0) || 0
      return sum + totalPaid
    }, 0)

    const remaining = total - spent
    const percentageSpent = total > 0 ? (spent / total) * 100 : 0

    setOverview({
      total,
      spent,
      remaining,
      percentageSpent
    })
  }

  // Ajouter un élément de budget
  const addBudgetItem = async (itemData) => {
    try {
      const { data, error } = await supabase
        .from('budget_items')
        .insert({
          wedding_id: weddingId,
          name: itemData.name,
          category: itemData.category,
          estimated_cost: itemData.estimatedCost,
          vendor_name: itemData.vendorName,
          description: itemData.description,
          due_date: itemData.dueDate,
          priority: itemData.priority || 'medium'
        })
        .select()
        .single()

      if (error) throw error

      // Mettre à jour l'état local
      setBudgetItems(prev => [...prev, data])

      // Notification WebSocket
      if (socket) {
        socket.emit('budget_item_added', {
          weddingId,
          item: data
        })
      }

      return { success: true, data }
    } catch (err) {
      console.error('Error adding budget item:', err)
      return { success: false, error: err.message }
    }
  }

  // Mettre à jour un élément de budget
  const updateBudgetItem = async (itemId, updates) => {
    try {
      const { data, error } = await supabase
        .from('budget_items')
        .update(updates)
        .eq('id', itemId)
        .eq('wedding_id', weddingId)
        .select()
        .single()

      if (error) throw error

      // Mettre à jour l'état local
      setBudgetItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, ...data } : item
      ))

      // Notification WebSocket
      if (socket) {
        socket.emit('budget_item_updated', {
          weddingId,
          itemId,
          updates: data
        })
      }

      return { success: true, data }
    } catch (err) {
      console.error('Error updating budget item:', err)
      return { success: false, error: err.message }
    }
  }

  // Supprimer un élément de budget
  const deleteBudgetItem = async (itemId) => {
    try {
      const { error } = await supabase
        .from('budget_items')
        .delete()
        .eq('id', itemId)
        .eq('wedding_id', weddingId)

      if (error) throw error

      // Mettre à jour l'état local
      setBudgetItems(prev => prev.filter(item => item.id !== itemId))

      // Notification WebSocket
      if (socket) {
        socket.emit('budget_item_deleted', {
          weddingId,
          itemId
        })
      }

      return { success: true }
    } catch (err) {
      console.error('Error deleting budget item:', err)
      return { success: false, error: err.message }
    }
  }

  // Enregistrer un paiement
  const recordPayment = async (paymentData) => {
    try {
      const { data, error } = await supabase
        .from('budget_payments')
        .insert({
          wedding_id: weddingId,
          budget_item_id: paymentData.budgetItemId,
          amount: paymentData.amount,
          payment_method: paymentData.paymentMethod,
          payment_date: paymentData.paymentDate || new Date().toISOString(),
          description: paymentData.description,
          status: 'completed'
        })
        .select()
        .single()

      if (error) throw error

      // Recharger les données pour avoir les totaux mis à jour
      await loadBudget()

      // Notification WebSocket
      if (socket) {
        socket.emit('payment_recorded', {
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
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          weddingId,
          budgetItemId: paymentData.budgetItemId,
          amount: paymentData.amount,
          description: paymentData.description,
          vendorEmail: paymentData.vendorEmail
        }
      })

      if (error) throw error

      return { success: true, data }
    } catch (err) {
      console.error('Error initiating Stripe payment:', err)
      return { success: false, error: err.message }
    }
  }

  // Obtenir les alertes budget
  const getBudgetAlerts = useCallback(() => {
    const alerts = []

    categories.forEach(category => {
      const spentPercentage = category.budgeted > 0 ? (category.spent / category.budgeted) * 100 : 0

      if (spentPercentage > 100) {
        alerts.push({
          type: 'error',
          category: category.name,
          message: `Budget dépassé de ${(spentPercentage - 100).toFixed(1)}%`,
          amount: category.spent - category.budgeted
        })
      } else if (spentPercentage > 90) {
        alerts.push({
          type: 'warning',
          category: category.name,
          message: `Budget presque épuisé (${spentPercentage.toFixed(1)}%)`,
          amount: category.remaining
        })
      }
    })

    // Alerte budget global
    if (overview.percentageSpent > 100) {
      alerts.unshift({
        type: 'error',
        category: 'Budget Global',
        message: `Budget total dépassé de ${(overview.percentageSpent - 100).toFixed(1)}%`,
        amount: overview.spent - overview.total
      })
    } else if (overview.percentageSpent > 90) {
      alerts.unshift({
        type: 'warning',
        category: 'Budget Global',
        message: `Budget global presque épuisé (${overview.percentageSpent.toFixed(1)}%)`,
        amount: overview.remaining
      })
    }

    return alerts
  }, [categories, overview])

  // Exporter le rapport budget
  const exportBudgetReport = async (format = 'pdf') => {
    try {
      const { data, error } = await supabase.functions.invoke('export-budget', {
        body: {
          weddingId,
          format,
          budgetItems,
          categories,
          overview,
          transactions
        }
      })

      if (error) throw error

      // Créer un lien de téléchargement
      const blob = new Blob([data.content], { type: data.mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `budget-${weddingId}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      return { success: true }
    } catch (err) {
      console.error('Error exporting budget report:', err)
      return { success: false, error: err.message }
    }
  }

  // Écouter les mises à jour temps réel via WebSocket
  useEffect(() => {
    if (!socket || !weddingId) return

    const handleBudgetUpdate = (data) => {
      if (data.weddingId === weddingId) {
        loadBudget() // Recharger pour avoir les données fraîches
      }
    }

    socket.on('budget_item_added', handleBudgetUpdate)
    socket.on('budget_item_updated', handleBudgetUpdate)
    socket.on('budget_item_deleted', handleBudgetUpdate)
    socket.on('payment_recorded', handleBudgetUpdate)
    socket.on('payment_completed', handleBudgetUpdate)

    return () => {
      socket.off('budget_item_added', handleBudgetUpdate)
      socket.off('budget_item_updated', handleBudgetUpdate)
      socket.off('budget_item_deleted', handleBudgetUpdate)
      socket.off('payment_recorded', handleBudgetUpdate)
      socket.off('payment_completed', handleBudgetUpdate)
    }
  }, [socket, weddingId, loadBudget])

  // Écouter les changements via Supabase Real-time
  useEffect(() => {
    if (!weddingId) return

    const budgetSubscription = supabase
      .channel(`budget:${weddingId}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'budget_items',
          filter: `wedding_id=eq.${weddingId}`
        },
        () => {
          loadBudget() // Recharger toutes les données
        }
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'budget_payments',
          filter: `wedding_id=eq.${weddingId}`
        },
        () => {
          loadBudget() // Recharger toutes les données
        }
      )
      .subscribe()

    return () => budgetSubscription.unsubscribe()
  }, [weddingId, supabase, loadBudget])

  // Charger les données au montage
  useEffect(() => {
    loadBudget()
  }, [loadBudget])

  return {
    budgetItems,
    categories,
    transactions,
    overview,
    loading,
    error,
    alerts: getBudgetAlerts(),
    actions: {
      addBudgetItem,
      updateBudgetItem,
      deleteBudgetItem,
      recordPayment,
      initiateStripePayment,
      exportBudgetReport,
      reload: loadBudget
    }
  }
}
