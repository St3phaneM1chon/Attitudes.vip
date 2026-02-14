/**
 * Screen Reader Support Utilities
 * Provides utilities for screen reader announcements and optimizations
 */

class ScreenReaderUtils {
  constructor() {
    this.liveRegion = null;
    this.assertiveRegion = null;
    this.statusRegion = null;
    this.initialized = false;
    this.announcementQueue = [];
    this.isProcessingQueue = false;
  }

  /**
   * Initialize screen reader utilities
   */
  initialize() {
    if (this.initialized) return;

    // Create live regions
    this.createLiveRegions();
    
    // Add screen reader class to body
    document.body.classList.add('a11y-screen-reader-optimized');
    
    // Set up mutation observer for dynamic content
    this.setupMutationObserver();
    
    this.initialized = true;
  }

  /**
   * Create ARIA live regions for announcements
   */
  createLiveRegions() {
    // Polite announcements
    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('role', 'status');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.className = 'sr-only';
    this.liveRegion.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    
    // Assertive announcements
    this.assertiveRegion = document.createElement('div');
    this.assertiveRegion.setAttribute('role', 'alert');
    this.assertiveRegion.setAttribute('aria-live', 'assertive');
    this.assertiveRegion.setAttribute('aria-atomic', 'true');
    this.assertiveRegion.className = 'sr-only';
    this.assertiveRegion.style.cssText = this.liveRegion.style.cssText;
    
    // Status region for ongoing operations
    this.statusRegion = document.createElement('div');
    this.statusRegion.setAttribute('role', 'status');
    this.statusRegion.setAttribute('aria-live', 'polite');
    this.statusRegion.setAttribute('aria-relevant', 'additions text');
    this.statusRegion.className = 'sr-only';
    this.statusRegion.style.cssText = this.liveRegion.style.cssText;
    
    // Append to body
    document.body.appendChild(this.liveRegion);
    document.body.appendChild(this.assertiveRegion);
    document.body.appendChild(this.statusRegion);
  }

  /**
   * Clean up screen reader utilities
   */
  cleanup() {
    if (!this.initialized) return;

    // Remove live regions
    if (this.liveRegion) this.liveRegion.remove();
    if (this.assertiveRegion) this.assertiveRegion.remove();
    if (this.statusRegion) this.statusRegion.remove();
    
    // Remove class from body
    document.body.classList.remove('a11y-screen-reader-optimized');
    
    // Disconnect mutation observer
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
    
    this.initialized = false;
  }

  /**
   * Announce message to screen readers
   * @param {string} message - Message to announce
   * @param {string} priority - 'polite' or 'assertive'
   * @param {number} delay - Optional delay in milliseconds
   */
  announce(message, priority = 'polite', delay = 0) {
    if (!this.initialized) {
      this.initialize();
    }

    // Add to queue
    this.announcementQueue.push({ message, priority, delay });
    
    // Process queue
    this.processAnnouncementQueue();
  }

  /**
   * Process announcement queue
   */
  async processAnnouncementQueue() {
    if (this.isProcessingQueue || this.announcementQueue.length === 0) return;
    
    this.isProcessingQueue = true;
    
    while (this.announcementQueue.length > 0) {
      const { message, priority, delay } = this.announcementQueue.shift();
      
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const region = priority === 'assertive' ? this.assertiveRegion : this.liveRegion;
      
      // Clear previous content
      region.textContent = '';
      
      // Use requestAnimationFrame to ensure DOM update
      await new Promise(resolve => requestAnimationFrame(resolve));
      
      // Set new content
      region.textContent = message;
      
      // Clear after announcement (give screen readers time to read)
      setTimeout(() => {
        region.textContent = '';
      }, 1000);
      
      // Small delay between announcements
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.isProcessingQueue = false;
  }

  /**
   * Announce page change
   * @param {string} pageTitle - New page title
   * @param {Object} options - Additional options
   */
  announcePageChange(pageTitle, options = {}) {
    const {
      includeLoadTime = false,
      includeBreadcrumb = false,
      breadcrumb = [],
      loadTime = 0
    } = options;

    let announcement = `Page loaded: ${pageTitle}`;
    
    if (includeBreadcrumb && breadcrumb.length > 0) {
      announcement += `. You are in: ${breadcrumb.join(', ')}`;
    }
    
    if (includeLoadTime && loadTime > 0) {
      announcement += `. Page loaded in ${loadTime} milliseconds`;
    }
    
    // Update document title
    document.title = pageTitle;
    
    // Announce with assertive priority for page changes
    this.announce(announcement, 'assertive');
  }

  /**
   * Announce form validation errors
   * @param {Array} errors - Array of error messages
   * @param {Object} options - Additional options
   */
  announceFormErrors(errors, options = {}) {
    const {
      formName = 'Form',
      priority = 'assertive'
    } = options;

    if (errors.length === 0) return;
    
    const errorCount = errors.length;
    const announcement = `${formName} has ${errorCount} ${errorCount === 1 ? 'error' : 'errors'}: ${errors.join('. ')}`;
    
    this.announce(announcement, priority);
  }

  /**
   * Announce loading state
   * @param {string} message - Loading message
   * @param {string} id - Unique identifier for the loading operation
   */
  announceLoading(message = 'Loading', id = 'default') {
    const loadingMessage = `${message}, please wait`;
    this.statusRegion.textContent = loadingMessage;
    
    // Store loading state
    this.loadingStates = this.loadingStates || {};
    this.loadingStates[id] = true;
  }

  /**
   * Announce loading complete
   * @param {string} message - Completion message
   * @param {string} id - Unique identifier for the loading operation
   */
  announceLoadingComplete(message = 'Loading complete', id = 'default') {
    // Clear loading state
    if (this.loadingStates && this.loadingStates[id]) {
      delete this.loadingStates[id];
    }
    
    // Clear status region if no other loading states
    if (Object.keys(this.loadingStates || {}).length === 0) {
      this.statusRegion.textContent = '';
    }
    
    // Announce completion
    this.announce(message, 'polite');
  }

  /**
   * Create descriptive text for wedding-specific elements
   * @param {string} elementType - Type of wedding element
   * @param {Object} data - Element data
   * @returns {string} Descriptive text
   */
  describeWeddingElement(elementType, data) {
    switch (elementType) {
      case 'seating_chart':
        return this.describeSeatingChart(data);
      
      case 'photo_gallery':
        return this.describePhotoGallery(data);
      
      case 'guest_list':
        return this.describeGuestList(data);
      
      case 'timeline':
        return this.describeTimeline(data);
      
      case 'vendor_card':
        return this.describeVendor(data);
      
      case 'budget_summary':
        return this.describeBudget(data);
      
      default:
        return '';
    }
  }

  /**
   * Describe seating chart for screen readers
   * @param {Object} data - Seating chart data
   * @returns {string} Description
   */
  describeSeatingChart(data) {
    const { tables, totalGuests, unassignedGuests } = data;
    
    let description = `Wedding seating chart with ${tables.length} tables and ${totalGuests} guests.`;
    
    if (unassignedGuests > 0) {
      description += ` ${unassignedGuests} guests are not yet assigned to tables.`;
    }
    
    // Add table summaries
    tables.forEach((table, index) => {
      description += ` Table ${table.name || index + 1}: ${table.seats} seats, ${table.assignedGuests} guests assigned.`;
    });
    
    return description;
  }

  /**
   * Describe photo gallery
   * @param {Object} data - Gallery data
   * @returns {string} Description
   */
  describePhotoGallery(data) {
    const { photos, albums, totalSize } = data;
    
    let description = `Photo gallery containing ${photos} photos`;
    
    if (albums > 0) {
      description += ` organized in ${albums} albums`;
    }
    
    if (totalSize) {
      description += `, total size ${this.formatFileSize(totalSize)}`;
    }
    
    return description;
  }

  /**
   * Describe guest list
   * @param {Object} data - Guest list data
   * @returns {string} Description
   */
  describeGuestList(data) {
    const { total, confirmed, pending, declined } = data;
    
    return `Guest list: ${total} total invitations. ${confirmed} confirmed, ${pending} pending response, ${declined} declined.`;
  }

  /**
   * Describe timeline
   * @param {Object} data - Timeline data
   * @returns {string} Description
   */
  describeTimeline(data) {
    const { events, date, venue } = data;
    
    return `Wedding timeline for ${date} at ${venue} with ${events.length} scheduled events.`;
  }

  /**
   * Describe vendor
   * @param {Object} data - Vendor data
   * @returns {string} Description
   */
  describeVendor(data) {
    const { name, type, rating, price, status } = data;
    
    let description = `${type}: ${name}`;
    
    if (rating) {
      description += `, rated ${rating} out of 5 stars`;
    }
    
    if (price) {
      description += `, price ${price}`;
    }
    
    if (status) {
      description += `, status: ${status}`;
    }
    
    return description;
  }

  /**
   * Describe budget
   * @param {Object} data - Budget data
   * @returns {string} Description
   */
  describeBudget(data) {
    const { total, spent, remaining, categories } = data;
    
    return `Wedding budget: Total ${total}, spent ${spent}, remaining ${remaining}. Budget divided into ${categories} categories.`;
  }

  /**
   * Format file size for screen reader
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted size
   */
  formatFileSize(bytes) {
    const units = ['bytes', 'kilobytes', 'megabytes', 'gigabytes'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${Math.round(size * 10) / 10} ${units[unitIndex]}`;
  }

  /**
   * Setup mutation observer for dynamic content
   */
  setupMutationObserver() {
    const config = {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-label', 'aria-describedby', 'aria-live']
    };

    this.mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // Handle dynamically added content
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.enhanceNewElement(node);
            }
          });
        }
      });
    });

    this.mutationObserver.observe(document.body, config);
  }

  /**
   * Enhance newly added elements for screen readers
   * @param {HTMLElement} element - New element
   */
  enhanceNewElement(element) {
    // Add appropriate ARIA labels if missing
    if (element.tagName === 'IMG' && !element.hasAttribute('alt')) {
      console.warn('Image added without alt text:', element);
    }
    
    // Enhance form fields
    if (element.tagName === 'INPUT' || element.tagName === 'SELECT' || element.tagName === 'TEXTAREA') {
      this.enhanceFormField(element);
    }
    
    // Enhance buttons without text
    if (element.tagName === 'BUTTON' && !element.textContent.trim() && !element.hasAttribute('aria-label')) {
      console.warn('Button added without accessible text:', element);
    }
  }

  /**
   * Enhance form field for screen readers
   * @param {HTMLElement} field - Form field
   */
  enhanceFormField(field) {
    // Check for associated label
    const id = field.id;
    const label = id ? document.querySelector(`label[for="${id}"]`) : null;
    
    if (!label && !field.hasAttribute('aria-label') && !field.hasAttribute('aria-labelledby')) {
      // Try to find implicit label
      const parentLabel = field.closest('label');
      
      if (!parentLabel) {
        console.warn('Form field without accessible label:', field);
      }
    }
    
    // Add aria-required if required
    if (field.hasAttribute('required') && !field.hasAttribute('aria-required')) {
      field.setAttribute('aria-required', 'true');
    }
    
    // Add aria-invalid for validation
    if (field.validity && !field.validity.valid && !field.hasAttribute('aria-invalid')) {
      field.setAttribute('aria-invalid', 'true');
    }
  }

  /**
   * Create screen reader friendly table
   * @param {Object} tableData - Table data
   * @returns {string} HTML string
   */
  createAccessibleTable(tableData) {
    const { caption, headers, rows, summary } = tableData;
    
    let html = '<table role="table">';
    
    if (caption) {
      html += `<caption>${caption}</caption>`;
    }
    
    if (summary) {
      html += `<summary class="sr-only">${summary}</summary>`;
    }
    
    // Add headers
    html += '<thead><tr>';
    headers.forEach((header, index) => {
      html += `<th scope="col" id="header-${index}">${header}</th>`;
    });
    html += '</tr></thead>';
    
    // Add body
    html += '<tbody>';
    rows.forEach((row, rowIndex) => {
      html += '<tr>';
      row.forEach((cell, cellIndex) => {
        const headerId = `header-${cellIndex}`;
        html += `<td headers="${headerId}">${cell}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody>';
    
    html += '</table>';
    
    return html;
  }

  /**
   * Generate skip navigation links
   * @returns {string} HTML string
   */
  generateSkipLinks() {
    return `
      <nav class="sr-only" aria-label="Skip links">
        <a href="#main-content" class="skip-link">Skip to main content</a>
        <a href="#navigation" class="skip-link">Skip to navigation</a>
        <a href="#footer" class="skip-link">Skip to footer</a>
      </nav>
    `;
  }
}

module.exports = new ScreenReaderUtils();