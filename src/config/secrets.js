/**
 * Gestionnaire de secrets sécurisé pour production
 * Intégration avec AWS Secrets Manager, Azure Key Vault, etc.
 */

const crypto = require('crypto')

// Configuration par environnement
const ENVIRONMENT = process.env.NODE_ENV || 'development'

// Classe de gestion des secrets
class SecretsManager {
  constructor () {
    this.secrets = new Map()
    this.encryptionKey = this.getEncryptionKey()
    this.initialized = false
  }

  /**
   * Initialiser le gestionnaire de secrets
   */
  async initialize () {
    if (this.initialized) return

    try {
      switch (ENVIRONMENT) {
        case 'production':
          await this.loadFromCloud()
          break
        case 'staging':
          await this.loadFromEnvironment()
          break
        default:
          await this.loadFromEnvironment()
      }

      this.initialized = true
      console.log('✅ Secrets manager initialized for', ENVIRONMENT)
    } catch (error) {
      console.error('❌ Failed to initialize secrets manager:', error)
      throw error
    }
  }

  /**
   * Charger depuis le cloud (AWS Secrets Manager)
   */
  async loadFromCloud () {
    if (!process.env.AWS_REGION || !process.env.AWS_SECRET_NAME) {
      throw new Error('AWS configuration missing for production secrets')
    }

    try {
      // En production, utiliser AWS SDK
      const AWS = require('aws-sdk')
      const secretsManager = new AWS.SecretsManager({
        region: process.env.AWS_REGION
      })

      const result = await secretsManager.getSecretValue({
        SecretId: process.env.AWS_SECRET_NAME
      }).promise()

      const secrets = JSON.parse(result.SecretString)

      // Stocker les secrets de manière sécurisée
      Object.entries(secrets).forEach(([key, value]) => {
        this.secrets.set(key, this.encrypt(value))
      })
    } catch (error) {
      console.error('Error loading secrets from AWS:', error)
      // Fallback vers les variables d'environnement
      await this.loadFromEnvironment()
    }
  }

  /**
   * Charger depuis les variables d'environnement (dev/staging)
   */
  async loadFromEnvironment () {
    const envSecrets = {
      // Base de données
      DATABASE_URL: process.env.DATABASE_URL,
      DATABASE_PASSWORD: process.env.DATABASE_PASSWORD,

      // Redis
      REDIS_URL: process.env.REDIS_URL,
      REDIS_PASSWORD: process.env.REDIS_PASSWORD,

      // JWT
      JWT_SECRET: process.env.JWT_SECRET || this.generateSecret(64),
      JWT_SECRET_PREVIOUS: process.env.JWT_SECRET_PREVIOUS,

      // Stripe
      STRIPE_API_KEY: process.env.STRIPE_API_KEY,
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,

      // Twilio
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,

      // Email
      SMTP_PASSWORD: process.env.SMTP_PASSWORD,
      SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,

      // OAuth
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
      FACEBOOK_CLIENT_SECRET: process.env.FACEBOOK_CLIENT_SECRET,
      APPLE_PRIVATE_KEY: process.env.APPLE_PRIVATE_KEY,

      // Monitoring
      GRAFANA_PASSWORD: process.env.GRAFANA_PASSWORD,

      // API Keys externes
      CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

      // Encryption
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || this.generateSecret(32)
    }

    // Filtrer les valeurs nulles et chiffrer
    Object.entries(envSecrets).forEach(([key, value]) => {
      if (value) {
        this.secrets.set(key, this.encrypt(value))
      }
    })

    // Générer les secrets manquants pour le développement
    if (ENVIRONMENT === 'development') {
      this.generateMissingSecrets()
    }
  }

  /**
   * Générer les secrets manquants pour le développement
   */
  generateMissingSecrets () {
    const requiredSecrets = [
      'JWT_SECRET',
      'ENCRYPTION_KEY',
      'DATABASE_PASSWORD',
      'REDIS_PASSWORD'
    ]

    requiredSecrets.forEach(secretName => {
      if (!this.secrets.has(secretName)) {
        const generatedSecret = this.generateSecret(32)
        this.secrets.set(secretName, this.encrypt(generatedSecret))
        console.log(`🔑 Generated secret for ${secretName}`)
      }
    })
  }

  /**
   * Obtenir un secret
   */
  getSecret (name) {
    if (!this.initialized) {
      throw new Error('Secrets manager not initialized')
    }

    const encryptedSecret = this.secrets.get(name)
    if (!encryptedSecret) {
      if (ENVIRONMENT === 'production') {
        throw new Error(`Secret ${name} not found`)
      }
      console.warn(`⚠️  Secret ${name} not found, returning null`)
      return null
    }

    return this.decrypt(encryptedSecret)
  }

  /**
   * Définir un secret (pour rotation)
   */
  setSecret (name, value) {
    this.secrets.set(name, this.encrypt(value))
  }

  /**
   * Rotation des secrets JWT
   */
  async rotateJWTSecrets () {
    try {
      const currentSecret = this.getSecret('JWT_SECRET')
      const newSecret = this.generateSecret(64)

      // Sauvegarder l'ancien secret pour transition gracieuse
      this.setSecret('JWT_SECRET_PREVIOUS', currentSecret)
      this.setSecret('JWT_SECRET', newSecret)

      console.log('🔄 JWT secrets rotated successfully')

      // En production, sauvegarder dans le cloud
      if (ENVIRONMENT === 'production') {
        await this.saveToCloud({
          JWT_SECRET: newSecret,
          JWT_SECRET_PREVIOUS: currentSecret
        })
      }

      return { current: newSecret, previous: currentSecret }
    } catch (error) {
      console.error('Error rotating JWT secrets:', error)
      throw error
    }
  }

  /**
   * Sauvegarder dans le cloud
   */
  async saveToCloud (secrets) {
    if (ENVIRONMENT !== 'production') return

    try {
      const AWS = require('aws-sdk')
      const secretsManager = new AWS.SecretsManager({
        region: process.env.AWS_REGION
      })

      // Récupérer les secrets existants
      const currentSecrets = await secretsManager.getSecretValue({
        SecretId: process.env.AWS_SECRET_NAME
      }).promise()

      const existingSecrets = JSON.parse(currentSecrets.SecretString)
      const updatedSecrets = { ...existingSecrets, ...secrets }

      // Mettre à jour
      await secretsManager.updateSecret({
        SecretId: process.env.AWS_SECRET_NAME,
        SecretString: JSON.stringify(updatedSecrets)
      }).promise()

      console.log('✅ Secrets saved to cloud')
    } catch (error) {
      console.error('Error saving secrets to cloud:', error)
      throw error
    }
  }

  /**
   * Chiffrer une valeur
   */
  encrypt (text) {
    if (!text) return ''

    const iv = crypto.randomBytes(16)
    const key = Buffer.from(this.encryptionKey, 'hex')
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)

    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    return iv.toString('hex') + ':' + encrypted
  }

  /**
   * Déchiffrer une valeur
   */
  decrypt (encryptedText) {
    if (!encryptedText) return ''

    const parts = encryptedText.split(':')

    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format')
    }

    // Modern secure format (iv:encrypted) using createCipheriv/createDecipheriv
    const iv = Buffer.from(parts[0], 'hex')
    const encrypted = parts[1]
    const key = Buffer.from(this.encryptionKey, 'hex')

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  }

  /**
   * Générer un secret aléatoire
   */
  generateSecret (length = 32) {
    return crypto.randomBytes(length).toString('hex')
  }

  /**
   * Obtenir la clé de chiffrement principale
   */
  getEncryptionKey () {
    const key = process.env.MASTER_ENCRYPTION_KEY

    if (!key) {
      if (ENVIRONMENT === 'production') {
        throw new Error('MASTER_ENCRYPTION_KEY required in production')
      }

      // Générer une clé temporaire pour le développement
      console.warn('⚠️  Using temporary encryption key for development')
      return crypto.randomBytes(32).toString('hex')
    }

    // Ensure key is the correct length for AES-256-GCM (32 bytes = 64 hex chars)
    if (key.length === 64) {
      return key
    } else if (key.length === 32) {
      // If key is 32 chars (16 bytes), convert to hex
      return Buffer.from(key, 'utf8').toString('hex').padEnd(64, '0').slice(0, 64)
    } else {
      // Hash the key to ensure consistent 32-byte length
      return crypto.createHash('sha256').update(key).digest('hex')
    }
  }

  /**
   * Valider la configuration des secrets
   */
  validateSecrets () {
    const criticalSecrets = [
      'JWT_SECRET',
      'DATABASE_URL',
      'STRIPE_API_KEY'
    ]

    const missing = criticalSecrets.filter(secret => !this.getSecret(secret))

    if (missing.length > 0 && ENVIRONMENT === 'production') {
      throw new Error(`Critical secrets missing: ${missing.join(', ')}`)
    }

    if (missing.length > 0) {
      console.warn(`⚠️  Missing secrets in ${ENVIRONMENT}:`, missing)
    }

    return missing.length === 0
  }

  /**
   * Obtenir toutes les variables d'environnement sécurisées
   */
  getSecureEnv () {
    return {
      // Database
      DATABASE_URL: this.getSecret('DATABASE_URL'),

      // JWT
      JWT_SECRET: this.getSecret('JWT_SECRET'),
      JWT_SECRET_PREVIOUS: this.getSecret('JWT_SECRET_PREVIOUS'),
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
      JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

      // Services externes
      STRIPE_API_KEY: this.getSecret('STRIPE_API_KEY'),
      STRIPE_WEBHOOK_SECRET: this.getSecret('STRIPE_WEBHOOK_SECRET'),
      TWILIO_ACCOUNT_SID: this.getSecret('TWILIO_ACCOUNT_SID'),
      TWILIO_AUTH_TOKEN: this.getSecret('TWILIO_AUTH_TOKEN'),

      // OAuth
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: this.getSecret('GOOGLE_CLIENT_SECRET'),
      FACEBOOK_CLIENT_ID: process.env.FACEBOOK_CLIENT_ID,
      FACEBOOK_CLIENT_SECRET: this.getSecret('FACEBOOK_CLIENT_SECRET'),

      // Infrastructure
      REDIS_URL: this.getSecret('REDIS_URL'),

      // Monitoring
      GRAFANA_PASSWORD: this.getSecret('GRAFANA_PASSWORD')
    }
  }

  /**
   * Nettoyer les secrets de la mémoire
   */
  cleanup () {
    this.secrets.clear()
    this.initialized = false
    console.log('🧹 Secrets cleaned from memory')
  }
}

// Instance singleton
const secretsManager = new SecretsManager()

// Gestionnaire gracieux d'arrêt
process.on('SIGTERM', () => {
  secretsManager.cleanup()
})

process.on('SIGINT', () => {
  secretsManager.cleanup()
})

module.exports = secretsManager
