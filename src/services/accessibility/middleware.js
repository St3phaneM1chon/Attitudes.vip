/**
 * Accessibility Middleware
 * Runtime accessibility compliance checking for Express.js
 */

const accessibilityService = require('./index');
const wcagValidator = require('./wcagValidator');

/**
 * Create accessibility middleware
 * @param {Object} options - Middleware options
 * @returns {Function} Express middleware
 */
function createAccessibilityMiddleware(options = {}) {
  const {
    enabled = true,
    level = 'AA',
    autoFix = false,
    reportEndpoint = '/accessibility-report',
    excludePaths = ['/api', '/static', '/assets'],
    enforceCompliance = false,
    logViolations = true
  } = options;

  return async (req, res, next) => {
    // Skip if disabled
    if (!enabled) {
      return next();
    }

    // Skip excluded paths
    if (excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Intercept response
    const originalSend = res.send;
    const originalJson = res.json;

    // Override send method
    res.send = function(body) {
      handleResponse.call(this, body, 'html');
    };

    // Override json method
    res.json = function(body) {
      handleResponse.call(this, body, 'json');
    };

    // Handle response
    async function handleResponse(body, type) {
      const response = this;
      
      // Only process HTML responses
      if (type === 'html' && typeof body === 'string' && body.includes('<html')) {
        try {
          // Parse and check accessibility
          const { processedHtml, report } = await processHtmlForAccessibility(body, {
            level,
            autoFix,
            url: req.url,
            userAgent: req.get('user-agent')
          });

          // Log violations if enabled
          if (logViolations && report.errors.length > 0) {
            console.warn(`Accessibility violations on ${req.url}:`, report.errors);
          }

          // Store report for potential endpoint
          req.accessibilityReport = report;

          // Enforce compliance if enabled
          if (enforceCompliance && report.errors.length > 0) {
            return response.status(400).json({
              error: 'Accessibility compliance failed',
              violations: report.errors,
              reportUrl: reportEndpoint
            });
          }

          // Send processed HTML
          originalSend.call(response, processedHtml);
        } catch (error) {
          console.error('Accessibility middleware error:', error);
          originalSend.call(response, body);
        }
      } else {
        // Non-HTML response
        if (type === 'json') {
          originalJson.call(response, body);
        } else {
          originalSend.call(response, body);
        }
      }
    }

    // Add accessibility headers
    res.setHeader('X-Accessibility-Level', `WCAG-2.1-${level}`);
    
    // Add CSP for accessibility features
    const existingCSP = res.getHeader('Content-Security-Policy') || '';
    if (!existingCSP.includes('unsafe-inline')) {
      // Allow inline styles for focus indicators
      res.setHeader('Content-Security-Policy', 
        existingCSP + "; style-src 'self' 'unsafe-inline'");
    }

    next();
  };
}

/**
 * Process HTML for accessibility
 * @param {string} html - HTML content
 * @param {Object} options - Processing options
 * @returns {Object} Processed HTML and report
 */
async function processHtmlForAccessibility(html, options) {
  const { level, autoFix, url, userAgent } = options;
  const jsdom = require('jsdom');
  const { JSDOM } = jsdom;
  
  // Parse HTML
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const window = dom.window;

  // Make window available for validators
  global.window = window;
  global.document = document;

  // Run validation
  const validationResults = wcagValidator.validate(document.body, { level });
  
  // Auto-fix if enabled
  if (autoFix) {
    applyAutoFixes(document, validationResults);
  }

  // Enhance HTML
  enhanceAccessibility(document, { userAgent });

  // Generate report
  const report = {
    url,
    timestamp: new Date().toISOString(),
    level,
    score: calculateAccessibilityScore(validationResults),
    passed: validationResults.passed.length,
    failed: validationResults.failed.length,
    warnings: validationResults.warnings.length,
    errors: validationResults.failed,
    autoFixed: autoFix ? countAutoFixes(document) : 0
  };

  // Clean up globals
  delete global.window;
  delete global.document;

  return {
    processedHtml: dom.serialize(),
    report
  };
}

/**
 * Apply automatic fixes where possible
 * @param {Document} document - DOM document
 * @param {Object} validationResults - Validation results
 */
function applyAutoFixes(document, validationResults) {
  validationResults.failed.forEach(failure => {
    switch (failure.criterion) {
      case '1.1.1': // Non-text content
        fixMissingAltText(document, failure.elements);
        break;
      
      case '1.3.1': // Info and relationships
        fixFormLabels(document, failure.elements);
        break;
      
      case '2.4.2': // Page titled
        fixPageTitle(document);
        break;
      
      case '3.1.1': // Language of page
        fixPageLanguage(document);
        break;
      
      case '4.1.1': // Parsing
        fixDuplicateIds(document, failure.elements);
        break;
    }
  });
}

/**
 * Fix missing alt text
 * @param {Document} document - DOM document
 * @param {Array} images - Images missing alt text
 */
function fixMissingAltText(document, images) {
  images.forEach(img => {
    if (!img.hasAttribute('alt')) {
      // Add empty alt for decorative images or placeholder
      const src = img.getAttribute('src') || '';
      if (src.includes('decoration') || src.includes('spacer')) {
        img.setAttribute('alt', '');
      } else {
        img.setAttribute('alt', 'Image');
        img.setAttribute('data-accessibility-fixed', 'missing-alt');
      }
    }
  });
}

/**
 * Fix form labels
 * @param {Document} document - DOM document
 * @param {Array} inputs - Inputs missing labels
 */
function fixFormLabels(document, inputs) {
  inputs.forEach(input => {
    if (!input.id) {
      input.id = `input-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    const name = input.getAttribute('name') || input.getAttribute('type') || 'field';
    const label = document.createElement('label');
    label.setAttribute('for', input.id);
    label.textContent = name.charAt(0).toUpperCase() + name.slice(1).replace(/[-_]/g, ' ');
    label.setAttribute('data-accessibility-fixed', 'generated-label');
    
    input.parentNode.insertBefore(label, input);
  });
}

/**
 * Fix page title
 * @param {Document} document - DOM document
 */
function fixPageTitle(document) {
  if (!document.title || document.title.trim() === '') {
    const h1 = document.querySelector('h1');
    document.title = h1 ? h1.textContent : 'Attitudes.vip';
  }
}

/**
 * Fix page language
 * @param {Document} document - DOM document
 */
function fixPageLanguage(document) {
  const html = document.documentElement;
  if (!html.hasAttribute('lang')) {
    html.setAttribute('lang', 'en');
    html.setAttribute('data-accessibility-fixed', 'lang-attribute');
  }
}

/**
 * Fix duplicate IDs
 * @param {Document} document - DOM document
 * @param {Array} elements - Elements with duplicate IDs
 */
function fixDuplicateIds(document, elements) {
  const seenIds = new Set();
  
  elements.forEach(element => {
    const id = element.getAttribute('id');
    if (seenIds.has(id)) {
      const newId = `${id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      element.setAttribute('id', newId);
      element.setAttribute('data-accessibility-fixed', 'duplicate-id');
      
      // Update references
      document.querySelectorAll(`[for="${id}"], [aria-labelledby="${id}"], [aria-describedby="${id}"]`).forEach(ref => {
        const attr = ref.hasAttribute('for') ? 'for' : 
                    ref.hasAttribute('aria-labelledby') ? 'aria-labelledby' : 'aria-describedby';
        ref.setAttribute(attr, newId);
      });
    } else {
      seenIds.add(id);
    }
  });
}

/**
 * Enhance accessibility features
 * @param {Document} document - DOM document
 * @param {Object} options - Enhancement options
 */
function enhanceAccessibility(document, options) {
  // Add skip links if missing
  addSkipLinks(document);
  
  // Enhance focus indicators
  enhanceFocusIndicators(document);
  
  // Add ARIA landmarks if missing
  addARIALandmarks(document);
  
  // Enhance forms
  enhanceForms(document);
  
  // Add screen reader announcements
  addScreenReaderRegions(document);
  
  // Enhance tables
  enhanceTables(document);
  
  // Add keyboard shortcuts info
  addKeyboardShortcutsInfo(document);
}

/**
 * Add skip links
 * @param {Document} document - DOM document
 */
function addSkipLinks(document) {
  const body = document.body;
  const firstChild = body.firstChild;
  
  // Check if skip links already exist
  if (document.querySelector('.skip-links, [href^="#main"]')) {
    return;
  }
  
  const skipLinks = document.createElement('div');
  skipLinks.className = 'skip-links';
  skipLinks.innerHTML = `
    <a href="#main-content" class="skip-link">Skip to main content</a>
    <a href="#navigation" class="skip-link">Skip to navigation</a>
  `;
  
  body.insertBefore(skipLinks, firstChild);
}

/**
 * Enhance focus indicators
 * @param {Document} document - DOM document
 */
function enhanceFocusIndicators(document) {
  const style = document.createElement('style');
  style.setAttribute('data-accessibility-enhanced', 'focus-indicators');
  style.textContent = `
    /* Enhanced focus indicators */
    *:focus {
      outline: 3px solid #4A90E2 !important;
      outline-offset: 2px !important;
    }
    
    /* Focus visible only */
    *:focus:not(:focus-visible) {
      outline: none !important;
    }
    
    /* Skip link styles */
    .skip-link {
      position: absolute;
      left: -10000px;
      top: auto;
      width: 1px;
      height: 1px;
      overflow: hidden;
    }
    
    .skip-link:focus {
      position: static;
      width: auto;
      height: auto;
    }
  `;
  
  document.head.appendChild(style);
}

/**
 * Add ARIA landmarks
 * @param {Document} document - DOM document
 */
function addARIALandmarks(document) {
  // Main content
  const main = document.querySelector('main');
  if (!main) {
    const mainContent = document.querySelector('#main, .main, [class*="content"]');
    if (mainContent && !mainContent.hasAttribute('role')) {
      mainContent.setAttribute('role', 'main');
      mainContent.id = mainContent.id || 'main-content';
    }
  }
  
  // Navigation
  const nav = document.querySelector('nav');
  if (!nav) {
    const navElement = document.querySelector('.nav, .navigation, [class*="menu"]');
    if (navElement && !navElement.hasAttribute('role')) {
      navElement.setAttribute('role', 'navigation');
      navElement.id = navElement.id || 'navigation';
    }
  }
  
  // Header
  const header = document.querySelector('header');
  if (!header) {
    const headerElement = document.querySelector('.header, [class*="header"]');
    if (headerElement && !headerElement.hasAttribute('role')) {
      headerElement.setAttribute('role', 'banner');
    }
  }
  
  // Footer
  const footer = document.querySelector('footer');
  if (!footer) {
    const footerElement = document.querySelector('.footer, [class*="footer"]');
    if (footerElement && !footerElement.hasAttribute('role')) {
      footerElement.setAttribute('role', 'contentinfo');
    }
  }
}

/**
 * Enhance forms
 * @param {Document} document - DOM document
 */
function enhanceForms(document) {
  const forms = document.querySelectorAll('form');
  
  forms.forEach(form => {
    // Add form role if missing
    if (!form.hasAttribute('role')) {
      form.setAttribute('role', 'form');
    }
    
    // Enhance required fields
    const requiredFields = form.querySelectorAll('[required]');
    requiredFields.forEach(field => {
      if (!field.hasAttribute('aria-required')) {
        field.setAttribute('aria-required', 'true');
      }
    });
    
    // Add error regions
    if (!form.querySelector('[role="alert"]')) {
      const errorRegion = document.createElement('div');
      errorRegion.setAttribute('role', 'alert');
      errorRegion.setAttribute('aria-live', 'assertive');
      errorRegion.className = 'form-errors';
      errorRegion.style.display = 'none';
      form.insertBefore(errorRegion, form.firstChild);
    }
  });
}

/**
 * Add screen reader regions
 * @param {Document} document - DOM document
 */
function addScreenReaderRegions(document) {
  // Status region
  if (!document.querySelector('[role="status"]')) {
    const statusRegion = document.createElement('div');
    statusRegion.setAttribute('role', 'status');
    statusRegion.setAttribute('aria-live', 'polite');
    statusRegion.setAttribute('aria-atomic', 'true');
    statusRegion.className = 'sr-only status-region';
    document.body.appendChild(statusRegion);
  }
  
  // Alert region
  if (!document.querySelector('[role="alert"]')) {
    const alertRegion = document.createElement('div');
    alertRegion.setAttribute('role', 'alert');
    alertRegion.setAttribute('aria-live', 'assertive');
    alertRegion.setAttribute('aria-atomic', 'true');
    alertRegion.className = 'sr-only alert-region';
    document.body.appendChild(alertRegion);
  }
}

/**
 * Enhance tables
 * @param {Document} document - DOM document
 */
function enhanceTables(document) {
  const tables = document.querySelectorAll('table');
  
  tables.forEach(table => {
    // Add table role if missing
    if (!table.hasAttribute('role')) {
      table.setAttribute('role', 'table');
    }
    
    // Ensure headers have scope
    const headers = table.querySelectorAll('th');
    headers.forEach(header => {
      if (!header.hasAttribute('scope')) {
        // Determine scope based on position
        const isRowHeader = header.parentElement.querySelectorAll('th').length === 1;
        header.setAttribute('scope', isRowHeader ? 'row' : 'col');
      }
    });
    
    // Add caption if missing
    if (!table.querySelector('caption')) {
      const firstRow = table.querySelector('tr');
      if (firstRow) {
        const caption = document.createElement('caption');
        caption.className = 'sr-only';
        caption.textContent = 'Data table';
        table.insertBefore(caption, table.firstChild);
      }
    }
  });
}

/**
 * Add keyboard shortcuts info
 * @param {Document} document - DOM document
 */
function addKeyboardShortcutsInfo(document) {
  const meta = document.createElement('meta');
  meta.name = 'keyboard-shortcuts';
  meta.content = 'Alt+M=Main content, Alt+N=Navigation, Alt+H=Help';
  document.head.appendChild(meta);
}

/**
 * Calculate accessibility score
 * @param {Object} validationResults - Validation results
 * @returns {number} Score (0-100)
 */
function calculateAccessibilityScore(validationResults) {
  const total = validationResults.passed.length + 
                validationResults.failed.length + 
                validationResults.warnings.length;
  
  if (total === 0) return 100;
  
  const score = (validationResults.passed.length / total) * 100;
  return Math.round(score);
}

/**
 * Count auto-fixes applied
 * @param {Document} document - DOM document
 * @returns {number} Number of fixes
 */
function countAutoFixes(document) {
  return document.querySelectorAll('[data-accessibility-fixed]').length;
}

/**
 * Create accessibility report endpoint
 * @param {Object} options - Endpoint options
 * @returns {Function} Express route handler
 */
function createReportEndpoint(options = {}) {
  const {
    detailed = true,
    format = 'json' // 'json' or 'html'
  } = options;

  return (req, res) => {
    const report = req.accessibilityReport || {
      error: 'No accessibility report available'
    };

    if (format === 'html') {
      res.send(generateHTMLReport(report, detailed));
    } else {
      res.json(report);
    }
  };
}

/**
 * Generate HTML report
 * @param {Object} report - Accessibility report
 * @param {boolean} detailed - Include detailed information
 * @returns {string} HTML report
 */
function generateHTMLReport(report, detailed) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Accessibility Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .score { font-size: 2em; font-weight: bold; }
        .passed { color: green; }
        .failed { color: red; }
        .warning { color: orange; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <h1>Accessibility Report</h1>
      <p>URL: ${report.url}</p>
      <p>Timestamp: ${report.timestamp}</p>
      <p>WCAG Level: ${report.level}</p>
      <p class="score">Score: ${report.score}%</p>
      
      <h2>Summary</h2>
      <ul>
        <li class="passed">Passed: ${report.passed}</li>
        <li class="failed">Failed: ${report.failed}</li>
        <li class="warning">Warnings: ${report.warnings}</li>
        <li>Auto-fixed: ${report.autoFixed || 0}</li>
      </ul>
      
      ${detailed ? generateDetailedErrors(report.errors) : ''}
    </body>
    </html>
  `;
}

/**
 * Generate detailed errors section
 * @param {Array} errors - Error list
 * @returns {string} HTML errors
 */
function generateDetailedErrors(errors) {
  if (!errors || errors.length === 0) {
    return '<p>No errors found!</p>';
  }

  return `
    <h2>Detailed Errors</h2>
    <table>
      <thead>
        <tr>
          <th>Criterion</th>
          <th>Name</th>
          <th>Level</th>
          <th>Message</th>
          <th>Elements</th>
        </tr>
      </thead>
      <tbody>
        ${errors.map(error => `
          <tr>
            <td>${error.criterion}</td>
            <td>${error.name}</td>
            <td>${error.level}</td>
            <td>${error.message}</td>
            <td>${error.elements ? error.elements.length : 0}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

module.exports = {
  createAccessibilityMiddleware,
  createReportEndpoint,
  processHtmlForAccessibility
};