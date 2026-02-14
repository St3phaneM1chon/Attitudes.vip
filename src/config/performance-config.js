/**
 * Configuration des optimisations de performance
 * Intègre cache Redis, monitoring et optimisation des requêtes
 */

const { getRedisCacheService } = require('../services/cache/redis-cache-service')
const { getQueryOptimizer } = require('../services/database/query-optimizer')
const { getPerformanceMonitoring } = require('../middleware/performance-monitoring')

// Initialiser les services de performance
const cache = getRedisCacheService()
const queryOptimizer = getQueryOptimizer()
const performanceMonitoring = getPerformanceMonitoring()

/**
 * Configurer Express avec les optimisations
 */
function configurePerformanceOptimizations (app) {
  // 1. Compression des réponses
  app.use(performanceMonitoring.compressionMiddleware())

  // 2. Cache HTTP intelligent
  app.use(performanceMonitoring.httpCacheMiddleware())

  // 3. Rate limiting
  app.use('/api/', performanceMonitoring.rateLimitMiddleware())

  // 4. Monitoring des performances
  app.use(performanceMonitoring.requestTracker())

  // 5. Health check endpoint
  app.use(performanceMonitoring.healthCheckMiddleware())

  // 6. Servir les assets statiques avec cache long
  const express = require('express')
  app.use('/static', express.static('public', {
    maxAge: '1y',
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
      if (path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache')
      }
    }
  }))

  // 7. Body parser avec limite
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))

  console.log('✅ Performance optimizations configured')
}

/**
 * Stratégies de cache pour différents types de données
 */
const cacheStrategies = {
  // Cache utilisateur - 1 heure
  user: {
    ttl: 3600,
    namespace: 'users',
    tags: ['user'],
    invalidateOn: ['update', 'delete']
  },

  // Cache wedding - 30 minutes
  wedding: {
    ttl: 1800,
    namespace: 'weddings',
    tags: ['wedding'],
    invalidateOn: ['update', 'delete', 'vendor_change']
  },

  // Cache vendor - 1 heure
  vendor: {
    ttl: 3600,
    namespace: 'vendors',
    tags: ['vendor'],
    invalidateOn: ['update', 'delete', 'review_add']
  },

  // Cache analytics - 5 minutes
  analytics: {
    ttl: 300,
    namespace: 'analytics',
    tags: ['analytics'],
    invalidateOn: ['data_update']
  },

  // Cache session - 24 heures
  session: {
    ttl: 86400,
    namespace: 'sessions',
    tags: ['session'],
    invalidateOn: ['logout']
  }
}

/**
 * Wrapper pour les routes avec cache automatique
 */
function withCache (strategy, keyGenerator) {
  return (req, res, next) => {
    req.cache = {
      strategy: cacheStrategies[strategy],
      key: keyGenerator(req),

      get: async () => {
        const { namespace, ttl } = req.cache.strategy
        return cache.get(req.cache.key, namespace)
      },

      set: async (data) => {
        const { namespace, ttl, tags } = req.cache.strategy
        return cache.setWithTags(req.cache.key, data, tags, namespace, ttl)
      },

      invalidate: async () => {
        const { namespace } = req.cache.strategy
        return cache.invalidate(req.cache.key, namespace)
      }
    }

    next()
  }
}

/**
 * Wrapper pour les requêtes DB optimisées
 */
function withOptimizedQuery () {
  return (req, res, next) => {
    req.db = {
      query: (sql, params, options) => queryOptimizer.query(sql, params, options),
      transaction: (callback) => queryOptimizer.transaction(callback),
      batchInsert: (table, records) => queryOptimizer.batchInsert(table, records),
      update: (table, id, updates, tags) => queryOptimizer.update(table, id, updates, tags)
    }

    next()
  }
}

/**
 * Endpoints de monitoring
 */
function setupMonitoringEndpoints (app) {
  // Métriques de performance
  app.get('/api/metrics/performance', async (req, res) => {
    const metrics = performanceMonitoring.getMetrics()
    const cacheStats = cache.getStats()

    res.json({
      performance: metrics,
      cache: cacheStats,
      timestamp: new Date().toISOString()
    })
  })

  // Métriques de cache
  app.get('/api/metrics/cache', async (req, res) => {
    const stats = cache.getStats()
    const health = await cache.healthCheck()

    res.json({
      stats,
      health,
      timestamp: new Date().toISOString()
    })
  })

  // Reset des métriques (admin only)
  app.post('/api/metrics/reset', async (req, res) => {
    // Vérifier les permissions admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' })
    }

    performanceMonitoring.resetMetrics()
    cache.resetStats()

    res.json({ message: 'Metrics reset successfully' })
  })
}

/**
 * Préchauffer le cache au démarrage
 */
async function warmupCache () {
  console.log('🔥 Warming up cache...')

  try {
    // Charger les données fréquemment accédées
    const warmupData = [
      // Vendors populaires
      {
        key: 'vendors:popular',
        value: await queryOptimizer.query(
          'SELECT * FROM vendors WHERE rating >= 4.5 ORDER BY review_count DESC LIMIT 20'
        ),
        ttl: 3600
      },
      // Catégories de vendors
      {
        key: 'vendors:categories',
        value: await queryOptimizer.query(
          'SELECT DISTINCT type, COUNT(*) as count FROM vendors GROUP BY type'
        ),
        ttl: 7200
      },
      // Statistiques globales
      {
        key: 'stats:global',
        value: await queryOptimizer.query(
          `SELECT 
            (SELECT COUNT(*) FROM users) as total_users,
            (SELECT COUNT(*) FROM weddings) as total_weddings,
            (SELECT COUNT(*) FROM vendors) as total_vendors`
        ),
        ttl: 1800
      }
    ]

    await cache.warmCache(warmupData, 'analytics')
    console.log('✅ Cache warmed up successfully')
  } catch (error) {
    console.error('❌ Cache warmup failed:', error)
  }
}

/**
 * Optimisations spécifiques pour les dashboards
 */
const dashboardOptimizations = {
  // Précharger les données du dashboard
  preloadDashboard: async (userId, role) => {
    const cacheKey = `dashboard:${role}:${userId}`

    // Vérifier le cache
    const cached = await cache.get(cacheKey, 'dashboards')
    if (cached) return cached

    // Charger les données en parallèle
    const [stats, recentActivity, notifications] = await Promise.all([
      queryOptimizer.getDashboardStats(userId, role),
      queryOptimizer.query(
        'SELECT * FROM activities WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
        [userId],
        { cacheKey: `activities:${userId}` }
      ),
      queryOptimizer.query(
        'SELECT * FROM notifications WHERE user_id = $1 AND read = false',
        [userId],
        { cacheKey: `notifications:${userId}` }
      )
    ])

    const dashboardData = { stats, recentActivity, notifications }

    // Mettre en cache
    await cache.set(cacheKey, dashboardData, 'dashboards', 600)

    return dashboardData
  },

  // Invalider le cache du dashboard
  invalidateDashboard: async (userId, role) => {
    await cache.invalidate(`dashboard:${role}:${userId}`, 'dashboards')
    await cache.invalidate(`activities:${userId}`, 'queries')
    await cache.invalidate(`notifications:${userId}`, 'queries')
  }
}

module.exports = {
  configurePerformanceOptimizations,
  cacheStrategies,
  withCache,
  withOptimizedQuery,
  setupMonitoringEndpoints,
  warmupCache,
  dashboardOptimizations,

  // Export des services pour utilisation directe
  cache,
  queryOptimizer,
  performanceMonitoring
}
