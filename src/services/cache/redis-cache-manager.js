/**
 * Gestionnaire de Cache Redis Avancé
 * Cache intelligent avec TTL dynamique, invalidation et compression
 */

const Redis = require('ioredis')
const EventEmitter = require('events')
const zlib = require('zlib')
const { promisify } = require('util')

const gzip = promisify(zlib.gzip)
const gunzip = promisify(zlib.gunzip)

class RedisCacheManager extends EventEmitter {
  constructor (config = {}) {
    super()

    this.config = {
      // Configuration Redis
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      db: config.db || 0,

      // Configuration cluster si disponible
      cluster: config.cluster || false,
      clusterNodes: config.clusterNodes || [],

      // TTL par défaut
      defaultTTL: config.defaultTTL || 3600, // 1 heure

      // Compression
      enableCompression: config.enableCompression !== false,
      compressionThreshold: config.compressionThreshold || 1024, // 1KB

      // Préfixes de clés
      keyPrefix: config.keyPrefix || 'attitudes:',

      // Invalidation automatique
      enableInvalidation: config.enableInvalidation !== false,
      invalidationPatterns: config.invalidationPatterns || {},

      // Métriques
      enableMetrics: config.enableMetrics !== false,

      // Stratégies de cache
      strategies: {
        writeThrough: config.writeThrough || false,
        writeBack: config.writeBack || false,
        readThrough: config.readThrough || false
      },

      ...config
    }

    // Initialiser Redis
    this.redis = this.initializeRedis()
    this.subscriber = this.redis.duplicate() // Pour les invalidations

    // Cache local en mémoire (L1)
    this.localCache = new Map()
    this.localCacheTTL = new Map()
    this.maxLocalCacheSize = config.maxLocalCacheSize || 1000

    // Métriques
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      invalidations: 0,
      compressionSaved: 0,
      localCacheHits: 0,
      errors: 0
    }

    // Patterns de cache intelligents
    this.cachePatterns = new Map([
      ['user:*', { ttl: 1800, strategy: 'writeThrough' }], // 30 min
      ['wedding:*', { ttl: 3600, strategy: 'writeBack' }], // 1 heure
      ['guest:*', { ttl: 1800, strategy: 'writeThrough' }], // 30 min
      ['budget:*', { ttl: 600, strategy: 'writeThrough' }], // 10 min
      ['vendor:*', { ttl: 1800, strategy: 'writeBack' }], // 30 min
      ['task:*', { ttl: 300, strategy: 'writeThrough' }], // 5 min
      ['session:*', { ttl: 86400, strategy: 'writeThrough' }], // 24 heures
      ['jwt:*', { ttl: 900, strategy: 'writeThrough' }], // 15 min
      ['analytics:*', { ttl: 3600, strategy: 'writeBack' }], // 1 heure
      ['temp:*', { ttl: 300, strategy: 'writeThrough' }] // 5 min pour temporaires
    ])

    this.initialize()
  }

  /**
   * Initialiser Redis avec gestion de cluster
   */
  initializeRedis () {
    const redisConfig = {
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: true,
      family: 4
    }

    if (this.config.cluster && this.config.clusterNodes.length > 0) {
      console.log('[Cache] Initializing Redis cluster')
      return new Redis.Cluster(this.config.clusterNodes, {
        ...redisConfig,
        scaleReads: 'slave'
      })
    } else {
      console.log('[Cache] Initializing Redis single instance')
      return new Redis({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        db: this.config.db,
        ...redisConfig
      })
    }
  }

  /**
   * Initialiser le gestionnaire de cache
   */
  async initialize () {
    try {
      await this.redis.ping()
      console.log('[Cache] Redis connection established')

      // Configurer les invalidations
      if (this.config.enableInvalidation) {
        this.setupInvalidationListeners()
      }

      // Démarrer le nettoyage du cache local
      this.startLocalCacheCleanup()

      // Démarrer la collecte de métriques
      if (this.config.enableMetrics) {
        this.startMetricsCollection()
      }

      this.emit('ready')
    } catch (error) {
      console.error('[Cache] Redis connection failed:', error)
      this.emit('error', error)
    }
  }

  /**
   * Obtenir une valeur du cache avec stratégie multi-niveau
   */
  async get (key, options = {}) {
    const fullKey = this.buildKey(key)
    const startTime = Date.now()

    try {
      // Niveau 1: Cache local
      if (this.localCache.has(fullKey)) {
        const ttl = this.localCacheTTL.get(fullKey)
        if (ttl && Date.now() < ttl) {
          this.metrics.localCacheHits++
          this.metrics.hits++
          return this.localCache.get(fullKey)
        } else {
          // Expiré
          this.localCache.delete(fullKey)
          this.localCacheTTL.delete(fullKey)
        }
      }

      // Niveau 2: Redis
      const cachedData = await this.redis.get(fullKey)

      if (cachedData !== null) {
        this.metrics.hits++

        const value = await this.deserializeValue(cachedData)

        // Mettre en cache local si petit
        if (this.shouldCacheLocally(value)) {
          this.setLocalCache(fullKey, value, options.localTTL || 60000) // 1 min par défaut
        }

        return value
      } else {
        this.metrics.misses++

        // Read-through si configuré
        if (options.readThrough && options.loader) {
          const value = await options.loader()
          if (value !== null && value !== undefined) {
            await this.set(key, value, options)
            return value
          }
        }

        return null
      }
    } catch (error) {
      this.metrics.errors++
      console.error(`[Cache] Error getting key ${fullKey}:`, error)

      // Fallback sur read-through si disponible
      if (options.readThrough && options.loader) {
        try {
          return await options.loader()
        } catch (loaderError) {
          console.error('[Cache] Loader fallback failed:', loaderError)
        }
      }

      throw error
    } finally {
      this.recordLatency('get', Date.now() - startTime)
    }
  }

  /**
   * Définir une valeur dans le cache
   */
  async set (key, value, options = {}) {
    const fullKey = this.buildKey(key)
    const startTime = Date.now()

    try {
      // Obtenir la configuration pour cette clé
      const config = this.getKeyConfig(key)
      const ttl = options.ttl || config.ttl || this.config.defaultTTL

      // Sérialiser et compresser si nécessaire
      const serializedValue = await this.serializeValue(value)

      // Définir dans Redis
      if (ttl > 0) {
        await this.redis.setex(fullKey, ttl, serializedValue)
      } else {
        await this.redis.set(fullKey, serializedValue)
      }

      this.metrics.sets++

      // Cache local si approprié
      if (this.shouldCacheLocally(value)) {
        this.setLocalCache(fullKey, value, Math.min(ttl * 1000, 300000)) // Max 5 min local
      }

      // Write-back si configuré
      if (config.strategy === 'writeBack' && options.writeBack) {
        this.scheduleWriteBack(key, value, options.writeBack)
      }

      // Invalidation automatique
      if (this.config.enableInvalidation) {
        this.handleInvalidation(key, 'set')
      }

      return true
    } catch (error) {
      this.metrics.errors++
      console.error(`[Cache] Error setting key ${fullKey}:`, error)
      throw error
    } finally {
      this.recordLatency('set', Date.now() - startTime)
    }
  }

  /**
   * Obtenir plusieurs valeurs en une fois
   */
  async mget (keys, options = {}) {
    const fullKeys = keys.map(key => this.buildKey(key))

    try {
      // Vérifier le cache local d'abord
      const localResults = new Map()
      const redisKeys = []

      fullKeys.forEach((fullKey, index) => {
        if (this.localCache.has(fullKey)) {
          const ttl = this.localCacheTTL.get(fullKey)
          if (ttl && Date.now() < ttl) {
            localResults.set(index, this.localCache.get(fullKey))
          } else {
            this.localCache.delete(fullKey)
            this.localCacheTTL.delete(fullKey)
            redisKeys.push({ index, key: fullKey })
          }
        } else {
          redisKeys.push({ index, key: fullKey })
        }
      })

      // Récupérer le reste depuis Redis
      const results = new Array(keys.length)

      // Copier les résultats locaux
      localResults.forEach((value, index) => {
        results[index] = value
      })

      if (redisKeys.length > 0) {
        const redisValues = await this.redis.mget(redisKeys.map(k => k.key))

        for (let i = 0; i < redisKeys.length; i++) {
          const { index } = redisKeys[i]
          const value = redisValues[i]

          if (value !== null) {
            const deserializedValue = await this.deserializeValue(value)
            results[index] = deserializedValue

            // Cache local si approprié
            if (this.shouldCacheLocally(deserializedValue)) {
              this.setLocalCache(redisKeys[i].key, deserializedValue, 60000)
            }
          } else {
            results[index] = null
          }
        }
      }

      return results
    } catch (error) {
      this.metrics.errors++
      console.error('[Cache] Error in mget:', error)
      throw error
    }
  }

  /**
   * Supprimer une clé
   */
  async del (key) {
    const fullKey = this.buildKey(key)

    try {
      const result = await this.redis.del(fullKey)

      // Supprimer du cache local aussi
      this.localCache.delete(fullKey)
      this.localCacheTTL.delete(fullKey)

      this.metrics.deletes++

      // Invalidation
      if (this.config.enableInvalidation) {
        this.handleInvalidation(key, 'delete')
      }

      return result
    } catch (error) {
      this.metrics.errors++
      console.error(`[Cache] Error deleting key ${fullKey}:`, error)
      throw error
    }
  }

  /**
   * Invalider par pattern
   */
  async invalidatePattern (pattern) {
    try {
      const fullPattern = this.buildKey(pattern)
      const keys = await this.redis.keys(fullPattern)

      if (keys.length > 0) {
        await this.redis.del(...keys)

        // Nettoyer le cache local aussi
        keys.forEach(key => {
          this.localCache.delete(key)
          this.localCacheTTL.delete(key)
        })

        this.metrics.invalidations += keys.length

        console.log(`[Cache] Invalidated ${keys.length} keys matching pattern: ${pattern}`)
      }

      return keys.length
    } catch (error) {
      this.metrics.errors++
      console.error(`[Cache] Error invalidating pattern ${pattern}:`, error)
      throw error
    }
  }

  /**
   * Cache avec verrou (pour éviter cache stampede)
   */
  async getWithLock (key, loader, options = {}) {
    const lockKey = `lock:${key}`
    const lockTTL = options.lockTTL || 30 // 30 secondes
    const maxWait = options.maxWait || 5000 // 5 secondes max d'attente

    try {
      // Essayer d'obtenir la valeur normalement
      let value = await this.get(key)
      if (value !== null) {
        return value
      }

      // Essayer d'acquérir le verrou
      const lockAcquired = await this.redis.set(
        this.buildKey(lockKey),
        '1',
        'EX',
        lockTTL,
        'NX'
      )

      if (lockAcquired === 'OK') {
        try {
          // On a le verrou, charger la donnée
          value = await loader()

          if (value !== null && value !== undefined) {
            await this.set(key, value, options)
          }

          return value
        } finally {
          // Libérer le verrou
          await this.del(lockKey)
        }
      } else {
        // Attendre que l'autre processus termine
        const startWait = Date.now()
        while (Date.now() - startWait < maxWait) {
          await new Promise(resolve => setTimeout(resolve, 100))

          value = await this.get(key)
          if (value !== null) {
            return value
          }

          // Vérifier si le verrou existe encore
          const lockExists = await this.redis.exists(this.buildKey(lockKey))
          if (!lockExists) {
            break
          }
        }

        // Si on arrive ici, soit timeout soit pas de données
        // Essayer de charger quand même
        return await loader()
      }
    } catch (error) {
      console.error('[Cache] Error in getWithLock:', error)
      // Fallback direct au loader
      try {
        return await loader()
      } catch (loaderError) {
        console.error('[Cache] Loader fallback failed:', loaderError)
        throw loaderError
      }
    }
  }

  /**
   * Cache avec TTL intelligent basé sur la fréquence d'accès
   */
  async getWithAdaptiveTTL (key, loader, options = {}) {
    const statsKey = `stats:${key}`

    try {
      // Obtenir les statistiques d'accès
      const stats = await this.redis.hgetall(this.buildKey(statsKey))
      const accessCount = parseInt(stats.count || '0')
      const lastAccess = parseInt(stats.lastAccess || '0')

      // Calculer un TTL adaptatif
      const now = Date.now()
      const timeSinceLastAccess = now - lastAccess

      let adaptiveTTL = this.config.defaultTTL

      if (accessCount > 10) {
        // Fréquemment accédé = TTL plus long
        adaptiveTTL = Math.min(adaptiveTTL * 2, 7200) // Max 2 heures
      } else if (timeSinceLastAccess > 3600000) {
        // Pas accédé depuis 1h = TTL plus court
        adaptiveTTL = Math.max(adaptiveTTL / 2, 300) // Min 5 minutes
      }

      // Obtenir ou charger la valeur
      let value = await this.get(key)

      if (value === null && loader) {
        value = await loader()
        if (value !== null && value !== undefined) {
          await this.set(key, value, { ...options, ttl: adaptiveTTL })
        }
      }

      // Mettre à jour les statistiques
      await this.redis.hmset(this.buildKey(statsKey), {
        count: accessCount + 1,
        lastAccess: now
      })
      await this.redis.expire(this.buildKey(statsKey), adaptiveTTL * 2)

      return value
    } catch (error) {
      console.error('[Cache] Error in getWithAdaptiveTTL:', error)
      throw error
    }
  }

  /**
   * Méthodes de configuration et utilitaires
   */

  buildKey (key) {
    return `${this.config.keyPrefix}${key}`
  }

  getKeyConfig (key) {
    for (const [pattern, config] of this.cachePatterns) {
      if (this.matchPattern(key, pattern)) {
        return config
      }
    }
    return { ttl: this.config.defaultTTL, strategy: 'writeThrough' }
  }

  matchPattern (key, pattern) {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'))
    return regex.test(key)
  }

  async serializeValue (value) {
    const serialized = JSON.stringify(value)

    if (this.config.enableCompression &&
        serialized.length > this.config.compressionThreshold) {
      const compressed = await gzip(Buffer.from(serialized))
      this.metrics.compressionSaved += serialized.length - compressed.length

      return JSON.stringify({
        _compressed: true,
        data: compressed.toString('base64')
      })
    }

    return serialized
  }

  async deserializeValue (serialized) {
    const parsed = JSON.parse(serialized)

    if (parsed._compressed) {
      const buffer = Buffer.from(parsed.data, 'base64')
      const decompressed = await gunzip(buffer)
      return JSON.parse(decompressed.toString())
    }

    return parsed
  }

  shouldCacheLocally (value) {
    if (this.localCache.size >= this.maxLocalCacheSize) {
      return false
    }

    const size = JSON.stringify(value).length
    return size < 10240 // Moins de 10KB
  }

  setLocalCache (key, value, ttl) {
    // Nettoyer si nécessaire
    if (this.localCache.size >= this.maxLocalCacheSize) {
      this.cleanOldestLocalCache()
    }

    this.localCache.set(key, value)
    this.localCacheTTL.set(key, Date.now() + ttl)
  }

  cleanOldestLocalCache () {
    let oldestKey = null
    let oldestTTL = Infinity

    for (const [key, ttl] of this.localCacheTTL) {
      if (ttl < oldestTTL) {
        oldestTTL = ttl
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.localCache.delete(oldestKey)
      this.localCacheTTL.delete(oldestKey)
    }
  }

  setupInvalidationListeners () {
    this.subscriber.subscribe('cache_invalidation')

    this.subscriber.on('message', (channel, message) => {
      if (channel === 'cache_invalidation') {
        try {
          const { pattern, source } = JSON.parse(message)
          if (source !== process.pid) { // Éviter self-invalidation
            this.invalidatePattern(pattern)
          }
        } catch (error) {
          console.error('[Cache] Error processing invalidation message:', error)
        }
      }
    })
  }

  handleInvalidation (key, operation) {
    // Publier l'invalidation aux autres instances
    const patterns = this.config.invalidationPatterns[operation]
    if (patterns) {
      patterns.forEach(pattern => {
        if (this.matchPattern(key, pattern)) {
          this.redis.publish('cache_invalidation', JSON.stringify({
            pattern,
            source: process.pid,
            timestamp: Date.now()
          }))
        }
      })
    }
  }

  startLocalCacheCleanup () {
    setInterval(() => {
      const now = Date.now()
      const expiredKeys = []

      for (const [key, ttl] of this.localCacheTTL) {
        if (ttl < now) {
          expiredKeys.push(key)
        }
      }

      expiredKeys.forEach(key => {
        this.localCache.delete(key)
        this.localCacheTTL.delete(key)
      })

      if (expiredKeys.length > 0) {
        console.log(`[Cache] Cleaned ${expiredKeys.length} expired local cache entries`)
      }
    }, 60000) // Chaque minute
  }

  startMetricsCollection () {
    setInterval(() => {
      this.publishMetrics()
    }, 60000) // Chaque minute
  }

  publishMetrics () {
    const metrics = {
      ...this.metrics,
      hitRate: this.metrics.hits / (this.metrics.hits + this.metrics.misses) || 0,
      localCacheSize: this.localCache.size,
      timestamp: Date.now()
    }

    this.emit('metrics', metrics)

    // Reset des compteurs périodiques
    this.metrics.compressionSaved = 0
  }

  recordLatency (operation, latency) {
    // TODO: Implémenter un histogramme de latence
    this.emit('latency', { operation, latency })
  }

  scheduleWriteBack (key, value, writeBackFunction) {
    // TODO: Implémenter la stratégie write-back
    setTimeout(async () => {
      try {
        await writeBackFunction(key, value)
      } catch (error) {
        console.error('[Cache] Write-back failed:', error)
      }
    }, 5000) // 5 secondes de délai
  }

  /**
   * API publique
   */

  getMetrics () {
    return {
      ...this.metrics,
      hitRate: this.metrics.hits / (this.metrics.hits + this.metrics.misses) || 0,
      localCacheSize: this.localCache.size,
      redisConnected: this.redis.status === 'ready'
    }
  }

  async flushAll () {
    await this.redis.flushdb()
    this.localCache.clear()
    this.localCacheTTL.clear()
    console.log('[Cache] All cache cleared')
  }

  async disconnect () {
    await this.redis.quit()
    await this.subscriber.quit()
    this.localCache.clear()
    this.localCacheTTL.clear()
    console.log('[Cache] Redis cache manager disconnected')
  }
}

module.exports = RedisCacheManager
