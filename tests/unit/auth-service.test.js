const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const passport = require('passport')
const request = require('supertest')
const { 
  app, 
  requirePermission, 
  requireRole, 
  generateJWT,
  users,
  checkExistingUser,
  saveUser,
  findUserByEmail,
  updateUser
} = require('../../src/auth/auth-service')

// Mock dependencies
jest.mock('jsonwebtoken')
jest.mock('bcrypt')
jest.mock('passport')
jest.mock('../../docs/architecture/permissions-matrix.json', () => ({
  roles: {
    cio: {
      permissions: ['*'],
      dashboard: '/dashboard/cio'
    },
    admin: {
      permissions: ['read', 'write', 'delete'],
      dashboard: '/dashboard/admin'
    },
    customer: {
      permissions: ['read'],
      dashboard: '/dashboard/customer'
    },
    vendor: {
      permissions: ['read', 'write'],
      dashboard: '/dashboard/vendor'
    }
  }
}))

// Clean up environment
const originalEnv = process.env

beforeEach(() => {
  // Clear all mocks
  jest.clearAllMocks()
  
  // Clear users map
  users.clear()
  
  // Reset environment
  process.env = { 
    ...originalEnv,
    JWT_SECRET: 'test-secret-key',
    ALLOWED_ORIGINS: 'http://localhost:3000,http://localhost:3001',
    CLIENT_DOMAINS: 'client1.com,client2.com',
    VENDOR_DOMAINS: 'vendor1.com,vendor2.com'
  }
})

afterEach(() => {
  process.env = originalEnv
})

describe('Auth Service', () => {
  describe('JWT Generation', () => {
    test('should generate JWT with correct payload', () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'customer',
        tenant: 'default',
        permissions: ['read'],
        dashboardUrl: '/dashboard/customer',
        provider: 'local'
      }

      const mockToken = 'mock.jwt.token'
      jwt.sign.mockReturnValue(mockToken)

      const token = generateJWT(mockUser)

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
          tenant: mockUser.tenant,
          permissions: mockUser.permissions
        }),
        'test-secret-key',
        expect.objectContaining({
          algorithm: 'HS256',
          issuer: 'attitudes-vip',
          audience: 'attitudes-vip-users'
        })
      )
      expect(token).toBe(mockToken)
    })

    test('should throw error if JWT_SECRET is not set', () => {
      delete process.env.JWT_SECRET
      
      const mockUser = { id: 'user123' }
      
      expect(() => generateJWT(mockUser)).toThrow('JWT_SECRET environment variable is required')
    })
  })

  describe('Permission Middleware', () => {
    let req, res, next

    beforeEach(() => {
      req = {
        headers: {},
        query: {},
        cookies: {}
      }
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }
      next = jest.fn()
    })

    test('should pass if user has required permission', () => {
      const mockDecoded = {
        id: 'user123',
        permissions: ['read', 'write']
      }
      
      req.headers.authorization = 'Bearer valid.token'
      jwt.verify.mockReturnValue(mockDecoded)

      const middleware = requirePermission('read')
      middleware(req, res, next)

      expect(jwt.verify).toHaveBeenCalledWith('valid.token', 'test-secret-key')
      expect(req.user).toEqual(mockDecoded)
      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })

    test('should pass if user has wildcard permission', () => {
      const mockDecoded = {
        id: 'user123',
        permissions: ['*']
      }
      
      req.headers.authorization = 'Bearer valid.token'
      jwt.verify.mockReturnValue(mockDecoded)

      const middleware = requirePermission('delete')
      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
    })

    test('should reject if token is missing', () => {
      const middleware = requirePermission('read')
      middleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        error: 'Token manquant',
        code: 'MISSING_TOKEN'
      })
      expect(next).not.toHaveBeenCalled()
    })

    test('should reject if user lacks permission', () => {
      const mockDecoded = {
        id: 'user123',
        permissions: ['read']
      }
      
      req.headers.authorization = 'Bearer valid.token'
      jwt.verify.mockReturnValue(mockDecoded)

      const middleware = requirePermission('write')
      middleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({
        error: 'Permission write requise',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: 'write',
        userPermissions: ['read']
      })
    })

    test('should handle expired token', () => {
      req.headers.authorization = 'Bearer expired.token'
      
      const error = new Error('Token expired')
      error.name = 'TokenExpiredError'
      jwt.verify.mockImplementation(() => { throw error })

      const middleware = requirePermission('read')
      middleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        error: 'Token expiré',
        code: 'TOKEN_EXPIRED'
      })
    })

    test('should handle invalid token', () => {
      req.headers.authorization = 'Bearer invalid.token'
      jwt.verify.mockImplementation(() => { throw new Error('Invalid token') })

      const middleware = requirePermission('read')
      middleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        error: 'Token invalide',
        code: 'INVALID_TOKEN'
      })
    })

    test('should accept token from query parameter', () => {
      const mockDecoded = { id: 'user123', permissions: ['*'] }
      req.query.token = 'query.token'
      jwt.verify.mockReturnValue(mockDecoded)

      const middleware = requirePermission('read')
      middleware(req, res, next)

      expect(jwt.verify).toHaveBeenCalledWith('query.token', 'test-secret-key')
      expect(next).toHaveBeenCalled()
    })

    test('should accept token from cookie', () => {
      const mockDecoded = { id: 'user123', permissions: ['*'] }
      req.cookies.authToken = 'cookie.token'
      jwt.verify.mockReturnValue(mockDecoded)

      const middleware = requirePermission('read')
      middleware(req, res, next)

      expect(jwt.verify).toHaveBeenCalledWith('cookie.token', 'test-secret-key')
      expect(next).toHaveBeenCalled()
    })
  })

  describe('Role Middleware', () => {
    let req, res, next

    beforeEach(() => {
      req = {
        headers: { authorization: 'Bearer valid.token' },
        query: {},
        cookies: {}
      }
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }
      next = jest.fn()
    })

    test('should pass if user has required role', () => {
      const mockDecoded = {
        id: 'user123',
        role: 'admin',
        permissions: ['*']
      }
      
      jwt.verify.mockReturnValue(mockDecoded)

      const middleware = requireRole('admin')
      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
    })

    test('should pass if user is CIO regardless of required role', () => {
      const mockDecoded = {
        id: 'user123',
        role: 'cio',
        permissions: ['*']
      }
      
      jwt.verify.mockReturnValue(mockDecoded)

      const middleware = requireRole('vendor')
      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
    })

    test('should reject if user lacks required role', () => {
      const mockDecoded = {
        id: 'user123',
        role: 'customer',
        permissions: ['*']
      }
      
      jwt.verify.mockReturnValue(mockDecoded)

      const middleware = requireRole('admin')
      middleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({
        error: 'Rôle admin requis',
        code: 'INSUFFICIENT_ROLE',
        required: 'admin',
        userRole: 'customer'
      })
    })
  })

  describe('Registration Endpoint', () => {
    test('should register new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'securePassword123',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'customer',
        locale: 'fr'
      }

      bcrypt.hash.mockResolvedValue('hashedPassword')
      jwt.sign.mockReturnValue('mock.jwt.token')

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201)

      expect(bcrypt.hash).toHaveBeenCalledWith('securePassword123', 12)
      expect(response.body).toMatchObject({
        success: true,
        message: 'Utilisateur créé avec succès',
        user: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role
        },
        token: 'mock.jwt.token'
      })

      // Verify user was saved
      const savedUser = await findUserByEmail(userData.email)
      expect(savedUser).toBeTruthy()
      expect(savedUser.password).toBe('hashedPassword')
    })

    test('should reject registration with missing fields', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123'
          // Missing firstName and lastName
        })
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'Tous les champs sont requis',
        code: 'MISSING_FIELDS'
      })
    })

    test('should reject registration with invalid email', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe'
        })
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'Format d\'email invalide',
        code: 'INVALID_EMAIL'
      })
    })

    test('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'weak',
          firstName: 'John',
          lastName: 'Doe'
        })
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'Le mot de passe doit contenir au moins 8 caractères',
        code: 'WEAK_PASSWORD'
      })
    })

    test('should reject registration if user already exists', async () => {
      const existingUser = {
        email: 'existing@example.com',
        password: 'hashedPassword',
        firstName: 'Existing',
        lastName: 'User'
      }
      
      await saveUser(existingUser)

      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'password123',
          firstName: 'New',
          lastName: 'User'
        })
        .expect(409)

      expect(response.body).toMatchObject({
        error: 'Un utilisateur avec cet email existe déjà',
        code: 'USER_EXISTS'
      })
    })
  })

  describe('Login Endpoint', () => {
    test('should login successfully with valid credentials', async () => {
      const user = {
        id: 'user123',
        email: 'test@example.com',
        password: 'hashedPassword',
        firstName: 'John',
        lastName: 'Doe',
        role: 'customer',
        locale: 'fr',
        isActive: true
      }
      
      await saveUser(user)
      bcrypt.compare.mockResolvedValue(true)
      jwt.sign.mockReturnValue('mock.jwt.token')

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(200)

      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword')
      expect(response.body).toMatchObject({
        success: true,
        message: 'Connexion réussie',
        user: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        },
        token: 'mock.jwt.token'
      })
    })

    test('should reject login with missing credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com' })
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'Email et mot de passe requis',
        code: 'MISSING_CREDENTIALS'
      })
    })

    test('should reject login with invalid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        })
        .expect(401)

      expect(response.body).toMatchObject({
        error: 'Identifiants invalides',
        code: 'INVALID_CREDENTIALS'
      })
    })

    test('should reject login if account is disabled', async () => {
      const user = {
        email: 'disabled@example.com',
        password: 'hashedPassword',
        isActive: false
      }
      
      await saveUser(user)
      bcrypt.compare.mockResolvedValue(true)

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'disabled@example.com',
          password: 'password123'
        })
        .expect(403)

      expect(response.body).toMatchObject({
        error: 'Compte désactivé',
        code: 'ACCOUNT_DISABLED'
      })
    })
  })

  describe('OAuth Endpoints', () => {
    test('should handle Google OAuth callback', async () => {
      const mockProfile = {
        emails: [{ value: 'oauth@example.com' }],
        displayName: 'OAuth User'
      }

      jwt.sign.mockReturnValue('mock.jwt.token')

      const response = await request(app)
        .post('/auth/oauth/google')
        .send({
          accessToken: 'google.access.token',
          profile: mockProfile
        })
        .expect(201)

      expect(response.body).toMatchObject({
        success: true,
        message: 'Utilisateur OAuth créé avec succès',
        token: 'mock.jwt.token'
      })
    })

    test('should login existing OAuth user', async () => {
      const existingUser = {
        id: 'user123',
        email: 'oauth@example.com',
        firstName: 'OAuth',
        lastName: 'User',
        role: 'customer'
      }
      
      await saveUser(existingUser)
      jwt.sign.mockReturnValue('mock.jwt.token')

      const response = await request(app)
        .post('/auth/oauth/google')
        .send({
          accessToken: 'google.access.token',
          profile: {
            emails: [{ value: 'oauth@example.com' }],
            displayName: 'OAuth User'
          }
        })
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: 'Connexion OAuth réussie'
      })
    })
  })

  describe('Profile Endpoint', () => {
    test('should return user profile with valid token', async () => {
      const mockDecoded = {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'customer',
        locale: 'fr',
        tenant: 'default',
        permissions: ['read'],
        dashboardUrl: '/dashboard/customer'
      }

      jwt.verify.mockReturnValue(mockDecoded)

      const response = await request(app)
        .get('/auth/profile')
        .set('Authorization', 'Bearer valid.token')
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        user: {
          id: mockDecoded.id,
          email: mockDecoded.email,
          firstName: mockDecoded.firstName,
          lastName: mockDecoded.lastName,
          role: mockDecoded.role
        }
      })
    })

    test('should reject profile request without token', async () => {
      const response = await request(app)
        .get('/auth/profile')
        .expect(401)

      expect(response.body).toMatchObject({
        error: 'Token manquant',
        code: 'MISSING_TOKEN'
      })
    })
  })

  describe('Logout Endpoint', () => {
    test('should logout successfully', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: 'Utilisateur déconnecté avec succès'
      })
    })
  })

  describe('Token Refresh', () => {
    test('should refresh token successfully', async () => {
      const mockDecoded = {
        id: 'user123',
        userId: 'user123',
        type: 'refresh'
      }

      jwt.verify.mockReturnValue(mockDecoded)
      jwt.sign
        .mockReturnValueOnce('new.access.token')
        .mockReturnValueOnce('new.refresh.token')

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'valid.refresh.token' })
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        token: 'new.access.token',
        refreshToken: 'new.refresh.token',
        expiresIn: 86400
      })
    })

    test('should reject refresh without token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({})
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'Refresh token manquant'
      })
    })
  })

  describe('Role Determination', () => {
    test('should identify CIO role from email', async () => {
      const userData = {
        email: 'cio@attitudes.vip',
        password: 'password123',
        firstName: 'CIO',
        lastName: 'User'
      }

      bcrypt.hash.mockResolvedValue('hashedPassword')
      jwt.sign.mockReturnValue('mock.jwt.token')

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201)

      const savedUser = await findUserByEmail(userData.email)
      expect(savedUser.role).toBe('cio')
      expect(savedUser.permissions).toContain('*')
    })

    test('should identify admin role from attitudes.vip domain', async () => {
      const userData = {
        email: 'admin@attitudes.vip',
        password: 'password123',
        firstName: 'Admin',
        lastName: 'User'
      }

      bcrypt.hash.mockResolvedValue('hashedPassword')
      jwt.sign.mockReturnValue('mock.jwt.token')

      await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201)

      const savedUser = await findUserByEmail(userData.email)
      expect(savedUser.role).toBe('admin')
    })

    test('should identify client role from configured domains', async () => {
      const userData = {
        email: 'user@client1.com',
        password: 'password123',
        firstName: 'Client',
        lastName: 'User'
      }

      bcrypt.hash.mockResolvedValue('hashedPassword')
      jwt.sign.mockReturnValue('mock.jwt.token')

      await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201)

      const savedUser = await findUserByEmail(userData.email)
      expect(savedUser.role).toBe('client')
    })

    test('should default to customer role', async () => {
      const userData = {
        email: 'user@gmail.com',
        password: 'password123',
        firstName: 'Regular',
        lastName: 'User'
      }

      bcrypt.hash.mockResolvedValue('hashedPassword')
      jwt.sign.mockReturnValue('mock.jwt.token')

      await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201)

      const savedUser = await findUserByEmail(userData.email)
      expect(savedUser.role).toBe('customer')
    })
  })
})