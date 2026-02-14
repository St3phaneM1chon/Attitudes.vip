/**
 * ARIA Helper
 * Generates and validates ARIA attributes for accessibility
 */

class ARIAHelper {
  constructor() {
    this.roleRequirements = {
      // Widget roles
      button: { requiredStates: [], supportedStates: ['aria-expanded', 'aria-pressed'] },
      checkbox: { requiredStates: ['aria-checked'], supportedStates: [] },
      gridcell: { requiredStates: [], supportedStates: ['aria-readonly', 'aria-required', 'aria-selected'] },
      link: { requiredStates: [], supportedStates: ['aria-expanded'] },
      menuitem: { requiredStates: [], supportedStates: ['aria-checked', 'aria-expanded'] },
      option: { requiredStates: [], supportedStates: ['aria-checked', 'aria-selected'] },
      progressbar: { requiredStates: [], supportedStates: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'] },
      radio: { requiredStates: ['aria-checked'], supportedStates: [] },
      scrollbar: { requiredStates: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax', 'aria-orientation'], supportedStates: [] },
      slider: { requiredStates: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'], supportedStates: ['aria-orientation'] },
      spinbutton: { requiredStates: [], supportedStates: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'] },
      switch: { requiredStates: ['aria-checked'], supportedStates: [] },
      tab: { requiredStates: [], supportedStates: ['aria-selected'] },
      tabpanel: { requiredStates: [], supportedStates: ['aria-labelledby'] },
      textbox: { requiredStates: [], supportedStates: ['aria-multiline', 'aria-readonly', 'aria-required'] },
      treeitem: { requiredStates: [], supportedStates: ['aria-expanded', 'aria-selected'] },
      
      // Document structure roles
      article: { requiredStates: [], supportedStates: [] },
      columnheader: { requiredStates: [], supportedStates: ['aria-sort'] },
      definition: { requiredStates: [], supportedStates: [] },
      directory: { requiredStates: [], supportedStates: [] },
      document: { requiredStates: [], supportedStates: [] },
      feed: { requiredStates: [], supportedStates: [] },
      figure: { requiredStates: [], supportedStates: [] },
      group: { requiredStates: [], supportedStates: [] },
      heading: { requiredStates: ['aria-level'], supportedStates: [] },
      img: { requiredStates: [], supportedStates: [] },
      list: { requiredStates: [], supportedStates: [] },
      listitem: { requiredStates: [], supportedStates: [] },
      math: { requiredStates: [], supportedStates: [] },
      note: { requiredStates: [], supportedStates: [] },
      row: { requiredStates: [], supportedStates: ['aria-selected'] },
      rowgroup: { requiredStates: [], supportedStates: [] },
      rowheader: { requiredStates: [], supportedStates: ['aria-sort'] },
      separator: { requiredStates: [], supportedStates: ['aria-orientation'] },
      table: { requiredStates: [], supportedStates: [] },
      term: { requiredStates: [], supportedStates: [] },
      
      // Landmark roles
      application: { requiredStates: [], supportedStates: [] },
      banner: { requiredStates: [], supportedStates: [] },
      complementary: { requiredStates: [], supportedStates: [] },
      contentinfo: { requiredStates: [], supportedStates: [] },
      form: { requiredStates: [], supportedStates: [] },
      main: { requiredStates: [], supportedStates: [] },
      navigation: { requiredStates: [], supportedStates: [] },
      region: { requiredStates: ['aria-label', 'aria-labelledby'], supportedStates: [] },
      search: { requiredStates: [], supportedStates: [] }
    };
  }

  /**
   * Generate ARIA attributes for element
   * @param {string} role - ARIA role
   * @param {Object} options - Additional options
   * @returns {Object} ARIA attributes
   */
  generateARIA(role, options = {}) {
    const attrs = {
      role: role
    };

    // Add required attributes for role
    const requirements = this.roleRequirements[role];
    if (requirements) {
      // Handle required states
      requirements.requiredStates.forEach(state => {
        if (!options[state]) {
          // Set default values
          switch (state) {
            case 'aria-checked':
              attrs[state] = 'false';
              break;
            case 'aria-selected':
              attrs[state] = 'false';
              break;
            case 'aria-expanded':
              attrs[state] = 'false';
              break;
            case 'aria-level':
              attrs[state] = '2'; // Default heading level
              break;
            case 'aria-valuenow':
              attrs[state] = '0';
              break;
            case 'aria-valuemin':
              attrs[state] = '0';
              break;
            case 'aria-valuemax':
              attrs[state] = '100';
              break;
            case 'aria-orientation':
              attrs[state] = 'horizontal';
              break;
          }
        }
      });
    }

    // Apply provided options
    Object.assign(attrs, options);

    // Add label if provided
    if (options.label) {
      attrs['aria-label'] = options.label;
    }

    // Add description if provided
    if (options.description) {
      attrs['aria-describedby'] = options.descriptionId || `desc-${Date.now()}`;
    }

    return attrs;
  }

  /**
   * Generate wedding-specific ARIA attributes
   * @param {string} componentType - Type of wedding component
   * @param {Object} data - Component data
   * @returns {Object} ARIA attributes
   */
  generateWeddingARIA(componentType, data) {
    switch (componentType) {
      case 'seating_chart':
        return this.generateSeatingChartARIA(data);
      
      case 'guest_card':
        return this.generateGuestCardARIA(data);
      
      case 'vendor_card':
        return this.generateVendorCardARIA(data);
      
      case 'timeline_event':
        return this.generateTimelineEventARIA(data);
      
      case 'photo_gallery':
        return this.generatePhotoGalleryARIA(data);
      
      case 'budget_category':
        return this.generateBudgetCategoryARIA(data);
      
      case 'rsvp_form':
        return this.generateRSVPFormARIA(data);
      
      case 'gift_registry':
        return this.generateGiftRegistryARIA(data);
      
      default:
        return {};
    }
  }

  /**
   * Generate ARIA for seating chart
   * @param {Object} data - Seating chart data
   * @returns {Object} ARIA attributes
   */
  generateSeatingChartARIA(data) {
    const { tableCount, guestCount, selectedTable } = data;
    
    return {
      role: 'application',
      'aria-label': `Wedding seating chart with ${tableCount} tables and ${guestCount} guests`,
      'aria-describedby': 'seating-chart-instructions',
      'aria-activedescendant': selectedTable ? `table-${selectedTable}` : null
    };
  }

  /**
   * Generate ARIA for guest card
   * @param {Object} data - Guest data
   * @returns {Object} ARIA attributes
   */
  generateGuestCardARIA(data) {
    const { name, table, rsvpStatus, dietaryRestrictions } = data;
    
    let label = `Guest: ${name}`;
    if (table) {
      label += `, seated at ${table}`;
    }
    if (rsvpStatus) {
      label += `, RSVP status: ${rsvpStatus}`;
    }
    
    const attrs = {
      role: 'article',
      'aria-label': label
    };
    
    if (dietaryRestrictions && dietaryRestrictions.length > 0) {
      attrs['aria-describedby'] = `dietary-${data.id}`;
    }
    
    return attrs;
  }

  /**
   * Generate ARIA for vendor card
   * @param {Object} data - Vendor data
   * @returns {Object} ARIA attributes
   */
  generateVendorCardARIA(data) {
    const { name, type, rating, price, status } = data;
    
    let label = `${type} vendor: ${name}`;
    if (rating) {
      label += `, rated ${rating} out of 5 stars`;
    }
    if (status) {
      label += `, status: ${status}`;
    }
    
    return {
      role: 'article',
      'aria-label': label,
      'aria-describedby': price ? `price-${data.id}` : null
    };
  }

  /**
   * Generate ARIA for timeline event
   * @param {Object} data - Event data
   * @returns {Object} ARIA attributes
   */
  generateTimelineEventARIA(data) {
    const { title, time, location, duration } = data;
    
    let label = `Event: ${title} at ${time}`;
    if (location) {
      label += ` at ${location}`;
    }
    if (duration) {
      label += `, duration: ${duration}`;
    }
    
    return {
      role: 'article',
      'aria-label': label,
      'aria-current': data.isCurrent ? 'time' : null
    };
  }

  /**
   * Generate ARIA for photo gallery
   * @param {Object} data - Gallery data
   * @returns {Object} ARIA attributes
   */
  generatePhotoGalleryARIA(data) {
    const { photoCount, currentIndex, albumName } = data;
    
    return {
      role: 'region',
      'aria-label': albumName ? `Photo gallery: ${albumName}` : 'Photo gallery',
      'aria-describedby': 'gallery-controls',
      'aria-live': 'polite',
      'aria-atomic': 'false',
      'data-photo-count': photoCount,
      'data-current-index': currentIndex
    };
  }

  /**
   * Generate ARIA for budget category
   * @param {Object} data - Budget category data
   * @returns {Object} ARIA attributes
   */
  generateBudgetCategoryARIA(data) {
    const { category, allocated, spent, percentage } = data;
    
    return {
      role: 'article',
      'aria-label': `Budget category: ${category}, ${percentage}% of budget allocated, ${Math.round((spent/allocated) * 100)}% spent`,
      'aria-describedby': `budget-details-${data.id}`
    };
  }

  /**
   * Generate ARIA for RSVP form
   * @param {Object} data - Form data
   * @returns {Object} ARIA attributes
   */
  generateRSVPFormARIA(data) {
    const { guestName, eventDate } = data;
    
    return {
      role: 'form',
      'aria-label': `RSVP form for ${guestName} for wedding on ${eventDate}`,
      'aria-describedby': 'rsvp-instructions'
    };
  }

  /**
   * Generate ARIA for gift registry
   * @param {Object} data - Registry data
   * @returns {Object} ARIA attributes
   */
  generateGiftRegistryARIA(data) {
    const { itemCount, purchasedCount } = data;
    const remainingCount = itemCount - purchasedCount;
    
    return {
      role: 'region',
      'aria-label': `Gift registry with ${itemCount} items, ${purchasedCount} already purchased, ${remainingCount} available`,
      'aria-describedby': 'registry-instructions'
    };
  }

  /**
   * Validate ARIA implementation
   * @param {HTMLElement} element - Element to validate
   * @returns {Object} Validation result
   */
  validateARIA(element) {
    const results = {
      valid: true,
      errors: [],
      warnings: []
    };

    const role = element.getAttribute('role');
    
    if (role) {
      // Check if role is valid
      if (!this.roleRequirements[role]) {
        results.valid = false;
        results.errors.push({
          type: 'invalid_role',
          message: `Invalid ARIA role: ${role}`
        });
      } else {
        // Check required attributes
        const requirements = this.roleRequirements[role];
        requirements.requiredStates.forEach(state => {
          if (!element.hasAttribute(state)) {
            results.valid = false;
            results.errors.push({
              type: 'missing_required_attribute',
              message: `Role "${role}" requires attribute "${state}"`
            });
          }
        });
      }
    }

    // Check for aria-label or aria-labelledby
    const hasLabel = element.hasAttribute('aria-label') || 
                    element.hasAttribute('aria-labelledby');
    
    if (!hasLabel && this.requiresLabel(element)) {
      results.warnings.push({
        type: 'missing_label',
        message: 'Element should have aria-label or aria-labelledby'
      });
    }

    // Check aria-describedby references
    if (element.hasAttribute('aria-describedby')) {
      const ids = element.getAttribute('aria-describedby').split(' ');
      ids.forEach(id => {
        if (!document.getElementById(id)) {
          results.errors.push({
            type: 'invalid_reference',
            message: `aria-describedby references non-existent ID: ${id}`
          });
        }
      });
    }

    // Check aria-labelledby references
    if (element.hasAttribute('aria-labelledby')) {
      const ids = element.getAttribute('aria-labelledby').split(' ');
      ids.forEach(id => {
        if (!document.getElementById(id)) {
          results.errors.push({
            type: 'invalid_reference',
            message: `aria-labelledby references non-existent ID: ${id}`
          });
        }
      });
    }

    return results;
  }

  /**
   * Check if element requires label
   * @param {HTMLElement} element - Element to check
   * @returns {boolean} Requires label
   */
  requiresLabel(element) {
    const tagName = element.tagName.toLowerCase();
    const role = element.getAttribute('role');
    
    // Interactive elements that need labels
    const needsLabel = [
      'button', 'input', 'select', 'textarea',
      'a', 'iframe', 'audio', 'video'
    ];
    
    // Roles that need labels
    const rolesNeedLabel = [
      'button', 'checkbox', 'combobox', 'gridcell',
      'link', 'menuitem', 'option', 'radio',
      'searchbox', 'slider', 'spinbutton', 'switch',
      'tab', 'textbox', 'treeitem'
    ];
    
    return needsLabel.includes(tagName) || rolesNeedLabel.includes(role);
  }

  /**
   * Generate live region for dynamic content
   * @param {string} content - Content to announce
   * @param {Object} options - Live region options
   * @returns {HTMLElement} Live region element
   */
  createLiveRegion(content, options = {}) {
    const {
      priority = 'polite',
      atomic = true,
      relevant = 'additions text'
    } = options;

    const region = document.createElement('div');
    region.setAttribute('aria-live', priority);
    region.setAttribute('aria-atomic', atomic.toString());
    region.setAttribute('aria-relevant', relevant);
    region.className = 'sr-only';
    region.textContent = content;

    return region;
  }

  /**
   * Create accessible loading indicator
   * @param {string} message - Loading message
   * @returns {HTMLElement} Loading element
   */
  createLoadingIndicator(message = 'Loading') {
    const loader = document.createElement('div');
    loader.setAttribute('role', 'status');
    loader.setAttribute('aria-live', 'polite');
    loader.setAttribute('aria-busy', 'true');
    loader.innerHTML = `
      <span class="spinner" aria-hidden="true"></span>
      <span class="sr-only">${message}</span>
    `;
    
    return loader;
  }

  /**
   * Create accessible error message
   * @param {string} message - Error message
   * @param {string} fieldId - Associated field ID
   * @returns {HTMLElement} Error element
   */
  createErrorMessage(message, fieldId) {
    const error = document.createElement('div');
    error.id = `error-${fieldId}`;
    error.setAttribute('role', 'alert');
    error.setAttribute('aria-live', 'assertive');
    error.className = 'error-message';
    error.textContent = message;
    
    // Associate with field
    const field = document.getElementById(fieldId);
    if (field) {
      field.setAttribute('aria-invalid', 'true');
      field.setAttribute('aria-describedby', error.id);
    }
    
    return error;
  }

  /**
   * Create accessible tooltip
   * @param {string} content - Tooltip content
   * @param {HTMLElement} target - Target element
   * @returns {HTMLElement} Tooltip element
   */
  createTooltip(content, target) {
    const tooltip = document.createElement('div');
    const tooltipId = `tooltip-${Date.now()}`;
    
    tooltip.id = tooltipId;
    tooltip.setAttribute('role', 'tooltip');
    tooltip.className = 'tooltip';
    tooltip.textContent = content;
    
    // Associate with target
    target.setAttribute('aria-describedby', tooltipId);
    
    // Position tooltip (implementation would include positioning logic)
    tooltip.style.position = 'absolute';
    tooltip.style.display = 'none';
    
    // Show/hide on hover and focus
    target.addEventListener('mouseenter', () => {
      tooltip.style.display = 'block';
    });
    
    target.addEventListener('mouseleave', () => {
      tooltip.style.display = 'none';
    });
    
    target.addEventListener('focus', () => {
      tooltip.style.display = 'block';
    });
    
    target.addEventListener('blur', () => {
      tooltip.style.display = 'none';
    });
    
    return tooltip;
  }

  /**
   * Audit ARIA implementation
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
      // Find all elements with ARIA attributes
      const ariaElements = container.querySelectorAll('[role], [aria-label], [aria-labelledby], [aria-describedby]');
      
      ariaElements.forEach(element => {
        const validation = this.validateARIA(element);
        
        if (validation.valid) {
          results.passed.push({
            element: this.getSelector(element),
            message: 'Valid ARIA implementation'
          });
        } else {
          validation.errors.forEach(error => {
            results.errors.push({
              ...error,
              element: this.getSelector(element)
            });
          });
        }
        
        validation.warnings.forEach(warning => {
          results.warnings.push({
            ...warning,
            element: this.getSelector(element)
          });
        });
      });

      // Check for missing ARIA on interactive elements
      const interactive = container.querySelectorAll('button, a, input, select, textarea');
      interactive.forEach(element => {
        if (!element.hasAttribute('aria-label') && 
            !element.hasAttribute('aria-labelledby') &&
            !element.textContent.trim() &&
            element.tagName !== 'INPUT') {
          results.errors.push({
            type: 'missing_aria_label',
            element: this.getSelector(element),
            message: 'Interactive element missing accessible label'
          });
        }
      });

    } catch (error) {
      results.errors.push({
        type: 'audit_error',
        message: error.message
      });
    }

    return results;
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
}

module.exports = new ARIAHelper();