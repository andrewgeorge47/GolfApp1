import React from 'react';
import { X, LucideIcon } from 'lucide-react';

export type BadgeVariant = 'default' | 'brand' | 'success' | 'warning' | 'error' | 'info';
export type BadgeSize = 'sm' | 'md' | 'lg';
export type BadgeStyle = 'solid' | 'subtle' | 'outlined';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: BadgeStyle;
  dot?: boolean;
  icon?: LucideIcon;
  onRemove?: () => void;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, Record<BadgeStyle, string>> = {
  default: {
    solid: 'bg-gray-600 text-white',
    subtle: 'bg-gray-100 text-gray-700 border border-gray-200',
    outlined: 'bg-transparent text-gray-700 border-2 border-gray-300'
  },
  brand: {
    solid: 'bg-brand-dark-green text-white',
    subtle: 'bg-brand-sage-green/10 text-brand-dark-green border border-brand-sage-green/20',
    outlined: 'bg-transparent text-brand-dark-green border-2 border-brand-dark-green'
  },
  success: {
    solid: 'bg-success-600 text-white',
    subtle: 'bg-success-50 text-success-700 border border-success-200',
    outlined: 'bg-transparent text-success-700 border-2 border-success-500'
  },
  warning: {
    solid: 'bg-warning-600 text-white',
    subtle: 'bg-warning-50 text-warning-700 border border-warning-200',
    outlined: 'bg-transparent text-warning-700 border-2 border-warning-500'
  },
  error: {
    solid: 'bg-error-600 text-white',
    subtle: 'bg-error-50 text-error-700 border border-error-200',
    outlined: 'bg-transparent text-error-700 border-2 border-error-500'
  },
  info: {
    solid: 'bg-info-600 text-white',
    subtle: 'bg-info-50 text-info-700 border border-info-200',
    outlined: 'bg-transparent text-info-700 border-2 border-info-500'
  }
};

const sizeStyles: Record<BadgeSize, { badge: string; icon: string; dot: string }> = {
  sm: {
    badge: 'px-2 py-0.5 text-xs',
    icon: 'h-3 w-3',
    dot: 'h-1.5 w-1.5'
  },
  md: {
    badge: 'px-2.5 py-1 text-sm',
    icon: 'h-3.5 w-3.5',
    dot: 'h-2 w-2'
  },
  lg: {
    badge: 'px-3 py-1.5 text-base',
    icon: 'h-4 w-4',
    dot: 'h-2.5 w-2.5'
  }
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-gray-400',
  brand: 'bg-brand-neon-green',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  error: 'bg-error-500',
  info: 'bg-info-500'
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = 'default',
      size = 'md',
      style = 'subtle',
      dot = false,
      icon: Icon,
      onRemove,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      inline-flex items-center gap-1.5
      font-medium rounded-full
      transition-all duration-200
    `;

    const sizes = sizeStyles[size];

    return (
      <span
        ref={ref}
        className={`
          ${baseStyles}
          ${variantStyles[variant][style]}
          ${sizes.badge}
          ${className}
        `}
        {...props}
      >
        {dot && (
          <span className={`${sizes.dot} ${dotColors[variant]} rounded-full`} />
        )}
        {Icon && <Icon className={sizes.icon} />}
        {children}
        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="ml-0.5 hover:opacity-70 transition-opacity focus:outline-none"
            aria-label="Remove"
          >
            <X className={sizes.icon} />
          </button>
        )}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

// Status Badge - Specialized badge for common status indicators
export type StatusType =
  | 'active'
  | 'inactive'
  | 'pending'
  | 'completed'
  | 'in_progress'
  | 'cancelled'
  | 'draft'
  | 'verified'
  | 'disputed';

export interface StatusBadgeProps extends Omit<BadgeProps, 'variant' | 'children'> {
  status: StatusType;
}

const statusConfig: Record<StatusType, { variant: BadgeVariant; label: string; dot: boolean }> = {
  active: { variant: 'success', label: 'Active', dot: true },
  inactive: { variant: 'default', label: 'Inactive', dot: false },
  pending: { variant: 'warning', label: 'Pending', dot: true },
  completed: { variant: 'success', label: 'Completed', dot: false },
  in_progress: { variant: 'info', label: 'In Progress', dot: true },
  cancelled: { variant: 'error', label: 'Cancelled', dot: false },
  draft: { variant: 'default', label: 'Draft', dot: false },
  verified: { variant: 'success', label: 'Verified', dot: false },
  disputed: { variant: 'error', label: 'Disputed', dot: true }
};

export const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, ...props }, ref) => {
    const config = statusConfig[status];

    return (
      <Badge
        ref={ref}
        variant={config.variant}
        dot={config.dot}
        {...props}
      >
        {config.label}
      </Badge>
    );
  }
);

StatusBadge.displayName = 'StatusBadge';

// Count Badge - Specialized badge for numerical counts
export interface CountBadgeProps extends Omit<BadgeProps, 'children'> {
  count: number;
  max?: number;
  showZero?: boolean;
}

export const CountBadge = React.forwardRef<HTMLSpanElement, CountBadgeProps>(
  ({ count, max, showZero = false, ...props }, ref) => {
    if (count === 0 && !showZero) {
      return null;
    }

    const displayCount = max && count > max ? `${max}+` : count.toString();

    return (
      <Badge
        ref={ref}
        style="solid"
        size="sm"
        {...props}
      >
        {displayCount}
      </Badge>
    );
  }
);

CountBadge.displayName = 'CountBadge';
