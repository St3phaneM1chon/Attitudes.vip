const socketIO = require('socket.io')
const jwt = require('jsonwebtoken')
const redis = require('redis')
const WebSocketService = require('../../src/services/websocket/websocket-service')
const logger = require('../../src/utils/logger')

// Mock dependencies
jest.mock('socket.io')
jest.mock('jsonwebtoken')
jest.mock('redis')
jest.mock('../../src/utils/logger')

// Mock Socket.IO server
const mockIO = {
  on: jest.fn(),
  of: jest.fn(),
  emit: jest.fn(),
  to: jest.fn().mockReturnThis(),
  close: jest.fn(),
  engine: { clientsCount: 10 },
  use: jest.fn()
}

// Mock namespace
const mockNamespace = {
  on: jest.fn(),
  use: jest.fn(),
  emit: jest.fn(),
  to: jest.fn().mockReturnThis(),
  sockets: new Map()
}

// Mock socket
const mockSocket = {
  id: 'socket123',
  handshake: {
    auth: { token: 'valid.token' },
    query: {}
  },
  userId: null,
  userRole: null,
  clientId: null,
  join: jest.fn(),
  leave: jest.fn(),
  emit: jest.fn(),
  on: jest.fn(),
  to: jest.fn().mockReturnThis(),
  disconnect: jest.fn(),
  connected: true
}

// Mock Redis clients
const mockRedisClient = {
  connect: jest.fn(),
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  publish: jest.fn(),
  keys: jest.fn(),
  quit: jest.fn()
}

const mockRedisSubscriber = {
  connect: jest.fn(),
  subscribe: jest.fn(),
  quit: jest.fn()
}

beforeEach(() => {
  jest.clearAllMocks()
  
  // Reset WebSocketService state
  WebSocketService.io = null
  WebSocketService.redisClient = null
  WebSocketService.redisSubscriber = null
  WebSocketService.namespaces = {}
  WebSocketService.rooms.clear()
  
  // Setup mocks
  socketIO.mockReturnValue(mockIO)
  mockIO.of.mockReturnValue(mockNamespace)
  redis.createClient.mockReturnValue(mockRedisClient)
    .mockReturnValueOnce(mockRedisClient)
    .mockReturnValueOnce(mockRedisSubscriber)
  
  // Default environment
  process.env.REDIS_URL = 'redis://localhost:6379'
  process.env.ALLOWED_ORIGINS = 'http://localhost:3000,http://localhost:3001'
  process.env.JWT_SECRET = 'test-secret'
})

describe('WebSocketService', () => {
  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      const mockServer = {}
      
      await WebSocketService.initialize(mockServer)
      
      expect(socketIO).toHaveBeenCalledWith(mockServer, {
        cors: {
          origin: ['http://localhost:3000', 'http://localhost:3001'],
          credentials: true
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000
      })
      
      expect(redis.createClient).toHaveBeenCalledTimes(2)
      expect(mockRedisClient.connect).toHaveBeenCalled()
      expect(mockRedisSubscriber.connect).toHaveBeenCalled()
      expect(mockIO.use).toHaveBeenCalled()
      expect(mockIO.on).toHaveBeenCalledWith('connection', expect.any(Function))
      expect(logger.info).toHaveBeenCalledWith('✅ WebSocket service initialisé')
    })

    test('should handle initialization error', async () => {
      const error = new Error('Init failed')
      mockRedisClient.connect.mockRejectedValue(error)
      
      await expect(WebSocketService.initialize({})).rejects.toThrow('Init failed')
      expect(logger.error).toHaveBeenCalledWith('Erreur initialisation WebSocket:', error)
    })

    test('should setup namespaces', async () => {
      await WebSocketService.initialize({})
      
      expect(mockIO.of).toHaveBeenCalledWith('/wedding')
      expect(mockIO.of).toHaveBeenCalledWith('/vendor')
      expect(mockIO.of).toHaveBeenCalledWith('/admin')
      expect(mockIO.of).toHaveBeenCalledWith('/notifications')
      
      expect(WebSocketService.namespaces).toHaveProperty('wedding')
      expect(WebSocketService.namespaces).toHaveProperty('vendor')
      expect(WebSocketService.namespaces).toHaveProperty('admin')
      expect(WebSocketService.namespaces).toHaveProperty('notifications')
    })
  })

  describe('Authentication', () => {
    let next

    beforeEach(() => {
      next = jest.fn()
    })

    test('should authenticate valid socket', async () => {
      const mockDecoded = {
        id: 'user123',
        role: 'customer',
        clientId: 'client456'
      }
      jwt.verify.mockReturnValue(mockDecoded)
      
      await WebSocketService.authenticateSocket(mockSocket, next)
      
      expect(jwt.verify).toHaveBeenCalledWith('valid.token', 'test-secret')
      expect(mockSocket.userId).toBe('user123')
      expect(mockSocket.userRole).toBe('customer')
      expect(mockSocket.clientId).toBe('client456')
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'socket:socket123',
        expect.stringContaining('user123'),
        { EX: 86400 }
      )
      expect(next).toHaveBeenCalledWith()
    })

    test('should reject missing token', async () => {
      const noTokenSocket = {
        ...mockSocket,
        handshake: { auth: {}, query: {} }
      }
      
      await WebSocketService.authenticateSocket(noTokenSocket, next)
      
      expect(next).toHaveBeenCalledWith(new Error('Authentication required'))
    })

    test('should reject invalid token', async () => {
      jwt.verify.mockImplementation(() => { throw new Error('Invalid token') })
      
      await WebSocketService.authenticateSocket(mockSocket, next)
      
      expect(logger.error).toHaveBeenCalledWith(
        'Socket authentication failed:',
        expect.any(Error)
      )
      expect(next).toHaveBeenCalledWith(new Error('Authentication failed'))
    })

    test('should accept token from query parameter', async () => {
      const querySocket = {
        ...mockSocket,
        handshake: {
          auth: {},
          query: { token: 'query.token' }
        }
      }
      
      const mockDecoded = { id: 'user123', role: 'customer' }
      jwt.verify.mockReturnValue(mockDecoded)
      
      await WebSocketService.authenticateSocket(querySocket, next)
      
      expect(jwt.verify).toHaveBeenCalledWith('query.token', 'test-secret')
      expect(next).toHaveBeenCalledWith()
    })
  })

  describe('Connection Handling', () => {
    beforeEach(async () => {
      await WebSocketService.initialize({})
      mockSocket.userId = 'user123'
      mockSocket.clientId = 'client456'
    })

    test('should handle new connection', () => {
      const connectionHandler = mockIO.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1]
      
      connectionHandler(mockSocket)
      
      expect(logger.info).toHaveBeenCalledWith(
        'Nouvelle connexion: socket123 - User: user123'
      )
      expect(mockSocket.join).toHaveBeenCalledWith('user:user123')
      expect(mockSocket.join).toHaveBeenCalledWith('client:client456')
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function))
      expect(mockSocket.on).toHaveBeenCalledWith('reconnect', expect.any(Function))
      expect(mockSocket.on).toHaveBeenCalledWith('ping', expect.any(Function))
    })

    test('should handle disconnection', async () => {
      const connectionHandler = mockIO.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1]
      connectionHandler(mockSocket)
      
      const disconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )[1]
      
      await disconnectHandler('transport close')
      
      expect(logger.info).toHaveBeenCalledWith(
        'Déconnexion: socket123 - Raison: transport close'
      )
      expect(mockRedisClient.del).toHaveBeenCalledWith('socket:socket123')
    })

    test('should handle reconnection', () => {
      const connectionHandler = mockIO.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1]
      connectionHandler(mockSocket)
      
      const reconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'reconnect'
      )[1]
      
      reconnectHandler()
      
      expect(logger.info).toHaveBeenCalledWith('Reconnexion: socket123')
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'reconnected',
        { timestamp: expect.any(Date) }
      )
    })

    test('should handle ping/pong', () => {
      const connectionHandler = mockIO.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1]
      connectionHandler(mockSocket)
      
      const pingHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'ping'
      )[1]
      
      pingHandler()
      
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'pong',
        { timestamp: expect.any(Date) }
      )
    })
  })

  describe('Wedding Namespace', () => {
    let weddingSocket

    beforeEach(async () => {
      await WebSocketService.initialize({})
      
      weddingSocket = { ...mockSocket }
      const connectionHandler = mockNamespace.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1]
      connectionHandler(weddingSocket)
    })

    test('should join wedding room with access', async () => {
      WebSocketService.checkWeddingAccess = jest.fn().mockResolvedValue(true)
      
      const joinHandler = weddingSocket.on.mock.calls.find(
        call => call[0] === 'join-wedding'
      )[1]
      
      await joinHandler('wedding123')
      
      expect(WebSocketService.checkWeddingAccess).toHaveBeenCalledWith(
        weddingSocket.userId,
        'wedding123'
      )
      expect(weddingSocket.join).toHaveBeenCalledWith('wedding:wedding123')
      expect(weddingSocket.emit).toHaveBeenCalledWith(
        'joined-wedding',
        { weddingId: 'wedding123' }
      )
      expect(weddingSocket.to).toHaveBeenCalledWith('wedding:wedding123')
      expect(weddingSocket.emit).toHaveBeenCalledWith('user-joined', {
        userId: weddingSocket.userId,
        timestamp: expect.any(Date)
      })
    })

    test('should deny wedding access', async () => {
      WebSocketService.checkWeddingAccess = jest.fn().mockResolvedValue(false)
      
      const joinHandler = weddingSocket.on.mock.calls.find(
        call => call[0] === 'join-wedding'
      )[1]
      
      await joinHandler('wedding123')
      
      expect(weddingSocket.join).not.toHaveBeenCalledWith('wedding:wedding123')
      expect(weddingSocket.emit).toHaveBeenCalledWith(
        'error',
        { message: 'Accès refusé' }
      )
    })

    test('should handle wedding update', async () => {
      const updateData = {
        weddingId: 'wedding123',
        type: 'details-update',
        payload: { venue: 'New Venue' }
      }
      
      const updateHandler = weddingSocket.on.mock.calls.find(
        call => call[0] === 'wedding-update'
      )[1]
      
      await updateHandler(updateData)
      
      expect(mockNamespace.to).toHaveBeenCalledWith('wedding:wedding123')
      expect(mockNamespace.emit).toHaveBeenCalledWith('update', {
        type: updateData.type,
        payload: updateData.payload,
        userId: weddingSocket.userId,
        timestamp: expect.any(Date)
      })
      expect(mockRedisClient.publish).toHaveBeenCalledWith(
        'wedding-update',
        JSON.stringify(updateData)
      )
    })

    test('should handle wedding messages', async () => {
      const messageData = {
        weddingId: 'wedding123',
        message: 'Hello everyone!'
      }
      
      const messageHandler = weddingSocket.on.mock.calls.find(
        call => call[0] === 'wedding-message'
      )[1]
      
      await messageHandler(messageData)
      
      expect(mockNamespace.to).toHaveBeenCalledWith('wedding:wedding123')
      expect(mockNamespace.emit).toHaveBeenCalledWith('new-message', {
        id: expect.any(String),
        userId: weddingSocket.userId,
        message: messageData.message,
        timestamp: expect.any(Date)
      })
    })

    test('should handle leave wedding', () => {
      const leaveHandler = weddingSocket.on.mock.calls.find(
        call => call[0] === 'leave-wedding'
      )[1]
      
      leaveHandler('wedding123')
      
      expect(weddingSocket.leave).toHaveBeenCalledWith('wedding:wedding123')
      expect(weddingSocket.to).toHaveBeenCalledWith('wedding:wedding123')
      expect(weddingSocket.emit).toHaveBeenCalledWith('user-left', {
        userId: weddingSocket.userId,
        timestamp: expect.any(Date)
      })
    })
  })

  describe('Vendor Namespace', () => {
    let vendorSocket

    beforeEach(async () => {
      await WebSocketService.initialize({})
      
      vendorSocket = { ...mockSocket }
      const connectionHandler = mockNamespace.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1]
      connectionHandler(vendorSocket)
    })

    test('should handle vendor online status', async () => {
      const onlineHandler = vendorSocket.on.mock.calls.find(
        call => call[0] === 'vendor-online'
      )[1]
      
      await onlineHandler('vendor789')
      
      expect(vendorSocket.join).toHaveBeenCalledWith('vendor:vendor789')
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'vendor:online:vendor789',
        expect.stringContaining('socket123'),
        { EX: 3600 }
      )
      expect(vendorSocket.emit).toHaveBeenCalledWith(
        'vendor-connected',
        { vendorId: 'vendor789' }
      )
    })

    test('should handle new booking', async () => {
      const bookingData = {
        vendorId: 'vendor789',
        bookingData: {
          date: '2024-06-15',
          service: 'Photography'
        }
      }
      
      const bookingHandler = vendorSocket.on.mock.calls.find(
        call => call[0] === 'new-booking'
      )[1]
      
      await bookingHandler(bookingData)
      
      expect(mockNamespace.to).toHaveBeenCalledWith('vendor:vendor789')
      expect(mockNamespace.emit).toHaveBeenCalledWith('booking-request', {
        ...bookingData.bookingData,
        timestamp: expect.any(Date)
      })
    })

    test('should handle availability update', async () => {
      const availabilityData = {
        vendorId: 'vendor789',
        availability: {
          dates: ['2024-06-15', '2024-06-16'],
          status: 'available'
        }
      }
      
      const availabilityHandler = vendorSocket.on.mock.calls.find(
        call => call[0] === 'availability-update'
      )[1]
      
      await availabilityHandler(availabilityData)
      
      expect(mockNamespace.emit).toHaveBeenCalledWith(
        'vendor-availability-changed',
        {
          vendorId: availabilityData.vendorId,
          availability: availabilityData.availability,
          timestamp: expect.any(Date)
        }
      )
    })
  })

  describe('Admin Namespace', () => {
    let adminSocket

    beforeEach(async () => {
      await WebSocketService.initialize({})
      
      adminSocket = { ...mockSocket, userRole: 'admin' }
      const connectionHandler = mockNamespace.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1]
      connectionHandler(adminSocket)
    })

    test('should allow admin access', () => {
      expect(adminSocket.disconnect).not.toHaveBeenCalled()
    })

    test('should deny non-admin access', () => {
      const customerSocket = { ...mockSocket, userRole: 'customer' }
      const connectionHandler = mockNamespace.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1]
      
      connectionHandler(customerSocket)
      
      expect(customerSocket.disconnect).toHaveBeenCalled()
    })

    test('should allow CIO access', () => {
      const cioSocket = { ...mockSocket, userRole: 'cio' }
      const connectionHandler = mockNamespace.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1]
      
      connectionHandler(cioSocket)
      
      expect(cioSocket.disconnect).not.toHaveBeenCalled()
    })

    test('should start monitoring', () => {
      const monitorHandler = adminSocket.on.mock.calls.find(
        call => call[0] === 'monitor-start'
      )[1]
      
      monitorHandler()
      
      expect(adminSocket.join).toHaveBeenCalledWith('admin:monitoring')
    })

    test('should broadcast to all users', async () => {
      const broadcastData = {
        message: 'System maintenance',
        target: 'all'
      }
      
      const broadcastHandler = adminSocket.on.mock.calls.find(
        call => call[0] === 'admin-broadcast'
      )[1]
      
      await broadcastHandler(broadcastData)
      
      expect(mockIO.emit).toHaveBeenCalledWith('admin-message', broadcastData.message)
    })

    test('should broadcast to vendors only', async () => {
      const broadcastData = {
        message: 'Vendor update',
        target: 'vendors'
      }
      
      const broadcastHandler = adminSocket.on.mock.calls.find(
        call => call[0] === 'admin-broadcast'
      )[1]
      
      await broadcastHandler(broadcastData)
      
      expect(mockNamespace.emit).toHaveBeenCalledWith('admin-message', broadcastData.message)
    })
  })

  describe('Notifications Namespace', () => {
    let notificationSocket

    beforeEach(async () => {
      await WebSocketService.initialize({})
      
      notificationSocket = { ...mockSocket, userId: 'user123' }
      const connectionHandler = mockNamespace.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1]
      connectionHandler(notificationSocket)
    })

    test('should join personal notification room', () => {
      expect(notificationSocket.join).toHaveBeenCalledWith('notifications:user123')
    })

    test('should mark notification as read', async () => {
      const readHandler = notificationSocket.on.mock.calls.find(
        call => call[0] === 'notification-read'
      )[1]
      
      await readHandler('notif123')
      
      expect(mockNamespace.to).toHaveBeenCalledWith('notifications:user123')
      expect(mockNamespace.emit).toHaveBeenCalledWith(
        'notification-marked-read',
        { notificationId: 'notif123' }
      )
    })

    test('should get unread count', async () => {
      WebSocketService.getUnreadNotificationCount = jest.fn().mockResolvedValue(5)
      
      const countHandler = notificationSocket.on.mock.calls.find(
        call => call[0] === 'get-unread-count'
      )[1]
      
      await countHandler()
      
      expect(WebSocketService.getUnreadNotificationCount).toHaveBeenCalledWith('user123')
      expect(notificationSocket.emit).toHaveBeenCalledWith(
        'unread-count',
        { count: 5 }
      )
    })
  })

  describe('Redis Pub/Sub', () => {
    beforeEach(async () => {
      await WebSocketService.initialize({})
    })

    test('should setup Redis subscriptions', async () => {
      expect(mockRedisSubscriber.subscribe).toHaveBeenCalledWith(
        'wedding-updates',
        expect.any(Function)
      )
      expect(mockRedisSubscriber.subscribe).toHaveBeenCalledWith(
        'vendor-updates',
        expect.any(Function)
      )
      expect(mockRedisSubscriber.subscribe).toHaveBeenCalledWith(
        'notifications',
        expect.any(Function)
      )
    })

    test('should handle wedding updates from Redis', async () => {
      const handler = mockRedisSubscriber.subscribe.mock.calls.find(
        call => call[0] === 'wedding-updates'
      )[1]
      
      const updateData = {
        weddingId: 'wedding123',
        type: 'update',
        data: { status: 'confirmed' }
      }
      
      handler(JSON.stringify(updateData))
      
      expect(mockNamespace.to).toHaveBeenCalledWith('wedding:wedding123')
      expect(mockNamespace.emit).toHaveBeenCalledWith('update', updateData)
    })

    test('should publish to Redis channel', async () => {
      const data = { test: 'data' }
      
      await WebSocketService.publishToRedis('test-channel', data)
      
      expect(mockRedisClient.publish).toHaveBeenCalledWith(
        'test-channel',
        JSON.stringify(data)
      )
    })
  })

  describe('Public API', () => {
    beforeEach(async () => {
      await WebSocketService.initialize({})
    })

    test('should emit to namespace', () => {
      WebSocketService.emit('wedding', 'test-event', { data: 'test' })
      
      expect(mockNamespace.emit).toHaveBeenCalledWith(
        'test-event',
        { data: 'test' }
      )
    })

    test('should emit to room in namespace', () => {
      WebSocketService.emitToRoom('vendor', 'vendor:123', 'update', { status: 'online' })
      
      expect(mockNamespace.to).toHaveBeenCalledWith('vendor:123')
      expect(mockNamespace.emit).toHaveBeenCalledWith(
        'update',
        { status: 'online' }
      )
    })

    test('should emit to user', () => {
      WebSocketService.emitToUser('user123', 'personal-event', { message: 'hello' })
      
      expect(mockIO.to).toHaveBeenCalledWith('user:user123')
      expect(mockIO.emit).toHaveBeenCalledWith(
        'personal-event',
        { message: 'hello' }
      )
    })

    test('should get online users', async () => {
      const mockKeys = ['socket:1', 'socket:2']
      const mockUsers = [
        { userId: 'user1', role: 'customer' },
        { userId: 'user2', role: 'vendor' }
      ]
      
      mockRedisClient.keys.mockResolvedValue(mockKeys)
      mockRedisClient.get
        .mockResolvedValueOnce(JSON.stringify(mockUsers[0]))
        .mockResolvedValueOnce(JSON.stringify(mockUsers[1]))
      
      const result = await WebSocketService.getOnlineUsers()
      
      expect(mockRedisClient.keys).toHaveBeenCalledWith('socket:*')
      expect(result).toEqual(mockUsers)
    })
  })

  describe('System Metrics', () => {
    test('should send system metrics periodically', async () => {
      await WebSocketService.initialize({})
      
      const adminSocket = { ...mockSocket, connected: true, emit: jest.fn() }
      jest.useFakeTimers()
      
      await WebSocketService.sendSystemMetrics(adminSocket)
      
      jest.advanceTimersByTime(5000)
      
      expect(adminSocket.emit).toHaveBeenCalledWith('system-metrics', {
        connectedClients: 10,
        namespaces: {
          wedding: 0,
          vendor: 0,
          admin: 0,
          notifications: 0
        },
        timestamp: expect.any(Date)
      })
      
      jest.useRealTimers()
    })

    test('should stop metrics when socket disconnects', async () => {
      await WebSocketService.initialize({})
      
      const adminSocket = { ...mockSocket, connected: false, emit: jest.fn() }
      jest.useFakeTimers()
      
      await WebSocketService.sendSystemMetrics(adminSocket)
      
      jest.advanceTimersByTime(5000)
      
      expect(adminSocket.emit).not.toHaveBeenCalled()
      
      jest.useRealTimers()
    })
  })

  describe('Cleanup', () => {
    test('should disconnect all connections', async () => {
      await WebSocketService.initialize({})
      
      await WebSocketService.disconnect()
      
      expect(mockIO.close).toHaveBeenCalled()
      expect(mockRedisClient.quit).toHaveBeenCalled()
      expect(mockRedisSubscriber.quit).toHaveBeenCalled()
    })

    test('should handle disconnect when not initialized', async () => {
      await WebSocketService.disconnect()
      
      expect(mockIO.close).not.toHaveBeenCalled()
    })
  })
})