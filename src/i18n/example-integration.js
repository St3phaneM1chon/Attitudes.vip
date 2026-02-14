/**
 * Example integration of i18n in Express application
 * This file demonstrates how to integrate the i18n system
 */

const express = require('express');
const cookieParser = require('cookie-parser');
const { setupI18n, i18nErrorHandler, loadNamespaces } = require('./index');

// Create Express app
const app = express();

// Required middleware for i18n
app.use(express.json());
app.use(cookieParser());

// Initialize i18n (async)
async function initializeApp() {
  // Setup i18n - this adds all necessary middleware
  await setupI18n(app);
  
  // Example: Home page with language detection
  app.get('/', (req, res) => {
    const welcomeMessage = req.t('welcome.title', { 
      appName: req.t('app.name') 
    });
    
    res.json({
      message: welcomeMessage,
      language: req.language,
      direction: res.locals.dir,
      availableLanguages: res.locals.languages
    });
  });
  
  // Example: Dashboard routes with specific namespace
  app.get('/dashboard/*', 
    loadNamespaces('dashboard', 'wedding'), // Load additional namespaces
    (req, res, next) => {
      // Dashboard routes have access to dashboard and wedding namespaces
      const dashboardTitle = req.t('dashboard:customer.title');
      const weddingTerm = req.t('wedding:terminology.default.ceremony');
      
      res.json({
        title: dashboardTitle,
        weddingTerm: weddingTerm
      });
    }
  );
  
  // Example: Wedding vendors page
  app.get('/vendors', 
    loadNamespaces('vendors'),
    (req, res) => {
      const categories = req.t('vendors:categories', { returnObjects: true });
      
      res.json({
        title: req.t('vendors:search.title'),
        categories: Object.keys(categories).map(key => ({
          id: key,
          name: categories[key].name,
          description: categories[key].description
        }))
      });
    }
  );
  
  // Example: Form with validation errors
  app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    // Validation
    if (!email) {
      return res.status(400).json({
        error: req.t('validation.required', { field: req.t('forms:fields.email.label') })
      });
    }
    
    if (!password) {
      return res.status(400).json({
        error: req.t('validation.required', { field: req.t('forms:fields.password.label') })
      });
    }
    
    // Mock authentication
    res.json({
      message: req.t('auth.login.success'),
      user: {
        email,
        preferredLanguage: req.language
      }
    });
  });
  
  // Example: Wedding-specific route with cultural adaptations
  app.get('/wedding/terminology/:religion?', (req, res) => {
    const { religion } = req.params;
    const terminology = req.locals.getWeddingTerminology(req.language, religion);
    const culturalAdaptations = req.locals.getCulturalAdaptations(req.language);
    
    res.json({
      language: req.language,
      religion: religion || 'default',
      terminology,
      culturalAdaptations,
      direction: res.locals.dir
    });
  });
  
  // Example: Date and currency formatting
  app.get('/api/format-examples', (req, res) => {
    const exampleDate = new Date();
    const exampleAmount = 1234.56;
    
    res.json({
      language: req.language,
      formattedDate: res.locals.formatDate(exampleDate),
      formattedDateTime: res.locals.formatDateTime(exampleDate),
      formattedCurrency: res.locals.formatCurrency(exampleAmount),
      relativeTime: req.t('dateTime.relative.daysAgo', { count: 3 })
    });
  });
  
  // Example: Regional content
  app.get('/api/regional-info', (req, res) => {
    const region = res.locals.getRegion();
    const regionConfig = req.i18n.services.resourceStore.data[req.language]?.regionalization?.[region];
    
    res.json({
      language: req.language,
      region,
      regionConfig,
      isRTL: res.locals.isRTL(),
      languageUrl: (lang) => res.locals.languageUrl(lang)
    });
  });
  
  // Example: Error handling with i18n
  app.get('/api/error-test/:code', (req, res, next) => {
    const error = new Error('Test error');
    error.status = parseInt(req.params.code) || 500;
    next(error);
  });
  
  // Use i18n error handler
  app.use(i18nErrorHandler);
  
  // Start server
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Supported languages: ${require('./config').supportedLocales.join(', ')}`);
  });
}

// Initialize the application
initializeApp().catch(console.error);

/**
 * Template Engine Integration Example (EJS)
 * 
 * If using a template engine like EJS:
 * 
 * app.set('view engine', 'ejs');
 * 
 * app.get('/page', (req, res) => {
 *   res.render('page', {
 *     // All template helpers are available in res.locals
 *     title: req.t('page.title'),
 *     // Access helpers directly in templates: 
 *     // <%= t('key') %>
 *     // <%= formatCurrency(100) %>
 *     // <%= formatDate(new Date()) %>
 *   });
 * });
 * 
 * In your EJS template:
 * <!DOCTYPE html>
 * <html lang="<%= language %>" dir="<%= dir %>">
 * <head>
 *   <title><%= t('app.name') %> - <%= title %></title>
 * </head>
 * <body>
 *   <h1><%= t('welcome.title', { appName: t('app.name') }) %></h1>
 *   
 *   <!-- Language Switcher -->
 *   <select onchange="location.href='<%= languageUrl(this.value) %>'">
 *     <% languages.forEach(lang => { %>
 *       <option value="<%= lang %>" <%= lang === language ? 'selected' : '' %>>
 *         <%= lang %>
 *       </option>
 *     <% }) %>
 *   </select>
 *   
 *   <!-- Formatted values -->
 *   <p><%= t('common.price') %>: <%= formatCurrency(99.99) %></p>
 *   <p><%= t('common.date') %>: <%= formatDate(new Date()) %></p>
 * </body>
 * </html>
 */