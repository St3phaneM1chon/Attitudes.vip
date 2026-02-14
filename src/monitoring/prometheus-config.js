/**
 * Configuration Prometheus pour le monitoring
 * Métriques personnalisées et intégration Express
 */

const promClient = require('prom-client')
const responseTime = require('response-time')

// Créer un registre personnalisé
const register = new promClient.Registry()

// Ajouter les métriques par défaut (CPU, mémoire, etc.)
promClient.collectDefaultMetrics({
  register,
  prefix: 'attitudes_app_'
})

// Métriques personnalisées

// 1. Compteur de requêtes HTTP
const httpRequestsTotal = new promClient.Counter({
  name: 'attitudes_http_requests_total',
  help: 'Total des requêtes HTTP',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
})

// 2. Histogramme des temps de réponse
const httpRequestDuration = new promClient.Histogram({
  name: 'attitudes_http_request_duration_seconds',
  help: 'Durée des requêtes HTTP en secondes',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  registers: [register]
})

// 3. Gauge pour les utilisateurs actifs
const activeUsers = new promClient.Gauge({
  name: 'attitudes_active_users',
  help: 'Nombre d\'utilisateurs actuellement connectés',
  registers: [register]
})

// 4. Compteur d'erreurs métier
const businessErrors = new promClient.Counter({
  name: 'attitudes_business_errors_total',
  help: 'Total des erreurs métier',
  labelNames: ['type', 'code'],
  registers: [register]
})

// 5. Métriques de base de données
const dbQueryDuration = new promClient.Histogram({
  name: 'attitudes_db_query_duration_seconds',
  help: 'Durée des requêtes base de données',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register]
})

const dbConnectionPool = new promClient.Gauge({
  name: 'attitudes_db_connection_pool_size',
  help: 'Taille du pool de connexions',
  labelNames: ['state'],
  registers: [register]
})

// 6. Métriques Redis
const redisCacheHits = new promClient.Counter({
  name: 'attitudes_redis_cache_hits_total',
  help: 'Nombre de cache hits Redis',
  labelNames: ['namespace'],
  registers: [register]
})

const redisCacheMisses = new promClient.Counter({
  name: 'attitudes_redis_cache_misses_total',
  help: 'Nombre de cache misses Redis',
  labelNames: ['namespace'],
  registers: [register]
})

// 7. Métriques WebSocket
const wsConnections = new promClient.Gauge({
  name: 'attitudes_websocket_connections',
  help: 'Nombre de connexions WebSocket actives',
  registers: [register]
})

const wsMessages = new promClient.Counter({
  name: 'attitudes_websocket_messages_total',
  help: 'Total des messages WebSocket',
  labelNames: ['type', 'direction'],
  registers: [register]
})

// 8. Métriques de paiement
const paymentTransactions = new promClient.Counter({
  name: 'attitudes_payment_transactions_total',
  help: 'Total des transactions de paiement',
  labelNames: ['status', 'type', 'provider'],
  registers: [register]
})

const paymentAmount = new promClient.Histogram({
  name: 'attitudes_payment_amount_euros',
  help: 'Montant des paiements en euros',
  labelNames: ['type'],
  buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
  registers: [register]
})

// 9. Métriques métier spécifiques
const weddingsCreated = new promClient.Counter({
  name: 'attitudes_weddings_created_total',
  help: 'Nombre total de mariages créés',
  registers: [register]
})

const vendorBookings = new promClient.Counter({
  name: 'attitudes_vendor_bookings_total',
  help: 'Total des réservations vendors',
  labelNames: ['vendor_type', 'status'],
  registers: [register]
})

const guestInvitations = new promClient.Counter({
  name: 'attitudes_guest_invitations_total',
  help: 'Total des invitations envoyées',
  labelNames: ['status'],
  registers: [register]
})

// 10. Métriques de performance
const apiLatency = new promClient.Summary({
  name: 'attitudes_api_latency_seconds',
  help: 'Latence des endpoints API',
  labelNames: ['endpoint'],
  percentiles: [0.5, 0.9, 0.95, 0.99],
  registers: [register]
})

/**
 * Middleware pour collecter les métriques HTTP
 */
function prometheusMiddleware () {
  return responseTime((req, res, time) => {
    const route = req.route ? req.route.path : req.path
    const method = req.method
    const statusCode = res.statusCode

    // Incrémenter le compteur de requêtes
    httpRequestsTotal.inc({
      method,
      route,
      status_code: statusCode
    })

    // Enregistrer la durée
    httpRequestDuration.observe({
      method,
      route,
      status_code: statusCode
    }, time / 1000) // Convertir en secondes

    // Enregistrer la latence API
    if (route.startsWith('/api/')) {
      apiLatency.observe({
        endpoint: route
      }, time / 1000)
    }
  })
}

/**
 * Middleware pour les métriques de base de données
 */
function databaseMetricsMiddleware () {
  return (req, res, next) => {
    // Intercepter les requêtes DB
    if (req.db && req.db.query) {
      const originalQuery = req.db.query

      req.db.query = async function (...args) {
        const start = Date.now()
        const [sql] = args

        // Extraire l'opération et la table
        const operation = sql.trim().split(' ')[0].toUpperCase()
        const tableMatch = sql.match(/(?:FROM|INTO|UPDATE)\s+(\w+)/i)
        const table = tableMatch ? tableMatch[1] : 'unknown'

        try {
          const result = await originalQuery.apply(this, args)

          // Enregistrer la durée
          const duration = (Date.now() - start) / 1000
          dbQueryDuration.observe({
            operation,
            table
          }, duration)

          return result
        } catch (error) {
          // Enregistrer l'erreur
          businessErrors.inc({
            type: 'database',
            code: error.code || 'unknown'
          })
          throw error
        }
      }
    }

    next()
  }
}

/**
 * Instrumenter les services pour les métriques
 */
function instrumentServices (services) {
  // Instrumenter Redis
  if (services.cache) {
    const originalGet = services.cache.get
    const originalSet = services.cache.set

    services.cache.get = async function (key, namespace) {
      const result = await originalGet.apply(this, [key, namespace])

      if (result !== null) {
        redisCacheHits.inc({ namespace })
      } else {
        redisCacheMisses.inc({ namespace })
      }

      return result
    }
  }

  // Instrumenter WebSocket
  if (services.websocket) {
    services.websocket.on('connection', () => {
      wsConnections.inc()
    })

    services.websocket.on('disconnect', () => {
      wsConnections.dec()
    })

    services.websocket.on('message', (type, direction) => {
      wsMessages.inc({ type, direction })
    })
  }

  // Instrumenter Stripe
  if (services.stripe) {
    const originalCreateCheckout = services.stripe.createCheckoutSession

    services.stripe.createCheckoutSession = async function (...args) {
      try {
        const result = await originalCreateCheckout.apply(this, args)
        const [options] = args

        paymentTransactions.inc({
          status: 'initiated',
          type: options.mode || 'payment',
          provider: 'stripe'
        })

        if (options.line_items && options.line_items[0]) {
          const amount = options.line_items[0].price_data.unit_amount / 100
          paymentAmount.observe({
            type: options.mode || 'payment'
          }, amount)
        }

        return result
      } catch (error) {
        paymentTransactions.inc({
          status: 'failed',
          type: 'payment',
          provider: 'stripe'
        })
        throw error
      }
    }
  }
}

/**
 * Collecter des métriques métier périodiquement
 */
function startBusinessMetricsCollection (db) {
  // Collecter toutes les 30 secondes
  setInterval(async () => {
    try {
      // Utilisateurs actifs
      const activeUsersResult = await db.query(
        'SELECT COUNT(DISTINCT user_id) as count FROM sessions WHERE expires_at > NOW()'
      )
      activeUsers.set(activeUsersResult[0].count)

      // Pool de connexions
      const pool = db.pool
      dbConnectionPool.set({ state: 'active' }, pool.totalCount)
      dbConnectionPool.set({ state: 'idle' }, pool.idleCount)
      dbConnectionPool.set({ state: 'waiting' }, pool.waitingCount)
    } catch (error) {
      console.error('Error collecting business metrics:', error)
    }
  }, 30000)
}

/**
 * Endpoint pour exposer les métriques à Prometheus
 */
function metricsEndpoint () {
  return async (req, res) => {
    try {
      res.set('Content-Type', register.contentType)
      const metrics = await register.metrics()
      res.end(metrics)
    } catch (error) {
      res.status(500).end(error.message)
    }
  }
}

/**
 * Enregistrer des métriques métier
 */
const recordBusinessMetrics = {
  weddingCreated: () => {
    weddingsCreated.inc()
  },

  vendorBooked: (vendorType, status) => {
    vendorBookings.inc({ vendor_type: vendorType, status })
  },

  guestInvited: (status) => {
    guestInvitations.inc({ status })
  },

  paymentProcessed: (status, type, provider, amount) => {
    paymentTransactions.inc({ status, type, provider })
    if (amount && status === 'succeeded') {
      paymentAmount.observe({ type }, amount)
    }
  },

  businessError: (type, code) => {
    businessErrors.inc({ type, code })
  }
}

module.exports = {
  register,
  prometheusMiddleware,
  databaseMetricsMiddleware,
  instrumentServices,
  startBusinessMetricsCollection,
  metricsEndpoint,
  recordBusinessMetrics,

  // Exporter les métriques individuelles pour usage direct
  metrics: {
    httpRequestsTotal,
    httpRequestDuration,
    activeUsers,
    businessErrors,
    dbQueryDuration,
    dbConnectionPool,
    redisCacheHits,
    redisCacheMisses,
    wsConnections,
    wsMessages,
    paymentTransactions,
    paymentAmount,
    weddingsCreated,
    vendorBookings,
    guestInvitations,
    apiLatency
  }
}
