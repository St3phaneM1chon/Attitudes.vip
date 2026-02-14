/**
 * Focus Management System
 * Handles focus trapping, focus restoration, and focus indicators
 */

class FocusManager {
  constructor() {
    this.focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      'iframe',
      'audio[controls]',
      'video[controls]',
      '[contenteditable]'
    ].join(',');

    this.focusStack = [];
    this.trapStack = [];
    this.focusIndicatorsEnabled = true;
    this.lastFocusedElement = null;
    this.focusHistory = [];
    this.maxHistorySize = 50;
  }

  /**
   * Initialize focus management
   */
  initialize() {
    // Track focus changes
    document.addEventListener('focusin', this.handleFocusIn.bind(this));
    document.addEventListener('focusout', this.handleFocusOut.bind(this));
    
    // Add custom focus styles
    this.injectFocusStyles();
  }

  /**
   * Handle focus in event
   * @param {FocusEvent} event - Focus event
   */
  handleFocusIn(event) {
    this.lastFocusedElement = event.target;
    
    // Add to history
    this.focusHistory.push({
      element: event.target,
      timestamp: Date.now(),
      selector: this.getSelector(event.target)
    });
    
    // Trim history if too large
    if (this.focusHistory.length > this.maxHistorySize) {
      this.focusHistory.shift();
    }
  }

  /**
   * Handle focus out event
   * @param {FocusEvent} event - Focus event
   */
  handleFocusOut(event) {
    // Track when focus leaves the document
    if (!event.relatedTarget) {
      this.lastFocusedElement = null;
    }
  }

  /**
   * Inject focus indicator styles
   */
  injectFocusStyles() {
    if (document.getElementById('a11y-focus-styles')) return;

    const style = document.createElement('style');
    style.id = 'a11y-focus-styles';
    style.textContent = `
      /* Enhanced focus indicators for accessibility */
      .a11y-focus-indicators *:focus {
        outline: 3px solid #4A90E2 !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.3) !important;
      }

      /* High contrast mode focus */
      @media (prefers-contrast: high) {
        .a11y-focus-indicators *:focus {
          outline: 3px solid currentColor !important;
          outline-offset: 3px !important;
        }
      }

      /* Focus visible only for keyboard navigation */
      .a11y-focus-visible-only *:focus:not(:focus-visible) {
        outline: none !important;
        box-shadow: none !important;
      }

      /* Skip link styles */
      .a11y-skip-link {
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
      }

      .a11y-skip-link:focus {
        position: fixed;
        top: 10px;
        left: 10px;
        width: auto;
        height: auto;
        padding: 8px 16px;
        background: #000;
        color: #fff;
        text-decoration: none;
        z-index: 999999;
        border-radius: 4px;
      }

      /* Focus trap indicator */
      .a11y-focus-trap {
        position: relative;
      }

      .a11y-focus-trap::before {
        content: '';
        position: absolute;
        top: -2px;
        left: -2px;
        right: -2px;
        bottom: -2px;
        border: 2px dashed #4A90E2;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s;
      }

      .a11y-focus-trap.active::before {
        opacity: 1;
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Enable focus indicators
   */
  enableFocusIndicators() {
    this.focusIndicatorsEnabled = true;
    document.body.classList.add('a11y-focus-indicators');
  }

  /**
   * Disable focus indicators
   */
  disableFocusIndicators() {
    this.focusIndicatorsEnabled = false;
    document.body.classList.remove('a11y-focus-indicators');
  }

  /**
   * Enable focus-visible only mode
   */
  enableFocusVisibleOnly() {
    document.body.classList.add('a11y-focus-visible-only');
  }

  /**
   * Get all focusable elements within container
   * @param {HTMLElement} container - Container element
   * @param {boolean} includeContainer - Include container if focusable
   * @returns {Array<HTMLElement>} Focusable elements
   */
  getFocusableElements(container, includeContainer = false) {
    const elements = Array.from(container.querySelectorAll(this.focusableSelectors));
    
    // Filter out elements that are not visible or are disabled
    const focusable = elements.filter(el => {
      return this.isElementVisible(el) && !el.hasAttribute('disabled');
    });

    // Include container if it's focusable
    if (includeContainer && this.isFocusable(container)) {
      focusable.unshift(container);
    }

    return focusable;
  }

  /**
   * Check if element is visible
   * @param {HTMLElement} element - Element to check
   * @returns {boolean} Is visible
   */
  isElementVisible(element) {
    if (!element) return false;

    const style = window.getComputedStyle(element);
    
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      element.offsetParent !== null
    );
  }

  /**
   * Check if element is focusable
   * @param {HTMLElement} element - Element to check
   * @returns {boolean} Is focusable
   */
  isFocusable(element) {
    if (!element) return false;
    
    return element.matches(this.focusableSelectors) && 
           this.isElementVisible(element) &&
           !element.hasAttribute('disabled');
  }

  /**
   * Manage focus for a container
   * @param {HTMLElement} container - Container element
   * @param {Object} options - Management options
   */
  manage(container, options = {}) {
    const {
      autoFocus = true,
      restoreFocus = true,
      initialFocus = null,
      skipLinks = true
    } = options;

    // Store current focus for restoration
    if (restoreFocus) {
      this.focusStack.push(document.activeElement);
    }

    // Add skip links if requested
    if (skipLinks) {
      this.addSkipLinks(container);
    }

    // Set initial focus
    if (autoFocus) {
      this.setInitialFocus(container, initialFocus);
    }

    return {
      restore: () => this.restoreFocus(),
      trap: () => this.trap(container),
      release: () => this.release(container)
    };
  }

  /**
   * Set initial focus in container
   * @param {HTMLElement} container - Container element
   * @param {HTMLElement|string} initialFocus - Initial focus target
   */
  setInitialFocus(container, initialFocus = null) {
    let targetElement = null;

    if (initialFocus) {
      if (typeof initialFocus === 'string') {
        targetElement = container.querySelector(initialFocus);
      } else if (initialFocus instanceof HTMLElement) {
        targetElement = initialFocus;
      }
    }

    // If no specific target, find first focusable element
    if (!targetElement) {
      const focusable = this.getFocusableElements(container);
      targetElement = focusable[0] || container;
    }

    if (targetElement && this.isFocusable(targetElement)) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        targetElement.focus();
      });
    }
  }

  /**
   * Trap focus within container
   * @param {HTMLElement} container - Container to trap focus in
   */
  trap(container) {
    if (!container) return;

    // Add to trap stack
    this.trapStack.push({
      container,
      handler: this.createTrapHandler(container)
    });

    // Add visual indicator
    container.classList.add('a11y-focus-trap', 'active');

    // Add event listeners
    document.addEventListener('keydown', this.trapStack[this.trapStack.length - 1].handler);
  }

  /**
   * Create focus trap handler
   * @param {HTMLElement} container - Container element
   * @returns {Function} Event handler
   */
  createTrapHandler(container) {
    return (event) => {
      if (event.key !== 'Tab') return;

      const focusable = this.getFocusableElements(container);
      if (focusable.length === 0) return;

      const firstFocusable = focusable[0];
      const lastFocusable = focusable[focusable.length - 1];

      // Handle shift+tab
      if (event.shiftKey) {
        if (document.activeElement === firstFocusable) {
          event.preventDefault();
          lastFocusable.focus();
        }
      } else {
        // Handle tab
        if (document.activeElement === lastFocusable) {
          event.preventDefault();
          firstFocusable.focus();
        }
      }

      // Ensure focus stays within container
      if (!container.contains(document.activeElement)) {
        event.preventDefault();
        firstFocusable.focus();
      }
    };
  }

  /**
   * Release focus trap
   * @param {HTMLElement} container - Container to release
   */
  release(container) {
    const trapIndex = this.trapStack.findIndex(trap => trap.container === container);
    
    if (trapIndex !== -1) {
      const trap = this.trapStack[trapIndex];
      
      // Remove event listener
      document.removeEventListener('keydown', trap.handler);
      
      // Remove from stack
      this.trapStack.splice(trapIndex, 1);
      
      // Remove visual indicator
      container.classList.remove('a11y-focus-trap', 'active');
    }
  }

  /**
   * Release all focus traps
   */
  releaseAll() {
    while (this.trapStack.length > 0) {
      const trap = this.trapStack.pop();
      document.removeEventListener('keydown', trap.handler);
      trap.container.classList.remove('a11y-focus-trap', 'active');
    }
  }

  /**
   * Restore focus to previous element
   */
  restoreFocus() {
    if (this.focusStack.length > 0) {
      const element = this.focusStack.pop();
      
      if (element && this.isElementVisible(element)) {
        // Use requestAnimationFrame to ensure smooth transition
        requestAnimationFrame(() => {
          element.focus();
        });
      }
    }
  }

  /**
   * Add skip links to container
   * @param {HTMLElement} container - Container element
   */
  addSkipLinks(container) {
    const mainContent = container.querySelector('main, [role="main"]');
    const navigation = container.querySelector('nav, [role="navigation"]');
    
    const skipLinks = document.createElement('div');
    skipLinks.className = 'a11y-skip-links';
    skipLinks.setAttribute('role', 'navigation');
    skipLinks.setAttribute('aria-label', 'Skip links');

    if (mainContent) {
      const skipToMain = document.createElement('a');
      skipToMain.href = '#main-content';
      skipToMain.className = 'a11y-skip-link';
      skipToMain.textContent = 'Skip to main content';
      skipToMain.addEventListener('click', (e) => {
        e.preventDefault();
        mainContent.focus();
        mainContent.scrollIntoView();
      });
      skipLinks.appendChild(skipToMain);
    }

    if (navigation) {
      const skipToNav = document.createElement('a');
      skipToNav.href = '#navigation';
      skipToNav.className = 'a11y-skip-link';
      skipToNav.textContent = 'Skip to navigation';
      skipToNav.addEventListener('click', (e) => {
        e.preventDefault();
        navigation.focus();
        navigation.scrollIntoView();
      });
      skipLinks.appendChild(skipToNav);
    }

    // Insert at beginning of container
    if (skipLinks.children.length > 0) {
      container.insertBefore(skipLinks, container.firstChild);
    }
  }

  /**
   * Create focus group for related elements
   * @param {Array<HTMLElement>} elements - Elements in group
   * @param {Object} options - Group options
   */
  createFocusGroup(elements, options = {}) {
    const {
      wrap = true,
      orientation = 'horizontal',
      activateOnFocus = false
    } = options;

    elements.forEach((element, index) => {
      element.setAttribute('role', 'group');
      element.setAttribute('tabindex', index === 0 ? '0' : '-1');
      
      element.addEventListener('keydown', (event) => {
        let nextIndex;
        
        switch (event.key) {
          case 'ArrowRight':
            if (orientation === 'horizontal') {
              event.preventDefault();
              nextIndex = wrap ? (index + 1) % elements.length : Math.min(index + 1, elements.length - 1);
              this.focusElement(elements[nextIndex], activateOnFocus);
            }
            break;
            
          case 'ArrowLeft':
            if (orientation === 'horizontal') {
              event.preventDefault();
              nextIndex = wrap ? (index - 1 + elements.length) % elements.length : Math.max(index - 1, 0);
              this.focusElement(elements[nextIndex], activateOnFocus);
            }
            break;
            
          case 'ArrowDown':
            if (orientation === 'vertical') {
              event.preventDefault();
              nextIndex = wrap ? (index + 1) % elements.length : Math.min(index + 1, elements.length - 1);
              this.focusElement(elements[nextIndex], activateOnFocus);
            }
            break;
            
          case 'ArrowUp':
            if (orientation === 'vertical') {
              event.preventDefault();
              nextIndex = wrap ? (index - 1 + elements.length) % elements.length : Math.max(index - 1, 0);
              this.focusElement(elements[nextIndex], activateOnFocus);
            }
            break;
            
          case 'Home':
            event.preventDefault();
            this.focusElement(elements[0], activateOnFocus);
            break;
            
          case 'End':
            event.preventDefault();
            this.focusElement(elements[elements.length - 1], activateOnFocus);
            break;
        }
      });

      element.addEventListener('focus', () => {
        elements.forEach((el, i) => {
          el.setAttribute('tabindex', i === index ? '0' : '-1');
        });
      });
    });
  }

  /**
   * Focus element with optional activation
   * @param {HTMLElement} element - Element to focus
   * @param {boolean} activate - Whether to activate (click) element
   */
  focusElement(element, activate = false) {
    if (!element) return;
    
    element.focus();
    
    if (activate) {
      element.click();
    }
  }

  /**
   * Get CSS selector for element
   * @param {HTMLElement} element - Element
   * @returns {string} CSS selector
   */
  getSelector(element) {
    if (element.id) {
      return `#${element.id}`;
    }
    
    if (element.className) {
      return `${element.tagName.toLowerCase()}.${element.className.split(' ').join('.')}`;
    }
    
    return element.tagName.toLowerCase();
  }

  /**
   * Audit focus management
   * @param {HTMLElement} container - Container to audit
   * @returns {Promise<Object>} Audit results
   */
  async audit(container) {
    const results = {
      passed: [],
      warnings: [],
      errors: []
    };

    try {
      // Check for focusable elements
      const focusable = this.getFocusableElements(container);
      
      if (focusable.length === 0) {
        results.warnings.push({
          type: 'no_focusable_elements',
          message: 'No focusable elements found in container'
        });
      }

      // Check tab order
      const tabIndexElements = container.querySelectorAll('[tabindex]');
      tabIndexElements.forEach(element => {
        const tabIndex = parseInt(element.getAttribute('tabindex'));
        
        if (tabIndex > 0) {
          results.warnings.push({
            type: 'positive_tabindex',
            element: this.getSelector(element),
            message: 'Positive tabindex values should be avoided',
            value: tabIndex
          });
        }
      });

      // Check for keyboard traps
      const interactiveElements = container.querySelectorAll('a, button, input, select, textarea');
      interactiveElements.forEach(element => {
        if (!this.isFocusable(element) && !element.hasAttribute('disabled')) {
          results.errors.push({
            type: 'keyboard_trap',
            element: this.getSelector(element),
            message: 'Interactive element is not keyboard accessible'
          });
        }
      });

      // Check focus indicators
      if (!this.focusIndicatorsEnabled) {
        results.warnings.push({
          type: 'focus_indicators_disabled',
          message: 'Focus indicators are disabled'
        });
      }

      results.passed.push({
        type: 'focus_management',
        message: 'Basic focus management checks passed'
      });

    } catch (error) {
      results.errors.push({
        type: 'audit_error',
        message: error.message
      });
    }

    return results;
  }
}

module.exports = new FocusManager();