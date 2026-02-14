/**
 * Modal - Composant de modal réutilisable
 * Support de différentes tailles et animations
 */

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'default',
  closeOnOverlay = true,
  closeOnEsc = true,
  showCloseButton = true,
  className = '',
  animate = true
}) => {
  const modalRef = useRef(null);

  const sizeClasses = {
    small: 'max-w-md',
    default: 'max-w-lg',
    large: 'max-w-2xl',
    xlarge: 'max-w-4xl',
    full: 'max-w-full mx-4'
  };

  // Gérer la fermeture avec Escape
  useEffect(() => {
    if (!closeOnEsc || !isOpen) return;

    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose, closeOnEsc]);

  // Gérer le focus trap
  useEffect(() => {
    if (!isOpen) return;

    const modalElement = modalRef.current;
    if (!modalElement) return;

    // Focus le premier élément focusable
    const focusableElements = modalElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // Empêcher le scroll du body
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (closeOnOverlay && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-50 overflow-y-auto ${
          animate ? 'transition-opacity duration-300' : ''
        }`}
        onClick={handleOverlayClick}
      >
        <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
          {/* Background overlay */}
          <div 
            className={`fixed inset-0 bg-gray-500 bg-opacity-75 ${
              animate ? 'transition-opacity' : ''
            }`}
          />

          {/* Modal panel */}
          <div
            ref={modalRef}
            className={`
              relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl
              ${animate ? 'transition-all duration-300' : ''}
              ${sizeClasses[size]}
              w-full
              ${className}
            `}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  {title && (
                    <h3 className="text-lg font-semibold text-gray-900">
                      {title}
                    </h3>
                  )}
                  
                  {showCloseButton && (
                    <button
                      onClick={onClose}
                      className="ml-auto rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Content */}
            <div className="px-6 py-4">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// Composant pour le footer avec boutons standards
export const ModalFooter = ({ 
  onCancel, 
  onConfirm, 
  cancelText = 'Annuler',
  confirmText = 'Confirmer',
  confirmVariant = 'primary',
  loading = false,
  children
}) => {
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white'
  };

  if (children) return children;

  return (
    <div className="flex justify-end space-x-3">
      <button
        type="button"
        onClick={onCancel}
        disabled={loading}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {cancelText}
      </button>
      
      <button
        type="button"
        onClick={onConfirm}
        disabled={loading}
        className={`
          px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2
          ${variantClasses[confirmVariant]}
          disabled:opacity-50 disabled:cursor-not-allowed
          ${loading ? 'cursor-wait' : ''}
        `}
      >
        {loading ? (
          <span className="flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Chargement...
          </span>
        ) : confirmText}
      </button>
    </div>
  );
};

export default Modal;