const http = require('http')
const app = require('./app')
const logger = require('./utils/logger')
const websocketService = require('./services/websocket/websocket-service')
const { sequelize } = require('./models')
const cacheService = require('./services/cache/redis-cache')

// Port de l'application
const PORT = process.env.PORT || 3000

// Créer le serveur HTTP
const server = http.createServer(app)

// Fonction de démarrage asynchrone
async function startServer() {
  try {
    // 1. Connecter à la base de données
    logger.info('Connexion à la base de données...')
    await sequelize.authenticate()
    logger.info('✅ Base de données connectée')
    
    // Synchroniser les modèles en développement
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true })
      logger.info('✅ Modèles synchronisés')
    }
    
    // 2. Connecter au cache Redis
    logger.info('Connexion à Redis...')
    await cacheService.connect()
    logger.info('✅ Redis connecté')
    
    // 3. Initialiser WebSocket
    logger.info('Initialisation WebSocket...')
    await websocketService.initialize(server)
    logger.info('✅ WebSocket initialisé')
    
    // 4. Démarrer le serveur
    server.listen(PORT, () => {
      logger.info({
        message: '🚀 Serveur démarré',
        port: PORT,
        environment: process.env.NODE_ENV,
        url: `http://localhost:${PORT}`
      })
    })
    
  } catch (error) {
    logger.error({
      message: 'Erreur lors du démarrage du serveur',
      error: error.message,
      stack: error.stack
    })
    process.exit(1)
  }
}

// Gestion de l'arrêt gracieux
process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)

async function gracefulShutdown() {
  logger.info('⏹️  Signal d\'arrêt reçu, fermeture gracieuse...')
  
  // Arrêter d'accepter de nouvelles connexions
  server.close(async () => {
    logger.info('✅ Serveur HTTP fermé')
    
    try {
      // Fermer les connexions
      await sequelize.close()
      logger.info('✅ Base de données déconnectée')
      
      await cacheService.client?.quit()
      logger.info('✅ Redis déconnecté')
      
      logger.info('👋 Arrêt complet')
      process.exit(0)
    } catch (error) {
      logger.error('Erreur lors de l\'arrêt:', error)
      process.exit(1)
    }
  })
  
  // Forcer l'arrêt après 30 secondes
  setTimeout(() => {
    logger.error('Arrêt forcé après timeout')
    process.exit(1)
  }, 30000)
}

// Démarrer le serveur
startServer()