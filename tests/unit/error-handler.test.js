const { 
  AppError, 
  errorHandler, 
  handleUnhandledRejection,
  handleUncaughtException,
  notFoundHandler,
  asyncHandler,
  errorCodes
} = require('../../src/middleware/error-handler')
const logger = require('../../src/utils/logger')

// Mock dependencies
jest.mock('../../src/utils/logger')

// Mock process.exit
const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {})

afterAll(() => {
  mockExit.mockRestore()
})

describe('Error Handler Middleware', () => {
  describe('AppError Class', () => {
    test('should create AppError with all properties', () => {
      const error = new AppError(
        'Test error message',
        'TEST_ERROR',
        400,
        { field: 'value' }
      )

      expect(error.message).toBe('Test error message')
      expect(error.code).toBe('TEST_ERROR')
      expect(error.statusCode).toBe(400)
      expect(error.isOperational).toBe(true)
      expect(error.details).toEqual({ field: 'value' })
      expect(error.timestamp).toBeDefined()
      expect(error.stack).toBeDefined()
    })

    test('should create AppError with default status code', () => {
      const error = new AppError('Test error', 'TEST_ERROR')
      
      expect(error.statusCode).toBe(500)
      expect(error.details).toBeNull()
    })
  })

  describe('errorHandler Middleware', () => {
    let req, res, next

    beforeEach(() => {
      req = {
        method: 'GET',
        url: '/test',
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('Mozilla/5.0'),
        user: { id: 'user123' },
        sessionID: 'session123'
      }
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }
      next = jest.fn()
      
      // Reset environment
      process.env.NODE_ENV = 'test'
    })

    test('should handle operational error', () => {
      const error = new AppError('Operational error', 'OP_ERROR', 400)
      
      errorHandler(error, req, res, next)

      expect(logger.error).toHaveBeenCalledWith({
        error: {
          message: error.message,
          code: error.code,
          stack: error.stack,
          statusCode: error.statusCode,
          details: error.details
        },
        request: {
          method: 'GET',
          url: '/test',
          ip: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          userId: 'user123',
          sessionId: 'session123'
        },
        timestamp: expect.any(String)
      })

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        code: 'OP_ERROR',
        message: 'Operational error',
        details: null,
        stack: expect.any(String),
        timestamp: expect.any(String)
      })
    })

    test('should handle ValidationError', () => {
      const error = {
        name: 'ValidationError',
        errors: {
          field1: { message: 'Field1 is required' },
          field2: { message: 'Field2 must be valid' }
        }
      }
      
      errorHandler(error, req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        code: errorCodes.VALIDATION_INVALID_FORMAT,
        message: 'Données invalides',
        details: ['Field1 is required', 'Field2 must be valid'],
        stack: undefined,
        timestamp: expect.any(String)
      })
    })

    test('should handle CastError', () => {
      const error = {
        name: 'CastError',
        message: 'Cast to ObjectId failed'
      }
      
      errorHandler(error, req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        code: errorCodes.VALIDATION_INVALID_TYPE,
        message: 'Format de données incorrect',
        details: undefined,
        stack: undefined,
        timestamp: expect.any(String)
      })
    })

    test('should handle MongoDB duplicate key error', () => {
      const error = {
        name: 'MongoError',
        code: 11000,
        message: 'Duplicate key error'
      }
      
      errorHandler(error, req, res, next)

      expect(res.status).toHaveBeenCalledWith(409)
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        code: errorCodes.DB_DUPLICATE_ENTRY,
        message: 'Cette ressource existe déjà',
        details: undefined,
        stack: undefined,
        timestamp: expect.any(String)
      })
    })

    test('should handle TokenExpiredError', () => {
      const error = {
        name: 'TokenExpiredError',
        message: 'jwt expired'
      }
      
      errorHandler(error, req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        code: errorCodes.AUTH_TOKEN_EXPIRED,
        message: 'Token expiré',
        details: undefined,
        stack: undefined,
        timestamp: expect.any(String)
      })
    })

    test('should handle JsonWebTokenError', () => {
      const error = {
        name: 'JsonWebTokenError',
        message: 'invalid signature'
      }
      
      errorHandler(error, req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        code: errorCodes.AUTH_TOKEN_INVALID,
        message: 'Token invalide',
        details: undefined,
        stack: undefined,
        timestamp: expect.any(String)
      })
    })

    test('should hide details in production for non-operational errors', () => {
      process.env.NODE_ENV = 'production'
      const error = new Error('Internal server error')
      error.statusCode = 500
      
      errorHandler(error, req, res, next)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        code: errorCodes.SYSTEM_INTERNAL_ERROR,
        message: 'Une erreur est survenue',
        details: null
      })
    })

    test('should show details in non-production for non-operational errors', () => {
      process.env.NODE_ENV = 'development'
      const error = new Error('Detailed error message')
      error.statusCode = 500
      
      errorHandler(error, req, res, next)

      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        code: undefined,
        message: 'Detailed error message',
        details: undefined,
        stack: expect.any(String),
        timestamp: expect.any(String)
      })
    })

    test('should handle error without user context', () => {
      req.user = undefined
      req.sessionID = undefined
      const error = new AppError('Test error', 'TEST_ERROR', 400)
      
      errorHandler(error, req, res, next)

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            userId: undefined,
            sessionId: undefined
          })
        })
      )
    })
  })

  describe('notFoundHandler Middleware', () => {
    test('should create 404 error', () => {
      const req = { originalUrl: '/api/missing-route' }
      const res = {}
      const next = jest.fn()
      
      notFoundHandler(req, res, next)

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Route non trouvée: /api/missing-route',
          code: errorCodes.SYSTEM_FILE_NOT_FOUND,
          statusCode: 404
        })
      )
    })
  })

  describe('asyncHandler Wrapper', () => {
    test('should handle successful async function', async () => {
      const req = { body: { test: 'data' } }
      const res = { json: jest.fn() }
      const next = jest.fn()
      
      const asyncFunction = async (req, res) => {
        res.json({ success: true })
      }
      
      const wrapped = asyncHandler(asyncFunction)
      await wrapped(req, res, next)

      expect(res.json).toHaveBeenCalledWith({ success: true })
      expect(next).not.toHaveBeenCalled()
    })

    test('should catch async errors', async () => {
      const req = {}
      const res = {}
      const next = jest.fn()
      
      const asyncFunction = async () => {
        throw new Error('Async error')
      }
      
      const wrapped = asyncHandler(asyncFunction)
      await wrapped(req, res, next)

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Async error'
        })
      )
    })

    test('should handle synchronous errors in async handler', async () => {
      const req = {}
      const res = {}
      const next = jest.fn()
      
      const asyncFunction = () => {
        throw new Error('Sync error in async')
      }
      
      const wrapped = asyncHandler(asyncFunction)
      await wrapped(req, res, next)

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Sync error in async'
        })
      )
    })
  })

  describe('Process Event Handlers', () => {
    let originalEnv

    beforeEach(() => {
      originalEnv = process.env.NODE_ENV
      jest.clearAllMocks()
    })

    afterEach(() => {
      process.env.NODE_ENV = originalEnv
      // Remove all listeners to prevent interference
      process.removeAllListeners('unhandledRejection')
      process.removeAllListeners('uncaughtException')
    })

    describe('handleUnhandledRejection', () => {
      test('should log unhandled rejection', () => {
        handleUnhandledRejection()
        
        const promise = Promise.resolve()
        const reason = new Error('Unhandled rejection')
        
        process.emit('unhandledRejection', reason, promise)

        expect(logger.error).toHaveBeenCalledWith({
          type: 'unhandledRejection',
          reason,
          promise,
          timestamp: expect.any(String)
        })
      })

      test('should exit process in production', () => {
        process.env.NODE_ENV = 'production'
        handleUnhandledRejection()
        
        const promise = Promise.resolve()
        const reason = new Error('Unhandled rejection')
        
        process.emit('unhandledRejection', reason, promise)

        expect(logger.info).toHaveBeenCalledWith(
          'Arrêt du serveur suite à une rejection non gérée...'
        )
        expect(mockExit).toHaveBeenCalledWith(1)
      })

      test('should not exit process in development', () => {
        process.env.NODE_ENV = 'development'
        handleUnhandledRejection()
        
        const promise = Promise.resolve()
        const reason = new Error('Unhandled rejection')
        
        process.emit('unhandledRejection', reason, promise)

        expect(mockExit).not.toHaveBeenCalled()
      })
    })

    describe('handleUncaughtException', () => {
      test('should log uncaught exception and exit', () => {
        handleUncaughtException()
        
        const error = new Error('Uncaught exception')
        error.stack = 'Error stack trace'
        
        process.emit('uncaughtException', error)

        expect(logger.error).toHaveBeenCalledWith({
          type: 'uncaughtException',
          error: {
            message: 'Uncaught exception',
            stack: 'Error stack trace'
          },
          timestamp: expect.any(String)
        })

        expect(logger.info).toHaveBeenCalledWith(
          'Arrêt du serveur suite à une exception non capturée...'
        )
        expect(mockExit).toHaveBeenCalledWith(1)
      })

      test('should always exit regardless of environment', () => {
        process.env.NODE_ENV = 'development'
        handleUncaughtException()
        
        const error = new Error('Uncaught exception')
        process.emit('uncaughtException', error)

        expect(mockExit).toHaveBeenCalledWith(1)
      })
    })
  })

  describe('Error Code Integration', () => {
    let req, res, next

    beforeEach(() => {
      req = {
        method: 'GET',
        url: '/test',
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('Mozilla/5.0')
      }
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }
      next = jest.fn()
    })

    test('should use correct error codes for different error types', () => {
      // Test each error type with its corresponding code
      const errorScenarios = [
        {
          error: { name: 'ValidationError', errors: { field: { message: 'Invalid' } } },
          expectedCode: errorCodes.VALIDATION_INVALID_FORMAT,
          expectedStatus: 400
        },
        {
          error: { name: 'CastError' },
          expectedCode: errorCodes.VALIDATION_INVALID_TYPE,
          expectedStatus: 400
        },
        {
          error: { name: 'MongoError', code: 11000 },
          expectedCode: errorCodes.DB_DUPLICATE_ENTRY,
          expectedStatus: 409
        },
        {
          error: { name: 'TokenExpiredError' },
          expectedCode: errorCodes.AUTH_TOKEN_EXPIRED,
          expectedStatus: 401
        },
        {
          error: { name: 'JsonWebTokenError' },
          expectedCode: errorCodes.AUTH_TOKEN_INVALID,
          expectedStatus: 401
        }
      ]

      errorScenarios.forEach(scenario => {
        jest.clearAllMocks()
        errorHandler(scenario.error, req, res, next)
        
        expect(res.status).toHaveBeenCalledWith(scenario.expectedStatus)
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            code: scenario.expectedCode
          })
        )
      })
    })
  })

  describe('AppError Usage Examples', () => {
    test('should create authentication error', () => {
      const error = new AppError(
        'Invalid credentials',
        errorCodes.AUTH_INVALID_CREDENTIALS,
        401
      )

      expect(error.code).toBe('AUTH001')
      expect(error.statusCode).toBe(401)
    })

    test('should create validation error with details', () => {
      const validationDetails = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'password', message: 'Password too short' }
      ]
      
      const error = new AppError(
        'Validation failed',
        errorCodes.VALIDATION_INVALID_FORMAT,
        400,
        validationDetails
      )

      expect(error.code).toBe('VAL002')
      expect(error.details).toEqual(validationDetails)
    })

    test('should create business logic error', () => {
      const error = new AppError(
        'Insufficient permissions',
        errorCodes.BUSINESS_INSUFFICIENT_PERMISSIONS,
        403,
        { requiredRole: 'admin', userRole: 'customer' }
      )

      expect(error.code).toBe('BUS003')
      expect(error.details.requiredRole).toBe('admin')
    })
  })

  describe('Error Codes', () => {
    test('should have all required error code categories', () => {
      expect(errorCodes).toHaveProperty('AUTH_INVALID_CREDENTIALS')
      expect(errorCodes).toHaveProperty('DB_CONNECTION_ERROR')
      expect(errorCodes).toHaveProperty('BUSINESS_INVALID_OPERATION')
      expect(errorCodes).toHaveProperty('VALIDATION_REQUIRED_FIELD')
      expect(errorCodes).toHaveProperty('PAYMENT_CARD_DECLINED')
      expect(errorCodes).toHaveProperty('SYSTEM_INTERNAL_ERROR')
    })
    
    test('all error codes should follow naming convention', () => {
      Object.entries(errorCodes).forEach(([key, value]) => {
        // Les clés doivent être en MAJUSCULES avec underscores
        expect(key).toMatch(/^[A-Z_]+$/)
        
        // Les valeurs doivent suivre le pattern CATEGORY + numéro
        expect(value).toMatch(/^[A-Z]+\d{3}$/)
      })
    })
  })
})