/**
 * Middleware d'authentification sécurisé
 * JWT avec gestion des sessions et rate limiting
 */

const jwt = require('jsonwebtoken')
const { Pool } = require('pg')
const rateLimit = require('express-rate-limit')
const bcrypt = require('bcrypt')

// Configuration base de données
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

// Secrets JWT rotatifs
const JWT_SECRETS = {
  current: process.env.JWT_SECRET,
  previous: process.env.JWT_SECRET_PREVIOUS // Pour rotation gracieuse
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h'
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'

/**
 * Middleware d'authentification principal
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header'
      })
    }

    const token = authHeader.split(' ')[1]

    // Vérifier si le token est blacklisté
    const blacklistCheck = await pool.query(
      'SELECT id FROM token_blacklist WHERE token_hash = $1',
      [hashToken(token)]
    )

    if (blacklistCheck.rows.length > 0) {
      return res.status(401).json({
        success: false,
        error: 'Token has been revoked'
      })
    }

    // Vérifier le token avec les secrets actuels et précédents
    let decoded
    try {
      decoded = jwt.verify(token, JWT_SECRETS.current)
    } catch (err) {
      if (JWT_SECRETS.previous) {
        try {
          decoded = jwt.verify(token, JWT_SECRETS.previous)
        } catch (prevErr) {
          return res.status(401).json({
            success: false,
            error: 'Invalid or expired token'
          })
        }
      } else {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token'
        })
      }
    }

    // Vérifier que l'utilisateur existe et est actif
    const userQuery = `
      SELECT u.*, 
             json_agg(r.name) as roles,
             json_agg(p.name) as permissions
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE u.id = $1 AND u.is_active = true
      GROUP BY u.id
    `

    const userResult = await pool.query(userQuery, [decoded.sub])

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive'
      })
    }

    const user = userResult.rows[0]

    // Vérifier la session active
    const sessionQuery = `
      SELECT id FROM sessions 
      WHERE user_id = $1 AND token_hash = $2 AND is_active = true 
      AND expires_at > CURRENT_TIMESTAMP
    `

    const sessionResult = await pool.query(sessionQuery, [
      user.id,
      hashToken(token)
    ])

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Session expired or invalid'
      })
    }

    // Mettre à jour la dernière activité de session
    await pool.query(
      'UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [sessionResult.rows[0].id]
    )

    // Ajouter les infos user à la requête
    req.user = {
      id: user.id,
      customer_id: user.id, // Pour compatibilité
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      roles: user.roles || [],
      permissions: user.permissions || [],
      tenant_id: user.tenant_id
    }

    next()
  } catch (error) {
    console.error('Authentication error:', error)
    res.status(500).json({
      success: false,
      error: 'Authentication service error'
    })
  }
}

/**
 * Middleware d'autorisation basé sur les rôles
 */
const authorize = (requiredRoles = [], requiredPermissions = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      })
    }

    // Vérifier les rôles requis
    if (requiredRoles.length > 0) {
      const hasRole = requiredRoles.some(role =>
        req.user.roles.includes(role) || req.user.role === role
      )

      if (!hasRole) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions - role required',
          required_roles: requiredRoles
        })
      }
    }

    // Vérifier les permissions requises
    if (requiredPermissions.length > 0) {
      const hasPermission = requiredPermissions.every(permission =>
        req.user.permissions.includes(permission)
      )

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          required_permissions: requiredPermissions
        })
      }
    }

    next()
  }
}

/**
 * Rate limiting pour authentification
 */
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives par IP
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting en développement
    return process.env.NODE_ENV === 'development'
  }
})

/**
 * Rate limiting général pour l'API
 */
const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requêtes par IP
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
})

/**
 * Générer un token JWT sécurisé
 */
const generateTokens = async (user) => {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    tenant_id: user.tenant_id,
    iat: Math.floor(Date.now() / 1000),
    type: 'access'
  }

  const refreshPayload = {
    ...payload,
    type: 'refresh'
  }

  const accessToken = jwt.sign(payload, JWT_SECRETS.current, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'attitudes.vip',
    audience: 'attitudes.vip-api'
  })

  const refreshToken = jwt.sign(refreshPayload, JWT_SECRETS.current, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: 'attitudes.vip',
    audience: 'attitudes.vip-api'
  })

  return { accessToken, refreshToken }
}

/**
 * Créer une session sécurisée
 */
const createSession = async (userId, accessToken, refreshToken, req) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Invalider les anciennes sessions
    await client.query(
      'UPDATE sessions SET is_active = false WHERE user_id = $1',
      [userId]
    )

    // Créer nouvelle session
    const sessionId = require('crypto').randomUUID()
    const expiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)) // 7 jours

    await client.query(
      `INSERT INTO sessions 
       (id, user_id, token_hash, expires_at, ip_address, user_agent, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        sessionId,
        userId,
        hashToken(accessToken),
        expiresAt,
        req.ip,
        req.get('User-Agent'),
        true
      ]
    )

    await client.query('COMMIT')
    return sessionId
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/**
 * Invalider une session
 */
const invalidateSession = async (userId, token) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Blacklister le token
    await client.query(
      `INSERT INTO token_blacklist (token_hash, expires_at, created_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (token_hash) DO NOTHING`,
      [hashToken(token), new Date(Date.now() + (24 * 60 * 60 * 1000))]
    )

    // Désactiver la session
    await client.query(
      'UPDATE sessions SET is_active = false WHERE user_id = $1 AND token_hash = $2',
      [userId, hashToken(token)]
    )

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/**
 * Nettoyer les tokens expirés
 */
const cleanupExpiredTokens = async () => {
  try {
    // Nettoyer les sessions expirées
    await pool.query(
      'DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP'
    )

    // Nettoyer la blacklist
    await pool.query(
      'DELETE FROM token_blacklist WHERE expires_at < CURRENT_TIMESTAMP'
    )

    console.log('Expired tokens cleaned up')
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error)
  }
}

/**
 * Hash d'un token pour stockage sécurisé
 */
const hashToken = (token) => {
  return require('crypto')
    .createHash('sha256')
    .update(token)
    .digest('hex')
}

/**
 * Middleware de sécurité avancée
 */
const advancedSecurity = (req, res, next) => {
  // Headers de sécurité
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  })

  // Enlever headers exposant des infos
  res.removeHeader('X-Powered-By')
  res.removeHeader('Server')

  next()
}

/**
 * Audit des tentatives de connexion
 */
const auditLogin = async (email, success, ip, userAgent, reason = null) => {
  try {
    await pool.query(
      `INSERT INTO audit_logs 
       (action, user_id, ip_address, user_agent, old_values, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [
        success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
        null, // user_id sera ajouté si trouvé
        ip,
        userAgent,
        JSON.stringify({ email, reason })
      ]
    )
  } catch (error) {
    console.error('Error auditing login:', error)
  }
}

// Initialiser le nettoyage automatique des tokens
setInterval(cleanupExpiredTokens, 60 * 60 * 1000) // Toutes les heures

module.exports = {
  authenticate,
  authorize,
  authRateLimit,
  apiRateLimit,
  generateTokens,
  createSession,
  invalidateSession,
  cleanupExpiredTokens,
  hashToken,
  advancedSecurity,
  auditLogin
}
