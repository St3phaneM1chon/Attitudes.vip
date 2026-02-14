/**
 * Accessible Button Component
 * Fully WCAG 2.1 AA compliant button with keyboard and screen reader support
 */

import React, { useRef, useEffect } from 'react';
import { useAccessibility } from './AccessibilityProvider';

const AccessibleButton = ({
  children,
  onClick,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  ariaLabel,
  ariaPressed,
  ariaExpanded,
  ariaControls,
  ariaDescribedBy,
  tooltip,
  shortcutKey,
  className = '',
  ...props
}) => {
  const buttonRef = useRef(null);
  const { announce, settings } = useAccessibility();

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!shortcutKey || disabled) return;

    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === shortcutKey) {
        e.preventDefault();
        buttonRef.current?.click();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcutKey, disabled]);

  // Handle click with announcements
  const handleClick = (e) => {
    if (disabled || loading) {
      e.preventDefault();
      return;
    }

    // Announce action for screen readers
    if (loading) {
      announce('Processing, please wait', 'polite');
    }

    if (onClick) {
      onClick(e);
    }
  };

  // Determine button classes
  const getButtonClasses = () => {
    const classes = ['accessible-button'];
    
    // Variant classes
    const variantClasses = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
      secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
      ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500'
    };
    
    classes.push(variantClasses[variant] || variantClasses.primary);
    
    // Size classes
    const sizeClasses = {
      small: 'px-3 py-1.5 text-sm',
      medium: 'px-4 py-2 text-base',
      large: 'px-6 py-3 text-lg'
    };
    
    classes.push(sizeClasses[size] || sizeClasses.medium);
    
    // State classes
    if (disabled) {
      classes.push('opacity-50 cursor-not-allowed');
    } else {
      classes.push('cursor-pointer');
    }
    
    if (loading) {
      classes.push('relative');
    }
    
    // Focus classes
    classes.push('focus:outline-none focus:ring-2 focus:ring-offset-2');
    
    // Reduced motion
    if (!settings.reducedMotion) {
      classes.push('transition-all duration-200');
    }
    
    // High contrast mode
    if (settings.highContrastMode) {
      classes.push('border-2 border-current');
    }
    
    // Custom classes
    if (className) {
      classes.push(className);
    }
    
    return classes.join(' ');
  };

  // Build ARIA attributes
  const ariaAttributes = {
    'aria-label': ariaLabel || null,
    'aria-pressed': ariaPressed !== undefined ? ariaPressed.toString() : null,
    'aria-expanded': ariaExpanded !== undefined ? ariaExpanded.toString() : null,
    'aria-controls': ariaControls || null,
    'aria-describedby': ariaDescribedBy || null,
    'aria-busy': loading ? 'true' : null,
    'aria-disabled': disabled ? 'true' : null
  };

  // Remove null attributes
  Object.keys(ariaAttributes).forEach(key => {
    if (ariaAttributes[key] === null) {
      delete ariaAttributes[key];
    }
  });

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={handleClick}
        className={getButtonClasses()}
        {...ariaAttributes}
        {...props}
      >
        {loading && (
          <span
            className="absolute inset-0 flex items-center justify-center"
            aria-hidden="true"
          >
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </span>
        )}
        
        <span className={loading ? 'opacity-0' : ''}>
          {children}
        </span>
      </button>
      
      {/* Tooltip for keyboard shortcut */}
      {shortcutKey && !disabled && (
        <span className="sr-only">
          Keyboard shortcut: {navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}+{shortcutKey.toUpperCase()}
        </span>
      )}
      
      {/* Custom tooltip */}
      {tooltip && (
        <span
          role="tooltip"
          id={`tooltip-${Date.now()}`}
          className="sr-only"
        >
          {tooltip}
        </span>
      )}
    </>
  );
};

export default AccessibleButton;