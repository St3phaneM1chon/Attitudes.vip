/**
 * Routes API principales avec documentation Swagger intégrée
 * Centralise toutes les routes de l'application
 */

const express = require('express')
const router = express.Router()

// Middlewares
const { authenticate } = require('../../middleware/auth')
const { validateRequest } = require('../../middleware/validation')
const { withCache, withOptimizedQuery } = require('../../config/performance-config')

// Controllers
const AuthController = require('../../controllers/auth-controller')
const UserController = require('../../controllers/user-controller')
const VendorController = require('../controllers/vendor-controller')
const WeddingController = require('../controllers/wedding-controller')
const PaymentController = require('../controllers/payment-controller')
const BookingController = require('../controllers/booking-controller')
const WorkflowController = require('../controllers/workflow-controller')
const NotificationController = require('../../controllers/notification-controller')
const AnalyticsController = require('../../controllers/analytics-controller')

/**
 * @swagger
 * /api/v1:
 *   get:
 *     summary: API Root
 *     description: Retourne les informations de base de l'API
 *     responses:
 *       200:
 *         description: Informations API
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                   example: Attitudes.vip API
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 status:
 *                   type: string
 *                   example: operational
 *                 documentation:
 *                   type: string
 *                   example: /api/v1/docs
 */
router.get('/', (req, res) => {
  res.json({
    name: 'Attitudes.vip API',
    version: '1.0.0',
    status: 'operational',
    documentation: '/api/v1/docs',
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      weddings: '/api/v1/weddings',
      vendors: '/api/v1/vendors',
      payments: '/api/v1/payments',
      notifications: '/api/v1/notifications',
      analytics: '/api/v1/analytics'
    }
  })
})

// Routes d'authentification (publiques)
router.post('/auth/register',
  validateRequest('auth.register'),
  AuthController.register
)

router.post('/auth/login',
  validateRequest('auth.login'),
  AuthController.login
)

router.post('/auth/logout',
  authenticate,
  AuthController.logout
)

router.post('/auth/refresh',
  validateRequest('auth.refresh'),
  AuthController.refresh
)

router.post('/auth/forgot-password',
  validateRequest('auth.forgotPassword'),
  AuthController.forgotPassword
)

router.post('/auth/reset-password',
  validateRequest('auth.resetPassword'),
  AuthController.resetPassword
)

router.post('/auth/verify-email',
  validateRequest('auth.verifyEmail'),
  AuthController.verifyEmail
)

// OAuth routes
router.get('/auth/oauth/:provider', AuthController.oauthInit)
router.get('/auth/oauth/:provider/callback', AuthController.oauthCallback)

// Routes utilisateurs (authentifiées)
router.get('/users/me',
  authenticate,
  UserController.getProfile
)

router.put('/users/me',
  authenticate,
  validateRequest('user.updateProfile'),
  UserController.updateProfile
)

router.post('/users/me/avatar',
  authenticate,
  UserController.uploadAvatar
)

router.delete('/users/me',
  authenticate,
  UserController.deleteAccount
)

// Routes vendors
router.post('/vendors/search',
  VendorController.searchVendors
)

router.get('/vendors/:id',
  VendorController.getVendor
)

router.get('/vendors/:id/availability',
  VendorController.checkAvailability
)

router.post('/vendors',
  authenticate,
  VendorController.createVendor
)

router.put('/vendors/:id',
  authenticate,
  VendorController.updateVendor
)

router.delete('/vendors/:id',
  authenticate,
  VendorController.deleteVendor
)

router.get('/weddings/:wedding_id/vendors',
  authenticate,
  VendorController.getWeddingVendors
)

// Routes mariages
router.get('/weddings',
  authenticate,
  WeddingController.getWeddings
)

router.post('/weddings',
  authenticate,
  WeddingController.createWedding
)

router.get('/weddings/:id',
  authenticate,
  WeddingController.getWedding
)

router.put('/weddings/:id',
  authenticate,
  WeddingController.updateWedding
)

router.delete('/weddings/:id',
  authenticate,
  WeddingController.deleteWedding
)

router.get('/weddings/:id/stats',
  authenticate,
  WeddingController.getWeddingStats
)

// Routes bookings
router.post('/bookings',
  authenticate,
  BookingController.createBooking
)

router.get('/weddings/:wedding_id/bookings',
  authenticate,
  BookingController.getWeddingBookings
)

router.get('/bookings/:id',
  authenticate,
  BookingController.getBooking
)

router.put('/bookings/:id',
  authenticate,
  BookingController.updateBooking
)

router.post('/bookings/:id/cancel',
  authenticate,
  BookingController.cancelBooking
)

// Routes paiements
router.post('/payments/create-intent',
  authenticate,
  PaymentController.createPaymentIntent
)

router.post('/payments/confirm',
  authenticate,
  PaymentController.confirmPayment
)

router.get('/weddings/:wedding_id/payments',
  authenticate,
  PaymentController.getWeddingPayments
)

router.post('/payments/refund',
  authenticate,
  PaymentController.createRefund
)

// Webhook Stripe (route publique)
router.post('/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  PaymentController.handleWebhook
)

// =============================================================================
// ROUTES WORKFLOWS
// =============================================================================

// Initier un workflow de réservation
router.post('/workflows/reservation',
  authenticate,
  WorkflowController.initiateReservationWorkflow
)

// Obtenir l'état d'un workflow
router.get('/workflows/:workflow_id',
  authenticate,
  WorkflowController.getWorkflowStatus
)

// Obtenir tous les workflows d'un utilisateur
router.get('/workflows',
  authenticate,
  WorkflowController.getUserWorkflows
)

// Soumettre un devis (vendor)
router.post('/workflows/quote',
  authenticate,
  WorkflowController.submitQuote
)

// Accepter un devis (customer)
router.post('/workflows/quote/accept',
  authenticate,
  WorkflowController.acceptQuote
)

// Signer un contrat
router.post('/workflows/contract/sign',
  authenticate,
  WorkflowController.signContract
)

// Annuler un workflow
router.post('/workflows/:workflow_id/cancel',
  authenticate,
  WorkflowController.cancelWorkflow
)

// Routes notifications
router.get('/notifications',
  authenticate,
  NotificationController.getNotifications
)

router.put('/notifications/:id/read',
  authenticate,
  NotificationController.markAsRead
)

router.put('/notifications/read-all',
  authenticate,
  NotificationController.markAllAsRead
)

router.get('/notifications/preferences',
  authenticate,
  NotificationController.getPreferences
)

router.put('/notifications/preferences',
  authenticate,
  validateRequest('notification.updatePreferences'),
  NotificationController.updatePreferences
)

// Routes analytics
router.get('/analytics/dashboard',
  authenticate,
  withCache('analytics', req => `analytics:dashboard:${req.user.id}`),
  AnalyticsController.getDashboardStats
)

router.get('/analytics/revenue',
  authenticate,
  withCache('analytics', req => `analytics:revenue:${req.user.id}`),
  AnalyticsController.getRevenueStats
)

router.get('/analytics/vendors',
  authenticate,
  withCache('analytics', req => `analytics:vendors:${req.user.id}`),
  AnalyticsController.getVendorStats
)

router.get('/analytics/guests',
  authenticate,
  withCache('analytics', req => `analytics:guests:${req.user.id}`),
  AnalyticsController.getGuestStats
)

router.post('/analytics/export',
  authenticate,
  validateRequest('analytics.export'),
  AnalyticsController.exportData
)

// Health check (public)
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  })
})

// 404 pour les routes non trouvées
router.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `${req.method} ${req.path} does not exist`
  })
})

// Error handler
router.use((err, req, res, next) => {
  console.error('API Error:', err)

  // Erreur de validation
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      errors: err.errors
    })
  }

  // Erreur d'authentification
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: err.message
    })
  }

  // Erreur générique
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
})

module.exports = router
