import React from 'react';
import { Loader2, LucideIcon } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'outline' | 'neon' | 'outline-neon';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  fullWidth?: boolean;
  /** Auto-shrink button on mobile screens */
  responsive?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-brand-dark-green text-white
    hover:bg-brand-muted-green hover:shadow-lg
    focus:ring-brand-neon-green
    active:bg-brand-muted-green
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
  `,
  neon: `
    bg-brand-neon-green text-brand-dark-green
    hover:brightness-110 hover:shadow-neon
    focus:ring-brand-neon-green
    active:brightness-110
    font-semibold
  `,
  'outline-neon': `
    bg-transparent text-brand-neon-green border border-brand-neon-green
    hover:bg-brand-neon-green hover:text-brand-dark-green hover:shadow-neon
    focus:ring-brand-neon-green
    font-semibold
  `
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'px-2 py-1 text-xs min-h-[32px]',
  sm: 'px-3 py-1.5 text-sm min-h-[36px]',
  md: 'px-4 py-2 text-sm sm:text-base min-h-[44px]',
  lg: 'px-4 sm:px-6 py-2.5 sm:py-3 text-base sm:text-lg min-h-[44px]'
};

// Responsive size mapping: size on mobile -> size on desktop
const responsiveSizeStyles: Record<ButtonSize, string> = {
  xs: 'px-2 py-1 text-xs min-h-[32px]',
  sm: 'px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm min-h-[32px] sm:min-h-[36px]',
  md: 'px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-base min-h-[36px] sm:min-h-[44px]',
  lg: 'px-3 py-2 text-sm sm:px-6 sm:py-3 sm:text-lg min-h-[40px] sm:min-h-[44px]'
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
      responsive = false,
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
    const currentSizeStyles = responsive ? responsiveSizeStyles[size] : sizeStyles[size];

    // Responsive icon sizing
    const iconSizeClass = responsive
      ? 'h-3 w-3 sm:h-4 sm:w-4'
      : 'h-4 w-4';

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          ${baseStyles}
          ${variantStyles[variant]}
          ${currentSizeStyles}
          ${widthStyles}
          ${className}
        `}
        {...props}
      >
        {loading && <Loader2 className={`${iconSizeClass} mr-2 animate-spin`} />}
        {!loading && Icon && iconPosition === 'left' && (
          <Icon className={`${iconSizeClass} ${children ? 'mr-1 sm:mr-2' : ''}`} />
        )}
        {children}
        {!loading && Icon && iconPosition === 'right' && (
          <Icon className={`${iconSizeClass} ${children ? 'ml-1 sm:ml-2' : ''}`} />
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
