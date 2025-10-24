import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  X,
  RefreshCw,
  Home,
  LucideIcon
} from 'lucide-react';
import { Button, ButtonProps } from './Button';

// ============================================================
// Alert Component
// ============================================================

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  message?: string | React.ReactNode;
  icon?: LucideIcon;
  dismissible?: boolean;
  onDismiss?: () => void;
  children?: React.ReactNode;
}

const alertConfig: Record<
  AlertVariant,
  { icon: LucideIcon; containerClass: string; iconClass: string }
> = {
  info: {
    icon: Info,
    containerClass: 'bg-info-50 border-info-200 text-info-800',
    iconClass: 'text-info-600'
  },
  success: {
    icon: CheckCircle,
    containerClass: 'bg-success-50 border-success-200 text-success-800',
    iconClass: 'text-success-600'
  },
  warning: {
    icon: AlertTriangle,
    containerClass: 'bg-warning-50 border-warning-200 text-warning-800',
    iconClass: 'text-warning-600'
  },
  error: {
    icon: XCircle,
    containerClass: 'bg-error-50 border-error-200 text-error-800',
    iconClass: 'text-error-600'
  }
};

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      variant = 'info',
      title,
      message,
      icon,
      dismissible = false,
      onDismiss,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const config = alertConfig[variant];
    const Icon = icon || config.icon;

    return (
      <div
        ref={ref}
        role="alert"
        className={`
          rounded-lg border p-4
          ${config.containerClass}
          ${className}
        `}
        {...props}
      >
        <div className="flex items-start gap-3">
          <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${config.iconClass}`} />

          <div className="flex-1 min-w-0">
            {title && (
              <h4 className="font-semibold text-sm mb-1">
                {title}
              </h4>
            )}
            {message && (
              <div className="text-sm">
                {message}
              </div>
            )}
            {children}
          </div>

          {dismissible && onDismiss && (
            <button
              onClick={onDismiss}
              className="flex-shrink-0 ml-2 hover:opacity-70 transition-opacity focus:outline-none"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }
);

Alert.displayName = 'Alert';

// ============================================================
// Error Page Component
// ============================================================

export interface ErrorPageProps {
  code?: number | string;
  title: string;
  message?: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick: () => void;
  } & Partial<ButtonProps>;
  secondaryAction?: {
    label: string;
    onClick: () => void;
  } & Partial<ButtonProps>;
  className?: string;
}

export const ErrorPage: React.FC<ErrorPageProps> = ({
  code,
  title,
  message,
  icon: Icon = AlertCircle,
  action,
  secondaryAction,
  className = ''
}) => {
  return (
    <div className={`min-h-[60vh] flex items-center justify-center px-4 ${className}`}>
      <div className="max-w-md w-full text-center">
        {/* Error Code */}
        {code && (
          <div className="text-8xl font-bold text-brand-dark-green/10 mb-4">
            {code}
          </div>
        )}

        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="p-4 bg-error-50 rounded-full">
            <Icon className="h-16 w-16 text-error-600" strokeWidth={1.5} />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-heading-xl text-brand-black font-bold mb-4">
          {title}
        </h1>

        {/* Message */}
        {message && (
          <p className="text-base text-gray-600 mb-8">
            {message}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {action && (
            <Button
              variant={action.variant || 'primary'}
              size={action.size || 'lg'}
              icon={action.icon}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant={secondaryAction.variant || 'outline'}
              size={secondaryAction.size || 'lg'}
              icon={secondaryAction.icon}
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

ErrorPage.displayName = 'ErrorPage';

// ============================================================
// Preset Error Pages
// ============================================================

export const NotFoundPage: React.FC<{ onNavigateHome?: () => void }> = ({ onNavigateHome }) => {
  return (
    <ErrorPage
      code={404}
      title="Page not found"
      message="Sorry, we couldn't find the page you're looking for. It might have been moved or deleted."
      icon={AlertCircle}
      action={
        onNavigateHome
          ? { label: 'Go to homepage', onClick: onNavigateHome, icon: Home }
          : undefined
      }
    />
  );
};

NotFoundPage.displayName = 'NotFoundPage';

export const ServerErrorPage: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => {
  return (
    <ErrorPage
      code={500}
      title="Something went wrong"
      message="We're experiencing technical difficulties. Please try again later."
      icon={AlertTriangle}
      action={
        onRetry
          ? { label: 'Try again', onClick: onRetry, icon: RefreshCw }
          : undefined
      }
    />
  );
};

ServerErrorPage.displayName = 'ServerErrorPage';

export const UnauthorizedPage: React.FC<{ onNavigateHome?: () => void }> = ({
  onNavigateHome
}) => {
  return (
    <ErrorPage
      code={403}
      title="Access denied"
      message="You don't have permission to access this page. Please contact an administrator if you believe this is an error."
      icon={XCircle}
      action={
        onNavigateHome
          ? { label: 'Go to homepage', onClick: onNavigateHome, icon: Home }
          : undefined
      }
    />
  );
};

UnauthorizedPage.displayName = 'UnauthorizedPage';

// ============================================================
// Inline Error Component
// ============================================================

export interface InlineErrorProps {
  message: string;
  className?: string;
}

export const InlineError: React.FC<InlineErrorProps> = ({ message, className = '' }) => {
  return (
    <div className={`flex items-center gap-2 text-sm text-error-600 ${className}`}>
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
};

InlineError.displayName = 'InlineError';

// ============================================================
// Field Error Component (for forms)
// ============================================================

export interface FieldErrorProps {
  error?: string;
  touched?: boolean;
  className?: string;
}

export const FieldError: React.FC<FieldErrorProps> = ({
  error,
  touched = true,
  className = ''
}) => {
  if (!error || !touched) {
    return null;
  }

  return (
    <p className={`text-sm text-error-600 mt-1 ${className}`}>
      {error}
    </p>
  );
};

FieldError.displayName = 'FieldError';

// ============================================================
// Error Boundary Fallback
// ============================================================

export interface ErrorBoundaryFallbackProps {
  error: Error;
  resetError?: () => void;
}

export const ErrorBoundaryFallback: React.FC<ErrorBoundaryFallbackProps> = ({
  error,
  resetError
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-lg w-full">
        <Alert
          variant="error"
          title="Application Error"
          message={
            <div className="space-y-2">
              <p>Something went wrong in the application.</p>
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-3">
                  <summary className="cursor-pointer font-medium">Error details</summary>
                  <pre className="mt-2 p-3 bg-white rounded text-xs overflow-auto max-h-40">
                    {error.message}
                    {'\n\n'}
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          }
        />

        {resetError && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="primary"
              icon={RefreshCw}
              onClick={resetError}
            >
              Try again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

ErrorBoundaryFallback.displayName = 'ErrorBoundaryFallback';

// ============================================================
// API Error Handler
// ============================================================

export interface ApiErrorProps {
  error: any;
  onRetry?: () => void;
  className?: string;
}

export const ApiError: React.FC<ApiErrorProps> = ({ error, onRetry, className = '' }) => {
  const getErrorMessage = (err: any): string => {
    if (err.response?.data?.error) {
      return err.response.data.error;
    }
    if (err.response?.data?.message) {
      return err.response.data.message;
    }
    if (err.message) {
      return err.message;
    }
    return 'An unexpected error occurred';
  };

  const getErrorTitle = (err: any): string => {
    if (err.response?.status === 404) return 'Not Found';
    if (err.response?.status === 403) return 'Access Denied';
    if (err.response?.status === 401) return 'Unauthorized';
    if (err.response?.status >= 500) return 'Server Error';
    return 'Error';
  };

  return (
    <Alert
      variant="error"
      title={getErrorTitle(error)}
      message={getErrorMessage(error)}
      className={className}
    >
      {onRetry && (
        <div className="mt-3">
          <Button
            variant="danger"
            size="sm"
            icon={RefreshCw}
            onClick={onRetry}
          >
            Try again
          </Button>
        </div>
      )}
    </Alert>
  );
};

ApiError.displayName = 'ApiError';
