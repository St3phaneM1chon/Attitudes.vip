/**
 * Accessibility Testing Utilities
 * Comprehensive testing tools for WCAG 2.1 compliance
 */

const axeCore = require('axe-core');
const { JSDOM } = require('jsdom');
const puppeteer = require('puppeteer');
const pa11y = require('pa11y');

class AccessibilityTester {
  constructor(options = {}) {
    this.options = {
      standard: 'WCAG2AA',
      timeout: 30000,
      wait: 250,
      includeWarnings: true,
      includeNotices: false,
      chromeLaunchConfig: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      },
      ...options
    };

    this.browser = null;
  }

  /**
   * Initialize browser for testing
   */
  async initialize() {
    if (!this.browser) {
      this.browser = await puppeteer.launch(this.options.chromeLaunchConfig);
    }
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Test a URL with multiple testing engines
   * @param {string} url - URL to test
   * @param {Object} options - Test options
   * @returns {Object} Combined test results
   */
  async testUrl(url, options = {}) {
    await this.initialize();

    const results = {
      url,
      timestamp: new Date().toISOString(),
      summary: {
        errors: 0,
        warnings: 0,
        notices: 0,
        passed: 0
      },
      axe: null,
      pa11y: null,
      lighthouse: null,
      custom: null
    };

    try {
      // Run tests in parallel
      const [axeResults, pa11yResults, customResults] = await Promise.all([
        this.runAxeTest(url, options),
        this.runPa11yTest(url, options),
        this.runCustomTests(url, options)
      ]);

      results.axe = axeResults;
      results.pa11y = pa11yResults;
      results.custom = customResults;

      // Aggregate results
      this.aggregateResults(results);

    } catch (error) {
      results.error = error.message;
    }

    return results;
  }

  /**
   * Run Axe accessibility test
   * @param {string} url - URL to test
   * @param {Object} options - Test options
   * @returns {Object} Axe test results
   */
  async runAxeTest(url, options = {}) {
    const page = await this.browser.newPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle2' });
      
      // Inject axe-core
      await page.addScriptTag({ path: require.resolve('axe-core') });
      
      // Run axe
      const results = await page.evaluate(async (options) => {
        const axeOptions = {
          resultTypes: ['violations', 'passes', 'incomplete'],
          ...options.axe
        };
        
        return await axe.run(document, axeOptions);
      }, options);

      return {
        violations: results.violations,
        passes: results.passes,
        incomplete: results.incomplete,
        inapplicable: results.inapplicable
      };

    } finally {
      await page.close();
    }
  }

  /**
   * Run Pa11y accessibility test
   * @param {string} url - URL to test
   * @param {Object} options - Test options
   * @returns {Object} Pa11y test results
   */
  async runPa11yTest(url, options = {}) {
    const pa11yOptions = {
      standard: this.options.standard,
      timeout: this.options.timeout,
      wait: this.options.wait,
      includeWarnings: this.options.includeWarnings,
      includeNotices: this.options.includeNotices,
      browser: this.browser,
      ...options.pa11y
    };

    try {
      const results = await pa11y(url, pa11yOptions);
      
      return {
        issues: results.issues,
        pageTitle: results.pageTitle,
        documentTitle: results.documentTitle
      };

    } catch (error) {
      return {
        error: error.message,
        issues: []
      };
    }
  }

  /**
   * Run custom accessibility tests
   * @param {string} url - URL to test
   * @param {Object} options - Test options
   * @returns {Object} Custom test results
   */
  async runCustomTests(url, options = {}) {
    const page = await this.browser.newPage();
    const results = {
      colorContrast: [],
      keyboardNavigation: [],
      screenReaderOptimization: [],
      weddingSpecific: []
    };

    try {
      await page.goto(url, { waitUntil: 'networkidle2' });

      // Test color contrast
      results.colorContrast = await this.testColorContrast(page);

      // Test keyboard navigation
      results.keyboardNavigation = await this.testKeyboardNavigation(page);

      // Test screen reader optimization
      results.screenReaderOptimization = await this.testScreenReaderOptimization(page);

      // Test wedding-specific features
      results.weddingSpecific = await this.testWeddingFeatures(page);

    } finally {
      await page.close();
    }

    return results;
  }

  /**
   * Test color contrast on page
   * @param {Page} page - Puppeteer page
   * @returns {Array} Color contrast issues
   */
  async testColorContrast(page) {
    return await page.evaluate(() => {
      const issues = [];
      const elements = document.querySelectorAll('*');

      elements.forEach(element => {
        const style = window.getComputedStyle(element);
        const color = style.color;
        const backgroundColor = style.backgroundColor;

        // Skip if colors are default or transparent
        if (color === 'rgba(0, 0, 0, 0)' || backgroundColor === 'rgba(0, 0, 0, 0)') {
          return;
        }

        // This would integrate with the color contrast checker
        // For now, we'll flag potential issues
        const fontSize = parseFloat(style.fontSize);
        if (fontSize < 14) {
          issues.push({
            element: element.tagName,
            selector: element.id || element.className,
            message: 'Small text size may have contrast issues',
            fontSize: fontSize
          });
        }
      });

      return issues;
    });
  }

  /**
   * Test keyboard navigation
   * @param {Page} page - Puppeteer page
   * @returns {Array} Keyboard navigation issues
   */
  async testKeyboardNavigation(page) {
    const issues = [];

    try {
      // Test tab navigation
      const tabOrder = await page.evaluate(() => {
        const focusable = Array.from(document.querySelectorAll(
          'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ));
        
        return focusable.map((el, index) => ({
          element: el.tagName,
          tabindex: el.getAttribute('tabindex'),
          hasOnClick: !!el.onclick,
          hasKeyHandler: !!(el.onkeydown || el.onkeypress || el.onkeyup)
        }));
      });

      // Check for keyboard traps
      const keyboardTraps = tabOrder.filter(item => 
        item.tabindex && parseInt(item.tabindex) > 0
      );

      if (keyboardTraps.length > 0) {
        issues.push({
          type: 'keyboard_trap_risk',
          message: `${keyboardTraps.length} elements use positive tabindex`,
          elements: keyboardTraps
        });
      }

      // Check for click handlers without keyboard handlers
      const clickOnly = tabOrder.filter(item => 
        item.hasOnClick && !item.hasKeyHandler
      );

      if (clickOnly.length > 0) {
        issues.push({
          type: 'missing_keyboard_handler',
          message: `${clickOnly.length} elements have click handlers without keyboard handlers`,
          elements: clickOnly
        });
      }

    } catch (error) {
      issues.push({
        type: 'keyboard_test_error',
        message: error.message
      });
    }

    return issues;
  }

  /**
   * Test screen reader optimization
   * @param {Page} page - Puppeteer page
   * @returns {Array} Screen reader issues
   */
  async testScreenReaderOptimization(page) {
    return await page.evaluate(() => {
      const issues = [];

      // Check for proper heading structure
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      let lastLevel = 0;
      
      headings.forEach((heading, index) => {
        const level = parseInt(heading.tagName.charAt(1));
        
        if (level - lastLevel > 1) {
          issues.push({
            type: 'heading_skip',
            message: `Heading level skipped from H${lastLevel} to H${level}`,
            element: heading.tagName
          });
        }
        
        lastLevel = level;
      });

      // Check for empty links and buttons
      const interactiveElements = document.querySelectorAll('a, button');
      interactiveElements.forEach(element => {
        const text = element.textContent.trim();
        const ariaLabel = element.getAttribute('aria-label');
        
        if (!text && !ariaLabel) {
          issues.push({
            type: 'empty_interactive',
            message: 'Interactive element without accessible text',
            element: element.tagName
          });
        }
      });

      // Check for images without alt text
      const images = document.querySelectorAll('img:not([alt])');
      if (images.length > 0) {
        issues.push({
          type: 'missing_alt',
          message: `${images.length} images missing alt text`,
          count: images.length
        });
      }

      // Check for ARIA landmarks
      const landmarks = [
        'main', 'navigation', 'banner', 'contentinfo',
        'complementary', 'search', 'form', 'region'
      ];
      
      const foundLandmarks = landmarks.filter(role => 
        document.querySelector(`[role="${role}"]`) || 
        document.querySelector(role)
      );

      if (foundLandmarks.length < 3) {
        issues.push({
          type: 'missing_landmarks',
          message: 'Page should have more ARIA landmarks for better navigation',
          found: foundLandmarks
        });
      }

      return issues;
    });
  }

  /**
   * Test wedding-specific accessibility features
   * @param {Page} page - Puppeteer page
   * @returns {Array} Wedding-specific issues
   */
  async testWeddingFeatures(page) {
    return await page.evaluate(() => {
      const issues = [];

      // Check seating chart accessibility
      const seatingChart = document.querySelector('[class*="seating"], [id*="seating"]');
      if (seatingChart) {
        if (!seatingChart.getAttribute('role')) {
          issues.push({
            type: 'seating_chart_role',
            message: 'Seating chart should have appropriate ARIA role'
          });
        }
      }

      // Check guest list accessibility
      const guestList = document.querySelector('[class*="guest-list"], [id*="guest"]');
      if (guestList) {
        const guestItems = guestList.querySelectorAll('li, tr');
        const itemsWithoutLabels = Array.from(guestItems).filter(item => 
          !item.getAttribute('aria-label') && !item.querySelector('[aria-label]')
        );

        if (itemsWithoutLabels.length > 0) {
          issues.push({
            type: 'guest_list_labels',
            message: 'Guest list items should have descriptive labels',
            count: itemsWithoutLabels.length
          });
        }
      }

      // Check photo gallery accessibility
      const gallery = document.querySelector('[class*="gallery"], [id*="gallery"]');
      if (gallery) {
        const images = gallery.querySelectorAll('img');
        const imagesWithoutAlt = Array.from(images).filter(img => !img.hasAttribute('alt'));
        
        if (imagesWithoutAlt.length > 0) {
          issues.push({
            type: 'gallery_alt_text',
            message: 'Gallery images need descriptive alt text',
            count: imagesWithoutAlt.length
          });
        }
      }

      // Check RSVP form accessibility
      const rsvpForm = document.querySelector('form[class*="rsvp"], form[id*="rsvp"]');
      if (rsvpForm) {
        const requiredFields = rsvpForm.querySelectorAll('[required]');
        const fieldsWithoutAriaRequired = Array.from(requiredFields).filter(field => 
          !field.hasAttribute('aria-required')
        );

        if (fieldsWithoutAriaRequired.length > 0) {
          issues.push({
            type: 'rsvp_required_fields',
            message: 'Required fields should have aria-required attribute',
            count: fieldsWithoutAriaRequired.length
          });
        }
      }

      return issues;
    });
  }

  /**
   * Aggregate results from all tests
   * @param {Object} results - Test results object
   */
  aggregateResults(results) {
    // Aggregate Axe results
    if (results.axe) {
      results.summary.errors += results.axe.violations.length;
      results.summary.warnings += results.axe.incomplete.length;
      results.summary.passed += results.axe.passes.length;
    }

    // Aggregate Pa11y results
    if (results.pa11y && results.pa11y.issues) {
      results.pa11y.issues.forEach(issue => {
        switch (issue.type) {
          case 'error':
            results.summary.errors++;
            break;
          case 'warning':
            results.summary.warnings++;
            break;
          case 'notice':
            results.summary.notices++;
            break;
        }
      });
    }

    // Aggregate custom test results
    if (results.custom) {
      Object.values(results.custom).forEach(category => {
        if (Array.isArray(category)) {
          results.summary.warnings += category.length;
        }
      });
    }
  }

  /**
   * Generate HTML report from results
   * @param {Object} results - Test results
   * @returns {string} HTML report
   */
  generateHTMLReport(results) {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Accessibility Test Report - ${results.url}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
          .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
          .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }
          .summary-item { background: white; padding: 20px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
          .errors { color: #d32f2f; }
          .warnings { color: #f57c00; }
          .notices { color: #388e3c; }
          .passed { color: #388e3c; }
          .issue { margin: 10px 0; padding: 10px; background: #f9f9f9; border-left: 4px solid #ccc; }
          .issue.error { border-color: #d32f2f; }
          .issue.warning { border-color: #f57c00; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #f4f4f4; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Accessibility Test Report</h1>
          <p><strong>URL:</strong> ${results.url}</p>
          <p><strong>Tested:</strong> ${new Date(results.timestamp).toLocaleString()}</p>
        </div>

        <div class="summary">
          <div class="summary-item">
            <h2 class="errors">${results.summary.errors}</h2>
            <p>Errors</p>
          </div>
          <div class="summary-item">
            <h2 class="warnings">${results.summary.warnings}</h2>
            <p>Warnings</p>
          </div>
          <div class="summary-item">
            <h2 class="notices">${results.summary.notices}</h2>
            <p>Notices</p>
          </div>
          <div class="summary-item">
            <h2 class="passed">${results.summary.passed}</h2>
            <p>Passed</p>
          </div>
        </div>

        ${this.generateAxeReport(results.axe)}
        ${this.generatePa11yReport(results.pa11y)}
        ${this.generateCustomReport(results.custom)}

      </body>
      </html>
    `;

    return html;
  }

  /**
   * Generate Axe report section
   * @param {Object} axeResults - Axe test results
   * @returns {string} HTML section
   */
  generateAxeReport(axeResults) {
    if (!axeResults) return '';

    let html = '<h2>Axe Accessibility Test</h2>';

    if (axeResults.violations.length > 0) {
      html += '<h3>Violations</h3>';
      axeResults.violations.forEach(violation => {
        html += `
          <div class="issue error">
            <h4>${violation.help}</h4>
            <p><strong>Impact:</strong> ${violation.impact}</p>
            <p><strong>Tags:</strong> ${violation.tags.join(', ')}</p>
            <p><strong>Elements:</strong> ${violation.nodes.length}</p>
          </div>
        `;
      });
    }

    return html;
  }

  /**
   * Generate Pa11y report section
   * @param {Object} pa11yResults - Pa11y test results
   * @returns {string} HTML section
   */
  generatePa11yReport(pa11yResults) {
    if (!pa11yResults || !pa11yResults.issues) return '';

    let html = '<h2>Pa11y Accessibility Test</h2>';

    if (pa11yResults.issues.length > 0) {
      html += '<table><thead><tr><th>Type</th><th>Code</th><th>Message</th><th>Selector</th></tr></thead><tbody>';
      
      pa11yResults.issues.forEach(issue => {
        html += `
          <tr class="${issue.type}">
            <td>${issue.type}</td>
            <td>${issue.code}</td>
            <td>${issue.message}</td>
            <td>${issue.selector}</td>
          </tr>
        `;
      });
      
      html += '</tbody></table>';
    }

    return html;
  }

  /**
   * Generate custom tests report section
   * @param {Object} customResults - Custom test results
   * @returns {string} HTML section
   */
  generateCustomReport(customResults) {
    if (!customResults) return '';

    let html = '<h2>Custom Accessibility Tests</h2>';

    Object.entries(customResults).forEach(([category, issues]) => {
      if (issues.length > 0) {
        html += `<h3>${this.formatCategoryName(category)}</h3>`;
        
        issues.forEach(issue => {
          html += `
            <div class="issue warning">
              <p><strong>Type:</strong> ${issue.type}</p>
              <p>${issue.message}</p>
              ${issue.count ? `<p><strong>Count:</strong> ${issue.count}</p>` : ''}
            </div>
          `;
        });
      }
    });

    return html;
  }

  /**
   * Format category name for display
   * @param {string} category - Category name
   * @returns {string} Formatted name
   */
  formatCategoryName(category) {
    return category
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Test a component in isolation
   * @param {string} componentHTML - Component HTML
   * @param {Object} options - Test options
   * @returns {Object} Test results
   */
  async testComponent(componentHTML, options = {}) {
    const dom = new JSDOM(componentHTML);
    const document = dom.window.document;
    
    // Make axe available
    global.window = dom.window;
    global.document = document;

    try {
      const results = await axeCore.run(document, {
        resultTypes: ['violations', 'passes', 'incomplete'],
        ...options
      });

      return {
        violations: results.violations,
        passes: results.passes,
        incomplete: results.incomplete
      };

    } finally {
      delete global.window;
      delete global.document;
    }
  }
}

// Jest matchers for accessibility testing
const toBeAccessible = {
  toBeAccessible(received) {
    const violations = received.violations || [];
    const pass = violations.length === 0;

    if (pass) {
      return {
        message: () => 'expected component to have accessibility violations',
        pass: true
      };
    } else {
      return {
        message: () => {
          const messages = violations.map(v => 
            `${v.help} (${v.impact}): ${v.nodes.length} instance(s)`
          ).join('\n');
          
          return `expected component to be accessible but found violations:\n${messages}`;
        },
        pass: false
      };
    }
  },

  toHaveNoViolations(received) {
    return this.toBeAccessible(received);
  }
};

// React Testing Library utilities
const a11yUtils = {
  /**
   * Get elements by accessible name
   * @param {HTMLElement} container - Container element
   * @param {string} name - Accessible name
   * @returns {Array} Matching elements
   */
  getByAccessibleName(container, name) {
    const elements = container.querySelectorAll('*');
    return Array.from(elements).filter(element => {
      const ariaLabel = element.getAttribute('aria-label');
      const ariaLabelledBy = element.getAttribute('aria-labelledby');
      const textContent = element.textContent?.trim();
      
      if (ariaLabel === name) return true;
      
      if (ariaLabelledBy) {
        const label = document.getElementById(ariaLabelledBy);
        if (label?.textContent?.trim() === name) return true;
      }
      
      if (textContent === name) return true;
      
      return false;
    });
  },

  /**
   * Get form fields by label
   * @param {HTMLElement} container - Container element
   * @param {string} labelText - Label text
   * @returns {HTMLElement|null} Form field
   */
  getByLabelText(container, labelText) {
    const labels = container.querySelectorAll('label');
    
    for (const label of labels) {
      if (label.textContent.trim() === labelText) {
        const forId = label.getAttribute('for');
        if (forId) {
          return document.getElementById(forId);
        }
        
        // Check for nested input
        const input = label.querySelector('input, select, textarea');
        if (input) return input;
      }
    }
    
    // Check aria-label
    const withAriaLabel = container.querySelector(`[aria-label="${labelText}"]`);
    if (withAriaLabel) return withAriaLabel;
    
    return null;
  }
};

module.exports = {
  AccessibilityTester,
  toBeAccessible,
  a11yUtils
};