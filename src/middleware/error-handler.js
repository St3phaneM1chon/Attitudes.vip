const errorCodes = require('../utils/error-codes')
const logger = require('../utils/logger')

/**
 * Classe d'erreur personnalisée pour l'application
 */
class AppError extends Error {
  constructor(message, code, statusCode = 500, details = null) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.isOperational = true
    this.details = details
    this.timestamp = new Date().toISOString()
    
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Middleware de gestion des erreurs global
 */
const errorHandler = (err, req, res, next) => {
  let { statusCode = 500, message, code, details } = err
  
  // Logger l'erreur avec contexte complet
  logger.error({
    error: {
      message: err.message,
      code: err.code,
      stack: err.stack,
      statusCode: err.statusCode,
      details: err.details
    },
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id,
      sessionId: req.sessionID
    },
    timestamp: new Date().toISOString()
  })

  // Gestion spécifique selon le type d'erreur
  if (err.name === 'ValidationError') {
    statusCode = 400
    code = errorCodes.VALIDATION_INVALID_FORMAT
    message = 'Données invalides'
    details = Object.values(err.errors).map(e => e.message)
  } else if (err.name === 'CastError') {
    statusCode = 400
    code = errorCodes.VALIDATION_INVALID_TYPE
    message = 'Format de données incorrect'
  } else if (err.name === 'MongoError' && err.code === 11000) {
    statusCode = 409
    code = errorCodes.DB_DUPLICATE_ENTRY
    message = 'Cette ressource existe déjà'
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401
    code = errorCodes.AUTH_TOKEN_EXPIRED
    message = 'Token expiré'
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401
    code = errorCodes.AUTH_TOKEN_INVALID
    message = 'Token invalide'
  }

  // Ne pas exposer les détails en production
  if (process.env.NODE_ENV === 'production' && !err.isOperational) {
    message = 'Une erreur est survenue'
    code = errorCodes.SYSTEM_INTERNAL_ERROR
    details = null
  }

  // Envoyer la réponse d'erreur
  res.status(statusCode).json({
    status: 'error',
    code,
    message,
    details,
    ...(process.env.NODE_ENV !== 'production' && { 
      stack: err.stack,
      timestamp: new Date().toISOString()
    })
  })
}

/**
 * Gestionnaire pour les promesses rejetées non gérées
 */
const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (reason, promise) => {
    logger.error({
      type: 'unhandledRejection',
      reason,
      promise,
      timestamp: new Date().toISOString()
    })
    
    // En production, redémarrer gracieusement
    if (process.env.NODE_ENV === 'production') {
      logger.info('Arrêt du serveur suite à une rejection non gérée...')
      process.exit(1)
    }
  })
}

/**
 * Gestionnaire pour les exceptions non capturées
 */
const handleUncaughtException = () => {
  process.on('uncaughtException', (error) => {
    logger.error({
      type: 'uncaughtException',
      error: {
        message: error.message,
        stack: error.stack
      },
      timestamp: new Date().toISOString()
    })
    
    // Toujours arrêter le processus après une exception non capturée
    logger.info('Arrêt du serveur suite à une exception non capturée...')
    process.exit(1)
  })
}

/**
 * Middleware pour capturer les erreurs 404
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    `Route non trouvée: ${req.originalUrl}`,
    errorCodes.SYSTEM_FILE_NOT_FOUND,
    404
  )
  next(error)
}

/**
 * Wrapper pour les fonctions async dans les routes
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

module.exports = {
  AppError,
  errorHandler,
  handleUnhandledRejection,
  handleUncaughtException,
  notFoundHandler,
  asyncHandler,
  errorCodes
}