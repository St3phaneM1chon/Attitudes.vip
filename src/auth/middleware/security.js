const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

// Rate limiting par rôle
const createRateLimit = (windowMs, max) => {
  return rateLimit({
    windowMs,
    max,
    message: 'Trop de requêtes, veuillez réessayer plus tard.',
    standardHeaders: true,
    legacyHeaders: false,
  });
};

const roleLimits = {
  public: createRateLimit(15 * 60 * 1000, 100), // 100 req/15min
  invite: createRateLimit(15 * 60 * 1000, 200), // 200 req/15min
  customer: createRateLimit(15 * 60 * 1000, 500), // 500 req/15min
  fournisseur: createRateLimit(15 * 60 * 1000, 300), // 300 req/15min
  client: createRateLimit(15 * 60 * 1000, 1000), // 1000 req/15min
  admin: createRateLimit(15 * 60 * 1000, 2000), // 2000 req/15min
  cio: createRateLimit(15 * 60 * 1000, 5000) // 5000 req/15min
};

// Middleware de sécurité principal
const securityMiddleware = {
  // Vérification tenant pour isolation multi-tenant
  verifyTenant: (req, res, next) => {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenant;
    
    if (!tenantId && req.user?.role !== 'cio') {
      return res.status(400).json({ error: 'Tenant ID requis' });
    }
    
    req.tenant = tenantId;
    next();
  },

  // Rate limiting adaptatif selon le rôle
  adaptiveRateLimit: (req, res, next) => {
    const role = req.user?.role || 'public';
    const limiter = roleLimits[role] || roleLimits.public;
    limiter(req, res, next);
  },

  // Validation de la session
  validateSession: (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Session invalide' });
    }
    
    // Vérifier si la session n'est pas expirée
    const now = Math.floor(Date.now() / 1000);
    if (req.user.exp < now) {
      return res.status(401).json({ error: 'Session expirée' });
    }
    
    next();
  },

  // Headers de sécurité
  securityHeaders: (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' cdn.tailwindcss.com; style-src 'self' 'unsafe-inline' cdn.tailwindcss.com; img-src 'self' data: https:;");
    next();
  }
};

// Rate limiting pour les dashboards
const dashboardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requêtes par IP
  message: { error: 'Trop de requêtes' }
});

// Middleware de vérification d'authentification pour les dashboards
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1] || 
                req.query.token || 
                req.cookies?.authToken;

  if (!token) {
    return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.redirect('/login?expired=true&redirect=' + encodeURIComponent(req.originalUrl));
    }
    return res.redirect('/login?invalid=true&redirect=' + encodeURIComponent(req.originalUrl));
  }
}

// Middleware de vérification de permissions pour les dashboards
function requireDashboardAccess(dashboardRole) {
  return (req, res, next) => {
    requireAuth(req, res, () => {
      const userRole = req.user.role;
      const userPermissions = req.user.permissions;

      // CIO a accès à tout
      if (userRole === 'cio') {
        return next();
      }

      // Vérification du rôle spécifique
      if (userRole === dashboardRole) {
        return next();
      }

      // Vérification des permissions spécifiques
      const dashboardPermissions = {
        'cio': ['*'],
        'admin': ['backend', 'frontend', 'support'],
        'client': ['white_label', 'customer_management'],
        'customer': ['wedding_planning', 'guest_management', 'vendor_communication'],
        'invite': ['profile_edit', 'rsvp', 'games', 'photo_upload'],
        'dj': ['music_management', 'micro_requests', 'games_results'],
        'photographe': ['photo_upload', 'album_creation'],
        'traiteur': ['menu_management', 'allergy_tracking'],
        'wedding_planner': ['project_overview', 'communication_hub'],
        'patissier': ['order_management'],
        'location': ['equipment_management']
      };

      const requiredPermissions = dashboardPermissions[dashboardRole] || [];
      
      if (requiredPermissions.some(perm => userPermissions.includes(perm))) {
        return next();
      }

      // Accès refusé
      return res.status(403).render('error', {
        title: 'Accès Refusé',
        message: 'Vous n\'avez pas les permissions nécessaires pour accéder à ce dashboard.',
        user: req.user
      });
    });
  };
}

// Middleware de vérification de tenant pour marque blanche
function requireTenantAccess(req, res, next) {
  requireAuth(req, res, () => {
    const userTenant = req.user.tenant;
    const requestedTenant = req.params.tenant || req.query.tenant;

    // CIO peut accéder à tous les tenants
    if (req.user.role === 'cio') {
      return next();
    }

    // Vérification de l'accès au tenant
    if (userTenant === requestedTenant || userTenant === 'attitudes-vip') {
      return next();
    }

    return res.status(403).json({
      error: 'Accès au tenant refusé',
      code: 'TENANT_ACCESS_DENIED'
    });
  });
}

// Middleware de protection CSRF
function csrfProtection(req, res, next) {
  if (req.method === 'GET') {
    return next();
  }

  const csrfToken = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session?.csrfToken;

  if (!csrfToken || !sessionToken || csrfToken !== sessionToken) {
    return res.status(403).json({
      error: 'Token CSRF invalide',
      code: 'CSRF_TOKEN_INVALID'
    });
  }

  next();
}

// Middleware de validation des données d'entrée
function validateInput(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Données invalides',
        details: error.details.map(d => d.message)
      });
    }
    next();
  };
}

// Middleware de logging des actions sensibles
function auditLog(action) {
  return (req, res, next) => {
    const originalSend = res.send;
    res.send = function(data) {
      // Log de l'action
      console.log(`[AUDIT] ${new Date().toISOString()} - User: ${req.user?.id} - Action: ${action} - IP: ${req.ip} - Status: ${res.statusCode}`);
      
      originalSend.call(this, data);
    };
    next();
  };
}

// Middleware de protection contre les attaques XSS
function xssProtection(req, res, next) {
  // Nettoyage des données d'entrée
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      }
    });
  }
  next();
}

// Middleware de vérification de la session
function checkSession(req, res, next) {
  if (!req.session) {
    return res.status(401).json({
      error: 'Session invalide',
      code: 'INVALID_SESSION'
    });
  }
  next();
}

// Middleware de limitation de taille des requêtes
function requestSizeLimit(limit) {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    if (contentLength > limit) {
      return res.status(413).json({
        error: 'Requête trop volumineuse',
        code: 'REQUEST_TOO_LARGE',
        maxSize: limit
      });
    }
    next();
  };
}

// Middleware de vérification de l'User-Agent
function validateUserAgent(req, res, next) {
  const userAgent = req.headers['user-agent'];
  const allowedPatterns = [
    /Mozilla\/\d+\.\d+/,
    /Chrome\/\d+\.\d+/,
    /Safari\/\d+\.\d+/,
    /Firefox\/\d+\.\d+/,
    /Edge\/\d+\.\d+/
  ];

  if (!userAgent || !allowedPatterns.some(pattern => pattern.test(userAgent))) {
    return res.status(403).json({
      error: 'User-Agent non autorisé',
      code: 'INVALID_USER_AGENT'
    });
  }

  next();
}

module.exports = {
  requireAuth,
  requireDashboardAccess,
  requireTenantAccess,
  csrfProtection,
  validateInput,
  auditLog,
  xssProtection,
  checkSession,
  requestSizeLimit,
  validateUserAgent,
  dashboardLimiter,
  ...securityMiddleware
};
