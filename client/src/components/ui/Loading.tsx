import React from 'react';
import { Loader2 } from 'lucide-react';

// ============================================================
// Spinner Component
// ============================================================

export type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: SpinnerSize;
  label?: string;
}

const spinnerSizes: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12'
};

export const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ size = 'md', label, className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`inline-flex items-center justify-center ${className}`}
        role="status"
        aria-label={label || 'Loading'}
        {...props}
      >
        <Loader2 className={`${spinnerSizes[size]} text-brand-dark-green animate-spin`} />
        {label && (
          <span className="ml-2 text-sm text-gray-600">{label}</span>
        )}
      </div>
    );
  }
);

Spinner.displayName = 'Spinner';

// Full-page spinner
export interface LoadingOverlayProps {
  label?: string;
  transparent?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  label = 'Loading...',
  transparent = false
}) => {
  return (
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center
        ${transparent ? 'bg-white/50' : 'bg-white'}
        backdrop-blur-sm
      `}
    >
      <div className="flex flex-col items-center gap-3">
        <Spinner size="xl" />
        <p className="text-sm font-medium text-gray-600">{label}</p>
      </div>
    </div>
  );
};

LoadingOverlay.displayName = 'LoadingOverlay';

// ============================================================
// Skeleton Component
// ============================================================

export type SkeletonVariant = 'text' | 'circular' | 'rectangular' | 'rounded';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  animate?: boolean;
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      variant = 'text',
      width,
      height,
      animate = true,
      className = '',
      style,
      ...props
    },
    ref
  ) => {
    const variantStyles: Record<SkeletonVariant, string> = {
      text: 'h-4 rounded',
      circular: 'rounded-full',
      rectangular: '',
      rounded: 'rounded-lg'
    };

    const animationClass = animate ? 'animate-pulse' : '';

    const inlineStyles: React.CSSProperties = {
      ...style,
      ...(width && { width: typeof width === 'number' ? `${width}px` : width }),
      ...(height && { height: typeof height === 'number' ? `${height}px` : height })
    };

    return (
      <div
        ref={ref}
        className={`
          bg-gray-200
          ${variantStyles[variant]}
          ${animationClass}
          ${className}
        `}
        style={inlineStyles}
        aria-hidden="true"
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

// ============================================================
// Skeleton Presets
// ============================================================

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className = ''
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={i === lines - 1 ? '80%' : '100%'}
        />
      ))}
    </div>
  );
};

SkeletonText.displayName = 'SkeletonText';

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <Skeleton variant="text" width="60%" height={24} className="mb-2" />
          <Skeleton variant="text" width="40%" height={16} />
        </div>
        <Skeleton variant="circular" width={40} height={40} />
      </div>
      <SkeletonText lines={3} />
      <div className="mt-4 flex items-center gap-2">
        <Skeleton variant="rounded" width={80} height={32} />
        <Skeleton variant="rounded" width={80} height={32} />
      </div>
    </div>
  );
};

SkeletonCard.displayName = 'SkeletonCard';

export const SkeletonTable: React.FC<{ rows?: number; columns?: number; className?: string }> = ({
  rows = 5,
  columns = 4,
  className = ''
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b border-gray-200">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} variant="text" width={`${100 / columns}%`} height={16} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={`cell-${rowIndex}-${colIndex}`}
              variant="text"
              width={`${100 / columns}%`}
              height={20}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

SkeletonTable.displayName = 'SkeletonTable';

export const SkeletonAvatar: React.FC<{ size?: number; className?: string }> = ({
  size = 40,
  className = ''
}) => {
  return (
    <Skeleton
      variant="circular"
      width={size}
      height={size}
      className={className}
    />
  );
};

SkeletonAvatar.displayName = 'SkeletonAvatar';

export const SkeletonListItem: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <SkeletonAvatar size={48} />
      <div className="flex-1">
        <Skeleton variant="text" width="60%" height={16} className="mb-2" />
        <Skeleton variant="text" width="40%" height={14} />
      </div>
      <Skeleton variant="rounded" width={60} height={24} />
    </div>
  );
};

SkeletonListItem.displayName = 'SkeletonListItem';

export const SkeletonList: React.FC<{ items?: number; className?: string }> = ({
  items = 5,
  className = ''
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonListItem key={i} />
      ))}
    </div>
  );
};

SkeletonList.displayName = 'SkeletonList';

// ============================================================
// Loading Spinner with Content
// ============================================================

export interface LoadingProps {
  loading: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  overlay?: boolean;
}

export const Loading: React.FC<LoadingProps> = ({
  loading,
  children,
  fallback,
  overlay = false
}) => {
  if (!loading) {
    return <>{children}</>;
  }

  if (overlay) {
    return (
      <div className="relative">
        {children}
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
          {fallback || <Spinner size="lg" />}
        </div>
      </div>
    );
  }

  return <>{fallback || <Spinner size="lg" />}</>;
};

Loading.displayName = 'Loading';
