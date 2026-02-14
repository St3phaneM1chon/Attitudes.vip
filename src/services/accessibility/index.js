/**
 * WCAG 2.1 AA Accessibility Service
 * Provides comprehensive accessibility compliance for Attitudes.vip
 */

const { EventEmitter } = require('events');
const colorContrast = require('./colorContrast');
const focusManager = require('./focusManager');
const screenReaderUtils = require('./screenReaderUtils');
const keyboardNavigator = require('./keyboardNavigator');
const ariaHelper = require('./ariaHelper');
const wcagValidator = require('./wcagValidator');

class AccessibilityService extends EventEmitter {
  constructor() {
    super();
    this.settings = {
      highContrastMode: false,
      reducedMotion: false,
      screenReaderMode: false,
      keyboardNavigationMode: false,
      fontSize: 'normal',
      colorBlindMode: null
    };
    
    this.wcagLevel = 'AA'; // Target WCAG 2.1 AA compliance
    this.language = 'en';
    this.region = 'default';
    
    this.initializeSystemPreferences();
  }

  /**
   * Initialize accessibility based on system preferences
   */
  initializeSystemPreferences() {
    // Check for prefers-reduced-motion
    if (typeof window !== 'undefined' && window.matchMedia) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.settings.reducedMotion = prefersReducedMotion.matches;
      
      prefersReducedMotion.addEventListener('change', (e) => {
        this.settings.reducedMotion = e.matches;
        this.emit('settingsChanged', { reducedMotion: e.matches });
      });

      // Check for high contrast mode
      const prefersHighContrast = window.matchMedia('(prefers-contrast: high)');
      this.settings.highContrastMode = prefersHighContrast.matches;
      
      prefersHighContrast.addEventListener('change', (e) => {
        this.settings.highContrastMode = e.matches;
        this.emit('settingsChanged', { highContrastMode: e.matches });
      });
    }
  }

  /**
   * Enable screen reader optimizations
   */
  enableScreenReaderMode() {
    this.settings.screenReaderMode = true;
    screenReaderUtils.initialize();
    this.emit('screenReaderModeEnabled');
  }

  /**
   * Disable screen reader optimizations
   */
  disableScreenReaderMode() {
    this.settings.screenReaderMode = false;
    screenReaderUtils.cleanup();
    this.emit('screenReaderModeDisabled');
  }

  /**
   * Enable keyboard navigation mode
   */
  enableKeyboardNavigation() {
    this.settings.keyboardNavigationMode = true;
    keyboardNavigator.initialize();
    focusManager.enableFocusIndicators();
    this.emit('keyboardNavigationEnabled');
  }

  /**
   * Disable keyboard navigation mode
   */
  disableKeyboardNavigation() {
    this.settings.keyboardNavigationMode = false;
    keyboardNavigator.cleanup();
    focusManager.disableFocusIndicators();
    this.emit('keyboardNavigationDisabled');
  }

  /**
   * Set font size preference
   * @param {string} size - 'small', 'normal', 'large', 'extra-large'
   */
  setFontSize(size) {
    const validSizes = ['small', 'normal', 'large', 'extra-large'];
    if (!validSizes.includes(size)) {
      throw new Error(`Invalid font size. Must be one of: ${validSizes.join(', ')}`);
    }
    
    this.settings.fontSize = size;
    this.emit('fontSizeChanged', size);
  }

  /**
   * Set color blind mode
   * @param {string|null} mode - 'protanopia', 'deuteranopia', 'tritanopia', or null
   */
  setColorBlindMode(mode) {
    const validModes = ['protanopia', 'deuteranopia', 'tritanopia', null];
    if (!validModes.includes(mode)) {
      throw new Error(`Invalid color blind mode. Must be one of: ${validModes.join(', ')}`);
    }
    
    this.settings.colorBlindMode = mode;
    this.emit('colorBlindModeChanged', mode);
  }

  /**
   * Check color contrast between two colors
   * @param {string} foreground - Foreground color
   * @param {string} background - Background color
   * @param {string} level - 'AA' or 'AAA'
   * @returns {Object} Contrast check result
   */
  checkColorContrast(foreground, background, level = 'AA') {
    return colorContrast.check(foreground, background, level);
  }

  /**
   * Get accessible color suggestion
   * @param {string} foreground - Foreground color
   * @param {string} background - Background color
   * @param {string} level - 'AA' or 'AAA'
   * @returns {Object} Suggested colors
   */
  suggestAccessibleColors(foreground, background, level = 'AA') {
    return colorContrast.suggest(foreground, background, level);
  }

  /**
   * Manage focus for a component or page
   * @param {HTMLElement} container - Container element
   * @param {Object} options - Focus management options
   */
  manageFocus(container, options = {}) {
    return focusManager.manage(container, options);
  }

  /**
   * Trap focus within a container (useful for modals)
   * @param {HTMLElement} container - Container element
   */
  trapFocus(container) {
    return focusManager.trap(container);
  }

  /**
   * Release focus trap
   * @param {HTMLElement} container - Container element
   */
  releaseFocusTrap(container) {
    return focusManager.release(container);
  }

  /**
   * Announce message to screen readers
   * @param {string} message - Message to announce
   * @param {string} priority - 'polite' or 'assertive'
   */
  announce(message, priority = 'polite') {
    return screenReaderUtils.announce(message, priority);
  }

  /**
   * Announce page change to screen readers
   * @param {string} pageTitle - New page title
   * @param {Object} options - Additional options
   */
  announcePageChange(pageTitle, options = {}) {
    return screenReaderUtils.announcePageChange(pageTitle, options);
  }

  /**
   * Generate ARIA labels for wedding-specific components
   * @param {string} componentType - Type of wedding component
   * @param {Object} data - Component data
   * @returns {Object} ARIA attributes
   */
  generateWeddingARIA(componentType, data) {
    return ariaHelper.generateWeddingARIA(componentType, data);
  }

  /**
   * Validate WCAG compliance for an element
   * @param {HTMLElement} element - Element to validate
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  validateWCAGCompliance(element, options = {}) {
    return wcagValidator.validate(element, {
      level: this.wcagLevel,
      ...options
    });
  }

  /**
   * Run accessibility audit on page or component
   * @param {HTMLElement} container - Container to audit
   * @param {Object} options - Audit options
   * @returns {Promise<Object>} Audit results
   */
  async runAccessibilityAudit(container = document.body, options = {}) {
    const results = {
      passed: [],
      warnings: [],
      errors: [],
      score: 0
    };

    try {
      // Check color contrast
      const contrastResults = await colorContrast.auditPage(container);
      results.passed.push(...contrastResults.passed);
      results.warnings.push(...contrastResults.warnings);
      results.errors.push(...contrastResults.errors);

      // Check ARIA implementation
      const ariaResults = await ariaHelper.audit(container);
      results.passed.push(...ariaResults.passed);
      results.warnings.push(...ariaResults.warnings);
      results.errors.push(...ariaResults.errors);

      // Check keyboard navigation
      const keyboardResults = await keyboardNavigator.audit(container);
      results.passed.push(...keyboardResults.passed);
      results.warnings.push(...keyboardResults.warnings);
      results.errors.push(...keyboardResults.errors);

      // Check focus management
      const focusResults = await focusManager.audit(container);
      results.passed.push(...focusResults.passed);
      results.warnings.push(...focusResults.warnings);
      results.errors.push(...focusResults.errors);

      // Calculate score
      const total = results.passed.length + results.warnings.length + results.errors.length;
      results.score = total > 0 ? (results.passed.length / total) * 100 : 100;

      this.emit('auditCompleted', results);
    } catch (error) {
      console.error('Accessibility audit failed:', error);
      results.errors.push({
        type: 'audit_error',
        message: error.message,
        severity: 'critical'
      });
    }

    return results;
  }

  /**
   * Get current accessibility settings
   * @returns {Object} Current settings
   */
  getSettings() {
    return { ...this.settings };
  }

  /**
   * Update multiple accessibility settings
   * @param {Object} newSettings - Settings to update
   */
  updateSettings(newSettings) {
    const oldSettings = { ...this.settings };
    this.settings = { ...this.settings, ...newSettings };
    this.emit('settingsChanged', this.settings, oldSettings);
  }

  /**
   * Export accessibility report
   * @param {Object} auditResults - Results from runAccessibilityAudit
   * @param {string} format - 'json', 'html', or 'pdf'
   * @returns {Promise<string|Buffer>} Report data
   */
  async exportReport(auditResults, format = 'json') {
    const report = {
      timestamp: new Date().toISOString(),
      wcagLevel: this.wcagLevel,
      settings: this.settings,
      results: auditResults,
      recommendations: this.generateRecommendations(auditResults)
    };

    switch (format) {
      case 'json':
        return JSON.stringify(report, null, 2);
      case 'html':
        return this.generateHTMLReport(report);
      case 'pdf':
        return this.generatePDFReport(report);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Generate recommendations based on audit results
   * @param {Object} auditResults - Audit results
   * @returns {Array} Recommendations
   */
  generateRecommendations(auditResults) {
    const recommendations = [];

    // Analyze errors and generate specific recommendations
    auditResults.errors.forEach(error => {
      switch (error.type) {
        case 'color_contrast':
          recommendations.push({
            priority: 'high',
            category: 'visual',
            title: 'Improve Color Contrast',
            description: `Adjust color combinations to meet WCAG ${this.wcagLevel} standards`,
            solution: error.suggestion
          });
          break;
        case 'missing_aria_label':
          recommendations.push({
            priority: 'high',
            category: 'screen_reader',
            title: 'Add ARIA Labels',
            description: 'Provide descriptive labels for interactive elements',
            solution: 'Add appropriate aria-label or aria-labelledby attributes'
          });
          break;
        case 'keyboard_trap':
          recommendations.push({
            priority: 'critical',
            category: 'keyboard',
            title: 'Fix Keyboard Navigation',
            description: 'Ensure all interactive elements are keyboard accessible',
            solution: 'Implement proper focus management and tab order'
          });
          break;
      }
    });

    return recommendations;
  }

  /**
   * Generate HTML report
   * @private
   */
  generateHTMLReport(report) {
    // Implementation would generate a formatted HTML report
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <title>Accessibility Report - Attitudes.vip</title>
        <style>
          /* Accessible styles for the report */
        </style>
      </head>
      <body>
        <h1>Accessibility Audit Report</h1>
        <!-- Report content -->
      </body>
      </html>
    `;
  }

  /**
   * Generate PDF report
   * @private
   */
  async generatePDFReport(report) {
    // Implementation would use a PDF generation library
    throw new Error('PDF generation not yet implemented');
  }
}

// Export singleton instance
module.exports = new AccessibilityService();