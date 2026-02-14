/**
 * useStripe - Hook pour intégrer Stripe et gérer les paiements
 * Utilise le service MCP Stripe configuré
 */

import { useState, useCallback, useEffect } from 'react'
import { useAuth } from './useAuth'
import { useWebSocket } from './useWebSocket'

const MCP_STRIPE_URL = process.env.REACT_APP_MCP_STRIPE_URL || 'http://localhost:3010/mcp'

export const useStripe = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Appel générique au service MCP Stripe
  const callStripeMCP = useCallback(async (method, params = {}) => {
    try {
      const response = await fetch(MCP_STRIPE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method,
          params,
          id: Date.now()
        })
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error.message || 'Erreur Stripe')
      }

      return data.result
    } catch (err) {
      console.error('Erreur MCP Stripe:', err)
      throw err
    }
  }, [])

  // Créer un client
  const createCustomer = useCallback(async (customerData) => {
    setLoading(true)
    setError(null)

    try {
      const result = await callStripeMCP('customers.create', {
        email: customerData.email,
        name: customerData.name,
        metadata: {
          userId: user?.id,
          weddingId: customerData.weddingId
        }
      })

      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [callStripeMCP, user])

  // Créer une intention de paiement
  const createPaymentIntent = useCallback(async ({
    amount,
    currency = 'eur',
    customerId,
    description,
    metadata = {}
  }) => {
    setLoading(true)
    setError(null)

    try {
      const result = await callStripeMCP('payment_intents.create', {
        amount: Math.round(amount * 100), // Convertir en centimes
        currency,
        customer: customerId,
        description,
        metadata: {
          ...metadata,
          vendorId: user?.id,
          createdAt: new Date().toISOString()
        }
      })

      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [callStripeMCP, user])

  // Confirmer un paiement
  const confirmPayment = useCallback(async (paymentIntentId, paymentMethod) => {
    setLoading(true)
    setError(null)

    try {
      const result = await callStripeMCP('payment_intents.confirm', {
        paymentIntentId,
        paymentMethod
      })

      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [callStripeMCP])

  // Créer un produit
  const createProduct = useCallback(async ({
    name,
    description,
    images = [],
    metadata = {}
  }) => {
    setLoading(true)
    setError(null)

    try {
      const result = await callStripeMCP('products.create', {
        name,
        description,
        images,
        metadata: {
          ...metadata,
          vendorId: user?.id
        }
      })

      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [callStripeMCP, user])

  // Créer un prix
  const createPrice = useCallback(async ({
    productId,
    unitAmount,
    currency = 'eur',
    recurring = null
  }) => {
    setLoading(true)
    setError(null)

    try {
      const result = await callStripeMCP('prices.create', {
        product: productId,
        unit_amount: Math.round(unitAmount * 100),
        currency,
        recurring
      })

      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [callStripeMCP])

  // Lister les paiements
  const listPayments = useCallback(async (filters = {}) => {
    setLoading(true)
    setError(null)

    try {
      const result = await callStripeMCP('payment_intents.list', {
        limit: filters.limit || 10,
        starting_after: filters.startingAfter,
        ending_before: filters.endingBefore,
        created: filters.created
      })

      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [callStripeMCP])

  // Créer un lien de paiement
  const createPaymentLink = useCallback(async ({
    priceId,
    quantity = 1,
    metadata = {},
    successUrl,
    cancelUrl
  }) => {
    setLoading(true)
    setError(null)

    try {
      const result = await callStripeMCP('payment_links.create', {
        line_items: [{
          price: priceId,
          quantity
        }],
        metadata: {
          ...metadata,
          vendorId: user?.id
        },
        success_url: successUrl || `${window.location.origin}/payment/success`,
        cancel_url: cancelUrl || `${window.location.origin}/payment/cancel`
      })

      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [callStripeMCP, user])

  // Créer une facture
  const createInvoice = useCallback(async ({
    customerId,
    items,
    dueDate,
    description
  }) => {
    setLoading(true)
    setError(null)

    try {
      const result = await callStripeMCP('invoices.create', {
        customer: customerId,
        collection_method: 'send_invoice',
        days_until_due: 30,
        description,
        line_items: items.map(item => ({
          price: item.priceId,
          quantity: item.quantity || 1
        }))
      })

      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [callStripeMCP])

  // Envoyer une facture
  const sendInvoice = useCallback(async (invoiceId) => {
    setLoading(true)
    setError(null)

    try {
      const result = await callStripeMCP('invoices.send', { invoiceId })
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [callStripeMCP])

  // Créer un remboursement
  const createRefund = useCallback(async ({
    paymentIntentId,
    amount,
    reason
  }) => {
    setLoading(true)
    setError(null)

    try {
      const result = await callStripeMCP('refunds.create', {
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined,
        reason
      })

      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [callStripeMCP])

  // Vérifier la configuration Stripe
  const checkConfiguration = useCallback(async () => {
    try {
      const result = await callStripeMCP('config.info')
      return result
    } catch (err) {
      console.error('Erreur vérification config Stripe:', err)
      return { configured: false }
    }
  }, [callStripeMCP])

  return {
    // État
    loading,
    error,

    // Clients
    createCustomer,

    // Paiements
    createPaymentIntent,
    confirmPayment,
    listPayments,
    createPaymentLink,

    // Produits et Prix
    createProduct,
    createPrice,

    // Factures
    createInvoice,
    sendInvoice,

    // Remboursements
    createRefund,

    // Configuration
    checkConfiguration
  }
}

// Hook pour gérer les webhooks Stripe
export const useStripeWebhooks = (onPaymentSuccess, onPaymentFailed) => {
  const { on } = useWebSocket()

  useEffect(() => {
    const unsubscribeSuccess = on('stripe:payment_success', (data) => {
      console.log('Paiement réussi:', data)
      if (onPaymentSuccess) {
        onPaymentSuccess(data)
      }
    })

    const unsubscribeFailed = on('stripe:payment_failed', (data) => {
      console.log('Paiement échoué:', data)
      if (onPaymentFailed) {
        onPaymentFailed(data)
      }
    })

    return () => {
      unsubscribeSuccess()
      unsubscribeFailed()
    }
  }, [on, onPaymentSuccess, onPaymentFailed])
}
