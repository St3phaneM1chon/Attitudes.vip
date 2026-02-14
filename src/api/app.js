/**
 * Application Express avec Swagger et optimisations
 * Point d'entrée principal de l'API
 */

const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
require('dotenv').config()

// Configuration
const { setupSwagger } = require('./swagger-config')
const { configurePerformanceOptimizations, warmupCache } = require('../config/performance-config')
const apiRoutes = require('./routes')

// Créer l'application Express
const app = express()

// Sécurité
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", 'data:', 'https:']
    }
  }
}))

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}))

// Logging
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'))
} else {
  app.use(morgan('dev'))
}

// Trust proxy pour obtenir la vraie IP
app.set('trust proxy', 1)

// Configurer les optimisations de performance
configurePerformanceOptimizations(app)

// Routes API
app.use('/api/v1', apiRoutes)

// Configuration Swagger
setupSwagger(app)

// Page d'accueil
app.get('/', (req, res) => {
  res.json({
    name: 'Attitudes.vip API',
    version: '1.0.0',
    documentation: '/api/v1/docs',
    health: '/api/v1/health',
    status: 'operational'
  })
})

// Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.path} not found`
  })
})

// Gestion globale des erreurs
app.use((err, req, res, _next) => {
  console.error('Global error handler:', err)

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err
    })
  })
})

// Démarrage du serveur
async function startServer () {
  try {
    // Préchauffer le cache
    await warmupCache()

    const PORT = process.env.PORT || 3000

    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║          🎉 Attitudes.vip API Server 🎉           ║
║                                                   ║
╠═══════════════════════════════════════════════════╣
║                                                   ║
║  🚀 Server running on port ${PORT}                   ║
║  📚 API Docs: http://localhost:${PORT}/api/v1/docs   ║
║  🏥 Health: http://localhost:${PORT}/api/v1/health   ║
║  🔧 Environment: ${process.env.NODE_ENV || 'development'}                     ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
      `)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Gestion des signaux pour arrêt propre
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...')

  // Fermer les connexions
  const { cache, queryOptimizer } = require('../config/performance-config')
  await cache.close()
  await queryOptimizer.close()

  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...')

  const { cache, queryOptimizer } = require('../config/performance-config')
  await cache.close()
  await queryOptimizer.close()

  process.exit(0)
})

// Démarrer le serveur si ce n'est pas un import
if (require.main === module) {
  startServer()
}

module.exports = app
