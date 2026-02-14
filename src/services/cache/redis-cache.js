const redis = require('redis')
const logger = require('../../utils/logger')

class CacheService {
  constructor() {
    this.client = null
    this.defaultTTL = 3600 // 1 heure
    this.isConnected = false
  }

  async connect() {
    try {
      this.client = redis.createClient({
        url: process.env.REDIS_URL,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis: Trop de tentatives de reconnexion')
              return new Error('Redis connection failed')
            }
            return Math.min(retries * 100, 3000)
          }
        }
      })

      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', err)
        this.isConnected = false
      })

      this.client.on('connect', () => {
        logger.info('Redis: Connexion établie')
        this.isConnected = true
      })

      this.client.on('ready', () => {
        logger.info('Redis: Prêt')
      })

      this.client.on('reconnecting', () => {
        logger.warn('Redis: Reconnexion en cours...')
      })

      await this.client.connect()
      this.isConnected = true
      
      logger.info('✅ Service de cache Redis connecté')
    } catch (error) {
      logger.error('Erreur connexion Redis:', error)
      throw error
    }
  }

  // Opérations de base avec namespace et TTL
  async get(key, namespace = 'default') {
    if (!this.isConnected) return null
    
    try {
      const startTime = Date.now()
      const fullKey = this.buildKey(namespace, key)
      const value = await this.client.get(fullKey)
      
      const duration = Date.now() - startTime
      logger.logCacheOperation('get', fullKey, value !== null, duration)
      
      return value ? JSON.parse(value) : null
    } catch (error) {
      logger.error(`Cache get error for ${namespace}:${key}:`, error)
      return null
    }
  }

  async set(key, value, options = {}) {
    if (!this.isConnected) return false
    
    try {
      const { namespace = 'default', ttl = this.defaultTTL, tags = [] } = options
      const startTime = Date.now()
      const fullKey = this.buildKey(namespace, key)
      
      // Stocker avec TTL
      const serialized = JSON.stringify(value)
      await this.client.setEx(fullKey, ttl, serialized)
      
      // Gérer les tags pour invalidation groupée
      if (tags.length > 0) {
        await this.addToTags(fullKey, tags)
      }
      
      const duration = Date.now() - startTime
      logger.logCacheOperation('set', fullKey, true, duration)
      
      return true
    } catch (error) {
      logger.error(`Cache set error for ${key}:`, error)
      return false
    }
  }

  async delete(key, namespace = 'default') {
    if (!this.isConnected) return false
    
    try {
      const fullKey = this.buildKey(namespace, key)
      const result = await this.client.del(fullKey)
      
      logger.logCacheOperation('delete', fullKey, result > 0, 0)
      
      return result > 0
    } catch (error) {
      logger.error(`Cache delete error for ${namespace}:${key}:`, error)
      return false
    }
  }

  async exists(key, namespace = 'default') {
    if (!this.isConnected) return false
    
    try {
      const fullKey = this.buildKey(namespace, key)
      const exists = await this.client.exists(fullKey)
      return exists === 1
    } catch (error) {
      logger.error(`Cache exists error for ${namespace}:${key}:`, error)
      return false
    }
  }

  // Opérations avancées
  async mget(keys, namespace = 'default') {
    if (!this.isConnected) return {}
    
    try {
      const fullKeys = keys.map(key => this.buildKey(namespace, key))
      const values = await this.client.mGet(fullKeys)
      
      const result = {}
      keys.forEach((key, index) => {
        if (values[index]) {
          result[key] = JSON.parse(values[index])
        }
      })
      
      return result
    } catch (error) {
      logger.error('Cache mget error:', error)
      return {}
    }
  }

  async mset(keyValues, options = {}) {
    if (!this.isConnected) return false
    
    try {
      const { namespace = 'default', ttl = this.defaultTTL } = options
      const pipeline = this.client.multi()
      
      Object.entries(keyValues).forEach(([key, value]) => {
        const fullKey = this.buildKey(namespace, key)
        pipeline.setEx(fullKey, ttl, JSON.stringify(value))
      })
      
      await pipeline.exec()
      return true
    } catch (error) {
      logger.error('Cache mset error:', error)
      return false
    }
  }

  // Invalidation par tags
  async invalidateByTag(tag) {
    if (!this.isConnected) return 0
    
    try {
      const tagKey = `tag:${tag}`
      const keys = await this.client.sMembers(tagKey)
      
      if (keys.length > 0) {
        const pipeline = this.client.multi()
        keys.forEach(key => pipeline.del(key))
        pipeline.del(tagKey)
        
        const results = await pipeline.exec()
        return keys.length
      }
      
      return 0
    } catch (error) {
      logger.error(`Cache invalidateByTag error for ${tag}:`, error)
      return 0
    }
  }

  async invalidateNamespace(namespace) {
    if (!this.isConnected) return 0
    
    try {
      const pattern = `${namespace}:*`
      const keys = await this.scanKeys(pattern)
      
      if (keys.length > 0) {
        const pipeline = this.client.multi()
        keys.forEach(key => pipeline.del(key))
        await pipeline.exec()
        return keys.length
      }
      
      return 0
    } catch (error) {
      logger.error(`Cache invalidateNamespace error for ${namespace}:`, error)
      return 0
    }
  }

  // Pattern avec fonction de récupération
  async getOrSet(key, fetchFunction, options = {}) {
    const { namespace = 'default' } = options
    
    // Essayer de récupérer depuis le cache
    const cached = await this.get(key, namespace)
    if (cached !== null) {
      return cached
    }
    
    // Si pas en cache, récupérer la donnée
    try {
      const fresh = await fetchFunction()
      
      // Stocker en cache pour la prochaine fois
      await this.set(key, fresh, options)
      
      return fresh
    } catch (error) {
      logger.error(`Cache getOrSet error for ${namespace}:${key}:`, error)
      throw error
    }
  }

  // Cache avec verrou pour éviter les requêtes simultanées
  async getOrSetWithLock(key, fetchFunction, options = {}) {
    const { namespace = 'default', lockTTL = 30 } = options
    const lockKey = `lock:${namespace}:${key}`
    
    // Essayer d'acquérir le verrou
    const lockAcquired = await this.acquireLock(lockKey, lockTTL)
    
    if (!lockAcquired) {
      // Attendre et réessayer
      await new Promise(resolve => setTimeout(resolve, 100))
      return this.get(key, namespace)
    }
    
    try {
      // Double vérification après acquisition du verrou
      const cached = await this.get(key, namespace)
      if (cached !== null) {
        await this.releaseLock(lockKey)
        return cached
      }
      
      // Récupérer et stocker
      const fresh = await fetchFunction()
      await this.set(key, fresh, options)
      
      return fresh
    } finally {
      await this.releaseLock(lockKey)
    }
  }

  // Incrémentation atomique
  async increment(key, amount = 1, namespace = 'default') {
    if (!this.isConnected) return null
    
    try {
      const fullKey = this.buildKey(namespace, key)
      const result = await this.client.incrBy(fullKey, amount)
      return result
    } catch (error) {
      logger.error(`Cache increment error for ${namespace}:${key}:`, error)
      return null
    }
  }

  // Liste et ensembles
  async pushToList(key, value, options = {}) {
    if (!this.isConnected) return false
    
    try {
      const { namespace = 'default', maxLength = 1000 } = options
      const fullKey = this.buildKey(namespace, key)
      
      await this.client.lPush(fullKey, JSON.stringify(value))
      await this.client.lTrim(fullKey, 0, maxLength - 1)
      
      return true
    } catch (error) {
      logger.error(`Cache pushToList error for ${namespace}:${key}:`, error)
      return false
    }
  }

  async getList(key, start = 0, end = -1, namespace = 'default') {
    if (!this.isConnected) return []
    
    try {
      const fullKey = this.buildKey(namespace, key)
      const values = await this.client.lRange(fullKey, start, end)
      return values.map(v => JSON.parse(v))
    } catch (error) {
      logger.error(`Cache getList error for ${namespace}:${key}:`, error)
      return []
    }
  }

  // Méthodes utilitaires
  buildKey(namespace, key) {
    return `${namespace}:${key}`
  }

  async addToTags(key, tags) {
    const pipeline = this.client.multi()
    tags.forEach(tag => {
      pipeline.sAdd(`tag:${tag}`, key)
    })
    await pipeline.exec()
  }

  async scanKeys(pattern) {
    const keys = []
    for await (const key of this.client.scanIterator({
      MATCH: pattern,
      COUNT: 100
    })) {
      keys.push(key)
    }
    return keys
  }

  async acquireLock(lockKey, ttl) {
    const result = await this.client.set(lockKey, '1', {
      NX: true,
      EX: ttl
    })
    return result === 'OK'
  }

  async releaseLock(lockKey) {
    await this.client.del(lockKey)
  }

  // Statistiques
  async getStats() {
    if (!this.isConnected) return null
    
    try {
      const info = await this.client.info('stats')
      return info
    } catch (error) {
      logger.error('Cache getStats error:', error)
      return null
    }
  }

  // Nettoyage
  async flush(namespace = null) {
    if (!this.isConnected) return false
    
    try {
      if (namespace) {
        const keys = await this.scanKeys(`${namespace}:*`)
        if (keys.length > 0) {
          await this.client.del(keys)
        }
      } else {
        await this.client.flushDb()
      }
      return true
    } catch (error) {
      logger.error('Cache flush error:', error)
      return false
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit()
      this.isConnected = false
    }
  }
}

module.exports = new CacheService()