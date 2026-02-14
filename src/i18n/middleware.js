const { 
  initI18n, 
  i18nMiddleware, 
  createTemplateHelpers, 
  detectUserLanguage,
  getLanguageDirection
} = require('./config');

/**
 * Initialize i18n and return middleware for Express
 */
const setupI18n = async (app) => {
  // Initialize i18next
  await initI18n();
  
  // Add i18next middleware
  app.use(i18nMiddleware);
  
  // Add custom middleware for template helpers
  app.use((req, res, next) => {
    // Detect user's preferred language
    const detectedLanguage = detectUserLanguage(req);
    if (detectedLanguage !== req.language) {
      req.i18n.changeLanguage(detectedLanguage);
    }
    
    // Create template helpers
    const helpers = createTemplateHelpers(req);
    
    // Make helpers available in templates
    res.locals = {
      ...res.locals,
      ...helpers,
      // Additional template variables
      currentUrl: req.originalUrl,
      currentPath: req.path,
      currentLanguage: req.language,
      availableLanguages: req.i18n.languages,
      isRTL: getLanguageDirection(req.language) === 'rtl',
      // Helper to generate language switch URLs
      languageUrl: (lang) => {
        const url = new URL(req.originalUrl, `http://${req.headers.host}`);
        url.searchParams.set('lang', lang);
        return url.pathname + url.search;
      }
    };
    
    // Set language cookie if not already set
    if (!req.cookies.attitudes_language) {
      res.cookie('attitudes_language', req.language, {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
    }
    
    // Set Content-Language header
    res.set('Content-Language', req.language);
    
    // Set text direction in response for client-side use
    res.set('X-Text-Direction', getLanguageDirection(req.language));
    
    next();
  });
  
  // Language switching endpoint
  app.post('/api/language', (req, res) => {
    const { language } = req.body;
    
    if (!language || !req.i18n.languages.includes(language)) {
      return res.status(400).json({ 
        error: 'Invalid language' 
      });
    }
    
    // Change language
    req.i18n.changeLanguage(language);
    
    // Update cookie
    res.cookie('attitudes_language', language, {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    
    // Update user preference if logged in
    if (req.user) {
      // This would typically update the database
      req.user.preferredLanguage = language;
      // TODO: Save to database
    }
    
    res.json({ 
      success: true, 
      language,
      direction: getLanguageDirection(language)
    });
  });
  
  // API endpoint to get available translations
  app.get('/api/translations/:namespace?', (req, res) => {
    const { namespace = 'translation' } = req.params;
    const language = req.query.lang || req.language;
    
    const translations = req.i18n.getResourceBundle(language, namespace);
    
    if (!translations) {
      return res.status(404).json({ 
        error: 'Translations not found' 
      });
    }
    
    res.json({
      language,
      namespace,
      translations,
      direction: getLanguageDirection(language)
    });
  });
  
  // API endpoint to get user's detected language info
  app.get('/api/language/detect', (req, res) => {
    const detected = detectUserLanguage(req);
    
    res.json({
      detected,
      current: req.language,
      available: req.i18n.languages,
      direction: getLanguageDirection(detected),
      locale: req.i18n.language
    });
  });
};

/**
 * Helper middleware to ensure specific language for certain routes
 */
const requireLanguage = (language) => {
  return (req, res, next) => {
    if (req.language !== language) {
      req.i18n.changeLanguage(language);
    }
    next();
  };
};

/**
 * Helper middleware to load additional namespaces for specific routes
 */
const loadNamespaces = (...namespaces) => {
  return async (req, res, next) => {
    try {
      await req.i18n.loadNamespaces(namespaces);
      next();
    } catch (error) {
      console.error('Failed to load namespaces:', error);
      next();
    }
  };
};

/**
 * Error handler with i18n support
 */
const i18nErrorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const errorKey = `errors.http.${status}`;
  
  // Try to get localized error message
  const localizedError = req.t(errorKey, { 
    returnObjects: true,
    defaultValue: {
      title: 'Error',
      message: err.message || 'An error occurred'
    }
  });
  
  res.status(status).json({
    error: {
      status,
      ...localizedError,
      // Include original error in development
      ...(process.env.NODE_ENV === 'development' && {
        original: err.message,
        stack: err.stack
      })
    }
  });
};

module.exports = {
  setupI18n,
  requireLanguage,
  loadNamespaces,
  i18nErrorHandler
};