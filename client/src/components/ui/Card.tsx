import React from 'react';

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'ghost';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  interactive?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<CardVariant, string> = {
  default: `
    bg-white border border-gray-200
  `,
  elevated: `
    bg-white shadow-md
  `,
  outlined: `
    bg-white border-2 border-brand-dark-green
  `,
  ghost: `
    bg-transparent
  `
};

const paddingStyles: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8'
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'md',
      interactive = false,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      rounded-xl
      transition-all duration-200
    `;

    const interactiveStyles = interactive
      ? 'hover:shadow-lg hover:-translate-y-0.5 cursor-pointer active:translate-y-0'
      : '';

    return (
      <div
        ref={ref}
        className={`
          ${baseStyles}
          ${variantStyles[variant]}
          ${paddingStyles[padding]}
          ${interactiveStyles}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Card Header Component
export interface CardHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ title, subtitle, action, children, className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex items-start justify-between mb-4 ${className}`}
        {...props}
      >
        <div className="flex-1">
          {title && (
            <h3 className="text-heading-md text-brand-black font-semibold">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-gray-600 mt-1">
              {subtitle}
            </p>
          )}
          {children}
        </div>
        {action && (
          <div className="flex-shrink-0 ml-4">
            {action}
          </div>
        )}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

// Card Content Component
export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardContent.displayName = 'CardContent';

// Card Footer Component
export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  divided?: boolean;
}

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ divided = false, className = '', children, ...props }, ref) => {
    const dividerStyles = divided ? 'border-t border-gray-200 pt-4 mt-4' : '';

    return (
      <div
        ref={ref}
        className={`flex items-center justify-end gap-3 ${dividerStyles} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

// Stat Card - Specialized card for displaying statistics
export interface StatCardProps extends Omit<CardProps, 'children'> {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  description?: string;
}

export const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  (
    {
      label,
      value,
      icon,
      trend,
      trendValue,
      description,
      variant = 'default',
      className = '',
      ...props
    },
    ref
  ) => {
    const trendColors = {
      up: 'text-success-600',
      down: 'text-error-600',
      neutral: 'text-gray-600'
    };

    return (
      <Card
        ref={ref}
        variant={variant}
        padding="md"
        className={className}
        {...props}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">{label}</p>
            <p className="text-3xl font-bold text-brand-black mt-2">{value}</p>
            {(trendValue || description) && (
              <div className="mt-2 flex items-center gap-2">
                {trendValue && trend && (
                  <span className={`text-sm font-medium ${trendColors[trend]}`}>
                    {trendValue}
                  </span>
                )}
                {description && (
                  <span className="text-sm text-gray-500">{description}</span>
                )}
              </div>
            )}
          </div>
          {icon && (
            <div className="flex-shrink-0 p-3 bg-brand-sage-green/10 rounded-lg">
              {icon}
            </div>
          )}
        </div>
      </Card>
    );
  }
);

StatCard.displayName = 'StatCard';
