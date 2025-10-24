import React from 'react';
import { Loader2, LucideIcon } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-brand-dark-green text-white
    hover:bg-brand-forest-green hover:shadow-lg
    focus:ring-brand-neon-green
    active:bg-brand-forest-green
  `,
  secondary: `
    bg-gray-100 text-gray-900
    hover:bg-gray-200
    focus:ring-gray-500
  `,
  success: `
    bg-success-600 text-white
    hover:bg-success-700 hover:shadow-lg
    focus:ring-success-500
  `,
  danger: `
    bg-error-600 text-white
    hover:bg-error-700 hover:shadow-lg
    focus:ring-error-500
  `,
  ghost: `
    bg-transparent text-gray-700
    hover:bg-gray-100
    focus:ring-gray-500
  `,
  outline: `
    bg-transparent text-brand-dark-green border-2 border-brand-dark-green
    hover:bg-brand-dark-green hover:text-white
    focus:ring-brand-neon-green
  `
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg'
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      icon: Icon,
      iconPosition = 'left',
      loading = false,
      disabled = false,
      fullWidth = false,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      inline-flex items-center justify-center
      font-medium rounded-lg
      transition-all duration-200 ease-out
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      hover:scale-[1.02] active:scale-[0.98]
    `;

    const widthStyles = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          ${baseStyles}
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${widthStyles}
          ${className}
        `}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {!loading && Icon && iconPosition === 'left' && (
          <Icon className={`h-4 w-4 ${children ? 'mr-2' : ''}`} />
        )}
        {children}
        {!loading && Icon && iconPosition === 'right' && (
          <Icon className={`h-4 w-4 ${children ? 'ml-2' : ''}`} />
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

// Icon-only button variant
export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'icon'> {
  icon: LucideIcon;
  'aria-label': string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon: Icon, variant = 'ghost', size = 'md', className = '', ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={`p-2 ${className}`}
        {...props}
      >
        <Icon className="h-5 w-5" />
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';
