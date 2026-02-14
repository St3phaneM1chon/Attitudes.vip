/**
 * Main i18n module export
 * 
 * This module exports all necessary functions and configurations
 * for internationalization in the Attitudes.vip application
 */

const config = require('./config');
const middleware = require('./middleware');

module.exports = {
  // Configuration
  config,
  
  // Core functions from config
  initI18n: config.initI18n,
  i18next: config.i18next,
  supportedLanguages: config.supportedLocales,
  defaultLanguage: config.defaultLocale,
  rtlLanguages: config.rtlLanguages,
  
  // Middleware functions
  setupI18n: middleware.setupI18n,
  i18nMiddleware: config.i18nMiddleware,
  requireLanguage: middleware.requireLanguage,
  loadNamespaces: middleware.loadNamespaces,
  i18nErrorHandler: middleware.i18nErrorHandler,
  
  // Helper functions
  getLanguageDirection: config.getLanguageDirection,
  createTemplateHelpers: config.createTemplateHelpers,
  detectUserLanguage: config.detectUserLanguage,
  getWeddingTerminology: config.getWeddingTerminology,
  getCulturalAdaptations: config.getCulturalAdaptations,
  formatCurrency: config.formatCurrency,
  formatDate: config.formatDate,
  formatDateTime: config.formatDateTime,
  getCurrencyByLanguage: config.getCurrencyByLanguage,
  getLocaleByLanguage: config.getLocaleByLanguage,
  
  // Regional configurations
  regionalization: config.regionalization,
  creoleLanguages: config.creoleLanguages,
  dateFormats: config.dateFormats,
  numberFormats: config.numberFormats,
  currencies: config.currencies,
  timezones: config.timezones
};

/**
 * Example usage in Express app:
 * 
 * const express = require('express');
 * const { setupI18n, i18nErrorHandler } = require('./i18n');
 * 
 * const app = express();
 * 
 * // Setup i18n middleware
 * await setupI18n(app);
 * 
 * // Your routes here
 * app.get('/', (req, res) => {
 *   res.send(req.t('welcome.title', { appName: 'Attitudes.vip' }));
 * });
 * 
 * // Error handler with i18n support
 * app.use(i18nErrorHandler);
 */