import React from 'react';
import { Calendar, Users, Trophy, Clock, ChevronRight, LucideIcon } from 'lucide-react';
import { SegmentedControl, SegmentedControlOption } from './SegmentedControl';

export type FeedItemVariant = 'compact' | 'featured' | 'action-first' | 'compact-accent' | 'compact-minimal';
export type FeedItemStatus = 'open' | 'ending-soon' | 'full' | 'closed';

export interface FeedItemProps {
  variant?: FeedItemVariant;
  title: string;
  titleBadge?: string; // Badge to show next to title (e.g., "6d")
  subtitle?: string;
  description?: string;
  status?: FeedItemStatus;
  startDate?: string;
  endDate?: string;
  participants?: {
    current: number;
    max?: number;
  };
  prize?: string;
  imageUrl?: string;
  icon?: LucideIcon;
  onAction?: () => void;
  actionLabel?: string;
  segmentedActions?: {
    options: SegmentedControlOption<string>[];
    value: string;
    onChange: (value: string) => void;
  };
  onClick?: () => void;
  className?: string;
}

const statusConfig: Record<FeedItemStatus, {
  label: string;
  color: string;
  bgColor: string;
  accentGradient: string;
  borderColor: string;
  minimalBg: string;
  opacity: string;
}> = {
  open: {
    label: 'Open',
    color: 'text-success',
    bgColor: 'bg-success bg-opacity-10',
    accentGradient: 'bg-gradient-to-b from-success to-success-600',
    borderColor: 'border-success',
    minimalBg: 'bg-white',
    opacity: 'opacity-100'
  },
  'ending-soon': {
    label: 'Ending Soon',
    color: 'text-warning-600',
    bgColor: 'bg-warning-50',
    accentGradient: 'bg-gradient-to-b from-warning-500 to-warning-600',
    borderColor: 'border-warning-500',
    minimalBg: 'bg-white',
    opacity: 'opacity-100'
  },
  full: {
    label: 'Full',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    accentGradient: 'bg-gradient-to-b from-gray-400 to-gray-500',
    borderColor: 'border-gray-300',
    minimalBg: 'bg-gray-50',
    opacity: 'opacity-60'
  },
  closed: {
    label: 'Closed',
    color: 'text-gray-400',
    bgColor: 'bg-error-light',
    accentGradient: 'bg-gradient-to-b from-error to-error-600',
    borderColor: 'border-gray-200',
    minimalBg: 'bg-gray-50',
    opacity: 'opacity-40'
  }
};

/**
 * FeedItem - A mobile-optimized component for displaying challenge/event feeds
 *
 * Features five variants:
 * - compact: Minimal horizontal layout with icon, perfect for dense lists
 * - compact-accent: Similar to compact but with color-coded status bar on left
 * - compact-minimal: Ultra-clean variant using color/opacity for status, no badges or icons
 * - featured: Visual card with gradients and prominence
 * - action-first: Emphasizes the CTA with modern split layout
 */
export const FeedItem: React.FC<FeedItemProps> = ({
  variant = 'compact',
  title,
  titleBadge,
  subtitle,
  description,
  status = 'open',
  startDate,
  endDate,
  participants,
  prize,
  imageUrl,
  icon: Icon,
  onAction,
  actionLabel = 'Join',
  segmentedActions,
  onClick,
  className = ''
}) => {
  const statusStyle = statusConfig[status];

  // Compact Variant - Minimal, streamlined
  if (variant === 'compact') {
    return (
      <div
        onClick={onClick}
        className={`
          group relative
          bg-white rounded-2xl p-4
          border border-gray-200
          hover:border-brand-dark-green hover:shadow-md
          transition-all duration-200
          ${onClick ? 'cursor-pointer' : ''}
          ${className}
        `}
      >
        <div className="flex items-start gap-3">
          {/* Icon/Image */}
          <div className="flex-shrink-0">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={title}
                className="w-12 h-12 rounded-xl object-cover"
              />
            ) : Icon ? (
              <div className="w-12 h-12 rounded-xl bg-brand-highlight-green bg-opacity-10 flex items-center justify-center">
                <Icon className="w-6 h-6 text-brand-dark-green" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-dark-green to-brand-muted-green flex items-center justify-center">
                <Trophy className="w-6 h-6 text-brand-neon-green" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="text-base font-semibold text-brand-black truncate">
                {title}
              </h3>
              {status && (
                <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle.bgColor} ${statusStyle.color}`}>
                  {statusStyle.label}
                </span>
              )}
            </div>

            {subtitle && (
              <p className="text-sm text-gray-600 mb-2">{subtitle}</p>
            )}

            {/* Meta Info */}
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {participants && (
                <div className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>
                    {participants.current}
                    {participants.max ? `/${participants.max}` : ''}
                  </span>
                </div>
              )}
              {endDate && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{endDate}</span>
                </div>
              )}
              {prize && (
                <div className="flex items-center gap-1 text-brand-neon-green font-medium">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>{prize}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action */}
          {onAction && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction();
              }}
              className="flex-shrink-0 px-4 py-2 bg-brand-dark-green text-white rounded-lg text-sm font-medium hover:bg-brand-muted-green transition-colors"
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Compact-Minimal Variant - Clean, status through color/opacity
  if (variant === 'compact-minimal') {
    return (
      <div
        className={`
          group relative
          ${statusStyle.minimalBg}
          ${statusStyle.opacity}
          rounded-2xl p-4
          border-2 ${statusStyle.borderColor}
          hover:border-brand-dark-green hover:shadow-md
          transition-all duration-200
          ${className}
        `}
      >
        <div className="flex items-start justify-between gap-3">
          {/* Content - No icons */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`text-base font-semibold ${status === 'closed' || status === 'full' ? 'text-gray-500' : 'text-brand-black'}`}>
                {title}
              </h3>
              {titleBadge && (
                <span className="px-2 py-0.5 text-xs font-semibold bg-brand-neon-green text-brand-dark-green rounded-full">
                  {titleBadge}
                </span>
              )}
            </div>

            {subtitle && (
              <p className={`text-sm mb-2 ${status === 'closed' || status === 'full' ? 'text-gray-400' : 'text-gray-600'}`}>
                {subtitle}
              </p>
            )}

            {/* Meta Info - Minimal */}
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {participants && (
                <div className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>
                    {participants.current}
                    {participants.max ? `/${participants.max}` : ''}
                  </span>
                </div>
              )}
              {endDate && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{endDate}</span>
                </div>
              )}
              {prize && (
                <div className="flex items-center gap-1 text-brand-neon-green font-medium">
                  <span>{prize}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right side actions - stacked */}
          <div className="flex-shrink-0 flex flex-col items-end gap-2">
            {/* Leaderboard link */}
            {onClick && (
              <button
                onClick={onClick}
                className="flex items-center gap-1 text-sm font-medium text-brand-neon-green hover:text-brand-neon-green/80 transition-colors"
              >
                Leaderboard
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {/* Segmented Control or Single Action Button */}
            {segmentedActions ? (
              <div onClick={(e) => e.stopPropagation()}>
                <SegmentedControl
                  options={segmentedActions.options}
                  value={segmentedActions.value}
                  onChange={segmentedActions.onChange}
                  size="sm"
                  variant="primary"
                />
              </div>
            ) : onAction && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAction();
                }}
                className={`
                  px-3 py-1.5 rounded-lg text-sm font-medium
                  transition-colors
                  ${status === 'closed' || status === 'full'
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-brand-dark-green text-white hover:bg-brand-muted-green'
                  }
                `}
                disabled={status === 'closed' || status === 'full'}
              >
                {actionLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Compact-Accent Variant - Status bar on left
  if (variant === 'compact-accent') {
    return (
      <div
        onClick={onClick}
        className={`
          group relative
          bg-white rounded-2xl overflow-hidden
          border border-gray-200
          hover:border-brand-dark-green hover:shadow-md
          transition-all duration-200
          ${onClick ? 'cursor-pointer' : ''}
          ${className}
        `}
      >
        <div className="flex">
          {/* Status Accent Bar with Icon */}
          <div className={`flex-shrink-0 w-16 ${statusStyle.accentGradient} flex flex-col items-center justify-center gap-1 py-3`}>
            {Icon ? (
              <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
            ) : (
              <Trophy className="w-6 h-6 text-white" strokeWidth={2.5} />
            )}
            {status && (
              <span className="text-[10px] font-bold text-white uppercase tracking-tight leading-none text-center px-1">
                {statusStyle.label}
              </span>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-4">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="text-base font-semibold text-brand-black">
                {title}
              </h3>
              {status && (
                <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle.bgColor} ${statusStyle.color}`}>
                  {statusStyle.label}
                </span>
              )}
            </div>

            {subtitle && (
              <p className="text-sm text-gray-600 mb-2">{subtitle}</p>
            )}

            {/* Meta Info */}
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {participants && (
                <div className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>
                    {participants.current}
                    {participants.max ? `/${participants.max}` : ''}
                  </span>
                </div>
              )}
              {endDate && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{endDate}</span>
                </div>
              )}
              {prize && (
                <div className="flex items-center gap-1 text-brand-neon-green font-medium">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>{prize}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action */}
          {onAction && (
            <div className="flex-shrink-0 flex items-center pr-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAction();
                }}
                className="px-4 py-2 bg-brand-dark-green text-white rounded-lg text-sm font-medium hover:bg-brand-muted-green transition-colors"
              >
                {actionLabel}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Featured Variant - Visual prominence
  if (variant === 'featured') {
    return (
      <div
        onClick={onClick}
        className={`
          group relative
          bg-gradient-to-br from-white to-gray-50
          rounded-3xl overflow-hidden
          border border-gray-200
          hover:border-brand-dark-green hover:shadow-lg
          transition-all duration-200
          ${onClick ? 'cursor-pointer' : ''}
          ${className}
        `}
      >
        {/* Header with Image/Gradient */}
        {imageUrl ? (
          <div className="relative h-32 overflow-hidden">
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            {status && (
              <span className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold ${statusStyle.bgColor} ${statusStyle.color} backdrop-blur-sm`}>
                {statusStyle.label}
              </span>
            )}
          </div>
        ) : (
          <div className="relative h-24 bg-gradient-to-br from-brand-dark-green to-brand-muted-green">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_50%,_rgba(255,255,255,0.3),transparent_50%)]" />
            {status && (
              <span className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold ${statusStyle.bgColor} ${statusStyle.color} backdrop-blur-sm`}>
                {statusStyle.label}
              </span>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-4">
          <h3 className="text-lg font-bold text-brand-black mb-1">
            {title}
          </h3>

          {subtitle && (
            <p className="text-sm text-gray-600 mb-3">{subtitle}</p>
          )}

          {description && (
            <p className="text-sm text-gray-500 mb-3 line-clamp-2">
              {description}
            </p>
          )}

          {/* Meta Grid */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {participants && (
              <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100">
                <Users className="w-4 h-4 text-brand-dark-green" />
                <div>
                  <div className="text-xs text-gray-500">Players</div>
                  <div className="text-sm font-semibold text-brand-black">
                    {participants.current}
                    {participants.max ? `/${participants.max}` : ''}
                  </div>
                </div>
              </div>
            )}
            {prize && (
              <div className="flex items-center gap-2 p-2 bg-brand-neon-green bg-opacity-10 rounded-lg border border-brand-neon-green border-opacity-20">
                <Trophy className="w-4 h-4 text-brand-neon-green" />
                <div>
                  <div className="text-xs text-gray-600">Prize</div>
                  <div className="text-sm font-semibold text-brand-dark-green">
                    {prize}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          {onAction && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction();
              }}
              className="w-full py-3 bg-brand-dark-green text-white rounded-xl font-semibold hover:bg-brand-muted-green transition-colors flex items-center justify-center gap-2"
            >
              {actionLabel}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Action-First Variant - Modern split layout
  return (
    <div
      onClick={onClick}
      className={`
        group relative
        bg-white rounded-2xl overflow-hidden
        border border-gray-200
        hover:border-brand-dark-green hover:shadow-md
        transition-all duration-200
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      <div className="flex">
        {/* Main Content */}
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-base font-bold text-brand-black">
              {title}
            </h3>
            {status && (
              <span className={`flex-shrink-0 px-2 py-1 rounded-lg text-xs font-medium ${statusStyle.bgColor} ${statusStyle.color}`}>
                {statusStyle.label}
              </span>
            )}
          </div>

          {subtitle && (
            <p className="text-sm text-gray-600 mb-3">{subtitle}</p>
          )}

          {/* Horizontal Meta */}
          <div className="flex items-center gap-4 text-sm">
            {participants && (
              <div className="flex items-center gap-1.5 text-gray-600">
                <Users className="w-4 h-4" />
                <span className="font-medium text-brand-black">
                  {participants.current}
                </span>
                {participants.max && (
                  <span className="text-gray-400">/ {participants.max}</span>
                )}
              </div>
            )}
            {endDate && (
              <div className="flex items-center gap-1.5 text-gray-600">
                <Clock className="w-4 h-4" />
                <span>{endDate}</span>
              </div>
            )}
            {prize && (
              <div className="flex items-center gap-1.5 text-brand-neon-green font-semibold">
                <Trophy className="w-4 h-4" />
                <span>{prize}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Side */}
        {onAction && (
          <div className="flex-shrink-0 w-24 bg-gradient-to-br from-brand-dark-green to-brand-muted-green flex items-center justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction();
              }}
              className="flex flex-col items-center justify-center gap-1 text-white w-full h-full hover:brightness-110 transition-all"
            >
              <ChevronRight className="w-6 h-6" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                {actionLabel}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

FeedItem.displayName = 'FeedItem';
