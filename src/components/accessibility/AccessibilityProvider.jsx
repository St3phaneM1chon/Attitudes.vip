/**
 * Accessibility Provider Component
 * Provides accessibility context and utilities to child components
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import accessibilityService from '../../services/accessibility';

const AccessibilityContext = createContext();

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
};

const AccessibilityProvider = ({ children, options = {} }) => {
  const [settings, setSettings] = useState(accessibilityService.getSettings());
  const [announcements, setAnnouncements] = useState([]);
  const [isScreenReaderActive, setIsScreenReaderActive] = useState(false);

  useEffect(() => {
    // Initialize accessibility service
    accessibilityService.initialize();

    // Listen for settings changes
    const handleSettingsChange = (newSettings) => {
      setSettings(newSettings);
    };

    accessibilityService.on('settingsChanged', handleSettingsChange);

    // Detect screen reader
    detectScreenReader();

    // Cleanup
    return () => {
      accessibilityService.off('settingsChanged', handleSettingsChange);
    };
  }, []);

  // Detect if screen reader is active
  const detectScreenReader = () => {
    // Check for common screen reader indicators
    const indicators = [
      // NVDA
      window.navigator.userAgent.includes('NVDA'),
      // JAWS
      window.navigator.userAgent.includes('JAWS'),
      // VoiceOver
      window.navigator.platform.includes('Mac') && window.speechSynthesis,
      // Check for aria-live regions being monitored
      document.querySelector('[aria-live]') !== null
    ];

    setIsScreenReaderActive(indicators.some(indicator => indicator));
  };

  // Announce message to screen readers
  const announce = (message, priority = 'polite') => {
    accessibilityService.announce(message, priority);
    setAnnouncements(prev => [...prev, { message, priority, timestamp: Date.now() }]);
  };

  // Announce page change
  const announcePageChange = (pageTitle, options = {}) => {
    accessibilityService.announcePageChange(pageTitle, options);
  };

  // Check color contrast
  const checkContrast = (foreground, background, level = 'AA') => {
    return accessibilityService.checkColorContrast(foreground, background, level);
  };

  // Manage focus
  const manageFocus = (container, options = {}) => {
    return accessibilityService.manageFocus(container, options);
  };

  // Trap focus (for modals)
  const trapFocus = (container) => {
    return accessibilityService.trapFocus(container);
  };

  // Release focus trap
  const releaseFocusTrap = (container) => {
    return accessibilityService.releaseFocusTrap(container);
  };

  // Update settings
  const updateSettings = (newSettings) => {
    accessibilityService.updateSettings(newSettings);
  };

  // Run accessibility audit
  const runAudit = async (container) => {
    return await accessibilityService.runAccessibilityAudit(container);
  };

  // Get font size class
  const getFontSizeClass = () => {
    const sizeMap = {
      'small': 'text-sm',
      'normal': 'text-base',
      'large': 'text-lg',
      'extra-large': 'text-xl'
    };
    return sizeMap[settings.fontSize] || 'text-base';
  };

  // Get color blind filter class
  const getColorBlindClass = () => {
    if (!settings.colorBlindMode) return '';
    return `color-blind-${settings.colorBlindMode}`;
  };

  // Context value
  const value = {
    settings,
    isScreenReaderActive,
    announce,
    announcePageChange,
    checkContrast,
    manageFocus,
    trapFocus,
    releaseFocusTrap,
    updateSettings,
    runAudit,
    getFontSizeClass,
    getColorBlindClass,
    highContrastMode: settings.highContrastMode,
    reducedMotion: settings.reducedMotion,
    keyboardNavigationMode: settings.keyboardNavigationMode
  };

  // Apply global classes based on settings
  useEffect(() => {
    const classes = [];
    
    if (settings.highContrastMode) classes.push('high-contrast');
    if (settings.reducedMotion) classes.push('reduced-motion');
    if (settings.keyboardNavigationMode) classes.push('keyboard-navigation');
    if (settings.screenReaderMode) classes.push('screen-reader-mode');
    if (settings.colorBlindMode) classes.push(getColorBlindClass());
    
    // Apply font size
    classes.push(getFontSizeClass());
    
    // Update body classes
    document.body.className = classes.join(' ');
  }, [settings]);

  return (
    <AccessibilityContext.Provider value={value}>
      <div className="accessibility-provider">
        {/* Screen reader announcements */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {announcements.slice(-1).map((announcement, index) => (
            <span key={announcement.timestamp}>{announcement.message}</span>
          ))}
        </div>
        
        {children}
      </div>
    </AccessibilityContext.Provider>
  );
};

export default AccessibilityProvider;