/**
 * Color Contrast Checker
 * WCAG 2.1 AA/AAA compliance for color contrast ratios
 */

class ColorContrastChecker {
  constructor() {
    // WCAG 2.1 contrast ratio requirements
    this.contrastRequirements = {
      AA: {
        normal: 4.5,
        large: 3.0
      },
      AAA: {
        normal: 7.0,
        large: 4.5
      }
    };

    // Large text is 18pt (24px) or 14pt (18.66px) bold
    this.largeTextThreshold = {
      normal: 24,
      bold: 18.66
    };
  }

  /**
   * Convert hex color to RGB
   * @param {string} hex - Hex color code
   * @returns {Object} RGB values
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * Convert RGB to hex
   * @param {number} r - Red value
   * @param {number} g - Green value
   * @param {number} b - Blue value
   * @returns {string} Hex color
   */
  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  /**
   * Calculate relative luminance
   * @param {Object} rgb - RGB color values
   * @returns {number} Relative luminance
   */
  getRelativeLuminance(rgb) {
    const { r, g, b } = rgb;
    
    // Convert to sRGB
    const rsRGB = r / 255;
    const gsRGB = g / 255;
    const bsRGB = b / 255;

    // Apply gamma correction
    const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
    const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
    const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

    // Calculate luminance
    return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
  }

  /**
   * Calculate contrast ratio between two colors
   * @param {string} foreground - Foreground color
   * @param {string} background - Background color
   * @returns {number} Contrast ratio
   */
  getContrastRatio(foreground, background) {
    const fgRgb = this.hexToRgb(foreground);
    const bgRgb = this.hexToRgb(background);

    if (!fgRgb || !bgRgb) {
      throw new Error('Invalid color format');
    }

    const fgLuminance = this.getRelativeLuminance(fgRgb);
    const bgLuminance = this.getRelativeLuminance(bgRgb);

    // Ensure lighter color is in numerator
    const lighter = Math.max(fgLuminance, bgLuminance);
    const darker = Math.min(fgLuminance, bgLuminance);

    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Check if contrast meets WCAG requirements
   * @param {string} foreground - Foreground color
   * @param {string} background - Background color
   * @param {string} level - 'AA' or 'AAA'
   * @param {boolean} isLargeText - Whether text is large
   * @returns {Object} Compliance result
   */
  check(foreground, background, level = 'AA', isLargeText = false) {
    const ratio = this.getContrastRatio(foreground, background);
    const textSize = isLargeText ? 'large' : 'normal';
    const requiredRatio = this.contrastRequirements[level][textSize];
    const passes = ratio >= requiredRatio;

    return {
      ratio: Math.round(ratio * 100) / 100,
      requiredRatio,
      passes,
      level,
      textSize,
      message: passes 
        ? `Contrast ratio ${ratio.toFixed(2)}:1 meets WCAG ${level} standards for ${textSize} text`
        : `Contrast ratio ${ratio.toFixed(2)}:1 fails WCAG ${level} standards for ${textSize} text (requires ${requiredRatio}:1)`
    };
  }

  /**
   * Suggest accessible color alternatives
   * @param {string} foreground - Foreground color
   * @param {string} background - Background color
   * @param {string} level - 'AA' or 'AAA'
   * @param {boolean} isLargeText - Whether text is large
   * @returns {Object} Suggested colors
   */
  suggest(foreground, background, level = 'AA', isLargeText = false) {
    const currentCheck = this.check(foreground, background, level, isLargeText);
    
    if (currentCheck.passes) {
      return {
        foreground,
        background,
        message: 'Current colors already meet accessibility standards'
      };
    }

    const textSize = isLargeText ? 'large' : 'normal';
    const requiredRatio = this.contrastRequirements[level][textSize];

    // Try adjusting foreground color
    const suggestedForeground = this.adjustColorForContrast(
      foreground,
      background,
      requiredRatio,
      'foreground'
    );

    // Try adjusting background color
    const suggestedBackground = this.adjustColorForContrast(
      background,
      foreground,
      requiredRatio,
      'background'
    );

    return {
      current: {
        foreground,
        background,
        ratio: currentCheck.ratio
      },
      suggestions: [
        {
          type: 'adjust_foreground',
          foreground: suggestedForeground,
          background,
          ratio: this.getContrastRatio(suggestedForeground, background)
        },
        {
          type: 'adjust_background',
          foreground,
          background: suggestedBackground,
          ratio: this.getContrastRatio(foreground, suggestedBackground)
        }
      ],
      requiredRatio
    };
  }

  /**
   * Adjust color to meet contrast requirements
   * @param {string} colorToAdjust - Color to adjust
   * @param {string} fixedColor - Fixed color
   * @param {number} targetRatio - Target contrast ratio
   * @param {string} adjustType - 'foreground' or 'background'
   * @returns {string} Adjusted color
   */
  adjustColorForContrast(colorToAdjust, fixedColor, targetRatio, adjustType) {
    const rgb = this.hexToRgb(colorToAdjust);
    const fixedRgb = this.hexToRgb(fixedColor);
    const fixedLuminance = this.getRelativeLuminance(fixedRgb);

    // Determine if we need to lighten or darken
    const currentLuminance = this.getRelativeLuminance(rgb);
    const needsLightening = currentLuminance < fixedLuminance;

    let adjustedRgb = { ...rgb };
    let step = needsLightening ? 1 : -1;
    let iterations = 0;
    const maxIterations = 255;

    while (iterations < maxIterations) {
      // Adjust RGB values
      adjustedRgb.r = Math.max(0, Math.min(255, adjustedRgb.r + step));
      adjustedRgb.g = Math.max(0, Math.min(255, adjustedRgb.g + step));
      adjustedRgb.b = Math.max(0, Math.min(255, adjustedRgb.b + step));

      const newRatio = this.getContrastRatio(
        this.rgbToHex(adjustedRgb.r, adjustedRgb.g, adjustedRgb.b),
        fixedColor
      );

      if (newRatio >= targetRatio) {
        break;
      }

      iterations++;
    }

    return this.rgbToHex(adjustedRgb.r, adjustedRgb.g, adjustedRgb.b);
  }

  /**
   * Audit page for color contrast issues
   * @param {HTMLElement} container - Container to audit
   * @returns {Promise<Object>} Audit results
   */
  async auditPage(container) {
    const results = {
      passed: [],
      warnings: [],
      errors: []
    };

    try {
      const elements = container.querySelectorAll('*');
      
      for (const element of elements) {
        const computedStyle = window.getComputedStyle(element);
        const color = computedStyle.color;
        const backgroundColor = this.getEffectiveBackgroundColor(element);
        
        if (color && backgroundColor && color !== 'rgba(0, 0, 0, 0)') {
          const fontSize = parseFloat(computedStyle.fontSize);
          const fontWeight = computedStyle.fontWeight;
          const isLargeText = this.isLargeText(fontSize, fontWeight);
          
          // Convert CSS colors to hex
          const fgHex = this.cssColorToHex(color);
          const bgHex = this.cssColorToHex(backgroundColor);
          
          if (fgHex && bgHex) {
            const check = this.check(fgHex, bgHex, 'AA', isLargeText);
            
            if (check.passes) {
              results.passed.push({
                element: element.tagName,
                selector: this.getSelector(element),
                ratio: check.ratio
              });
            } else {
              results.errors.push({
                type: 'color_contrast',
                element: element.tagName,
                selector: this.getSelector(element),
                message: check.message,
                ratio: check.ratio,
                requiredRatio: check.requiredRatio,
                suggestion: this.suggest(fgHex, bgHex, 'AA', isLargeText)
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Color contrast audit error:', error);
      results.errors.push({
        type: 'audit_error',
        message: error.message
      });
    }

    return results;
  }

  /**
   * Get effective background color (traversing up if transparent)
   * @param {HTMLElement} element - Element to check
   * @returns {string} Background color
   */
  getEffectiveBackgroundColor(element) {
    let currentElement = element;
    
    while (currentElement) {
      const bgColor = window.getComputedStyle(currentElement).backgroundColor;
      
      if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
        return bgColor;
      }
      
      currentElement = currentElement.parentElement;
    }
    
    // Default to white if no background found
    return '#ffffff';
  }

  /**
   * Check if text is considered large per WCAG
   * @param {number} fontSize - Font size in pixels
   * @param {string} fontWeight - Font weight
   * @returns {boolean} Is large text
   */
  isLargeText(fontSize, fontWeight) {
    const isBold = parseInt(fontWeight) >= 700 || fontWeight === 'bold';
    return fontSize >= this.largeTextThreshold.normal || 
           (isBold && fontSize >= this.largeTextThreshold.bold);
  }

  /**
   * Convert CSS color to hex
   * @param {string} cssColor - CSS color value
   * @returns {string} Hex color
   */
  cssColorToHex(cssColor) {
    // Handle hex colors
    if (cssColor.startsWith('#')) {
      return cssColor;
    }

    // Handle rgb/rgba
    const rgbMatch = cssColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      return this.rgbToHex(
        parseInt(rgbMatch[1]),
        parseInt(rgbMatch[2]),
        parseInt(rgbMatch[3])
      );
    }

    // Handle named colors (simplified - would need full map)
    const namedColors = {
      white: '#ffffff',
      black: '#000000',
      red: '#ff0000',
      green: '#008000',
      blue: '#0000ff',
      // Add more as needed
    };

    return namedColors[cssColor.toLowerCase()] || null;
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
   * Apply color blind filter simulation
   * @param {string} color - Original color
   * @param {string} type - Type of color blindness
   * @returns {string} Simulated color
   */
  simulateColorBlindness(color, type) {
    const rgb = this.hexToRgb(color);
    let adjusted = { ...rgb };

    switch (type) {
      case 'protanopia': // Red-blind
        adjusted.r = 0.567 * rgb.r + 0.433 * rgb.g;
        adjusted.g = 0.558 * rgb.r + 0.442 * rgb.g;
        adjusted.b = 0.242 * rgb.g + 0.758 * rgb.b;
        break;
      
      case 'deuteranopia': // Green-blind
        adjusted.r = 0.625 * rgb.r + 0.375 * rgb.g;
        adjusted.g = 0.7 * rgb.r + 0.3 * rgb.g;
        adjusted.b = 0.3 * rgb.g + 0.7 * rgb.b;
        break;
      
      case 'tritanopia': // Blue-blind
        adjusted.r = 0.95 * rgb.r + 0.05 * rgb.g;
        adjusted.g = 0.433 * rgb.g + 0.567 * rgb.b;
        adjusted.b = 0.475 * rgb.g + 0.525 * rgb.b;
        break;
    }

    // Ensure values are within bounds
    adjusted.r = Math.round(Math.max(0, Math.min(255, adjusted.r)));
    adjusted.g = Math.round(Math.max(0, Math.min(255, adjusted.g)));
    adjusted.b = Math.round(Math.max(0, Math.min(255, adjusted.b)));

    return this.rgbToHex(adjusted.r, adjusted.g, adjusted.b);
  }
}

module.exports = new ColorContrastChecker();