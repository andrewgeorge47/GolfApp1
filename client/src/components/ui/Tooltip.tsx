import React from 'react';

// ============================================================
// Tooltip Component
// ============================================================

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';
export type TooltipVariant = 'dark' | 'light';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: TooltipPosition;
  variant?: TooltipVariant;
  delay?: number;
  disabled?: boolean;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  variant = 'dark',
  delay = 200,
  disabled = false,
  className = ''
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  const handleMouseEnter = () => {
    if (disabled) return;

    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const positionStyles: Record<TooltipPosition, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  const arrowStyles: Record<TooltipPosition, string> = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-current',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-current',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-current',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-current'
  };

  const variantStyles = {
    dark: 'bg-gray-900 text-white',
    light: 'bg-white text-gray-900 border border-gray-200 shadow-lg'
  };

  const arrowColorStyles = {
    dark: 'text-gray-900',
    light: 'text-white'
  };

  if (!content) return <>{children}</>;

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}

      {isVisible && !disabled && (
        <div
          role="tooltip"
          className={`
            absolute z-50 px-3 py-2 text-sm rounded-lg
            whitespace-nowrap max-w-xs
            animate-fade-in
            ${positionStyles[position]}
            ${variantStyles[variant]}
            ${className}
          `}
        >
          {content}

          {/* Arrow */}
          <div
            className={`
              absolute w-0 h-0
              border-4 border-transparent
              ${arrowStyles[position]}
              ${arrowColorStyles[variant]}
            `}
          />
        </div>
      )}
    </div>
  );
};

Tooltip.displayName = 'Tooltip';

// ============================================================
// Info Tooltip (with icon)
// ============================================================

import { HelpCircle } from 'lucide-react';

export interface InfoTooltipProps {
  content: React.ReactNode;
  position?: TooltipPosition;
  variant?: TooltipVariant;
  iconClassName?: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  content,
  position = 'top',
  variant = 'dark',
  iconClassName = ''
}) => {
  return (
    <Tooltip content={content} position={position} variant={variant}>
      <button
        type="button"
        className={`
          inline-flex items-center justify-center
          text-gray-400 hover:text-gray-600
          transition-colors duration-150
          focus:outline-none
          ${iconClassName}
        `}
        tabIndex={0}
      >
        <HelpCircle className="h-4 w-4" />
      </button>
    </Tooltip>
  );
};

InfoTooltip.displayName = 'InfoTooltip';
