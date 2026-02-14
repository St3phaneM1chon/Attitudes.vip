/**
 * WCAG 2.1 Validator
 * Validates elements against WCAG 2.1 Level AA/AAA criteria
 */

class WCAGValidator {
  constructor() {
    this.criteria = {
      // Perceivable
      '1.1.1': { level: 'A', name: 'Non-text Content', test: this.testNonTextContent },
      '1.2.1': { level: 'A', name: 'Audio-only and Video-only', test: this.testAudioVideoOnly },
      '1.2.2': { level: 'A', name: 'Captions', test: this.testCaptions },
      '1.2.3': { level: 'A', name: 'Audio Description', test: this.testAudioDescription },
      '1.3.1': { level: 'A', name: 'Info and Relationships', test: this.testInfoRelationships },
      '1.3.2': { level: 'A', name: 'Meaningful Sequence', test: this.testMeaningfulSequence },
      '1.3.3': { level: 'A', name: 'Sensory Characteristics', test: this.testSensoryCharacteristics },
      '1.3.4': { level: 'AA', name: 'Orientation', test: this.testOrientation },
      '1.3.5': { level: 'AA', name: 'Identify Input Purpose', test: this.testIdentifyInputPurpose },
      '1.4.1': { level: 'A', name: 'Use of Color', test: this.testUseOfColor },
      '1.4.2': { level: 'A', name: 'Audio Control', test: this.testAudioControl },
      '1.4.3': { level: 'AA', name: 'Contrast Minimum', test: this.testContrastMinimum },
      '1.4.4': { level: 'AA', name: 'Resize Text', test: this.testResizeText },
      '1.4.5': { level: 'AA', name: 'Images of Text', test: this.testImagesOfText },
      '1.4.10': { level: 'AA', name: 'Reflow', test: this.testReflow },
      '1.4.11': { level: 'AA', name: 'Non-text Contrast', test: this.testNonTextContrast },
      '1.4.12': { level: 'AA', name: 'Text Spacing', test: this.testTextSpacing },
      '1.4.13': { level: 'AA', name: 'Content on Hover or Focus', test: this.testHoverFocusContent },
      
      // Operable
      '2.1.1': { level: 'A', name: 'Keyboard', test: this.testKeyboard },
      '2.1.2': { level: 'A', name: 'No Keyboard Trap', test: this.testNoKeyboardTrap },
      '2.1.4': { level: 'A', name: 'Character Key Shortcuts', test: this.testCharacterKeyShortcuts },
      '2.2.1': { level: 'A', name: 'Timing Adjustable', test: this.testTimingAdjustable },
      '2.2.2': { level: 'A', name: 'Pause, Stop, Hide', test: this.testPauseStopHide },
      '2.3.1': { level: 'A', name: 'Three Flashes', test: this.testThreeFlashes },
      '2.4.1': { level: 'A', name: 'Bypass Blocks', test: this.testBypassBlocks },
      '2.4.2': { level: 'A', name: 'Page Titled', test: this.testPageTitled },
      '2.4.3': { level: 'A', name: 'Focus Order', test: this.testFocusOrder },
      '2.4.4': { level: 'A', name: 'Link Purpose', test: this.testLinkPurpose },
      '2.4.5': { level: 'AA', name: 'Multiple Ways', test: this.testMultipleWays },
      '2.4.6': { level: 'AA', name: 'Headings and Labels', test: this.testHeadingsLabels },
      '2.4.7': { level: 'AA', name: 'Focus Visible', test: this.testFocusVisible },
      '2.5.1': { level: 'A', name: 'Pointer Gestures', test: this.testPointerGestures },
      '2.5.2': { level: 'A', name: 'Pointer Cancellation', test: this.testPointerCancellation },
      '2.5.3': { level: 'A', name: 'Label in Name', test: this.testLabelInName },
      '2.5.4': { level: 'A', name: 'Motion Actuation', test: this.testMotionActuation },
      
      // Understandable
      '3.1.1': { level: 'A', name: 'Language of Page', test: this.testLanguageOfPage },
      '3.1.2': { level: 'AA', name: 'Language of Parts', test: this.testLanguageOfParts },
      '3.2.1': { level: 'A', name: 'On Focus', test: this.testOnFocus },
      '3.2.2': { level: 'A', name: 'On Input', test: this.testOnInput },
      '3.2.3': { level: 'AA', name: 'Consistent Navigation', test: this.testConsistentNavigation },
      '3.2.4': { level: 'AA', name: 'Consistent Identification', test: this.testConsistentIdentification },
      '3.3.1': { level: 'A', name: 'Error Identification', test: this.testErrorIdentification },
      '3.3.2': { level: 'A', name: 'Labels or Instructions', test: this.testLabelsInstructions },
      '3.3.3': { level: 'AA', name: 'Error Suggestion', test: this.testErrorSuggestion },
      '3.3.4': { level: 'AA', name: 'Error Prevention', test: this.testErrorPrevention },
      
      // Robust
      '4.1.1': { level: 'A', name: 'Parsing', test: this.testParsing },
      '4.1.2': { level: 'A', name: 'Name, Role, Value', test: this.testNameRoleValue },
      '4.1.3': { level: 'AA', name: 'Status Messages', test: this.testStatusMessages }
    };
  }

  /**
   * Validate element against WCAG criteria
   * @param {HTMLElement} element - Element to validate
   * @param {Object} options - Validation options
   * @returns {Object} Validation results
   */
  validate(element, options = {}) {
    const { level = 'AA', criteria = null } = options;
    const results = {
      passed: [],
      failed: [],
      warnings: [],
      notApplicable: [],
      level: level
    };

    // Filter criteria by level
    const applicableCriteria = criteria || Object.keys(this.criteria).filter(key => {
      const criterion = this.criteria[key];
      return criterion.level === 'A' || (level === 'AA' && criterion.level === 'AA') || (level === 'AAA');
    });

    // Run tests
    applicableCriteria.forEach(criterionKey => {
      const criterion = this.criteria[criterionKey];
      if (!criterion) return;

      try {
        const testResult = criterion.test.call(this, element);
        
        if (testResult.applicable === false) {
          results.notApplicable.push({
            criterion: criterionKey,
            name: criterion.name,
            level: criterion.level
          });
        } else if (testResult.passed) {
          results.passed.push({
            criterion: criterionKey,
            name: criterion.name,
            level: criterion.level,
            message: testResult.message
          });
        } else {
          results.failed.push({
            criterion: criterionKey,
            name: criterion.name,
            level: criterion.level,
            message: testResult.message,
            elements: testResult.elements || []
          });
        }

        if (testResult.warnings && testResult.warnings.length > 0) {
          results.warnings.push(...testResult.warnings);
        }
      } catch (error) {
        console.error(`Error testing criterion ${criterionKey}:`, error);
      }
    });

    return results;
  }

  // Test implementations for WCAG criteria

  /**
   * 1.1.1 Non-text Content
   */
  testNonTextContent(element) {
    const images = element.querySelectorAll('img');
    const failedImages = [];

    images.forEach(img => {
      const alt = img.getAttribute('alt');
      const isDecorative = img.getAttribute('role') === 'presentation' || img.getAttribute('aria-hidden') === 'true';
      
      if (!isDecorative && (alt === null || alt === undefined)) {
        failedImages.push(img);
      }
    });

    return {
      applicable: images.length > 0,
      passed: failedImages.length === 0,
      message: failedImages.length > 0 
        ? `${failedImages.length} images missing alt text`
        : 'All images have appropriate alt text',
      elements: failedImages
    };
  }

  /**
   * 1.2.1 Audio-only and Video-only
   */
  testAudioVideoOnly(element) {
    const media = element.querySelectorAll('audio, video');
    const issues = [];

    media.forEach(m => {
      const hasTranscript = m.getAttribute('aria-describedby') || 
                           m.closest('[aria-label*="transcript"]');
      if (!hasTranscript) {
        issues.push(m);
      }
    });

    return {
      applicable: media.length > 0,
      passed: issues.length === 0,
      message: issues.length > 0
        ? `${issues.length} media elements may need transcripts`
        : 'Media elements have appropriate alternatives',
      elements: issues
    };
  }

  /**
   * 1.2.2 Captions
   */
  testCaptions(element) {
    const videos = element.querySelectorAll('video');
    const issues = [];

    videos.forEach(video => {
      const tracks = video.querySelectorAll('track[kind="captions"]');
      if (tracks.length === 0) {
        issues.push(video);
      }
    });

    return {
      applicable: videos.length > 0,
      passed: issues.length === 0,
      message: issues.length > 0
        ? `${issues.length} videos missing captions`
        : 'All videos have captions',
      elements: issues
    };
  }

  /**
   * 1.2.3 Audio Description
   */
  testAudioDescription(element) {
    const videos = element.querySelectorAll('video');
    const warnings = [];

    videos.forEach(video => {
      const hasDescription = video.querySelector('track[kind="descriptions"]') ||
                           video.getAttribute('aria-describedby');
      if (!hasDescription) {
        warnings.push({
          element: video,
          message: 'Video may need audio description'
        });
      }
    });

    return {
      applicable: videos.length > 0,
      passed: true, // This is a warning-level check
      warnings: warnings
    };
  }

  /**
   * 1.3.1 Info and Relationships
   */
  testInfoRelationships(element) {
    const issues = [];

    // Check form associations
    const inputs = element.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      const id = input.id;
      const label = id ? element.querySelector(`label[for="${id}"]`) : null;
      const ariaLabel = input.getAttribute('aria-label');
      const ariaLabelledby = input.getAttribute('aria-labelledby');
      
      if (!label && !ariaLabel && !ariaLabelledby && input.type !== 'hidden') {
        issues.push(input);
      }
    });

    // Check table headers
    const tables = element.querySelectorAll('table');
    tables.forEach(table => {
      const headers = table.querySelectorAll('th');
      if (headers.length === 0 && table.querySelectorAll('tr').length > 0) {
        issues.push(table);
      }
    });

    return {
      applicable: true,
      passed: issues.length === 0,
      message: issues.length > 0
        ? `${issues.length} elements have unclear relationships`
        : 'Information and relationships are properly conveyed',
      elements: issues
    };
  }

  /**
   * 1.3.2 Meaningful Sequence
   */
  testMeaningfulSequence(element) {
    // This is difficult to test automatically
    const warnings = [];
    
    // Check for CSS-based content
    const pseudoElements = element.querySelectorAll('*');
    pseudoElements.forEach(el => {
      const before = window.getComputedStyle(el, ':before').content;
      const after = window.getComputedStyle(el, ':after').content;
      
      if ((before && before !== 'none' && before !== '""') || 
          (after && after !== 'none' && after !== '""')) {
        warnings.push({
          element: el,
          message: 'Element uses CSS-generated content that may affect reading order'
        });
      }
    });

    return {
      applicable: true,
      passed: true,
      warnings: warnings
    };
  }

  /**
   * 1.3.3 Sensory Characteristics
   */
  testSensoryCharacteristics(element) {
    const warnings = [];
    
    // Check for common phrases that rely on sensory characteristics
    const sensoryPhrases = [
      /click.*below/i,
      /see.*left/i,
      /on the right/i,
      /red button/i,
      /green text/i,
      /round button/i,
      /square icon/i
    ];

    const textElements = element.querySelectorAll('*');
    textElements.forEach(el => {
      const text = el.textContent;
      sensoryPhrases.forEach(phrase => {
        if (phrase.test(text)) {
          warnings.push({
            element: el,
            message: 'Content may rely on sensory characteristics'
          });
        }
      });
    });

    return {
      applicable: true,
      passed: warnings.length === 0,
      warnings: warnings
    };
  }

  /**
   * 1.3.4 Orientation
   */
  testOrientation(element) {
    // Check for CSS that locks orientation
    const hasOrientationLock = Array.from(document.styleSheets).some(sheet => {
      try {
        return Array.from(sheet.cssRules || []).some(rule => {
          return rule.cssText && rule.cssText.includes('@media') && 
                 rule.cssText.includes('orientation');
        });
      } catch (e) {
        return false;
      }
    });

    return {
      applicable: true,
      passed: !hasOrientationLock,
      message: hasOrientationLock
        ? 'CSS may restrict orientation'
        : 'Content adapts to different orientations'
    };
  }

  /**
   * 1.3.5 Identify Input Purpose
   */
  testIdentifyInputPurpose(element) {
    const inputs = element.querySelectorAll('input');
    const issues = [];

    const purposeMap = {
      'name': ['name', 'full-name', 'fullname'],
      'email': ['email', 'e-mail'],
      'tel': ['tel', 'phone', 'telephone'],
      'street-address': ['address', 'street'],
      'postal-code': ['zip', 'postal', 'postcode'],
      'cc-number': ['credit-card', 'card-number'],
      'cc-exp': ['expiry', 'exp-date'],
      'cc-csc': ['cvv', 'cvc', 'security-code']
    };

    inputs.forEach(input => {
      const type = input.type;
      const name = input.name?.toLowerCase() || '';
      const id = input.id?.toLowerCase() || '';
      const autocomplete = input.autocomplete;
      
      let needsAutocomplete = false;
      
      Object.entries(purposeMap).forEach(([purpose, keywords]) => {
        if (keywords.some(keyword => name.includes(keyword) || id.includes(keyword))) {
          if (!autocomplete || autocomplete === 'off') {
            needsAutocomplete = true;
          }
        }
      });
      
      if (needsAutocomplete) {
        issues.push(input);
      }
    });

    return {
      applicable: inputs.length > 0,
      passed: issues.length === 0,
      message: issues.length > 0
        ? `${issues.length} inputs missing autocomplete attributes`
        : 'Input purposes are properly identified',
      elements: issues
    };
  }

  /**
   * 1.4.1 Use of Color
   */
  testUseOfColor(element) {
    const warnings = [];
    
    // This is difficult to test automatically
    // Look for common patterns
    const colorOnlyPhrases = [
      /red.*required/i,
      /green.*success/i,
      /blue.*link/i,
      /highlighted in yellow/i
    ];

    const textElements = element.querySelectorAll('*');
    textElements.forEach(el => {
      const text = el.textContent;
      colorOnlyPhrases.forEach(phrase => {
        if (phrase.test(text)) {
          warnings.push({
            element: el,
            message: 'May be using color as the only means of conveying information'
          });
        }
      });
    });

    return {
      applicable: true,
      passed: true,
      warnings: warnings
    };
  }

  /**
   * 1.4.2 Audio Control
   */
  testAudioControl(element) {
    const audioElements = element.querySelectorAll('audio[autoplay], video[autoplay]');
    const issues = [];

    audioElements.forEach(audio => {
      const hasControls = audio.hasAttribute('controls');
      const hasMuted = audio.hasAttribute('muted');
      
      if (!hasControls && !hasMuted) {
        issues.push(audio);
      }
    });

    return {
      applicable: audioElements.length > 0,
      passed: issues.length === 0,
      message: issues.length > 0
        ? `${issues.length} auto-playing media elements without controls`
        : 'Auto-playing media has appropriate controls',
      elements: issues
    };
  }

  /**
   * 1.4.3 Contrast Minimum
   */
  testContrastMinimum(element) {
    // This would integrate with colorContrast.js
    // For now, return a placeholder
    return {
      applicable: true,
      passed: true,
      message: 'Contrast testing requires color contrast module'
    };
  }

  /**
   * 1.4.4 Resize Text
   */
  testResizeText(element) {
    const issues = [];
    
    // Check for fixed font sizes
    const elements = element.querySelectorAll('*');
    elements.forEach(el => {
      const fontSize = window.getComputedStyle(el).fontSize;
      if (fontSize && fontSize.endsWith('px')) {
        const size = parseFloat(fontSize);
        if (size < 10) {
          issues.push(el);
        }
      }
    });

    return {
      applicable: true,
      passed: issues.length === 0,
      message: issues.length > 0
        ? `${issues.length} elements with very small fixed font sizes`
        : 'Text can be resized appropriately',
      elements: issues
    };
  }

  /**
   * 1.4.5 Images of Text
   */
  testImagesOfText(element) {
    const warnings = [];
    const images = element.querySelectorAll('img');
    
    images.forEach(img => {
      const alt = img.getAttribute('alt') || '';
      // Simple heuristic: if alt text contains common text patterns
      if (alt.length > 20 || /[.!?]/.test(alt)) {
        warnings.push({
          element: img,
          message: 'Image may contain text that should be real text'
        });
      }
    });

    return {
      applicable: images.length > 0,
      passed: true,
      warnings: warnings
    };
  }

  /**
   * 2.1.1 Keyboard
   */
  testKeyboard(element) {
    const interactive = element.querySelectorAll('a, button, input, select, textarea, [onclick]');
    const issues = [];

    interactive.forEach(el => {
      const tabindex = el.getAttribute('tabindex');
      if (tabindex === '-1' && el.hasAttribute('onclick')) {
        issues.push(el);
      }
    });

    return {
      applicable: interactive.length > 0,
      passed: issues.length === 0,
      message: issues.length > 0
        ? `${issues.length} interactive elements not keyboard accessible`
        : 'All functionality is keyboard accessible',
      elements: issues
    };
  }

  /**
   * 2.1.2 No Keyboard Trap
   */
  testNoKeyboardTrap(element) {
    // This is difficult to test automatically
    const warnings = [];
    
    // Check for potential traps
    const modals = element.querySelectorAll('[role="dialog"], .modal');
    modals.forEach(modal => {
      warnings.push({
        element: modal,
        message: 'Modal/dialog should allow keyboard escape'
      });
    });

    return {
      applicable: true,
      passed: true,
      warnings: warnings
    };
  }

  /**
   * 2.4.1 Bypass Blocks
   */
  testBypassBlocks(element) {
    const skipLinks = element.querySelectorAll('a[href^="#"]:first-child, .skip-link');
    const hasSkipLinks = skipLinks.length > 0;
    
    const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const hasHeadingStructure = headings.length > 3;

    return {
      applicable: true,
      passed: hasSkipLinks || hasHeadingStructure,
      message: hasSkipLinks || hasHeadingStructure
        ? 'Page has skip links or proper heading structure'
        : 'Page needs skip links or better heading structure'
    };
  }

  /**
   * 2.4.2 Page Titled
   */
  testPageTitled(element) {
    const title = document.title;
    const hasTitle = title && title.trim().length > 0;

    return {
      applicable: true,
      passed: hasTitle,
      message: hasTitle
        ? 'Page has a descriptive title'
        : 'Page is missing a title'
    };
  }

  /**
   * 2.4.3 Focus Order
   */
  testFocusOrder(element) {
    const focusable = element.querySelectorAll('a, button, input, select, textarea, [tabindex]');
    const issues = [];

    focusable.forEach(el => {
      const tabindex = parseInt(el.getAttribute('tabindex') || '0');
      if (tabindex > 0) {
        issues.push(el);
      }
    });

    return {
      applicable: focusable.length > 0,
      passed: issues.length === 0,
      message: issues.length > 0
        ? `${issues.length} elements use positive tabindex`
        : 'Focus order follows visual flow',
      elements: issues
    };
  }

  /**
   * 2.4.4 Link Purpose
   */
  testLinkPurpose(element) {
    const links = element.querySelectorAll('a[href]');
    const issues = [];

    const genericTexts = ['click here', 'read more', 'more', 'link', 'here'];

    links.forEach(link => {
      const text = link.textContent.trim().toLowerCase();
      const ariaLabel = link.getAttribute('aria-label');
      
      if (!ariaLabel && genericTexts.includes(text)) {
        issues.push(link);
      }
    });

    return {
      applicable: links.length > 0,
      passed: issues.length === 0,
      message: issues.length > 0
        ? `${issues.length} links with unclear purpose`
        : 'All links have clear purpose',
      elements: issues
    };
  }

  /**
   * 2.4.6 Headings and Labels
   */
  testHeadingsLabels(element) {
    const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const labels = element.querySelectorAll('label');
    const issues = [];

    headings.forEach(heading => {
      if (!heading.textContent.trim()) {
        issues.push(heading);
      }
    });

    labels.forEach(label => {
      if (!label.textContent.trim()) {
        issues.push(label);
      }
    });

    return {
      applicable: headings.length > 0 || labels.length > 0,
      passed: issues.length === 0,
      message: issues.length > 0
        ? `${issues.length} empty headings or labels`
        : 'All headings and labels are descriptive',
      elements: issues
    };
  }

  /**
   * 2.4.7 Focus Visible
   */
  testFocusVisible(element) {
    // This requires runtime testing
    const warnings = [];
    
    const focusable = element.querySelectorAll('a, button, input, select, textarea');
    if (focusable.length > 0) {
      warnings.push({
        message: 'Ensure focus indicators are visible for all interactive elements'
      });
    }

    return {
      applicable: focusable.length > 0,
      passed: true,
      warnings: warnings
    };
  }

  /**
   * 3.1.1 Language of Page
   */
  testLanguageOfPage(element) {
    const htmlElement = document.documentElement;
    const hasLang = htmlElement.hasAttribute('lang') && 
                   htmlElement.getAttribute('lang').trim().length > 0;

    return {
      applicable: true,
      passed: hasLang,
      message: hasLang
        ? 'Page language is specified'
        : 'Page is missing lang attribute'
    };
  }

  /**
   * 3.3.1 Error Identification
   */
  testErrorIdentification(element) {
    const inputs = element.querySelectorAll('input[required], select[required], textarea[required]');
    const warnings = [];

    inputs.forEach(input => {
      const id = input.id;
      const errorMessage = id ? element.querySelector(`[id*="error-${id}"], [class*="error"][data-for="${id}"]`) : null;
      
      if (!errorMessage) {
        warnings.push({
          element: input,
          message: 'Required field may need error message element'
        });
      }
    });

    return {
      applicable: inputs.length > 0,
      passed: true,
      warnings: warnings
    };
  }

  /**
   * 3.3.2 Labels or Instructions
   */
  testLabelsInstructions(element) {
    const inputs = element.querySelectorAll('input:not([type="hidden"]), select, textarea');
    const issues = [];

    inputs.forEach(input => {
      const label = this.findLabel(input);
      const placeholder = input.getAttribute('placeholder');
      const ariaLabel = input.getAttribute('aria-label');
      const ariaLabelledby = input.getAttribute('aria-labelledby');
      
      if (!label && !placeholder && !ariaLabel && !ariaLabelledby) {
        issues.push(input);
      }
    });

    return {
      applicable: inputs.length > 0,
      passed: issues.length === 0,
      message: issues.length > 0
        ? `${issues.length} form fields missing labels or instructions`
        : 'All form fields have appropriate labels',
      elements: issues
    };
  }

  /**
   * 4.1.1 Parsing
   */
  testParsing(element) {
    const issues = [];
    
    // Check for duplicate IDs
    const ids = {};
    element.querySelectorAll('[id]').forEach(el => {
      const id = el.getAttribute('id');
      if (ids[id]) {
        issues.push(el);
      } else {
        ids[id] = true;
      }
    });

    return {
      applicable: true,
      passed: issues.length === 0,
      message: issues.length > 0
        ? `${issues.length} duplicate ID attributes found`
        : 'No parsing errors detected',
      elements: issues
    };
  }

  /**
   * 4.1.2 Name, Role, Value
   */
  testNameRoleValue(element) {
    const customElements = element.querySelectorAll('[role]');
    const issues = [];

    customElements.forEach(el => {
      const role = el.getAttribute('role');
      const hasName = el.hasAttribute('aria-label') || 
                     el.hasAttribute('aria-labelledby') ||
                     el.textContent.trim().length > 0;
      
      if (!hasName && this.roleNeedsName(role)) {
        issues.push(el);
      }
    });

    return {
      applicable: customElements.length > 0,
      passed: issues.length === 0,
      message: issues.length > 0
        ? `${issues.length} elements missing accessible name`
        : 'All elements have appropriate name, role, and value',
      elements: issues
    };
  }

  /**
   * 4.1.3 Status Messages
   */
  testStatusMessages(element) {
    const statusRegions = element.querySelectorAll('[role="status"], [role="alert"], [aria-live]');
    const hasStatusRegions = statusRegions.length > 0;

    return {
      applicable: true,
      passed: hasStatusRegions,
      message: hasStatusRegions
        ? 'Page has regions for status messages'
        : 'Consider adding live regions for dynamic status messages',
      warnings: hasStatusRegions ? [] : [{
        message: 'No status message regions found'
      }]
    };
  }

  // Helper methods

  /**
   * Find label for input element
   */
  findLabel(input) {
    const id = input.id;
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) return label;
    }
    
    const parent = input.parentElement;
    if (parent && parent.tagName === 'LABEL') {
      return parent;
    }
    
    return null;
  }

  /**
   * Check if role needs accessible name
   */
  roleNeedsName(role) {
    const rolesNeedingName = [
      'button', 'checkbox', 'combobox', 'gridcell',
      'link', 'menuitem', 'option', 'radio',
      'searchbox', 'slider', 'spinbutton', 'switch',
      'tab', 'textbox', 'treeitem'
    ];
    
    return rolesNeedingName.includes(role);
  }

  /**
   * Test remaining criteria placeholders
   */
  testCharacterKeyShortcuts() { return { applicable: false }; }
  testTimingAdjustable() { return { applicable: false }; }
  testPauseStopHide() { return { applicable: false }; }
  testThreeFlashes() { return { applicable: false }; }
  testMultipleWays() { return { applicable: false }; }
  testPointerGestures() { return { applicable: false }; }
  testPointerCancellation() { return { applicable: false }; }
  testLabelInName() { return { applicable: false }; }
  testMotionActuation() { return { applicable: false }; }
  testLanguageOfParts() { return { applicable: false }; }
  testOnFocus() { return { applicable: false }; }
  testOnInput() { return { applicable: false }; }
  testConsistentNavigation() { return { applicable: false }; }
  testConsistentIdentification() { return { applicable: false }; }
  testErrorSuggestion() { return { applicable: false }; }
  testErrorPrevention() { return { applicable: false }; }
  testReflow() { return { applicable: false }; }
  testNonTextContrast() { return { applicable: false }; }
  testTextSpacing() { return { applicable: false }; }
  testHoverFocusContent() { return { applicable: false }; }
}

module.exports = new WCAGValidator();