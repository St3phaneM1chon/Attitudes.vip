// Configuration de l'environnement de test
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only'
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/attitudes_test'
process.env.REDIS_URL = 'redis://localhost:6379/1'

// Désactiver les logs pendant les tests
if (!process.env.DEBUG_TESTS) {
  console.log = jest.fn()
  console.error = jest.fn()
  console.warn = jest.fn()
  console.info = jest.fn()
}

// Timeout global pour les tests
jest.setTimeout(10000)

// Mock des services externes
jest.mock('../src/services/notification/email-service', () => ({
  sendEmail: jest.fn().mockResolvedValue(true)
}))

jest.mock('../src/services/notification/sms-service', () => ({
  sendSMS: jest.fn().mockResolvedValue(true)
}))

// Nettoyage après chaque test
afterEach(() => {
  jest.clearAllMocks()
})

// Fermer les connexions après tous les tests
afterAll(async () => {
  // Fermer les connexions de base de données et Redis si nécessaire
  const { sequelize } = require('../src/models')
  if (sequelize) {
    await sequelize.close()
  }
})

// Helpers globaux pour les tests
global.testHelpers = {
  // Créer un utilisateur de test
  createTestUser: (overrides = {}) => ({
    id: 1,
    email: 'test@test.com',
    password: 'hashedpassword',
    role: 'customer',
    isActive: true,
    ...overrides
  }),
  
  // Créer un token JWT de test
  createTestToken: (payload = {}) => {
    const jwt = require('jsonwebtoken')
    return jwt.sign(
      { id: 1, email: 'test@test.com', role: 'customer', ...payload },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    )
  },
  
  // Headers d'authentification
  authHeaders: (token) => ({
    Authorization: `Bearer ${token}`
  })
}