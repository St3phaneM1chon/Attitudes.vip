const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../../auth/middleware/security');
const db = require('../../services/database/db-service');
const AuthService = require('../../auth/auth-service');

// POST /api/v1/auth/register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('role').optional().isIn(['customer', 'vendor', 'invite']),
  body('locale').optional().isIn(['fr', 'en', 'es', 'ar', 'zh'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, role = 'customer', locale = 'fr' } = req.body;

    // Vérifier si l'email existe déjà
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(password, 12);

    // Créer l'utilisateur
    const result = await db.query(`
      INSERT INTO users (
        email, password_hash, first_name, last_name, 
        role, locale, email_verified, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, false, true)
      RETURNING id, email, first_name, last_name, role, locale
    `, [email, passwordHash, firstName, lastName, role, locale]);

    const user = result.rows[0];

    // Générer les tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // Sauvegarder le refresh token
    await saveRefreshToken(user.id, refreshToken);

    res.status(201).json({
      user,
      token,
      refreshToken
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Récupérer l'utilisateur
    const userResult = await db.query(`
      SELECT id, email, password_hash, first_name, last_name, 
             role, locale, email_verified, is_active
      FROM users 
      WHERE email = $1
    `, [email]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    // Vérifier le compte actif
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    // Vérifier le mot de passe
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Récupérer le mariage actuel si applicable
    const weddingResult = await db.query(`
      SELECT wedding_id FROM user_weddings 
      WHERE user_id = $1 AND is_active = true 
      ORDER BY created_at DESC LIMIT 1
    `, [user.id]);

    if (weddingResult.rows.length > 0) {
      user.weddingId = weddingResult.rows[0].wedding_id;
    }

    // Générer les tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // Sauvegarder le refresh token
    await saveRefreshToken(user.id, refreshToken);

    // Mettre à jour la dernière connexion
    await db.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Nettoyer les données sensibles
    delete user.password_hash;

    res.json({
      user,
      token,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const userResult = await db.query(`
      SELECT id, email, first_name, last_name, role, locale, 
             email_verified, created_at, last_login
      FROM users 
      WHERE id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Récupérer le mariage actuel
    const weddingResult = await db.query(`
      SELECT w.id, w.partner1_name, w.partner2_name, w.wedding_date
      FROM user_weddings uw
      JOIN weddings w ON uw.wedding_id = w.id
      WHERE uw.user_id = $1 AND uw.is_active = true
      ORDER BY uw.created_at DESC LIMIT 1
    `, [userId]);

    if (weddingResult.rows.length > 0) {
      user.wedding = weddingResult.rows[0];
      user.weddingId = weddingResult.rows[0].id;
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // Vérifier le refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Vérifier en base de données
    const tokenResult = await db.query(`
      SELECT user_id FROM refresh_tokens 
      WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP
    `, [refreshToken]);

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Récupérer l'utilisateur
    const userResult = await db.query(`
      SELECT id, email, first_name, last_name, role 
      FROM users 
      WHERE id = $1 AND is_active = true
    `, [decoded.userId]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Générer un nouveau token
    const token = generateToken(user);

    res.json({ token });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// POST /api/v1/auth/logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const token = req.headers.authorization?.split(' ')[1];

    // Invalider le refresh token
    await db.query(
      'DELETE FROM refresh_tokens WHERE user_id = $1',
      [userId]
    );

    // Optionnel : ajouter le token à une blacklist
    if (token) {
      await db.query(
        'INSERT INTO token_blacklist (token, expires_at) VALUES ($1, $2)',
        [token, new Date(Date.now() + 24 * 60 * 60 * 1000)]
      );
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// OAuth routes
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email'] 
}));

router.get('/google/callback', 
  passport.authenticate('google', { session: false }),
  handleOAuthCallback
);

router.get('/facebook', passport.authenticate('facebook', { 
  scope: ['email'] 
}));

router.get('/facebook/callback',
  passport.authenticate('facebook', { session: false }),
  handleOAuthCallback
);

router.get('/apple', passport.authenticate('apple'));

router.get('/apple/callback',
  passport.authenticate('apple', { session: false }),
  handleOAuthCallback
);

router.get('/twitter', passport.authenticate('twitter'));

router.get('/twitter/callback',
  passport.authenticate('twitter', { session: false }),
  handleOAuthCallback
);

// Helper functions
function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      type: 'refresh'
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
}

async function saveRefreshToken(userId, token) {
  await db.query(`
    INSERT INTO refresh_tokens (user_id, token, expires_at)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id) 
    DO UPDATE SET token = $2, expires_at = $3
  `, [
    userId, 
    token, 
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  ]);
}

async function handleOAuthCallback(req, res) {
  try {
    const user = req.user;
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    await saveRefreshToken(user.id, refreshToken);

    // Rediriger vers le frontend avec les tokens
    const redirectUrl = new URL(`${process.env.FRONTEND_URL}/auth/${req.authInfo.provider}/callback`);
    redirectUrl.searchParams.append('token', token);
    redirectUrl.searchParams.append('refreshToken', refreshToken);

    res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('OAuth callback error:', error);
    const redirectUrl = new URL(`${process.env.FRONTEND_URL}/auth/${req.authInfo.provider}/callback`);
    redirectUrl.searchParams.append('error', 'oauth_failed');
    res.redirect(redirectUrl.toString());
  }
}

module.exports = router;