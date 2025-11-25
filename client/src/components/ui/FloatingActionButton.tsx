import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface FloatingActionButtonProps {
  onClick: () => void;
  icon: LucideIcon;
  label?: string;
  title?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const variantStyles = {
  primary: 'bg-brand-dark-green hover:bg-brand-muted-green',
  secondary: 'bg-gray-600 hover:bg-gray-700',
  success: 'bg-green-600 hover:bg-green-700',
  warning: 'bg-yellow-600 hover:bg-yellow-700',
  danger: 'bg-red-600 hover:bg-red-700',
};

const sizeStyles = {
  sm: 'w-12 h-12',
  md: 'w-14 h-14',
  lg: 'w-16 h-16',
};

const iconSizeStyles = {
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-7 h-7',
};

const positionStyles = {
  'bottom-right': 'bottom-6 right-6',
  'bottom-left': 'bottom-6 left-6',
  'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
};

/**
 * FloatingActionButton (FAB) - A circular floating button for primary actions
 *
 * Usage:
 * ```tsx
 * <FloatingActionButton
 *   icon={Plus}
 *   onClick={handleAdd}
 *   label="Add new item"
 *   variant="primary"
 *   position="bottom-right"
 * />
 * ```
 */
export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onClick,
  icon: Icon,
  label,
  title,
  variant = 'primary',
  position = 'bottom-right',
  size = 'md',
  className = '',
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        fixed z-50
        ${positionStyles[position]}
        ${sizeStyles[size]}
        ${variantStyles[variant]}
        text-white rounded-full shadow-lg
        hover:shadow-xl transition-all duration-200
        active:scale-95
        flex items-center justify-center
        ${className}
      `}
      aria-label={label || title || 'Action button'}
      title={title || label}
    >
      <Icon className={iconSizeStyles[size]} />
    </button>
  );
};

/**
 * CircleButton - A circular button (non-floating version)
 * Perfect for bay selectors, pagination, etc.
 *
 * Usage:
 * ```tsx
 * <CircleButton
 *   active={selected}
 *   onClick={() => handleSelect(1)}
 *   size="md"
 * >
 *   1
 * </CircleButton>
 * ```
 */
export interface CircleButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
}

const circleVariantStyles = {
  primary: {
    active: 'bg-white text-brand-dark-green',
    inactive: 'bg-white/20 text-white hover:bg-white/30',
  },
  secondary: {
    active: 'bg-brand-dark-green text-white',
    inactive: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  },
  outline: {
    active: 'bg-brand-dark-green text-white border-2 border-brand-dark-green',
    inactive: 'bg-white text-gray-700 border-2 border-gray-300 hover:border-gray-400',
  },
};

const circleSizeStyles = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
};

export const CircleButton: React.FC<CircleButtonProps> = ({
  children,
  onClick,
  active = false,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
}) => {
  const variantClasses = active
    ? circleVariantStyles[variant].active
    : circleVariantStyles[variant].inactive;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${circleSizeStyles[size]}
        ${variantClasses}
        rounded-full font-medium transition-colors
        flex items-center justify-center
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {children}
    </button>
  );
};
