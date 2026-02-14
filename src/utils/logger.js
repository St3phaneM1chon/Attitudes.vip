const winston = require('winston')
require('winston-daily-rotate-file')
const path = require('path')

// Configuration des niveaux de log personnalisés
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
}

// Couleurs pour chaque niveau
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
}

winston.addColors(colors)

// Format personnalisé pour les logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
)

// Format pour la console en développement
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info
    let metaString = ''
    
    if (Object.keys(meta).length > 0) {
      metaString = '\n' + JSON.stringify(meta, null, 2)
    }
    
    return `${timestamp} [${level}]: ${message}${metaString}`
  })
)

// Configuration des transports
const transports = []

// Transport pour la console
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: 'debug'
    })
  )
}

// Transport pour les fichiers avec rotation quotidienne
const fileRotateTransport = new winston.transports.DailyRotateFile({
  filename: path.join('logs', 'application-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  format
})

// Transport séparé pour les erreurs
const errorFileRotateTransport = new winston.transports.DailyRotateFile({
  filename: path.join('logs', 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  level: 'error',
  format
})

transports.push(fileRotateTransport, errorFileRotateTransport)

// Créer le logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  defaultMeta: { service: 'attitudes-api' },
  transports,
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join('logs', 'exceptions.log'),
      format 
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join('logs', 'rejections.log'),
      format 
    })
  ]
})

// Stream pour Morgan (HTTP logging)
logger.stream = {
  write: (message) => {
    logger.http(message.trim())
  }
}

// Méthodes utilitaires
logger.logRequest = (req, res, duration) => {
  logger.http({
    method: req.method,
    url: req.url,
    status: res.statusCode,
    duration: `${duration}ms`,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.id
  })
}

logger.logDatabaseQuery = (query, duration, error = null) => {
  const logData = {
    query: query.sql || query,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString()
  }
  
  if (error) {
    logger.error({ ...logData, error: error.message })
  } else {
    logger.debug(logData)
  }
}

logger.logCacheOperation = (operation, key, hit, duration) => {
  logger.debug({
    cache: {
      operation,
      key,
      hit,
      duration: `${duration}ms`
    }
  })
}

logger.logWebSocketEvent = (event, userId, data) => {
  logger.debug({
    websocket: {
      event,
      userId,
      data,
      timestamp: new Date().toISOString()
    }
  })
}

module.exports = logger