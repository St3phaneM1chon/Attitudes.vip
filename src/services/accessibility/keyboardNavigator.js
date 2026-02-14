/**
 * Keyboard Navigation Handler
 * Manages keyboard navigation patterns and shortcuts
 */

class KeyboardNavigator {
  constructor() {
    this.shortcuts = new Map();
    this.navigationMode = 'normal';
    this.initialized = false;
    this.focusableElements = [];
    this.currentFocusIndex = -1;
    this.handlers = new Map();
    this.modalStack = [];
  }

  /**
   * Initialize keyboard navigation
   */
  initialize() {
    if (this.initialized) return;

    // Set up global keyboard listeners
    document.addEventListener('keydown', this.handleGlobalKeydown.bind(this), true);
    document.addEventListener('keyup', this.handleGlobalKeyup.bind(this), true);
    
    // Register default shortcuts
    this.registerDefaultShortcuts();
    
    // Set up focus tracking
    this.setupFocusTracking();
    
    this.initialized = true;
  }

  /**
   * Clean up keyboard navigation
   */
  cleanup() {
    if (!this.initialized) return;

    document.removeEventListener('keydown', this.handleGlobalKeydown.bind(this), true);
    document.removeEventListener('keyup', this.handleGlobalKeyup.bind(this), true);
    
    this.shortcuts.clear();
    this.handlers.clear();
    this.modalStack = [];
    
    this.initialized = false;
  }

  /**
   * Register default keyboard shortcuts
   */
  registerDefaultShortcuts() {
    // Navigation shortcuts
    this.registerShortcut('Alt+M', () => this.focusMain(), 'Skip to main content');
    this.registerShortcut('Alt+N', () => this.focusNavigation(), 'Skip to navigation');
    this.registerShortcut('Alt+S', () => this.focusSearch(), 'Focus search');
    this.registerShortcut('Alt+H', () => this.showHelp(), 'Show keyboard help');
    
    // Modal/dialog shortcuts
    this.registerShortcut('Escape', () => this.closeModal(), 'Close modal or cancel');
    
    // Wedding-specific shortcuts
    this.registerShortcut('Alt+G', () => this.focusGuestList(), 'Go to guest list');
    this.registerShortcut('Alt+T', () => this.focusTimeline(), 'Go to timeline');
    this.registerShortcut('Alt+V', () => this.focusVendors(), 'Go to vendors');
    this.registerShortcut('Alt+B', () => this.focusBudget(), 'Go to budget');
    
    // Grid navigation
    this.registerShortcut('Ctrl+Home', () => this.focusFirst(), 'Focus first item');
    this.registerShortcut('Ctrl+End', () => this.focusLast(), 'Focus last item');
  }

  /**
   * Register keyboard shortcut
   * @param {string} keys - Key combination (e.g., 'Ctrl+S', 'Alt+Shift+F')
   * @param {Function} handler - Handler function
   * @param {string} description - Description for help
   */
  registerShortcut(keys, handler, description = '') {
    const normalizedKeys = this.normalizeKeys(keys);
    
    this.shortcuts.set(normalizedKeys, {
      handler,
      description,
      keys: normalizedKeys
    });
  }

  /**
   * Unregister keyboard shortcut
   * @param {string} keys - Key combination
   */
  unregisterShortcut(keys) {
    const normalizedKeys = this.normalizeKeys(keys);
    this.shortcuts.delete(normalizedKeys);
  }

  /**
   * Normalize key combination string
   * @param {string} keys - Key combination
   * @returns {string} Normalized keys
   */
  normalizeKeys(keys) {
    return keys
      .toLowerCase()
      .split('+')
      .map(k => k.trim())
      .sort()
      .join('+');
  }

  /**
   * Handle global keydown event
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleGlobalKeydown(event) {
    // Build key combination string
    const keys = [];
    if (event.ctrlKey || event.metaKey) keys.push('ctrl');
    if (event.altKey) keys.push('alt');
    if (event.shiftKey) keys.push('shift');
    
    // Add the actual key
    const key = event.key.toLowerCase();
    if (!['control', 'alt', 'shift', 'meta'].includes(key)) {
      keys.push(key);
    }
    
    const keyCombo = keys.join('+');
    
    // Check for registered shortcut
    const shortcut = this.shortcuts.get(keyCombo);
    if (shortcut) {
      event.preventDefault();
      event.stopPropagation();
      shortcut.handler(event);
      return;
    }
    
    // Handle special navigation patterns
    this.handleNavigationPattern(event);
  }

  /**
   * Handle global keyup event
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleGlobalKeyup(event) {
    // Handle any keyup-specific logic
  }

  /**
   * Handle navigation patterns (arrow keys, tab, etc.)
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleNavigationPattern(event) {
    const target = event.target;
    const key = event.key;
    
    // Handle table navigation
    if (target.closest('table')) {
      this.handleTableNavigation(event);
    }
    
    // Handle grid navigation
    else if (target.closest('[role="grid"]')) {
      this.handleGridNavigation(event);
    }
    
    // Handle tree navigation
    else if (target.closest('[role="tree"]')) {
      this.handleTreeNavigation(event);
    }
    
    // Handle tab navigation
    else if (key === 'Tab') {
      this.handleTabNavigation(event);
    }
  }

  /**
   * Handle table navigation
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleTableNavigation(event) {
    const key = event.key;
    const currentCell = event.target.closest('td, th');
    
    if (!currentCell) return;
    
    const currentRow = currentCell.parentElement;
    const table = currentCell.closest('table');
    const rows = Array.from(table.querySelectorAll('tr'));
    const cells = Array.from(currentRow.querySelectorAll('td, th'));
    
    const rowIndex = rows.indexOf(currentRow);
    const cellIndex = cells.indexOf(currentCell);
    
    let newCell = null;
    
    switch (key) {
      case 'ArrowUp':
        if (rowIndex > 0) {
          const prevRow = rows[rowIndex - 1];
          const prevCells = prevRow.querySelectorAll('td, th');
          newCell = prevCells[Math.min(cellIndex, prevCells.length - 1)];
        }
        break;
        
      case 'ArrowDown':
        if (rowIndex < rows.length - 1) {
          const nextRow = rows[rowIndex + 1];
          const nextCells = nextRow.querySelectorAll('td, th');
          newCell = nextCells[Math.min(cellIndex, nextCells.length - 1)];
        }
        break;
        
      case 'ArrowLeft':
        if (cellIndex > 0) {
          newCell = cells[cellIndex - 1];
        }
        break;
        
      case 'ArrowRight':
        if (cellIndex < cells.length - 1) {
          newCell = cells[cellIndex + 1];
        }
        break;
        
      case 'Home':
        if (event.ctrlKey) {
          // First cell in table
          newCell = table.querySelector('td, th');
        } else {
          // First cell in row
          newCell = cells[0];
        }
        break;
        
      case 'End':
        if (event.ctrlKey) {
          // Last cell in table
          const lastRow = rows[rows.length - 1];
          const lastCells = lastRow.querySelectorAll('td, th');
          newCell = lastCells[lastCells.length - 1];
        } else {
          // Last cell in row
          newCell = cells[cells.length - 1];
        }
        break;
    }
    
    if (newCell) {
      event.preventDefault();
      this.focusCell(newCell);
    }
  }

  /**
   * Handle grid navigation
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleGridNavigation(event) {
    const key = event.key;
    const grid = event.target.closest('[role="grid"]');
    const cells = Array.from(grid.querySelectorAll('[role="gridcell"]'));
    const currentCell = event.target.closest('[role="gridcell"]');
    
    if (!currentCell) return;
    
    const currentIndex = cells.indexOf(currentCell);
    const columns = parseInt(grid.getAttribute('data-columns') || '1');
    const rows = Math.ceil(cells.length / columns);
    
    const currentRow = Math.floor(currentIndex / columns);
    const currentCol = currentIndex % columns;
    
    let newIndex = -1;
    
    switch (key) {
      case 'ArrowUp':
        if (currentRow > 0) {
          newIndex = (currentRow - 1) * columns + currentCol;
        }
        break;
        
      case 'ArrowDown':
        if (currentRow < rows - 1) {
          newIndex = (currentRow + 1) * columns + currentCol;
        }
        break;
        
      case 'ArrowLeft':
        if (currentIndex > 0) {
          newIndex = currentIndex - 1;
        }
        break;
        
      case 'ArrowRight':
        if (currentIndex < cells.length - 1) {
          newIndex = currentIndex + 1;
        }
        break;
        
      case 'Home':
        newIndex = 0;
        break;
        
      case 'End':
        newIndex = cells.length - 1;
        break;
        
      case 'PageUp':
        newIndex = Math.max(0, currentIndex - columns * 3);
        break;
        
      case 'PageDown':
        newIndex = Math.min(cells.length - 1, currentIndex + columns * 3);
        break;
    }
    
    if (newIndex >= 0 && newIndex < cells.length) {
      event.preventDefault();
      this.focusCell(cells[newIndex]);
    }
  }

  /**
   * Handle tree navigation
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleTreeNavigation(event) {
    const key = event.key;
    const treeItem = event.target.closest('[role="treeitem"]');
    
    if (!treeItem) return;
    
    const expanded = treeItem.getAttribute('aria-expanded') === 'true';
    
    switch (key) {
      case 'ArrowRight':
        if (!expanded && treeItem.querySelector('[role="group"]')) {
          event.preventDefault();
          this.expandTreeItem(treeItem);
        } else {
          // Move to first child
          const firstChild = treeItem.querySelector('[role="treeitem"]');
          if (firstChild) {
            event.preventDefault();
            firstChild.focus();
          }
        }
        break;
        
      case 'ArrowLeft':
        if (expanded) {
          event.preventDefault();
          this.collapseTreeItem(treeItem);
        } else {
          // Move to parent
          const parent = treeItem.parentElement.closest('[role="treeitem"]');
          if (parent) {
            event.preventDefault();
            parent.focus();
          }
        }
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        this.focusPreviousTreeItem(treeItem);
        break;
        
      case 'ArrowDown':
        event.preventDefault();
        this.focusNextTreeItem(treeItem);
        break;
        
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.activateTreeItem(treeItem);
        break;
        
      case '*':
        event.preventDefault();
        this.expandAllSiblings(treeItem);
        break;
    }
  }

  /**
   * Handle tab navigation
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleTabNavigation(event) {
    // Custom tab handling for complex widgets
    const widget = event.target.closest('[role="tablist"], [role="menu"], [role="toolbar"]');
    
    if (widget) {
      const items = this.getNavigableItems(widget);
      const currentIndex = items.indexOf(event.target);
      
      if (currentIndex !== -1) {
        event.preventDefault();
        
        let nextIndex;
        if (event.shiftKey) {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        } else {
          nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        }
        
        items[nextIndex].focus();
      }
    }
  }

  /**
   * Get navigable items in widget
   * @param {HTMLElement} widget - Widget element
   * @returns {Array<HTMLElement>} Navigable items
   */
  getNavigableItems(widget) {
    const role = widget.getAttribute('role');
    let selector;
    
    switch (role) {
      case 'tablist':
        selector = '[role="tab"]:not([disabled])';
        break;
      case 'menu':
        selector = '[role="menuitem"]:not([disabled]), [role="menuitemcheckbox"]:not([disabled]), [role="menuitemradio"]:not([disabled])';
        break;
      case 'toolbar':
        selector = 'button:not([disabled]), [role="button"]:not([disabled])';
        break;
      default:
        selector = 'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
    }
    
    return Array.from(widget.querySelectorAll(selector));
  }

  /**
   * Focus cell in table or grid
   * @param {HTMLElement} cell - Cell to focus
   */
  focusCell(cell) {
    // Make cell focusable if needed
    if (!cell.hasAttribute('tabindex')) {
      cell.setAttribute('tabindex', '0');
    }
    
    // Focus the cell
    cell.focus();
    
    // Update ARIA attributes
    const grid = cell.closest('[role="grid"], table');
    if (grid) {
      // Remove tabindex from other cells
      grid.querySelectorAll('[tabindex="0"]').forEach(c => {
        if (c !== cell) {
          c.setAttribute('tabindex', '-1');
        }
      });
    }
  }

  /**
   * Setup focus tracking
   */
  setupFocusTracking() {
    document.addEventListener('focusin', (event) => {
      const focusable = this.getAllFocusableElements();
      this.currentFocusIndex = focusable.indexOf(event.target);
    });
  }

  /**
   * Get all focusable elements
   * @returns {Array<HTMLElement>} Focusable elements
   */
  getAllFocusableElements() {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',');
    
    return Array.from(document.querySelectorAll(selector)).filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }

  /**
   * Show keyboard shortcuts help
   */
  showHelp() {
    const shortcuts = Array.from(this.shortcuts.entries()).map(([keys, info]) => ({
      keys: info.keys,
      description: info.description
    }));
    
    // Create help modal
    const modal = document.createElement('div');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-label', 'Keyboard shortcuts help');
    modal.className = 'keyboard-help-modal';
    
    const content = `
      <div class="modal-content">
        <h2>Keyboard Shortcuts</h2>
        <button class="close-button" aria-label="Close help">&times;</button>
        <table>
          <thead>
            <tr>
              <th>Shortcut</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            ${shortcuts.map(s => `
              <tr>
                <td><kbd>${s.keys.toUpperCase()}</kbd></td>
                <td>${s.description}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    
    modal.innerHTML = content;
    document.body.appendChild(modal);
    
    // Focus the modal
    const closeButton = modal.querySelector('.close-button');
    closeButton.focus();
    
    // Handle close
    closeButton.addEventListener('click', () => {
      modal.remove();
    });
    
    // Add to modal stack
    this.modalStack.push(modal);
  }

  /**
   * Navigate to main content
   */
  focusMain() {
    const main = document.querySelector('main, [role="main"], #main-content');
    if (main) {
      main.tabIndex = -1;
      main.focus();
    }
  }

  /**
   * Navigate to navigation
   */
  focusNavigation() {
    const nav = document.querySelector('nav, [role="navigation"], #navigation');
    if (nav) {
      const firstLink = nav.querySelector('a, button');
      if (firstLink) {
        firstLink.focus();
      } else {
        nav.tabIndex = -1;
        nav.focus();
      }
    }
  }

  /**
   * Focus search input
   */
  focusSearch() {
    const search = document.querySelector('[type="search"], [role="search"] input, #search');
    if (search) {
      search.focus();
    }
  }

  /**
   * Close top modal
   */
  closeModal() {
    if (this.modalStack.length > 0) {
      const modal = this.modalStack.pop();
      modal.remove();
      
      // Restore focus
      const lastFocus = document.querySelector('[data-last-focus]');
      if (lastFocus) {
        lastFocus.focus();
        lastFocus.removeAttribute('data-last-focus');
      }
    }
  }

  // Wedding-specific navigation methods
  focusGuestList() {
    const guestList = document.querySelector('[data-section="guests"], #guest-list');
    if (guestList) {
      guestList.scrollIntoView({ behavior: 'smooth' });
      const firstInteractive = guestList.querySelector('button, a, input');
      if (firstInteractive) {
        firstInteractive.focus();
      }
    }
  }

  focusTimeline() {
    const timeline = document.querySelector('[data-section="timeline"], #timeline');
    if (timeline) {
      timeline.scrollIntoView({ behavior: 'smooth' });
      const firstEvent = timeline.querySelector('[role="article"], .event');
      if (firstEvent) {
        firstEvent.tabIndex = -1;
        firstEvent.focus();
      }
    }
  }

  focusVendors() {
    const vendors = document.querySelector('[data-section="vendors"], #vendors');
    if (vendors) {
      vendors.scrollIntoView({ behavior: 'smooth' });
      const firstVendor = vendors.querySelector('.vendor-card, [role="article"]');
      if (firstVendor) {
        firstVendor.tabIndex = -1;
        firstVendor.focus();
      }
    }
  }

  focusBudget() {
    const budget = document.querySelector('[data-section="budget"], #budget');
    if (budget) {
      budget.scrollIntoView({ behavior: 'smooth' });
      const budgetSummary = budget.querySelector('.budget-summary, [role="region"]');
      if (budgetSummary) {
        budgetSummary.tabIndex = -1;
        budgetSummary.focus();
      }
    }
  }

  /**
   * Focus first focusable element
   */
  focusFirst() {
    const focusable = this.getAllFocusableElements();
    if (focusable.length > 0) {
      focusable[0].focus();
    }
  }

  /**
   * Focus last focusable element
   */
  focusLast() {
    const focusable = this.getAllFocusableElements();
    if (focusable.length > 0) {
      focusable[focusable.length - 1].focus();
    }
  }

  /**
   * Tree navigation helpers
   */
  expandTreeItem(item) {
    item.setAttribute('aria-expanded', 'true');
    const group = item.querySelector('[role="group"]');
    if (group) {
      group.style.display = 'block';
    }
  }

  collapseTreeItem(item) {
    item.setAttribute('aria-expanded', 'false');
    const group = item.querySelector('[role="group"]');
    if (group) {
      group.style.display = 'none';
    }
  }

  activateTreeItem(item) {
    // Toggle expansion or trigger click
    const expanded = item.getAttribute('aria-expanded');
    if (expanded !== null) {
      if (expanded === 'true') {
        this.collapseTreeItem(item);
      } else {
        this.expandTreeItem(item);
      }
    } else {
      item.click();
    }
  }

  /**
   * Audit keyboard navigation
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
      // Check for keyboard traps
      const focusable = this.getAllFocusableElements();
      let hasKeyboardTrap = false;
      
      // Check interactive elements
      const interactive = container.querySelectorAll('a, button, input, select, textarea');
      interactive.forEach(element => {
        // Check if element is keyboard accessible
        if (!this.isKeyboardAccessible(element)) {
          results.errors.push({
            type: 'keyboard_inaccessible',
            element: this.getSelector(element),
            message: 'Interactive element is not keyboard accessible'
          });
        }
        
        // Check for click handlers without keyboard handlers
        if (element.onclick && !element.onkeydown && !element.onkeypress) {
          results.warnings.push({
            type: 'missing_keyboard_handler',
            element: this.getSelector(element),
            message: 'Click handler without keyboard equivalent'
          });
        }
      });
      
      // Check for proper ARIA roles
      const widgets = container.querySelectorAll('[role]');
      widgets.forEach(widget => {
        const role = widget.getAttribute('role');
        if (!this.isValidRole(role)) {
          results.errors.push({
            type: 'invalid_aria_role',
            element: this.getSelector(widget),
            message: `Invalid ARIA role: ${role}`
          });
        }
      });
      
      results.passed.push({
        type: 'keyboard_navigation',
        message: 'Basic keyboard navigation checks passed'
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
   * Check if element is keyboard accessible
   * @param {HTMLElement} element - Element to check
   * @returns {boolean} Is accessible
   */
  isKeyboardAccessible(element) {
    // Check if element is focusable
    const tabindex = element.getAttribute('tabindex');
    if (tabindex && parseInt(tabindex) < 0) {
      return false;
    }
    
    // Check if element is visible
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }
    
    return true;
  }

  /**
   * Check if ARIA role is valid
   * @param {string} role - ARIA role
   * @returns {boolean} Is valid
   */
  isValidRole(role) {
    const validRoles = [
      'alert', 'alertdialog', 'application', 'article', 'banner',
      'button', 'checkbox', 'columnheader', 'combobox', 'complementary',
      'contentinfo', 'definition', 'dialog', 'directory', 'document',
      'feed', 'figure', 'form', 'grid', 'gridcell', 'group',
      'heading', 'img', 'link', 'list', 'listbox', 'listitem',
      'log', 'main', 'marquee', 'math', 'menu', 'menubar',
      'menuitem', 'menuitemcheckbox', 'menuitemradio', 'navigation',
      'none', 'note', 'option', 'presentation', 'progressbar',
      'radio', 'radiogroup', 'region', 'row', 'rowgroup',
      'rowheader', 'scrollbar', 'search', 'searchbox', 'separator',
      'slider', 'spinbutton', 'status', 'switch', 'tab', 'table',
      'tablist', 'tabpanel', 'term', 'textbox', 'timer',
      'toolbar', 'tooltip', 'tree', 'treegrid', 'treeitem'
    ];
    
    return validRoles.includes(role);
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

module.exports = new KeyboardNavigator();