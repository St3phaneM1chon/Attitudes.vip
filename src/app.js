const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const compression = require('compression')
const rateLimit = require('express-rate-limit')
require('dotenv').config()

// Utilitaires
const logger = require('./utils/logger')
const {
  errorHandler,
  notFoundHandler,
  handleUnhandledRejection,
  handleUncaughtException
} = require('./middleware/error-handler')

// Configurer les gestionnaires d'erreurs globaux
handleUnhandledRejection()
handleUncaughtException()

// Créer l'application Express
const app = express()

// Trust proxy
app.set('trust proxy', 1)

// Middleware de sécurité avec Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.tailwindcss.com', 'unpkg.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'cdn.tailwindcss.com'],
      imgSrc: ["'self'", 'data:', 'https:', '*.cloudinary.com'],
      fontSrc: ["'self'", 'fonts.googleapis.com', 'fonts.gstatic.com'],
      connectSrc: ["'self'", 'wss:', 'ws:', 'localhost:*', '127.0.0.1:*'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", '*.cloudinary.com'],
      frameSrc: ["'self'", '*.stripe.com']
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}))

// CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
}))

// Compression
app.use(compression())

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Logging HTTP
app.use(morgan('combined', { stream: logger.stream }))

// Rate limiting global
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limite par IP
  message: 'Trop de requêtes depuis cette IP',
  standardHeaders: true,
  legacyHeaders: false
})

app.use('/api/', limiter)

// Health check endpoints
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'alive' })
})

app.get('/health/ready', async (req, res) => {
  try {
    // Vérifier les dépendances critiques
    const checks = {
      database: false,
      redis: false,
      services: true
    }
    
    // TODO: Implémenter les vérifications réelles
    // const db = await checkDatabaseConnection()
    // const redis = await checkRedisConnection()
    
    const allHealthy = Object.values(checks).every(check => check === true)
    
    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'ready' : 'not ready',
      checks
    })
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: error.message
    })
  }
})

// Routes API
const apiRoutes = require('./routes/api')
const dashboardRoutes = require('./routes/dashboard.routes')

// Monter les routes API v1
app.use('/api/v1', apiRoutes)

// Routes des dashboards (pour servir les pages)
app.use('/dashboard', dashboardRoutes)

// Route pour l'authentification OAuth callbacks
app.use('/auth', require('./routes/auth'))

// Servir les fichiers statiques en production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('public'))
}

// Middleware 404
app.use(notFoundHandler)

// Middleware de gestion des erreurs (doit être le dernier)
app.use(errorHandler)

// Logger le démarrage
logger.info({
  message: 'Application initialisée',
  environment: process.env.NODE_ENV,
  nodeVersion: process.version,
  pid: process.pid
})

module.exports = app