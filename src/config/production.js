/**
 * Configuration de production sécurisée
 * Gestion SSL/TLS, logging centralisé, monitoring
 */

const secretsManager = require('./secrets')
const winston = require('winston')
const helmet = require('helmet')

// Configuration SSL/TLS
const SSL_CONFIG = {
  development: {
    enabled: false
  },
  staging: {
    enabled: true,
    cert: '/etc/ssl/certs/staging.attitudes.vip.crt',
    key: '/etc/ssl/private/staging.attitudes.vip.key',
    ca: '/etc/ssl/certs/ca-bundle.crt'
  },
  production: {
    enabled: true,
    cert: process.env.SSL_CERT_PATH || '/etc/ssl/certs/attitudes.vip.crt',
    key: process.env.SSL_KEY_PATH || '/etc/ssl/private/attitudes.vip.key',
    ca: process.env.SSL_CA_PATH || '/etc/ssl/certs/ca-bundle.crt',
    // Configuration TLS moderne
    secureProtocol: 'TLSv1_2_method',
    ciphers: [
      'ECDHE-RSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES128-SHA256',
      'ECDHE-RSA-AES256-SHA384'
    ].join(':'),
    honorCipherOrder: true
  }
}

// Configuration Helmet pour sécurité HTTP
const HELMET_CONFIG = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://js.stripe.com'],
      connectSrc: ["'self'", 'https://api.stripe.com', 'wss://ws.attitudes.vip'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000, // 1 an
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}

// Configuration logging centralisé
const createLogger = () => {
  const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  )

  const transports = []

  // Console en développement
  if (process.env.NODE_ENV === 'development') {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    )
  }

  // Fichiers en staging/production
  if (process.env.NODE_ENV !== 'development') {
    transports.push(
      new winston.transports.File({
        filename: '/var/log/attitudes/error.log',
        level: 'error',
        maxsize: 50 * 1024 * 1024, // 50MB
        maxFiles: 5
      }),
      new winston.transports.File({
        filename: '/var/log/attitudes/combined.log',
        maxsize: 100 * 1024 * 1024, // 100MB
        maxFiles: 10
      })
    )
  }

  // Fluentd en production
  if (process.env.NODE_ENV === 'production' && process.env.FLUENTD_HOST) {
    const FluentLogger = require('fluent-logger')
    const fluentTransport = require('fluent-logger').support.winstonTransport()

    transports.push(
      new fluentTransport('attitudes.app', {
        host: process.env.FLUENTD_HOST,
        port: process.env.FLUENTD_PORT || 24224,
        timeout: 3.0,
        reconnectInterval: 60000
      })
    )
  }

  return winston.createLogger({
    format: logFormat,
    transports,
    exceptionHandlers: transports,
    rejectionHandlers: transports
  })
}

// Configuration CORS sécurisée
const CORS_CONFIG = {
  development: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true
  },
  staging: {
    origin: ['https://staging.attitudes.vip', 'https://admin-staging.attitudes.vip'],
    credentials: true
  },
  production: {
    origin: ['https://attitudes.vip', 'https://admin.attitudes.vip', 'https://app.attitudes.vip'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
    maxAge: 86400 // 24h
  }
}

// Configuration base de données par environnement
const DATABASE_CONFIG = {
  development: {
    ssl: false,
    pool: {
      min: 2,
      max: 10,
      idle: 10000
    }
  },
  staging: {
    ssl: {
      rejectUnauthorized: false
    },
    pool: {
      min: 5,
      max: 20,
      idle: 10000
    }
  },
  production: {
    ssl: {
      rejectUnauthorized: true,
      ca: process.env.DATABASE_CA_CERT
    },
    pool: {
      min: 10,
      max: 50,
      idle: 10000,
      acquireTimeoutMillis: 60000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 100
    },
    statement_timeout: 30000,
    query_timeout: 30000,
    connectionTimeoutMillis: 10000
  }
}

// Configuration monitoring
const MONITORING_CONFIG = {
  prometheus: {
    enabled: process.env.PROMETHEUS_ENABLED !== 'false',
    port: process.env.PROMETHEUS_PORT || 9090,
    metrics: {
      http: true,
      database: true,
      business: true
    }
  },
  healthCheck: {
    enabled: true,
    interval: 30000, // 30 secondes
    endpoints: [
      '/api/v1/health',
      '/api/v1/health/database',
      '/api/v1/health/redis',
      '/api/v1/health/services'
    ]
  },
  alerts: {
    enabled: process.env.ALERTS_ENABLED !== 'false',
    webhook: process.env.ALERTS_WEBHOOK_URL,
    thresholds: {
      errorRate: 0.05, // 5%
      responseTime: 1000, // 1s
      cpuUsage: 80, // 80%
      memoryUsage: 85, // 85%
      diskUsage: 90 // 90%
    }
  }
}

// Configuration cache Redis
const REDIS_CONFIG = {
  development: {
    host: 'localhost',
    port: 6379,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3
  },
  staging: {
    host: process.env.REDIS_HOST || 'redis-staging',
    port: process.env.REDIS_PORT || 6379,
    password: () => secretsManager.getSecret('REDIS_PASSWORD'),
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    connectTimeout: 10000
  },
  production: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT || 6379,
    password: () => secretsManager.getSecret('REDIS_PASSWORD'),
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
    lazyConnect: true,
    enableOfflineQueue: false,
    maxMemoryPolicy: 'allkeys-lru',
    cluster: process.env.REDIS_CLUSTER === 'true'
  }
}

// Configuration backup
const BACKUP_CONFIG = {
  database: {
    enabled: process.env.NODE_ENV !== 'development',
    schedule: '0 2 * * *', // 2h du matin
    retention: {
      daily: 7,
      weekly: 4,
      monthly: 12
    },
    s3: {
      bucket: process.env.BACKUP_S3_BUCKET,
      region: process.env.BACKUP_S3_REGION || 'eu-west-1',
      encryption: 'AES256'
    }
  },
  files: {
    enabled: process.env.NODE_ENV !== 'development',
    schedule: '0 3 * * *', // 3h du matin
    paths: ['/var/log/attitudes', '/uploads'],
    retention: 30 // 30 jours
  }
}

// Initialisation de la configuration
class ProductionConfig {
  constructor () {
    this.environment = process.env.NODE_ENV || 'development'
    this.logger = createLogger()
    this.initialized = false
  }

  async initialize () {
    if (this.initialized) return

    try {
      // Initialiser les secrets
      await secretsManager.initialize()

      // Valider la configuration
      this.validateConfig()

      // Configurer les services
      this.setupServices()

      this.initialized = true
      this.logger.info('Production configuration initialized', {
        environment: this.environment,
        ssl: this.isSSLEnabled(),
        monitoring: MONITORING_CONFIG.prometheus.enabled
      })
    } catch (error) {
      this.logger.error('Failed to initialize production config:', error)
      throw error
    }
  }

  validateConfig () {
    // Valider les secrets critiques
    const valid = secretsManager.validateSecrets()

    if (!valid && this.environment === 'production') {
      throw new Error('Critical configuration validation failed')
    }

    // Vérifier SSL en production
    if (this.environment === 'production' && !this.isSSLEnabled()) {
      throw new Error('SSL must be enabled in production')
    }

    // Vérifier les certificats SSL
    if (this.isSSLEnabled()) {
      this.validateSSLCertificates()
    }
  }

  validateSSLCertificates () {
    const fs = require('fs')
    const config = SSL_CONFIG[this.environment]

    try {
      if (!fs.existsSync(config.cert)) {
        throw new Error(`SSL certificate not found: ${config.cert}`)
      }

      if (!fs.existsSync(config.key)) {
        throw new Error(`SSL private key not found: ${config.key}`)
      }

      this.logger.info('SSL certificates validated')
    } catch (error) {
      this.logger.error('SSL certificate validation failed:', error)
      throw error
    }
  }

  setupServices () {
    // Configuration rate limiting
    this.setupRateLimiting()

    // Configuration monitoring
    this.setupMonitoring()

    // Configuration backup
    this.setupBackup()
  }

  setupRateLimiting () {
    // Configuration par environnement
    const limits = {
      development: { windowMs: 60000, max: 1000 },
      staging: { windowMs: 60000, max: 500 },
      production: { windowMs: 60000, max: 100 }
    }

    this.rateLimitConfig = limits[this.environment]
  }

  setupMonitoring () {
    if (MONITORING_CONFIG.prometheus.enabled) {
      const prometheus = require('prom-client')

      // Métriques par défaut
      prometheus.collectDefaultMetrics({
        timeout: 5000,
        gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
      })

      this.logger.info('Prometheus monitoring enabled')
    }
  }

  setupBackup () {
    if (BACKUP_CONFIG.database.enabled) {
      const cron = require('node-cron')

      // Programmer les backups
      cron.schedule(BACKUP_CONFIG.database.schedule, () => {
        this.performDatabaseBackup()
      })

      this.logger.info('Database backup scheduled')
    }
  }

  async performDatabaseBackup () {
    try {
      const { spawn } = require('child_process')
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `backup-${timestamp}.sql`

      // Backup PostgreSQL
      const pgDump = spawn('pg_dump', [
        secretsManager.getSecret('DATABASE_URL'),
        '-f', `/tmp/${filename}`,
        '--no-password',
        '--verbose'
      ])

      pgDump.on('close', (code) => {
        if (code === 0) {
          this.logger.info('Database backup completed', { filename })
          // Optionnel: upload vers S3
          this.uploadBackupToS3(filename)
        } else {
          this.logger.error('Database backup failed', { code })
        }
      })
    } catch (error) {
      this.logger.error('Backup error:', error)
    }
  }

  async uploadBackupToS3 (filename) {
    if (!BACKUP_CONFIG.database.s3.bucket) return

    try {
      const AWS = require('aws-sdk')
      const s3 = new AWS.S3()
      const fs = require('fs')

      const fileContent = fs.readFileSync(`/tmp/${filename}`)

      await s3.upload({
        Bucket: BACKUP_CONFIG.database.s3.bucket,
        Key: `database-backups/${filename}`,
        Body: fileContent,
        ServerSideEncryption: BACKUP_CONFIG.database.s3.encryption
      }).promise()

      this.logger.info('Backup uploaded to S3', { filename })

      // Nettoyer le fichier local
      fs.unlinkSync(`/tmp/${filename}`)
    } catch (error) {
      this.logger.error('S3 upload failed:', error)
    }
  }

  // Getters pour configuration
  getSSLConfig () {
    return SSL_CONFIG[this.environment]
  }

  getHelmetConfig () {
    return HELMET_CONFIG
  }

  getCORSConfig () {
    return CORS_CONFIG[this.environment]
  }

  getDatabaseConfig () {
    return {
      ...DATABASE_CONFIG[this.environment],
      connectionString: secretsManager.getSecret('DATABASE_URL')
    }
  }

  getRedisConfig () {
    const config = REDIS_CONFIG[this.environment]

    if (config.password && typeof config.password === 'function') {
      config.password = config.password()
    }

    return config
  }

  getMonitoringConfig () {
    return MONITORING_CONFIG
  }

  isSSLEnabled () {
    return SSL_CONFIG[this.environment].enabled
  }

  isProduction () {
    return this.environment === 'production'
  }

  getSecureEnv () {
    return secretsManager.getSecureEnv()
  }

  getLogger () {
    return this.logger
  }
}

// Instance singleton
const productionConfig = new ProductionConfig()

module.exports = productionConfig
