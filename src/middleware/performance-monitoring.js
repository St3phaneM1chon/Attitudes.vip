/**
 * Middleware de monitoring des performances
 * Trace et optimise les performances de l'application
 */

const { getRedisCacheService } = require('../services/cache/redis-cache-service')

class PerformanceMonitoring {
  constructor () {
    this.cache = getRedisCacheService()
    this.metrics = {
      requests: new Map(),
      slowQueries: [],
      errorRates: new Map(),
      responseTime: []
    }

    // Seuils de performance
    this.thresholds = {
      slowRequest: 1000, // 1 seconde
      slowQuery: 500, // 500ms
      highErrorRate: 0.05, // 5%
      memoryLimit: 500 * 1024 * 1024 // 500MB
    }
  }

  /**
   * Middleware Express pour tracker les requêtes
   */
  requestTracker () {
    return (req, res, next) => {
      const start = Date.now()
      const requestId = this.generateRequestId()

      // Attacher l'ID de requête
      req.requestId = requestId

      // Capturer les métriques de requête
      const metrics = {
        method: req.method,
        path: req.path,
        userAgent: req.get('user-agent'),
        ip: req.ip,
        startTime: start,
        startMemory: process.memoryUsage()
      }

      this.metrics.requests.set(requestId, metrics)

      // Intercepter la fin de la requête
      const originalEnd = res.end
      res.end = (...args) => {
        const duration = Date.now() - start
        const endMemory = process.memoryUsage()

        // Mettre à jour les métriques
        metrics.duration = duration
        metrics.statusCode = res.statusCode
        metrics.memoryDelta = {
          heapUsed: endMemory.heapUsed - metrics.startMemory.heapUsed,
          external: endMemory.external - metrics.startMemory.external
        }

        // Tracker les requêtes lentes
        if (duration > this.thresholds.slowRequest) {
          this.logSlowRequest(metrics)
        }

        // Enregistrer les métriques
        this.recordMetrics(metrics)

        // Nettoyer après 1 minute
        setTimeout(() => {
          this.metrics.requests.delete(requestId)
        }, 60000)

        // Appeler la méthode originale
        originalEnd.apply(res, args)
      }

      next()
    }
  }

  /**
   * Middleware pour compression des réponses
   */
  compressionMiddleware () {
    const compression = require('compression')

    return compression({
      filter: (req, res) => {
        // Ne pas compresser les petites réponses
        if (req.headers['x-no-compression']) {
          return false
        }

        return compression.filter(req, res)
      },
      threshold: 1024, // Seulement si > 1KB
      level: 6 // Niveau de compression équilibré
    })
  }

  /**
   * Middleware de cache HTTP
   */
  httpCacheMiddleware () {
    return (req, res, next) => {
      // Skip pour les méthodes non-GET
      if (req.method !== 'GET') {
        return next()
      }

      // Définir les headers de cache selon le type de contenu
      res.setHeader('Cache-Control', 'private, max-age=300') // 5 minutes par défaut

      // Assets statiques - cache long terme
      if (req.path.match(/\.(js|css|jpg|png|gif|ico|svg|woff|woff2)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable') // 1 an
      }

      // API - cache court terme ou pas de cache
      if (req.path.startsWith('/api/')) {
        if (req.path.includes('/static/') || req.path.includes('/public/')) {
          res.setHeader('Cache-Control', 'public, max-age=3600') // 1 heure
        } else {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
        }
      }

      // ETag pour validation conditionnelle
      const originalSend = res.send
      res.send = function (body) {
        if (typeof body === 'string' || Buffer.isBuffer(body)) {
          const etag = require('crypto')
            .createHash('md5')
            .update(body)
            .digest('hex')

          res.setHeader('ETag', `"${etag}"`)

          // Check If-None-Match
          if (req.headers['if-none-match'] === `"${etag}"`) {
            res.status(304).end()
            return
          }
        }

        originalSend.call(this, body)
      }

      next()
    }
  }

  /**
   * Rate limiting intelligent
   */
  rateLimitMiddleware () {
    const limits = new Map()

    return (req, res, next) => {
      const key = `${req.ip}:${req.path}`
      const now = Date.now()

      // Configuration par endpoint
      const limitConfig = this.getRateLimitConfig(req.path)

      if (!limits.has(key)) {
        limits.set(key, {
          count: 1,
          firstRequest: now,
          lastRequest: now
        })
        return next()
      }

      const userData = limits.get(key)
      const timeWindow = now - userData.firstRequest

      // Reset si fenêtre expirée
      if (timeWindow > limitConfig.window) {
        userData.count = 1
        userData.firstRequest = now
        userData.lastRequest = now
        return next()
      }

      // Vérifier la limite
      if (userData.count >= limitConfig.limit) {
        const retryAfter = Math.ceil((limitConfig.window - timeWindow) / 1000)

        res.setHeader('X-RateLimit-Limit', limitConfig.limit)
        res.setHeader('X-RateLimit-Remaining', 0)
        res.setHeader('X-RateLimit-Reset', userData.firstRequest + limitConfig.window)
        res.setHeader('Retry-After', retryAfter)

        return res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`
        })
      }

      // Incrémenter et continuer
      userData.count++
      userData.lastRequest = now

      res.setHeader('X-RateLimit-Limit', limitConfig.limit)
      res.setHeader('X-RateLimit-Remaining', limitConfig.limit - userData.count)
      res.setHeader('X-RateLimit-Reset', userData.firstRequest + limitConfig.window)

      next()
    }
  }

  /**
   * Configuration rate limit par endpoint
   */
  getRateLimitConfig (path) {
    // Configuration spécifique par endpoint
    const configs = {
      '/api/auth/login': { limit: 5, window: 900000 }, // 5 requêtes / 15 min
      '/api/auth/register': { limit: 3, window: 3600000 }, // 3 requêtes / heure
      '/api/payments': { limit: 10, window: 60000 }, // 10 requêtes / minute
      '/api/search': { limit: 30, window: 60000 }, // 30 requêtes / minute
      default: { limit: 100, window: 900000 } // 100 requêtes / 15 min
    }

    // Trouver la config la plus spécifique
    for (const [pattern, config] of Object.entries(configs)) {
      if (path.startsWith(pattern)) {
        return config
      }
    }

    return configs.default
  }

  /**
   * Monitoring de la santé de l'application
   */
  healthCheckMiddleware () {
    return async (req, res, next) => {
      if (req.path !== '/health') {
        return next()
      }

      const health = await this.getHealthStatus()
      const statusCode = health.status === 'healthy' ? 200 : 503

      res.status(statusCode).json(health)
    }
  }

  /**
   * Obtenir le statut de santé
   */
  async getHealthStatus () {
    const memoryUsage = process.memoryUsage()
    const uptime = process.uptime()

    // Vérifier Redis
    const redisHealth = await this.cache.healthCheck()

    // Calculer les métriques
    const avgResponseTime = this.calculateAverageResponseTime()
    const errorRate = this.calculateErrorRate()

    const status =
      memoryUsage.heapUsed < this.thresholds.memoryLimit &&
      redisHealth.status === 'healthy' &&
      errorRate < this.thresholds.highErrorRate
        ? 'healthy'
        : 'degraded'

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime),
      memory: {
        used: Math.floor(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
        limit: Math.floor(this.thresholds.memoryLimit / 1024 / 1024) + 'MB',
        percentage: ((memoryUsage.heapUsed / this.thresholds.memoryLimit) * 100).toFixed(2) + '%'
      },
      performance: {
        avgResponseTime: avgResponseTime + 'ms',
        errorRate: (errorRate * 100).toFixed(2) + '%',
        slowRequests: this.metrics.slowQueries.length
      },
      services: {
        redis: redisHealth.status,
        database: 'healthy' // À implémenter
      }
    }
  }

  /**
   * Logger les requêtes lentes
   */
  logSlowRequest (metrics) {
    console.warn('Slow request detected:', {
      method: metrics.method,
      path: metrics.path,
      duration: metrics.duration + 'ms',
      statusCode: metrics.statusCode
    })

    // Ajouter aux métriques
    this.metrics.slowQueries.push({
      ...metrics,
      timestamp: new Date().toISOString()
    })

    // Garder seulement les 100 dernières
    if (this.metrics.slowQueries.length > 100) {
      this.metrics.slowQueries.shift()
    }
  }

  /**
   * Enregistrer les métriques
   */
  async recordMetrics (metrics) {
    // Ajouter au temps de réponse
    this.metrics.responseTime.push(metrics.duration)

    // Garder seulement les 1000 dernières
    if (this.metrics.responseTime.length > 1000) {
      this.metrics.responseTime.shift()
    }

    // Tracker les erreurs
    if (metrics.statusCode >= 400) {
      const hour = new Date().getHours()
      const errorCount = this.metrics.errorRates.get(hour) || 0
      this.metrics.errorRates.set(hour, errorCount + 1)
    }

    // Envoyer les métriques au cache pour aggregation
    await this.cache.set(
      `metrics:${metrics.requestId}`,
      metrics,
      'analytics',
      300 // 5 minutes
    )
  }

  /**
   * Calculer le temps de réponse moyen
   */
  calculateAverageResponseTime () {
    if (this.metrics.responseTime.length === 0) {
      return 0
    }

    const sum = this.metrics.responseTime.reduce((a, b) => a + b, 0)
    return Math.floor(sum / this.metrics.responseTime.length)
  }

  /**
   * Calculer le taux d'erreur
   */
  calculateErrorRate () {
    const totalRequests = this.metrics.requests.size
    if (totalRequests === 0) {
      return 0
    }

    let errorCount = 0
    for (const [, metrics] of this.metrics.requests) {
      if (metrics.statusCode >= 400) {
        errorCount++
      }
    }

    return errorCount / totalRequests
  }

  /**
   * Générer un ID de requête unique
   */
  generateRequestId () {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Obtenir les métriques pour l'API
   */
  getMetrics () {
    return {
      requests: {
        total: this.metrics.requests.size,
        slow: this.metrics.slowQueries.length,
        avgResponseTime: this.calculateAverageResponseTime() + 'ms'
      },
      errors: {
        rate: (this.calculateErrorRate() * 100).toFixed(2) + '%',
        byHour: Array.from(this.metrics.errorRates.entries())
      },
      performance: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        uptime: process.uptime()
      }
    }
  }

  /**
   * Réinitialiser les métriques
   */
  resetMetrics () {
    this.metrics.requests.clear()
    this.metrics.slowQueries = []
    this.metrics.errorRates.clear()
    this.metrics.responseTime = []
  }
}

// Singleton
let instance = null

module.exports = {
  getPerformanceMonitoring: () => {
    if (!instance) {
      instance = new PerformanceMonitoring()
    }
    return instance
  },
  PerformanceMonitoring
}
