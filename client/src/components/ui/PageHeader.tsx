import React from 'react';
import { LucideIcon } from 'lucide-react';

/**
 * PageHeader Component
 *
 * Standard header component for pages in the app.
 * Designed to be used directly on the dark green gradient background.
 *
 * Color Standards:
 * - Title: text-white (high contrast on dark green background)
 * - Subtitle: text-white/80 (slightly transparent white for hierarchy)
 * - Icon: text-brand-neon-green (brand accent color)
 *
 * Usage:
 * ```tsx
 * <PageHeader
 *   title="Event Signups"
 *   subtitle="Register for upcoming events and tournaments"
 *   icon={Calendar}
 * />
 * ```
 */

export interface PageHeaderProps {
  /** Main page title */
  title: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Optional icon to display before the title */
  icon?: LucideIcon;
  /** Optional action button or element on the right */
  action?: React.ReactNode;
  /** Additional className for customization */
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  action,
  className = ''
}) => {
  return (
    <div className={`flex justify-between items-start gap-4 ${className}`}>
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-1">
          {Icon && <Icon className="w-8 h-8 text-brand-neon-green flex-shrink-0" />}
          <h1 className="text-3xl font-bold text-white">{title}</h1>
        </div>
        {subtitle && (
          <p className="text-white/80 mt-2 text-lg">{subtitle}</p>
        )}
      </div>
      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  );
};

/**
 * PageHeaderWithBack Component
 *
 * Page header with a back button navigation.
 * Used for detail/form pages that need to navigate back.
 */

export interface PageHeaderWithBackProps {
  /** Main page title */
  title: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Back button click handler */
  onBack: () => void;
  /** Optional back button label (defaults to "Back") */
  backLabel?: string;
  /** Optional action button or element on the right */
  action?: React.ReactNode;
  /** Additional className for customization */
  className?: string;
}

export const PageHeaderWithBack: React.FC<PageHeaderWithBackProps> = ({
  title,
  subtitle,
  onBack,
  backLabel = 'Back',
  action,
  className = ''
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-white/90 hover:text-white transition-colors group"
      >
        <svg
          className="w-5 h-5 group-hover:-translate-x-1 transition-transform"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        <span className="font-medium">{backLabel}</span>
      </button>

      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white">{title}</h1>
          {subtitle && (
            <p className="text-white/80 mt-2 text-lg">{subtitle}</p>
          )}
        </div>
        {action && (
          <div className="flex-shrink-0">
            {action}
          </div>
        )}
      </div>
    </div>
  );
};
