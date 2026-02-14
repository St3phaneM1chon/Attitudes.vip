const express = require('express')
const passport = require('passport')
const jwt = require('jsonwebtoken')

// Strategies OAuth2 selon tes spécifications
const GoogleStrategy = require('passport-google-oauth20').Strategy
const AppleStrategy = require('passport-apple').Strategy
const FacebookStrategy = require('passport-facebook').Strategy
const TwitterStrategy = require('passport-twitter').Strategy

class AttitudesMultiProviderAuth {
  constructor () {
    this.app = express()
    this.setupProviders()
    this.setupRoutes()
  }

  setupProviders () {
    // Gmail OAuth2
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/auth/google/callback'
    }, this.handleProviderCallback.bind(this)))

    // Apple Sign In
    passport.use(new AppleStrategy({
      clientID: process.env.APPLE_CLIENT_ID,
      teamID: process.env.APPLE_TEAM_ID,
      keyID: process.env.APPLE_KEY_ID,
      privateKeyLocation: process.env.APPLE_PRIVATE_KEY_LOCATION,
      callbackURL: '/auth/apple/callback'
    }, this.handleProviderCallback.bind(this)))

    // Facebook
    passport.use(new FacebookStrategy({
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: '/auth/facebook/callback'
    }, this.handleProviderCallback.bind(this)))

    // TikTok (utilisation Twitter temporaire)
    passport.use(new TwitterStrategy({
      consumerKey: process.env.TWITTER_CONSUMER_KEY,
      consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
      callbackURL: '/auth/twitter/callback'
    }, this.handleProviderCallback.bind(this)))
  }

  async handleProviderCallback (accessToken, refreshToken, profile, done) {
    try {
      // Logique de détermination du type d'utilisateur
      const userType = await this.determineUserType(profile)
      const user = await this.processUserProfile(profile, userType)
      const jwtToken = this.generateJWT(user)

      return done(null, { user, token: jwtToken })
    } catch (error) {
      return done(error, null)
    }
  }

  async determineUserType (profile) {
    // Logique pour déterminer si c'est un:
    // - CIO, Admin, Client, Customer, Invité, Fournisseur
    // Basé sur l'email, le domaine, ou la base de données existante

    const email = profile.emails[0].value

    if (email.endsWith('@attitudes.vip')) {
      return email.includes('cio') ? 'cio' : 'admin'
    }

    // Check base de données pour clients/fournisseurs existants
    const existingUser = await this.checkExistingUser(email)
    if (existingUser) {
      return existingUser.type
    }

    // Par défaut, nouveau customer
    return 'customer'
  }

  generateJWT (user) {
    const payload = {
      userId: user.id,
      role: user.role, // 'cio', 'admin', 'client', 'customer', 'invite', 'fournisseur'
      tenant: user.tenant,
      permissions: this.getPermissions(user.role),
      dashboardUrl: this.getDashboardUrl(user.role, user.subType),
      whiteLabelConfig: user.whiteLabelConfig || null
    }

    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' })
  }

  getPermissions (role) {
    const permissions = {
      cio: ['*'], // Tous droits
      admin: ['backend', 'frontend', 'user_management', 'client_creation'],
      client: ['white_label', 'customer_management', 'billing', 'customization'],
      customer: [
        'wedding_planning', 'guest_management', 'vendor_communication',
        'photo_upload', 'budget_tracking', 'ai_assistant'
      ],
      invite: [
        'profile_edit', 'rsvp', 'photo_upload', 'games', 'music_requests',
        'guest_book', 'photo_booth'
      ],
      fournisseur: ['vendor_dashboard', 'project_communication', 'upload_content']
    }
    return permissions[role] || []
  }

  getDashboardUrl (role, subType = null) {
    const dashboards = {
      cio: '/dashboard/cio',
      admin: '/dashboard/admin',
      client: '/dashboard/client',
      customer: '/dashboard/customer',
      invite: '/dashboard/invite',
      fournisseur: this.getFournisseurDashboard(subType)
    }
    return dashboards[role] || '/'
  }

  getFournisseurDashboard (subType) {
    const fournisseurDashboards = {
      dj: '/dashboard/dj-tablet',
      photographe: '/dashboard/photographe',
      traiteur: '/dashboard/traiteur',
      'wedding-planner': '/dashboard/wedding-planner',
      patissier: '/dashboard/patissier',
      location: '/dashboard/location'
    }
    return fournisseurDashboards[subType] || '/dashboard/fournisseur'
  }

  setupRoutes () {
    // Routes OAuth2 pour chaque provider
    this.app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }))
    this.app.get('/auth/apple', passport.authenticate('apple'))
    this.app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }))
    this.app.get('/auth/twitter', passport.authenticate('twitter'))

    // Callbacks
    this.app.get('/auth/google/callback',
      passport.authenticate('google', { failureRedirect: '/login' }),
      this.handleSuccessfulAuth.bind(this)
    )

    // Autres callbacks...
  }

  handleSuccessfulAuth (req, res) {
    const { user, token } = req.user

    // Redirection selon le type d'utilisateur
    res.cookie('auth_token', token, { httpOnly: true, secure: true })
    res.redirect(user.dashboardUrl)
  }
}

module.exports = AttitudesMultiProviderAuth
