import React from 'react';
import { AlertCircle, Eye, EyeOff, Search, LucideIcon } from 'lucide-react';

// ============================================================
// Base Input Component
// ============================================================

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  inputSize?: 'sm' | 'md' | 'lg';
}

// Responsive sizes with minimum 44px touch target
const sizeStyles = {
  sm: 'px-3 py-2 text-sm min-h-[36px]',
  md: 'px-3 sm:px-4 py-2.5 sm:py-2 text-base min-h-[44px]',
  lg: 'px-4 py-3 text-lg min-h-[48px]'
};

const iconSizes = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6'
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      icon: Icon,
      iconPosition = 'left',
      fullWidth = false,
      inputSize = 'md',
      className = '',
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = !!error;

    const baseStyles = `
      w-full rounded-lg border transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-1
      disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
    `;

    const stateStyles = hasError
      ? 'border-error-300 focus:border-error-500 focus:ring-error-200'
      : 'border-gray-300 focus:border-brand-dark-green focus:ring-brand-neon-green/20';

    const paddingWithIcon = Icon
      ? iconPosition === 'left'
        ? 'pl-10'
        : 'pr-10'
      : '';

    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {label}
            {props.required && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {Icon && (
            <div
              className={`
                absolute top-1/2 -translate-y-1/2
                ${iconPosition === 'left' ? 'left-3' : 'right-3'}
                ${hasError ? 'text-error-500' : 'text-gray-400'}
              `}
            >
              <Icon className={iconSizes[inputSize]} />
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={`
              ${baseStyles}
              ${stateStyles}
              ${sizeStyles[inputSize]}
              ${paddingWithIcon}
              ${className}
            `}
            aria-invalid={hasError}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            {...props}
          />

          {hasError && (
            <div className="absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none">
              <AlertCircle className="h-5 w-5 text-error-500" />
            </div>
          )}
        </div>

        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-sm text-error-600">
            {error}
          </p>
        )}

        {!error && helperText && (
          <p id={`${inputId}-helper`} className="mt-1.5 text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// ============================================================
// Password Input Component
// ============================================================

export interface PasswordInputProps extends Omit<InputProps, 'type' | 'icon'> {
  showStrengthIndicator?: boolean;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ showStrengthIndicator = false, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);

    return (
      <div className={props.fullWidth ? 'w-full' : ''}>
        <div className="relative">
          <Input
            ref={ref}
            type={showPassword ? 'text' : 'password'}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';

// ============================================================
// Search Input Component
// ============================================================

export interface SearchInputProps extends Omit<InputProps, 'icon' | 'type'> {
  onClear?: () => void;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onClear, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="search"
        icon={Search}
        iconPosition="left"
        placeholder="Search..."
        {...props}
      />
    );
  }
);

SearchInput.displayName = 'SearchInput';

// ============================================================
// Textarea Component
// ============================================================

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = false,
      resize = 'vertical',
      className = '',
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = !!error;

    const baseStyles = `
      w-full rounded-lg border px-4 py-2 text-base transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-1
      disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
    `;

    const stateStyles = hasError
      ? 'border-error-300 focus:border-error-500 focus:ring-error-200'
      : 'border-gray-300 focus:border-brand-dark-green focus:ring-brand-neon-green/20';

    const resizeStyles = {
      none: 'resize-none',
      vertical: 'resize-y',
      horizontal: 'resize-x',
      both: 'resize'
    };

    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {label}
            {props.required && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          disabled={disabled}
          className={`
            ${baseStyles}
            ${stateStyles}
            ${resizeStyles[resize]}
            ${className}
          `}
          aria-invalid={hasError}
          aria-describedby={
            error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined
          }
          {...props}
        />

        {error && (
          <p id={`${textareaId}-error`} className="mt-1.5 text-sm text-error-600">
            {error}
          </p>
        )}

        {!error && helperText && (
          <p id={`${textareaId}-helper`} className="mt-1.5 text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// ============================================================
// Select Component
// ============================================================

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
  fullWidth?: boolean;
  selectSize?: 'sm' | 'md' | 'lg';
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      options,
      placeholder,
      fullWidth = false,
      selectSize = 'md',
      className = '',
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = !!error;

    const baseStyles = `
      w-full rounded-lg border transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-1
      disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
      appearance-none bg-white
      bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22M6%208l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')]
      bg-[length:1.5em_1.5em] bg-[right_0.5rem_center] bg-no-repeat
      pr-10
    `;

    const stateStyles = hasError
      ? 'border-error-300 focus:border-error-500 focus:ring-error-200'
      : 'border-gray-300 focus:border-brand-dark-green focus:ring-brand-neon-green/20';

    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {label}
            {props.required && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}

        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          className={`
            ${baseStyles}
            ${stateStyles}
            ${sizeStyles[selectSize]}
            ${className}
          `}
          aria-invalid={hasError}
          aria-describedby={
            error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined
          }
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>

        {error && (
          <p id={`${selectId}-error`} className="mt-1.5 text-sm text-error-600">
            {error}
          </p>
        )}

        {!error && helperText && (
          <p id={`${selectId}-helper`} className="mt-1.5 text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
