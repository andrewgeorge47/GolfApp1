import React from 'react';
import { ChevronDown, Check, LucideIcon } from 'lucide-react';

// ============================================================
// Dropdown Menu Component
// ============================================================

export type DropdownPosition = 'left' | 'right' | 'center';

export interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  position?: DropdownPosition;
  closeOnClick?: boolean;
  disabled?: boolean;
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  children,
  position = 'left',
  closeOnClick = true,
  disabled = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close on click outside
  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on escape key
  React.useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleTriggerClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleMenuClick = () => {
    if (closeOnClick) {
      setIsOpen(false);
    }
  };

  const positionStyles = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2'
  };

  return (
    <div ref={dropdownRef} className={`relative inline-block ${className}`}>
      <div onClick={handleTriggerClick}>
        {trigger}
      </div>

      {isOpen && !disabled && (
        <div
          className={`
            absolute z-50 mt-2 min-w-[12rem]
            bg-white rounded-lg shadow-lg border border-gray-200
            animate-scale-in origin-top
            ${positionStyles[position]}
          `}
          onClick={handleMenuClick}
        >
          {children}
        </div>
      )}
    </div>
  );
};

Dropdown.displayName = 'Dropdown';

// ============================================================
// Dropdown Subcomponents
// ============================================================

export interface DropdownItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  icon?: LucideIcon;
  selected?: boolean;
  disabled?: boolean;
  destructive?: boolean;
  className?: string;
}

export const DropdownItem: React.FC<DropdownItemProps> = ({
  children,
  onClick,
  icon: Icon,
  selected = false,
  disabled = false,
  destructive = false,
  className = ''
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full px-4 py-2 text-left text-sm
        flex items-center gap-3
        transition-colors duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        ${
          destructive
            ? 'text-error-600 hover:bg-error-50'
            : 'text-gray-700 hover:bg-gray-50'
        }
        ${selected ? 'bg-brand-highlight-green bg-opacity-10' : ''}
        ${className}
      `}
    >
      {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
      <span className="flex-1">{children}</span>
      {selected && <Check className="h-4 w-4 text-brand-dark-green flex-shrink-0" />}
    </button>
  );
};

DropdownItem.displayName = 'DropdownItem';

export interface DropdownDividerProps {
  className?: string;
}

export const DropdownDivider: React.FC<DropdownDividerProps> = ({ className = '' }) => {
  return <div className={`my-1 border-t border-gray-200 ${className}`} />;
};

DropdownDivider.displayName = 'DropdownDivider';

export interface DropdownLabelProps {
  children: React.ReactNode;
  className?: string;
}

export const DropdownLabel: React.FC<DropdownLabelProps> = ({ children, className = '' }) => {
  return (
    <div className={`px-4 py-2 text-xs font-semibold text-gray-500 uppercase ${className}`}>
      {children}
    </div>
  );
};

DropdownLabel.displayName = 'DropdownLabel';

// ============================================================
// Select Dropdown (for form use)
// ============================================================

export interface SelectDropdownOption {
  value: string | number;
  label: string;
  icon?: LucideIcon;
  disabled?: boolean;
}

export interface SelectDropdownProps {
  options: SelectDropdownOption[];
  value?: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

export const SelectDropdown: React.FC<SelectDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  error = false,
  className = ''
}) => {
  const selectedOption = options.find((opt) => opt.value === value);

  const baseStyles = `
    w-full flex items-center justify-between gap-2
    px-4 py-2 text-sm
    border rounded-lg
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-1
    disabled:bg-gray-50 disabled:cursor-not-allowed
  `;

  const stateStyles = error
    ? 'border-error-300 focus:border-error-500 focus:ring-error-200'
    : 'border-gray-300 focus:border-brand-dark-green focus:ring-brand-neon-green/20';

  return (
    <Dropdown
      trigger={
        <button
          disabled={disabled}
          className={`${baseStyles} ${stateStyles} ${className}`}
        >
          <span className="flex items-center gap-2 flex-1 text-left">
            {selectedOption?.icon && <selectedOption.icon className="h-4 w-4" />}
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
        </button>
      }
      position="left"
      disabled={disabled}
      className="w-full"
    >
      <div className="py-1 max-h-60 overflow-auto">
        {options.map((option) => (
          <DropdownItem
            key={option.value}
            onClick={() => onChange(option.value)}
            icon={option.icon}
            selected={value === option.value}
            disabled={option.disabled}
          >
            {option.label}
          </DropdownItem>
        ))}
      </div>
    </Dropdown>
  );
};

SelectDropdown.displayName = 'SelectDropdown';

// ============================================================
// Menu Button (Preset Dropdown)
// ============================================================

export interface MenuButtonProps {
  label?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  position?: DropdownPosition;
  disabled?: boolean;
  className?: string;
}

const buttonVariantStyles = {
  default: 'bg-white border border-gray-300 hover:bg-gray-50',
  ghost: 'hover:bg-gray-100',
  outline: 'border border-brand-dark-green text-brand-dark-green hover:bg-brand-highlight-green hover:bg-opacity-10'
};

const buttonSizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-5 py-3 text-lg'
};

export const MenuButton: React.FC<MenuButtonProps> = ({
  label,
  icon: Icon,
  variant = 'default',
  size = 'md',
  children,
  position = 'left',
  disabled = false,
  className = ''
}) => {
  return (
    <Dropdown
      trigger={
        <button
          disabled={disabled}
          className={`
            inline-flex items-center gap-2 rounded-lg
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-brand-neon-green/50 focus:ring-offset-1
            disabled:opacity-50 disabled:cursor-not-allowed
            ${buttonVariantStyles[variant]}
            ${buttonSizeStyles[size]}
            ${className}
          `}
        >
          {Icon && <Icon className="h-4 w-4" />}
          {label && <span>{label}</span>}
          <ChevronDown className="h-4 w-4 text-gray-500" />
        </button>
      }
      position={position}
      disabled={disabled}
    >
      <div className="py-1">
        {children}
      </div>
    </Dropdown>
  );
};

MenuButton.displayName = 'MenuButton';
