const redis = require('redis')
const CacheService = require('../../src/services/cache/redis-cache')
const logger = require('../../src/utils/logger')

// Mock dependencies
jest.mock('redis')
jest.mock('../../src/utils/logger')

// Mock Redis client
const mockRedisClient = {
  connect: jest.fn(),
  on: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  setEx: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  mGet: jest.fn(),
  multi: jest.fn(),
  sMembers: jest.fn(),
  sAdd: jest.fn(),
  incrBy: jest.fn(),
  lPush: jest.fn(),
  lTrim: jest.fn(),
  lRange: jest.fn(),
  scanIterator: jest.fn(),
  info: jest.fn(),
  flushDb: jest.fn(),
  quit: jest.fn()
}

// Mock multi/pipeline
const mockPipeline = {
  setEx: jest.fn().mockReturnThis(),
  del: jest.fn().mockReturnThis(),
  sAdd: jest.fn().mockReturnThis(),
  exec: jest.fn()
}

beforeEach(() => {
  jest.clearAllMocks()
  
  // Reset cache service state
  CacheService.client = null
  CacheService.isConnected = false
  
  // Setup Redis client mock
  redis.createClient.mockReturnValue(mockRedisClient)
  mockRedisClient.multi.mockReturnValue(mockPipeline)
  
  // Default environment
  process.env.REDIS_URL = 'redis://localhost:6379'
})

describe('CacheService', () => {
  describe('Connection Management', () => {
    test('should connect successfully', async () => {
      mockRedisClient.connect.mockResolvedValue()
      
      await CacheService.connect()
      
      expect(redis.createClient).toHaveBeenCalledWith({
        url: 'redis://localhost:6379',
        socket: {
          reconnectStrategy: expect.any(Function)
        }
      })
      expect(mockRedisClient.connect).toHaveBeenCalled()
      expect(CacheService.isConnected).toBe(true)
      expect(logger.info).toHaveBeenCalledWith('✅ Service de cache Redis connecté')
    })

    test('should handle connection error', async () => {
      const error = new Error('Connection failed')
      mockRedisClient.connect.mockRejectedValue(error)
      
      await expect(CacheService.connect()).rejects.toThrow('Connection failed')
      expect(logger.error).toHaveBeenCalledWith('Erreur connexion Redis:', error)
    })

    test('should setup event handlers', async () => {
      await CacheService.connect()
      
      expect(mockRedisClient.on).toHaveBeenCalledWith('error', expect.any(Function))
      expect(mockRedisClient.on).toHaveBeenCalledWith('connect', expect.any(Function))
      expect(mockRedisClient.on).toHaveBeenCalledWith('ready', expect.any(Function))
      expect(mockRedisClient.on).toHaveBeenCalledWith('reconnecting', expect.any(Function))
    })

    test('should handle error event', async () => {
      await CacheService.connect()
      
      const errorHandler = mockRedisClient.on.mock.calls.find(call => call[0] === 'error')[1]
      const error = new Error('Redis error')
      errorHandler(error)
      
      expect(logger.error).toHaveBeenCalledWith('Redis Client Error:', error)
      expect(CacheService.isConnected).toBe(false)
    })

    test('should implement reconnect strategy', async () => {
      await CacheService.connect()
      
      const config = redis.createClient.mock.calls[0][0]
      const strategy = config.socket.reconnectStrategy
      
      expect(strategy(1)).toBe(100)
      expect(strategy(5)).toBe(500)
      expect(strategy(10)).toBe(1000)
      expect(strategy(11)).toBeInstanceOf(Error)
    })

    test('should disconnect properly', async () => {
      CacheService.client = mockRedisClient
      CacheService.isConnected = true
      
      await CacheService.disconnect()
      
      expect(mockRedisClient.quit).toHaveBeenCalled()
      expect(CacheService.isConnected).toBe(false)
    })
  })

  describe('Basic Operations', () => {
    beforeEach(async () => {
      mockRedisClient.connect.mockResolvedValue()
      await CacheService.connect()
    })

    describe('get', () => {
      test('should get value from cache', async () => {
        const mockValue = { test: 'data' }
        mockRedisClient.get.mockResolvedValue(JSON.stringify(mockValue))
        
        const result = await CacheService.get('testKey')
        
        expect(mockRedisClient.get).toHaveBeenCalledWith('default:testKey')
        expect(result).toEqual(mockValue)
        expect(logger.logCacheOperation).toHaveBeenCalledWith(
          'get',
          'default:testKey',
          true,
          expect.any(Number)
        )
      })

      test('should return null for missing key', async () => {
        mockRedisClient.get.mockResolvedValue(null)
        
        const result = await CacheService.get('missingKey')
        
        expect(result).toBeNull()
        expect(logger.logCacheOperation).toHaveBeenCalledWith(
          'get',
          'default:missingKey',
          false,
          expect.any(Number)
        )
      })

      test('should handle get error gracefully', async () => {
        mockRedisClient.get.mockRejectedValue(new Error('Redis error'))
        
        const result = await CacheService.get('errorKey')
        
        expect(result).toBeNull()
        expect(logger.error).toHaveBeenCalled()
      })

      test('should use custom namespace', async () => {
        mockRedisClient.get.mockResolvedValue('"value"')
        
        await CacheService.get('key', 'custom')
        
        expect(mockRedisClient.get).toHaveBeenCalledWith('custom:key')
      })

      test('should return null when not connected', async () => {
        CacheService.isConnected = false
        
        const result = await CacheService.get('key')
        
        expect(result).toBeNull()
        expect(mockRedisClient.get).not.toHaveBeenCalled()
      })
    })

    describe('set', () => {
      test('should set value in cache with default TTL', async () => {
        const value = { test: 'data' }
        
        const result = await CacheService.set('testKey', value)
        
        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
          'default:testKey',
          3600,
          JSON.stringify(value)
        )
        expect(result).toBe(true)
        expect(logger.logCacheOperation).toHaveBeenCalledWith(
          'set',
          'default:testKey',
          true,
          expect.any(Number)
        )
      })

      test('should set value with custom options', async () => {
        const value = 'test value'
        const options = {
          namespace: 'custom',
          ttl: 7200,
          tags: ['tag1', 'tag2']
        }
        
        await CacheService.set('key', value, options)
        
        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
          'custom:key',
          7200,
          JSON.stringify(value)
        )
        expect(mockPipeline.sAdd).toHaveBeenCalledWith('tag:tag1', 'custom:key')
        expect(mockPipeline.sAdd).toHaveBeenCalledWith('tag:tag2', 'custom:key')
      })

      test('should handle set error gracefully', async () => {
        mockRedisClient.setEx.mockRejectedValue(new Error('Redis error'))
        
        const result = await CacheService.set('errorKey', 'value')
        
        expect(result).toBe(false)
        expect(logger.error).toHaveBeenCalled()
      })

      test('should return false when not connected', async () => {
        CacheService.isConnected = false
        
        const result = await CacheService.set('key', 'value')
        
        expect(result).toBe(false)
        expect(mockRedisClient.setEx).not.toHaveBeenCalled()
      })
    })

    describe('delete', () => {
      test('should delete key from cache', async () => {
        mockRedisClient.del.mockResolvedValue(1)
        
        const result = await CacheService.delete('testKey')
        
        expect(mockRedisClient.del).toHaveBeenCalledWith('default:testKey')
        expect(result).toBe(true)
        expect(logger.logCacheOperation).toHaveBeenCalledWith(
          'delete',
          'default:testKey',
          true,
          0
        )
      })

      test('should return false if key not found', async () => {
        mockRedisClient.del.mockResolvedValue(0)
        
        const result = await CacheService.delete('missingKey')
        
        expect(result).toBe(false)
      })

      test('should handle delete error gracefully', async () => {
        mockRedisClient.del.mockRejectedValue(new Error('Redis error'))
        
        const result = await CacheService.delete('errorKey')
        
        expect(result).toBe(false)
        expect(logger.error).toHaveBeenCalled()
      })
    })

    describe('exists', () => {
      test('should check if key exists', async () => {
        mockRedisClient.exists.mockResolvedValue(1)
        
        const result = await CacheService.exists('testKey')
        
        expect(mockRedisClient.exists).toHaveBeenCalledWith('default:testKey')
        expect(result).toBe(true)
      })

      test('should return false for non-existent key', async () => {
        mockRedisClient.exists.mockResolvedValue(0)
        
        const result = await CacheService.exists('missingKey')
        
        expect(result).toBe(false)
      })
    })
  })

  describe('Advanced Operations', () => {
    beforeEach(async () => {
      mockRedisClient.connect.mockResolvedValue()
      await CacheService.connect()
    })

    describe('mget', () => {
      test('should get multiple values', async () => {
        const mockValues = [JSON.stringify('value1'), JSON.stringify('value2'), null]
        mockRedisClient.mGet.mockResolvedValue(mockValues)
        
        const result = await CacheService.mget(['key1', 'key2', 'key3'])
        
        expect(mockRedisClient.mGet).toHaveBeenCalledWith([
          'default:key1',
          'default:key2',
          'default:key3'
        ])
        expect(result).toEqual({
          key1: 'value1',
          key2: 'value2'
        })
      })

      test('should handle mget error', async () => {
        mockRedisClient.mGet.mockRejectedValue(new Error('Redis error'))
        
        const result = await CacheService.mget(['key1', 'key2'])
        
        expect(result).toEqual({})
        expect(logger.error).toHaveBeenCalled()
      })
    })

    describe('mset', () => {
      test('should set multiple values', async () => {
        mockPipeline.exec.mockResolvedValue([])
        
        const keyValues = {
          key1: 'value1',
          key2: { nested: 'value2' }
        }
        
        const result = await CacheService.mset(keyValues)
        
        expect(mockPipeline.setEx).toHaveBeenCalledWith(
          'default:key1',
          3600,
          JSON.stringify('value1')
        )
        expect(mockPipeline.setEx).toHaveBeenCalledWith(
          'default:key2',
          3600,
          JSON.stringify({ nested: 'value2' })
        )
        expect(mockPipeline.exec).toHaveBeenCalled()
        expect(result).toBe(true)
      })

      test('should use custom TTL', async () => {
        mockPipeline.exec.mockResolvedValue([])
        
        await CacheService.mset({ key: 'value' }, { ttl: 7200 })
        
        expect(mockPipeline.setEx).toHaveBeenCalledWith(
          'default:key',
          7200,
          JSON.stringify('value')
        )
      })
    })

    describe('invalidateByTag', () => {
      test('should invalidate all keys with tag', async () => {
        const taggedKeys = ['default:key1', 'default:key2']
        mockRedisClient.sMembers.mockResolvedValue(taggedKeys)
        mockPipeline.exec.mockResolvedValue([])
        
        const result = await CacheService.invalidateByTag('tag1')
        
        expect(mockRedisClient.sMembers).toHaveBeenCalledWith('tag:tag1')
        expect(mockPipeline.del).toHaveBeenCalledWith('default:key1')
        expect(mockPipeline.del).toHaveBeenCalledWith('default:key2')
        expect(mockPipeline.del).toHaveBeenCalledWith('tag:tag1')
        expect(result).toBe(2)
      })

      test('should return 0 if no keys found', async () => {
        mockRedisClient.sMembers.mockResolvedValue([])
        
        const result = await CacheService.invalidateByTag('emptyTag')
        
        expect(result).toBe(0)
        expect(mockPipeline.del).not.toHaveBeenCalled()
      })
    })

    describe('invalidateNamespace', () => {
      test('should invalidate all keys in namespace', async () => {
        const keys = ['test:key1', 'test:key2', 'test:key3']
        const mockIterator = {
          async *[Symbol.asyncIterator]() {
            for (const key of keys) {
              yield key
            }
          }
        }
        mockRedisClient.scanIterator.mockReturnValue(mockIterator)
        mockPipeline.exec.mockResolvedValue([])
        
        const result = await CacheService.invalidateNamespace('test')
        
        expect(mockRedisClient.scanIterator).toHaveBeenCalledWith({
          MATCH: 'test:*',
          COUNT: 100
        })
        keys.forEach(key => {
          expect(mockPipeline.del).toHaveBeenCalledWith(key)
        })
        expect(result).toBe(3)
      })
    })
  })

  describe('Pattern Operations', () => {
    beforeEach(async () => {
      mockRedisClient.connect.mockResolvedValue()
      await CacheService.connect()
    })

    describe('getOrSet', () => {
      test('should return cached value if exists', async () => {
        const cachedValue = { cached: true }
        mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedValue))
        
        const fetchFunction = jest.fn()
        const result = await CacheService.getOrSet('key', fetchFunction)
        
        expect(result).toEqual(cachedValue)
        expect(fetchFunction).not.toHaveBeenCalled()
      })

      test('should fetch and cache if not exists', async () => {
        mockRedisClient.get.mockResolvedValue(null)
        const freshValue = { fresh: true }
        const fetchFunction = jest.fn().mockResolvedValue(freshValue)
        
        const result = await CacheService.getOrSet('key', fetchFunction)
        
        expect(fetchFunction).toHaveBeenCalled()
        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
          'default:key',
          3600,
          JSON.stringify(freshValue)
        )
        expect(result).toEqual(freshValue)
      })

      test('should propagate fetch errors', async () => {
        mockRedisClient.get.mockResolvedValue(null)
        const fetchError = new Error('Fetch failed')
        const fetchFunction = jest.fn().mockRejectedValue(fetchError)
        
        await expect(CacheService.getOrSet('key', fetchFunction))
          .rejects.toThrow('Fetch failed')
      })
    })

    describe('getOrSetWithLock', () => {
      test('should acquire lock and fetch data', async () => {
        mockRedisClient.get.mockResolvedValue(null)
        mockRedisClient.set.mockResolvedValue('OK') // Lock acquired
        const freshValue = { fresh: true }
        const fetchFunction = jest.fn().mockResolvedValue(freshValue)
        
        const result = await CacheService.getOrSetWithLock('key', fetchFunction)
        
        expect(mockRedisClient.set).toHaveBeenCalledWith(
          'lock:default:key',
          '1',
          { NX: true, EX: 30 }
        )
        expect(fetchFunction).toHaveBeenCalled()
        expect(result).toEqual(freshValue)
        expect(mockRedisClient.del).toHaveBeenCalledWith('lock:default:key')
      })

      test('should wait if lock not acquired', async () => {
        mockRedisClient.get
          .mockResolvedValueOnce(null) // First check
          .mockResolvedValueOnce(JSON.stringify({ waited: true })) // After wait
        mockRedisClient.set.mockResolvedValue(null) // Lock not acquired
        
        const fetchFunction = jest.fn()
        const result = await CacheService.getOrSetWithLock('key', fetchFunction)
        
        expect(fetchFunction).not.toHaveBeenCalled()
        expect(result).toEqual({ waited: true })
      })

      test('should release lock even on error', async () => {
        mockRedisClient.get.mockResolvedValue(null)
        mockRedisClient.set.mockResolvedValue('OK')
        const fetchFunction = jest.fn().mockRejectedValue(new Error('Fetch error'))
        
        await expect(CacheService.getOrSetWithLock('key', fetchFunction))
          .rejects.toThrow()
        
        expect(mockRedisClient.del).toHaveBeenCalledWith('lock:default:key')
      })
    })
  })

  describe('Atomic Operations', () => {
    beforeEach(async () => {
      mockRedisClient.connect.mockResolvedValue()
      await CacheService.connect()
    })

    test('should increment value atomically', async () => {
      mockRedisClient.incrBy.mockResolvedValue(5)
      
      const result = await CacheService.increment('counter')
      
      expect(mockRedisClient.incrBy).toHaveBeenCalledWith('default:counter', 1)
      expect(result).toBe(5)
    })

    test('should increment by custom amount', async () => {
      mockRedisClient.incrBy.mockResolvedValue(15)
      
      const result = await CacheService.increment('counter', 10, 'stats')
      
      expect(mockRedisClient.incrBy).toHaveBeenCalledWith('stats:counter', 10)
      expect(result).toBe(15)
    })
  })

  describe('List Operations', () => {
    beforeEach(async () => {
      mockRedisClient.connect.mockResolvedValue()
      await CacheService.connect()
    })

    test('should push to list with max length', async () => {
      const value = { event: 'test' }
      
      const result = await CacheService.pushToList('events', value)
      
      expect(mockRedisClient.lPush).toHaveBeenCalledWith(
        'default:events',
        JSON.stringify(value)
      )
      expect(mockRedisClient.lTrim).toHaveBeenCalledWith('default:events', 0, 999)
      expect(result).toBe(true)
    })

    test('should push with custom max length', async () => {
      await CacheService.pushToList('events', 'value', { maxLength: 100 })
      
      expect(mockRedisClient.lTrim).toHaveBeenCalledWith('default:events', 0, 99)
    })

    test('should get list items', async () => {
      const mockItems = [
        JSON.stringify({ id: 1 }),
        JSON.stringify({ id: 2 })
      ]
      mockRedisClient.lRange.mockResolvedValue(mockItems)
      
      const result = await CacheService.getList('events')
      
      expect(mockRedisClient.lRange).toHaveBeenCalledWith('default:events', 0, -1)
      expect(result).toEqual([{ id: 1 }, { id: 2 }])
    })

    test('should get list with range', async () => {
      mockRedisClient.lRange.mockResolvedValue([])
      
      await CacheService.getList('events', 0, 10, 'custom')
      
      expect(mockRedisClient.lRange).toHaveBeenCalledWith('custom:events', 0, 10)
    })
  })

  describe('Utility Operations', () => {
    beforeEach(async () => {
      mockRedisClient.connect.mockResolvedValue()
      await CacheService.connect()
    })

    test('should get statistics', async () => {
      const mockStats = 'redis_version:6.2.6\r\nconnected_clients:10'
      mockRedisClient.info.mockResolvedValue(mockStats)
      
      const result = await CacheService.getStats()
      
      expect(mockRedisClient.info).toHaveBeenCalledWith('stats')
      expect(result).toBe(mockStats)
    })

    test('should flush entire database', async () => {
      const result = await CacheService.flush()
      
      expect(mockRedisClient.flushDb).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    test('should flush specific namespace', async () => {
      const keys = ['test:key1', 'test:key2']
      const mockIterator = {
        async *[Symbol.asyncIterator]() {
          for (const key of keys) {
            yield key
          }
        }
      }
      mockRedisClient.scanIterator.mockReturnValue(mockIterator)
      
      const result = await CacheService.flush('test')
      
      expect(mockRedisClient.del).toHaveBeenCalledWith(keys)
      expect(result).toBe(true)
    })

    test('should handle flush error', async () => {
      mockRedisClient.flushDb.mockRejectedValue(new Error('Flush error'))
      
      const result = await CacheService.flush()
      
      expect(result).toBe(false)
      expect(logger.error).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    beforeEach(async () => {
      mockRedisClient.connect.mockResolvedValue()
      await CacheService.connect()
    })

    test('should handle JSON parse errors', async () => {
      mockRedisClient.get.mockResolvedValue('invalid json')
      
      const result = await CacheService.get('badKey')
      
      expect(result).toBeNull()
      expect(logger.error).toHaveBeenCalled()
    })

    test('should handle circular references in values', async () => {
      const circular = { a: 1 }
      circular.self = circular
      
      const result = await CacheService.set('circular', circular)
      
      expect(result).toBe(false)
      expect(logger.error).toHaveBeenCalled()
    })

    test('should handle very large keys gracefully', async () => {
      const longKey = 'k'.repeat(10000)
      
      await CacheService.get(longKey)
      
      expect(mockRedisClient.get).toHaveBeenCalledWith(`default:${longKey}`)
    })

    test('should handle undefined values', async () => {
      const result = await CacheService.set('key', undefined)
      
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'default:key',
        3600,
        'undefined'
      )
      expect(result).toBe(true)
    })
  })
})