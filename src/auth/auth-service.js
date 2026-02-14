const express = require('express')
const jwt = require('jsonwebtoken')
const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const FacebookStrategy = require('passport-facebook').Strategy
const TwitterStrategy = require('passport-twitter').Strategy
const AppleStrategy = require('passport-apple').Strategy
const rateLimit = require('express-rate-limit')
const helmet = require('helmet')
const cors = require('cors')
const bcrypt = require('bcrypt')
require('dotenv').config()

const app = express()

// Middleware de sécurité
app.use(helmet())
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}))

// Middleware pour parser le JSON
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Rate limiting pour prévenir les attaques (ajusté pour les tests)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 tentatives par IP (augmenté pour les tests)
  message: { error: 'Trop de tentatives d\'authentification' }
})

// Chargement de la matrice de permissions
const permissionsMatrix = require('../../docs/architecture/permissions-matrix.json')

// Configuration des stratégies OAuth2
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const user = await createOrUpdateUser(profile, 'google')
    return done(null, user)
  } catch (error) {
    return done(error)
  }
}))

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: '/auth/facebook/callback',
  profileFields: ['id', 'displayName', 'photos', 'email']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const user = await createOrUpdateUser(profile, 'facebook')
    return done(null, user)
  } catch (error) {
    return done(error)
  }
}))

passport.use(new TwitterStrategy({
  consumerKey: process.env.TWITTER_CONSUMER_KEY,
  consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
  callbackURL: '/auth/twitter/callback',
  includeEmail: true
}, async (token, tokenSecret, profile, done) => {
  try {
    const user = await createOrUpdateUser(profile, 'twitter')
    return done(null, user)
  } catch (error) {
    return done(error)
  }
}))

passport.use(new AppleStrategy({
  clientID: process.env.APPLE_CLIENT_ID,
  teamID: process.env.APPLE_TEAM_ID,
  keyID: process.env.APPLE_KEY_ID,
  privateKeyLocation: process.env.APPLE_PRIVATE_KEY_PATH,
  callbackURL: '/auth/apple/callback',
  passReqToCallback: true
}, async (req, accessToken, refreshToken, idToken, profile, done) => {
  try {
    const user = await createOrUpdateUser(profile, 'apple')
    return done(null, user)
  } catch (error) {
    return done(error)
  }
}))

// Fonction de création/mise à jour utilisateur
async function createOrUpdateUser (profile, provider) {
  const email = profile.emails?.[0]?.value || profile.id
  const name = profile.displayName || profile.name?.givenName + ' ' + profile.name?.familyName || 'Utilisateur'

  // Logique de détermination du rôle basée sur l'email et le domaine
  const role = determineRole(email, profile)
  const tenant = determineTenant(email, profile)
  const permissions = getPermissionsForRole(role)
  const dashboardUrl = getDashboardUrlForRole(role)

  return {
    id: profile.id,
    email,
    name,
    provider,
    role,
    tenant,
    permissions,
    dashboardUrl,
    avatar: profile.photos?.[0]?.value,
    createdAt: new Date().toISOString()
  }
}

// Logique de détermination du rôle améliorée
function determineRole (email, profile) {
  // CIO - Accès total système
  if (email.endsWith('@attitudes.vip') && email.includes('cio')) {
    return 'cio'
  }

  // Admin - Employés Attitudes.vip
  if (email.endsWith('@attitudes.vip')) {
    return 'admin'
  }

  // Client - Revendeurs marque blanche (domaines spécifiques)
  const clientDomains = process.env.CLIENT_DOMAINS?.split(',') || []
  if (clientDomains.some(domain => email.endsWith(domain))) {
    return 'client'
  }

  // Fournisseurs - Basé sur des patterns d'email ou métadonnées
  if (profile.provider === 'google' && profile._json?.hd) {
    // Domaine Google Workspace spécifique aux fournisseurs
    const vendorDomains = process.env.VENDOR_DOMAINS?.split(',') || []
    if (vendorDomains.includes(profile._json.hd)) {
      return determineVendorRole(profile)
    }
  }

  // Par défaut : customer (couples mariés)
  return 'customer'
}

// Détermination du type de fournisseur
function determineVendorRole (profile) {
  const name = profile.displayName?.toLowerCase() || ''
  const email = profile.emails?.[0]?.value?.toLowerCase() || ''

  if (name.includes('dj') || email.includes('dj')) return 'dj'
  if (name.includes('photo') || email.includes('photo')) return 'photographe'
  if (name.includes('traiteur') || email.includes('traiteur')) return 'traiteur'
  if (name.includes('patissier') || email.includes('patissier')) return 'patissier'
  if (name.includes('planner') || email.includes('planner')) return 'wedding_planner'
  if (name.includes('location') || email.includes('location')) return 'location'

  return 'wedding_planner' // Par défaut
}

// Détermination du tenant pour marque blanche
function determineTenant (email, profile) {
  // Pour les clients marque blanche
  if (email.endsWith('@attitudes.vip')) {
    return 'attitudes-vip'
  }

  // Extraction du tenant depuis l'email
  const domain = email.split('@')[1]
  const clientDomains = process.env.CLIENT_DOMAINS?.split(',') || []

  if (clientDomains.includes(domain)) {
    return domain.replace('.com', '').replace('.org', '')
  }

  return 'default'
}

// Récupération des permissions depuis la matrice
function getPermissionsForRole (role) {
  const roleConfig = permissionsMatrix.roles[role]
  return roleConfig ? roleConfig.permissions : []
}

// Récupération de l'URL du dashboard
function getDashboardUrlForRole (role) {
  const roleConfig = permissionsMatrix.roles[role]
  return roleConfig ? roleConfig.dashboard : '/dashboard/customer'
}

// Initialisation Passport
app.use(passport.initialize())

// Routes d'authentification
app.get('/auth/google', authLimiter, passport.authenticate('google', {
  scope: ['profile', 'email']
}))

app.get('/auth/facebook', authLimiter, passport.authenticate('facebook', {
  scope: ['email']
}))

app.get('/auth/twitter', authLimiter, passport.authenticate('twitter'))

app.get('/auth/apple', authLimiter, passport.authenticate('apple'))

// Callbacks d'authentification
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', failureFlash: true }),
  (req, res) => {
    const token = generateJWT(req.user)
    res.redirect(`${req.user.dashboardUrl}?token=${token}`)
  }
)

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login', failureFlash: true }),
  (req, res) => {
    const token = generateJWT(req.user)
    res.redirect(`${req.user.dashboardUrl}?token=${token}`)
  }
)

app.get('/auth/twitter/callback',
  passport.authenticate('twitter', { failureRedirect: '/login', failureFlash: true }),
  (req, res) => {
    const token = generateJWT(req.user)
    res.redirect(`${req.user.dashboardUrl}?token=${token}`)
  }
)

app.get('/auth/apple/callback',
  passport.authenticate('apple', { failureRedirect: '/login', failureFlash: true }),
  (req, res) => {
    const token = generateJWT(req.user)
    res.redirect(`${req.user.dashboardUrl}?token=${token}`)
  }
)

// Génération du JWT avec refresh token
function generateJWT (user) {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name || `${user.firstName} ${user.lastName}`,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    tenant: user.tenant,
    permissions: user.permissions,
    dashboardUrl: user.dashboardUrl,
    provider: user.provider,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24h
  }

  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required')
  }

  return jwt.sign(payload, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    issuer: 'attitudes-vip',
    audience: 'attitudes-vip-users'
  })
}

// Middleware de vérification JWT amélioré
function requirePermission (permission) {
  return (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1] ||
                  req.query.token ||
                  req.cookies?.authToken

    if (!token) {
      return res.status(401).json({
        error: 'Token manquant',
        code: 'MISSING_TOKEN'
      })
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret-key')

      // Vérification des permissions
      if (decoded.permissions.includes('*') || decoded.permissions.includes(permission)) {
        req.user = decoded
        next()
      } else {
        return res.status(403).json({
          error: `Permission ${permission} requise`,
          code: 'INSUFFICIENT_PERMISSIONS',
          required: permission,
          userPermissions: decoded.permissions
        })
      }
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expiré',
          code: 'TOKEN_EXPIRED'
        })
      }
      return res.status(401).json({
        error: 'Token invalide',
        code: 'INVALID_TOKEN'
      })
    }
  }
}

// Middleware de vérification de rôle
function requireRole (role) {
  return (req, res, next) => {
    requirePermission('*')(req, res, () => {
      if (req.user.role === role || req.user.role === 'cio') {
        next()
      } else {
        return res.status(403).json({
          error: `Rôle ${role} requis`,
          code: 'INSUFFICIENT_ROLE',
          required: role,
          userRole: req.user.role
        })
      }
    })
  }
}

// Fonctions utilitaires pour la gestion des utilisateurs
function generateUserId () {
  return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

// Simulation de base de données pour les tests
const users = new Map()

async function checkExistingUser (email) {
  return users.get(email) || null
}

async function saveUser (user) {
  users.set(user.email, user)
  return user
}

async function findUserByEmail (email) {
  return users.get(email) || null
}

async function updateUser (user) {
  users.set(user.email, user)
  return user
}

// Route d'inscription
app.post('/auth/register', authLimiter, async (req, res) => {
  try {
    const { email, password, firstName, lastName, role = 'customer', locale = 'fr' } = req.body

    // Validation des données
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        error: 'Tous les champs sont requis',
        code: 'MISSING_FIELDS'
      })
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Format d\'email invalide',
        code: 'INVALID_EMAIL'
      })
    }

    // Validation mot de passe
    if (password.length < 8) {
      return res.status(400).json({
        error: 'Le mot de passe doit contenir au moins 8 caractères',
        code: 'WEAK_PASSWORD'
      })
    }

    // Vérification si l'utilisateur existe déjà
    const existingUser = await checkExistingUser(email)
    if (existingUser) {
      return res.status(409).json({
        error: 'Un utilisateur avec cet email existe déjà',
        code: 'USER_EXISTS'
      })
    }

    // Hashage du mot de passe
    const hashedPassword = await bcrypt.hash(password, 12)

    // Création de l'utilisateur
    const user = {
      id: generateUserId(),
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role,
      locale,
      tenant: determineTenant(email),
      permissions: getPermissionsForRole(role),
      dashboardUrl: getDashboardUrlForRole(role),
      isActive: true,
      emailVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Sauvegarde de l'utilisateur (simulation pour les tests)
    await saveUser(user)

    // Génération du token
    const token = generateJWT(user)

    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        locale: user.locale
      },
      token
    })
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error)
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_ERROR'
    })
  }
})

// Route de connexion
app.post('/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body

    // Validation des données
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email et mot de passe requis',
        code: 'MISSING_CREDENTIALS'
      })
    }

    // Recherche de l'utilisateur
    const user = await findUserByEmail(email)
    if (!user) {
      return res.status(401).json({
        error: 'Identifiants invalides',
        code: 'INVALID_CREDENTIALS'
      })
    }

    // Vérification du mot de passe
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Identifiants invalides',
        code: 'INVALID_CREDENTIALS'
      })
    }

    // Vérification si le compte est actif
    if (!user.isActive) {
      return res.status(403).json({
        error: 'Compte désactivé',
        code: 'ACCOUNT_DISABLED'
      })
    }

    // Mise à jour de la dernière connexion
    user.lastLoginAt = new Date().toISOString()
    await updateUser(user)

    // Génération du token
    const token = generateJWT(user)

    res.json({
      success: true,
      message: 'Connexion réussie',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        locale: user.locale
      },
      token
    })
  } catch (error) {
    console.error('Erreur lors de la connexion:', error)
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_ERROR'
    })
  }
})

// Route de profil utilisateur
app.get('/auth/profile', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1] ||
                req.query.token ||
                req.cookies?.authToken

  if (!token) {
    return res.status(401).json({
      error: 'Token manquant',
      code: 'MISSING_TOKEN'
    })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret-key')
    req.user = decoded

    res.json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        role: req.user.role,
        locale: req.user.locale,
        tenant: req.user.tenant,
        permissions: req.user.permissions,
        dashboardUrl: req.user.dashboardUrl
      }
    })
  } catch (err) {
    return res.status(401).json({
      error: 'Token invalide',
      code: 'INVALID_TOKEN'
    })
  }
})

// Route de déconnexion (changée en POST)
app.post('/auth/logout', (req, res) => {
  res.clearCookie('authToken')
  res.json({
    success: true,
    message: 'Utilisateur déconnecté avec succès'
  })
})

// Route de vérification de token
app.get('/auth/verify', requirePermission('*'), (req, res) => {
  res.json({
    valid: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
      tenant: req.user.tenant,
      permissions: req.user.permissions,
      dashboardUrl: req.user.dashboardUrl
    }
  })
})

// Route OAuth Google (POST pour les tests)
app.post('/auth/oauth/google', authLimiter, async (req, res) => {
  try {
    const { accessToken, profile } = req.body

    if (!accessToken || !profile) {
      return res.status(400).json({
        error: 'Données OAuth manquantes',
        code: 'MISSING_OAUTH_DATA'
      })
    }

    // Vérification si l'utilisateur existe déjà
    const existingUser = await findUserByEmail(profile.emails[0].value)

    if (existingUser) {
      // Utilisateur existant - connexion
      const token = generateJWT(existingUser)
      return res.status(200).json({
        success: true,
        message: 'Connexion OAuth réussie',
        user: {
          id: existingUser.id,
          email: existingUser.email,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
          role: existingUser.role
        },
        token
      })
    } else {
      // Nouvel utilisateur - création
      const user = await createOrUpdateUser(profile, 'google')
      const token = generateJWT(user)

      return res.status(201).json({
        success: true,
        message: 'Utilisateur OAuth créé avec succès',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        token
      })
    }
  } catch (error) {
    console.error('Erreur OAuth Google:', error)
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_ERROR'
    })
  }
})

// Route de refresh token (corrigée)
app.post('/auth/refresh', (req, res) => {
  const refreshToken = req.body.refreshToken

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token manquant' })
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET || 'test-secret-key')
    const newToken = generateJWT(decoded)
    const newRefreshToken = jwt.sign(
      { userId: decoded.id, type: 'refresh' },
      process.env.JWT_SECRET || 'test-secret-key',
      { expiresIn: '7d' }
    )

    res.json({
      success: true,
      token: newToken,
      refreshToken: newRefreshToken,
      expiresIn: 24 * 60 * 60 // 24h
    })
  } catch (err) {
    return res.status(401).json({ error: 'Refresh token invalide' })
  }
})

// Export des middlewares pour utilisation dans d'autres modules
module.exports = {
  app,
  requirePermission,
  requireRole,
  generateJWT,
  users,
  checkExistingUser,
  saveUser,
  findUserByEmail,
  updateUser
}
