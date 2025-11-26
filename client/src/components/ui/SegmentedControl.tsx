import React from 'react';

export interface SegmentedControlOption<T = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  badge?: number; // Badge count to display on the option
}

export interface SegmentedControlProps<T = string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'primary' | 'compact';
  fullWidth?: boolean;
  className?: string;
}

const sizeStyles = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-3 text-base',
};

const variantStyles = {
  default: {
    container: 'bg-gray-100',
    active: 'bg-white text-gray-900 shadow-sm',
    inactive: 'text-gray-600 hover:text-gray-900',
  },
  primary: {
    container: 'bg-gray-100',
    active: 'bg-brand-dark-green text-white',
    inactive: 'text-gray-700 hover:bg-gray-200',
  },
  compact: {
    container: 'bg-white/20',
    active: 'bg-white text-brand-dark-green',
    inactive: 'text-white hover:bg-white/30',
  },
};

/**
 * SegmentedControl - A toggle control for switching between multiple options
 *
 * Usage:
 * ```tsx
 * <SegmentedControl
 *   options={[
 *     { value: 'day', label: 'Day' },
 *     { value: 'week', label: 'Week' },
 *     { value: 'month', label: 'Month' }
 *   ]}
 *   value={view}
 *   onChange={setView}
 *   variant="primary"
 * />
 * ```
 */
export const SegmentedControl = <T extends string = string>({
  options,
  value,
  onChange,
  size = 'md',
  variant = 'default',
  fullWidth = false,
  className = '',
}: SegmentedControlProps<T>) => {
  const styles = variantStyles[variant];

  return (
    <div className="relative inline-block">
      <div
        className={`
          inline-flex items-center rounded-full overflow-hidden
          ${styles.container}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        role="group"
        aria-label="Segmented control"
      >
        {options.map((option, index) => {
          const isActive = option.value === value;
          const isDisabled = option.disabled || false;

          return (
            <button
              key={String(option.value)}
              onClick={() => !isDisabled && onChange(option.value)}
              disabled={isDisabled}
              className={`
                ${sizeStyles[size]}
                font-medium transition-colors
                flex items-center justify-center gap-2
                ${fullWidth ? 'flex-1' : ''}
                ${isActive ? styles.active : styles.inactive}
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              aria-pressed={isActive}
              aria-disabled={isDisabled}
            >
              {option.icon && (
                <span className="inline-flex items-center">{option.icon}</span>
              )}
              {option.label}
            </button>
          );
        })}
      </div>
      {/* Render badges outside overflow-hidden container */}
      {options.map((option, index) => {
        if (option.badge === undefined || option.badge <= 0) return null;

        return (
          <span
            key={`badge-${String(option.value)}-${option.badge}`}
            className="
              absolute -top-2
              min-w-[18px] h-[18px]
              flex items-center justify-center
              bg-brand-neon-green text-brand-dark-green
              text-[10px] font-bold
              rounded-full
              px-1
              animate-[badge-pop_0.5s_cubic-bezier(0.68,-0.55,0.265,1.55)]
              shadow-md
              pointer-events-none
            "
            style={{
              right: index === options.length - 1 ? '-2px' : 'auto',
              left: index === 0 ? '-2px' : 'auto'
            }}
            aria-label={`${option.badge} pending`}
          >
            {option.badge}
          </span>
        );
      })}
    </div>
  );
};

/**
 * ViewToggle - A preset segmented control for Day/Week/Month views
 *
 * Usage:
 * ```tsx
 * <ViewToggle
 *   view={calendarView}
 *   onChange={setCalendarView}
 *   views={['day', 'week']}
 * />
 * ```
 */
export interface ViewToggleProps {
  view: 'day' | 'week' | 'month';
  onChange: (view: 'day' | 'week' | 'month') => void;
  views?: Array<'day' | 'week' | 'month'>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({
  view,
  onChange,
  views = ['day', 'week'],
  size = 'md',
  className = '',
}) => {
  const viewOptions: Record<string, { value: 'day' | 'week' | 'month'; label: string }> = {
    day: { value: 'day', label: 'Day' },
    week: { value: 'week', label: 'Week' },
    month: { value: 'month', label: 'Month' },
  };

  const options = views.map(v => viewOptions[v]);

  return (
    <SegmentedControl
      options={options}
      value={view}
      onChange={onChange}
      size={size}
      variant="primary"
      className={className}
    />
  );
};
