/**
 * Service de cache Redis optimisé
 * Gestion avancée du cache avec stratégies d'invalidation
 */

const Redis = require('ioredis')
const { EventEmitter } = require('events')

class RedisCacheService extends EventEmitter {
  constructor () {
    super()

    // Configuration Redis avec options optimisées
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      db: process.env.REDIS_DB || 0,

      // Options de performance
      enableReadyCheck: true,
      enableOfflineQueue: true,
      connectTimeout: 10000,
      maxRetriesPerRequest: 3,

      // Reconnexion automatique
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000)
        return delay
      },

      // Options de performance réseau
      keepAlive: true,
      noDelay: true,

      // Compression pour grandes valeurs
      stringNumbers: true
    })

    // Pipeline pour opérations batch
    this.pipeline = null

    // Statistiques de cache
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    }

    // Configuration des namespaces
    this.namespaces = {
      users: 'users:',
      weddings: 'weddings:',
      vendors: 'vendors:',
      sessions: 'sessions:',
      analytics: 'analytics:',
      temp: 'temp:'
    }

    // TTL par défaut (en secondes)
    this.defaultTTL = {
      users: 3600, // 1 heure
      weddings: 1800, // 30 minutes
      vendors: 3600, // 1 heure
      sessions: 86400, // 24 heures
      analytics: 300, // 5 minutes
      temp: 600 // 10 minutes
    }

    this.setupEventHandlers()
  }

  setupEventHandlers () {
    this.redis.on('connect', () => {
      console.log('Redis connected')
      this.emit('connected')
    })

    this.redis.on('error', (err) => {
      console.error('Redis error:', err)
      this.stats.errors++
      this.emit('error', err)
    })

    this.redis.on('close', () => {
      console.log('Redis connection closed')
      this.emit('disconnected')
    })
  }

  /**
   * Obtenir une valeur du cache avec namespace
   */
  async get (key, namespace = 'temp') {
    try {
      const fullKey = this.namespaces[namespace] + key
      const value = await this.redis.get(fullKey)

      if (value) {
        this.stats.hits++
        return JSON.parse(value)
      } else {
        this.stats.misses++
        return null
      }
    } catch (error) {
      this.stats.errors++
      console.error('Cache get error:', error)
      return null
    }
  }

  /**
   * Définir une valeur avec TTL automatique
   */
  async set (key, value, namespace = 'temp', ttl = null) {
    try {
      const fullKey = this.namespaces[namespace] + key
      const serialized = JSON.stringify(value)
      const finalTTL = ttl || this.defaultTTL[namespace]

      if (finalTTL) {
        await this.redis.setex(fullKey, finalTTL, serialized)
      } else {
        await this.redis.set(fullKey, serialized)
      }

      this.stats.sets++
      return true
    } catch (error) {
      this.stats.errors++
      console.error('Cache set error:', error)
      return false
    }
  }

  /**
   * Cache avec fonction de récupération (cache-aside pattern)
   */
  async getOrSet (key, fetchFunction, namespace = 'temp', ttl = null) {
    try {
      // Essayer de récupérer du cache
      const cached = await this.get(key, namespace)
      if (cached !== null) {
        return cached
      }

      // Si pas en cache, récupérer la donnée
      const data = await fetchFunction()

      // Mettre en cache
      if (data !== null && data !== undefined) {
        await this.set(key, data, namespace, ttl)
      }

      return data
    } catch (error) {
      console.error('Cache getOrSet error:', error)
      throw error
    }
  }

  /**
   * Invalider une clé
   */
  async invalidate (key, namespace = 'temp') {
    try {
      const fullKey = this.namespaces[namespace] + key
      const result = await this.redis.del(fullKey)
      this.stats.deletes++
      return result > 0
    } catch (error) {
      this.stats.errors++
      console.error('Cache invalidate error:', error)
      return false
    }
  }

  /**
   * Invalider toutes les clés d'un namespace
   */
  async invalidateNamespace (namespace) {
    try {
      const pattern = this.namespaces[namespace] + '*'
      const keys = await this.redis.keys(pattern)

      if (keys.length > 0) {
        const pipeline = this.redis.pipeline()
        keys.forEach(key => pipeline.del(key))
        await pipeline.exec()
        this.stats.deletes += keys.length
      }

      return keys.length
    } catch (error) {
      this.stats.errors++
      console.error('Cache invalidate namespace error:', error)
      return 0
    }
  }

  /**
   * Invalider par pattern
   */
  async invalidatePattern (pattern, namespace = 'temp') {
    try {
      const fullPattern = this.namespaces[namespace] + pattern
      const keys = await this.redis.keys(fullPattern)

      if (keys.length > 0) {
        const pipeline = this.redis.pipeline()
        keys.forEach(key => pipeline.del(key))
        await pipeline.exec()
        this.stats.deletes += keys.length
      }

      return keys.length
    } catch (error) {
      this.stats.errors++
      console.error('Cache invalidate pattern error:', error)
      return 0
    }
  }

  /**
   * Mise en cache avec tags pour invalidation groupée
   */
  async setWithTags (key, value, tags = [], namespace = 'temp', ttl = null) {
    try {
      // Sauvegarder la valeur
      await this.set(key, value, namespace, ttl)

      // Ajouter les tags
      for (const tag of tags) {
        const tagKey = `tags:${tag}`
        await this.redis.sadd(tagKey, this.namespaces[namespace] + key)

        // TTL pour le tag (plus long que les données)
        const tagTTL = (ttl || this.defaultTTL[namespace]) * 2
        await this.redis.expire(tagKey, tagTTL)
      }

      return true
    } catch (error) {
      console.error('Cache setWithTags error:', error)
      return false
    }
  }

  /**
   * Invalider toutes les clés avec un tag
   */
  async invalidateTag (tag) {
    try {
      const tagKey = `tags:${tag}`
      const keys = await this.redis.smembers(tagKey)

      if (keys.length > 0) {
        const pipeline = this.redis.pipeline()
        keys.forEach(key => pipeline.del(key))
        pipeline.del(tagKey)
        await pipeline.exec()
        this.stats.deletes += keys.length
      }

      return keys.length
    } catch (error) {
      this.stats.errors++
      console.error('Cache invalidate tag error:', error)
      return 0
    }
  }

  /**
   * Cache warming - précharger des données
   */
  async warmCache (items, namespace = 'temp') {
    try {
      const pipeline = this.redis.pipeline()

      for (const item of items) {
        const fullKey = this.namespaces[namespace] + item.key
        const ttl = item.ttl || this.defaultTTL[namespace]

        if (ttl) {
          pipeline.setex(fullKey, ttl, JSON.stringify(item.value))
        } else {
          pipeline.set(fullKey, JSON.stringify(item.value))
        }
      }

      await pipeline.exec()
      this.stats.sets += items.length

      return true
    } catch (error) {
      this.stats.errors++
      console.error('Cache warm error:', error)
      return false
    }
  }

  /**
   * Obtenir les statistiques du cache
   */
  getStats () {
    const total = this.stats.hits + this.stats.misses
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0

    return {
      ...this.stats,
      hitRate: hitRate.toFixed(2) + '%',
      total
    }
  }

  /**
   * Réinitialiser les statistiques
   */
  resetStats () {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    }
  }

  /**
   * Vérifier la santé du cache
   */
  async healthCheck () {
    try {
      const start = Date.now()
      await this.redis.ping()
      const latency = Date.now() - start

      const info = await this.redis.info()
      const memory = info.match(/used_memory_human:(.+)/)?.[1] || 'N/A'

      return {
        status: 'healthy',
        latency: `${latency}ms`,
        memory,
        stats: this.getStats()
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        stats: this.getStats()
      }
    }
  }

  /**
   * Fermer la connexion Redis
   */
  async close () {
    await this.redis.quit()
  }
}

// Singleton
let instance = null

module.exports = {
  getRedisCacheService: () => {
    if (!instance) {
      instance = new RedisCacheService()
    }
    return instance
  },
  RedisCacheService
}
