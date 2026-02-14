/**
 * Input - Composant d'input réutilisable avec validation
 * Support de différents types et états
 */

import React, { forwardRef } from 'react';
import { AlertCircle, Check, Eye, EyeOff } from 'lucide-react';

const Input = forwardRef(({
  label,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  error,
  success,
  helperText,
  required = false,
  disabled = false,
  readOnly = false,
  icon: Icon,
  rightIcon: RightIcon,
  onRightIconClick,
  size = 'default',
  variant = 'default',
  className = '',
  containerClassName = '',
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = React.useState(false);

  const sizeClasses = {
    small: 'px-3 py-1.5 text-sm',
    default: 'px-4 py-2',
    large: 'px-4 py-3 text-lg'
  };

  const variantClasses = {
    default: `
      border-gray-300 
      focus:ring-blue-500 focus:border-blue-500
      disabled:bg-gray-50 disabled:text-gray-500
    `,
    error: `
      border-red-300 text-red-900 placeholder-red-300
      focus:ring-red-500 focus:border-red-500
    `,
    success: `
      border-green-300 text-green-900 placeholder-green-300
      focus:ring-green-500 focus:border-green-500
    `
  };

  const inputType = type === 'password' && showPassword ? 'text' : type;
  const currentVariant = error ? 'error' : success ? 'success' : variant;

  const handlePasswordToggle = () => {
    setShowPassword(!showPassword);
  };

  const PasswordToggleIcon = showPassword ? EyeOff : Eye;

  return (
    <div className={containerClassName}>
      {label && (
        <label
          htmlFor={name}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className={`h-5 w-5 ${
              currentVariant === 'error' ? 'text-red-400' :
              currentVariant === 'success' ? 'text-green-400' :
              'text-gray-400'
            }`} />
          </div>
        )}

        <input
          ref={ref}
          type={inputType}
          name={name}
          id={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          className={`
            block w-full rounded-md border shadow-sm
            ${sizeClasses[size]}
            ${variantClasses[currentVariant]}
            ${Icon ? 'pl-10' : ''}
            ${type === 'password' || RightIcon ? 'pr-10' : ''}
            ${disabled ? 'cursor-not-allowed' : ''}
            ${readOnly ? 'cursor-default' : ''}
            transition-colors duration-200
            ${className}
          `}
          {...props}
        />

        {/* Icône de droite ou toggle password */}
        {(type === 'password' || RightIcon) && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {type === 'password' ? (
              <button
                type="button"
                onClick={handlePasswordToggle}
                className="text-gray-400 hover:text-gray-500 focus:outline-none focus:text-gray-500"
                tabIndex={-1}
              >
                <PasswordToggleIcon className="h-5 w-5" />
              </button>
            ) : RightIcon ? (
              onRightIconClick ? (
                <button
                  type="button"
                  onClick={onRightIconClick}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none focus:text-gray-500"
                  tabIndex={-1}
                >
                  <RightIcon className="h-5 w-5" />
                </button>
              ) : (
                <RightIcon className="h-5 w-5 text-gray-400" />
              )
            ) : null}
          </div>
        )}

        {/* Indicateurs de validation */}
        {(error || success) && !type.includes('password') && !RightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {error && <AlertCircle className="h-5 w-5 text-red-400" />}
            {success && <Check className="h-5 w-5 text-green-400" />}
          </div>
        )}
      </div>

      {/* Message d'aide ou d'erreur */}
      {(error || success || helperText) && (
        <p className={`mt-1 text-sm ${
          error ? 'text-red-600' :
          success ? 'text-green-600' :
          'text-gray-500'
        }`}>
          {error || success || helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

// Composant TextArea utilisant les mêmes styles
export const TextArea = forwardRef(({
  label,
  name,
  value,
  onChange,
  placeholder,
  error,
  success,
  helperText,
  required = false,
  disabled = false,
  readOnly = false,
  rows = 4,
  maxLength,
  showCount = false,
  size = 'default',
  className = '',
  containerClassName = '',
  ...props
}, ref) => {
  const sizeClasses = {
    small: 'px-3 py-1.5 text-sm',
    default: 'px-4 py-2',
    large: 'px-4 py-3 text-lg'
  };

  const variantClasses = error ? `
    border-red-300 text-red-900 placeholder-red-300
    focus:ring-red-500 focus:border-red-500
  ` : success ? `
    border-green-300 text-green-900 placeholder-green-300
    focus:ring-green-500 focus:border-green-500
  ` : `
    border-gray-300 
    focus:ring-blue-500 focus:border-blue-500
    disabled:bg-gray-50 disabled:text-gray-500
  `;

  return (
    <div className={containerClassName}>
      {label && (
        <label
          htmlFor={name}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <textarea
          ref={ref}
          name={name}
          id={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          rows={rows}
          maxLength={maxLength}
          className={`
            block w-full rounded-md border shadow-sm resize-none
            ${sizeClasses[size]}
            ${variantClasses}
            ${disabled ? 'cursor-not-allowed' : ''}
            ${readOnly ? 'cursor-default' : ''}
            transition-colors duration-200
            ${className}
          `}
          {...props}
        />

        {showCount && maxLength && (
          <div className="absolute bottom-2 right-2 text-xs text-gray-400">
            {value?.length || 0}/{maxLength}
          </div>
        )}
      </div>

      {/* Message d'aide ou d'erreur */}
      {(error || success || helperText) && (
        <p className={`mt-1 text-sm ${
          error ? 'text-red-600' :
          success ? 'text-green-600' :
          'text-gray-500'
        }`}>
          {error || success || helperText}
        </p>
      )}
    </div>
  );
});

TextArea.displayName = 'TextArea';

export default Input;