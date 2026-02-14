/**
 * Button - Composant bouton réutilisable
 * Support de différentes variantes, tailles et états
 */

import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'default',
  fullWidth = false,
  loading = false,
  disabled = false,
  type = 'button',
  icon: Icon,
  iconPosition = 'left',
  className = '',
  onClick,
  ...props
}, ref) => {
  const baseClasses = `
    inline-flex items-center justify-center font-medium rounded-md
    transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    warning: 'bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-500',
    info: 'bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
    link: 'bg-transparent text-blue-600 hover:text-blue-700 underline-offset-4 hover:underline focus:ring-blue-500',
    outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-500'
  };

  const sizeClasses = {
    small: 'px-3 py-1.5 text-sm',
    default: 'px-4 py-2 text-sm',
    large: 'px-6 py-3 text-base',
    xlarge: 'px-8 py-4 text-lg'
  };

  const iconSizeClasses = {
    small: 'h-4 w-4',
    default: 'h-5 w-5',
    large: 'h-6 w-6',
    xlarge: 'h-7 w-7'
  };

  const iconSpacingClasses = {
    small: 'space-x-1',
    default: 'space-x-2',
    large: 'space-x-2',
    xlarge: 'space-x-3'
  };

  const LoadingIcon = () => (
    <Loader2 className={`animate-spin ${iconSizeClasses[size]}`} />
  );

  const renderIcon = () => {
    if (loading) return <LoadingIcon />;
    if (Icon) return <Icon className={iconSizeClasses[size]} />;
    return null;
  };

  const buttonClasses = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${fullWidth ? 'w-full' : ''}
    ${(Icon || loading) && children ? iconSpacingClasses[size] : ''}
    ${className}
  `;

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={buttonClasses}
      {...props}
    >
      {iconPosition === 'left' && renderIcon()}
      {children}
      {iconPosition === 'right' && renderIcon()}
    </button>
  );
});

Button.displayName = 'Button';

// Composant ButtonGroup pour grouper des boutons
export const ButtonGroup = ({ children, className = '' }) => {
  return (
    <div className={`inline-flex rounded-md shadow-sm ${className}`}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;
        
        const isFirst = index === 0;
        const isLast = index === React.Children.count(children) - 1;
        
        return React.cloneElement(child, {
          className: `
            ${child.props.className || ''}
            ${!isFirst && '-ml-px'}
            ${isFirst ? 'rounded-r-none' : ''}
            ${isLast ? 'rounded-l-none' : ''}
            ${!isFirst && !isLast ? 'rounded-none' : ''}
            focus:z-10
          `
        });
      })}
    </div>
  );
};

// Composant IconButton pour les boutons avec seulement une icône
export const IconButton = forwardRef(({
  icon: Icon,
  variant = 'ghost',
  size = 'default',
  rounded = true,
  tooltip,
  className = '',
  ...props
}, ref) => {
  const iconButtonSizeClasses = {
    small: 'p-1',
    default: 'p-2',
    large: 'p-3',
    xlarge: 'p-4'
  };

  const iconSizes = {
    small: 'h-4 w-4',
    default: 'h-5 w-5',
    large: 'h-6 w-6',
    xlarge: 'h-7 w-7'
  };

  return (
    <Button
      ref={ref}
      variant={variant}
      className={`
        ${iconButtonSizeClasses[size]}
        ${rounded ? 'rounded-full' : ''}
        ${className}
      `}
      title={tooltip}
      {...props}
    >
      <Icon className={iconSizes[size]} />
    </Button>
  );
});

IconButton.displayName = 'IconButton';

export default Button;