const express = require('express');
const router = express.Router();

// Import all API routes
const authRoutes = require('./auth');
const weddingRoutes = require('./weddings');
const taskRoutes = require('./tasks');
const vendorRoutes = require('./vendors');
const guestRoutes = require('./guests');
const expenseRoutes = require('./expenses');
const paymentRoutes = require('./payments');

// Mount routes with versioning
router.use('/auth', authRoutes);
router.use('/weddings', weddingRoutes);
router.use('/tasks', taskRoutes);
router.use('/vendors', vendorRoutes);
router.use('/guests', guestRoutes);
router.use('/expenses', expenseRoutes);
router.use('/payments', paymentRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.API_VERSION || '1.0.0',
    uptime: process.uptime()
  });
});

// API documentation endpoint
router.get('/', (req, res) => {
  res.json({
    message: 'Attitudes.vip API v1',
    version: '1.0.0',
    endpoints: {
      auth: {
        login: 'POST /api/v1/auth/login',
        register: 'POST /api/v1/auth/register',
        refresh: 'POST /api/v1/auth/refresh',
        logout: 'POST /api/v1/auth/logout',
        me: 'GET /api/v1/auth/me',
        oauth: {
          google: 'GET /api/v1/auth/google',
          facebook: 'GET /api/v1/auth/facebook',
          apple: 'GET /api/v1/auth/apple',
          twitter: 'GET /api/v1/auth/twitter'
        }
      },
      weddings: {
        get: 'GET /api/v1/weddings/:weddingId',
        update: 'PATCH /api/v1/weddings/:weddingId',
        tasks: 'GET /api/v1/weddings/:weddingId/tasks',
        vendors: 'GET /api/v1/weddings/:weddingId/vendors',
        guests: 'GET /api/v1/weddings/:weddingId/guests',
        budget: 'GET /api/v1/weddings/:weddingId/budget',
        emergency: 'POST /api/v1/weddings/:weddingId/emergency'
      },
      tasks: {
        update: 'PATCH /api/v1/tasks/:taskId',
        delete: 'DELETE /api/v1/tasks/:taskId',
        assign: 'POST /api/v1/tasks/:taskId/assign',
        complete: 'POST /api/v1/tasks/:taskId/complete'
      },
      vendors: {
        update: 'PATCH /api/v1/vendors/:vendorId',
        delete: 'DELETE /api/v1/vendors/:vendorId'
      },
      guests: {
        update: 'PATCH /api/v1/guests/:guestId',
        delete: 'DELETE /api/v1/guests/:guestId',
        import: 'POST /api/v1/weddings/:weddingId/guests/import'
      },
      expenses: {
        create: 'POST /api/v1/weddings/:weddingId/expenses',
        update: 'PATCH /api/v1/expenses/:expenseId',
        delete: 'DELETE /api/v1/expenses/:expenseId'
      }
    }
  });
});

module.exports = router;