import React from 'react';
import { Check, Minus } from 'lucide-react';

// ============================================================
// Checkbox Component
// ============================================================

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string | React.ReactNode;
  error?: string;
  helperText?: string;
  indeterminate?: boolean;
  checkboxSize?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: {
    checkbox: 'h-4 w-4',
    icon: 'h-3 w-3'
  },
  md: {
    checkbox: 'h-5 w-5',
    icon: 'h-4 w-4'
  },
  lg: {
    checkbox: 'h-6 w-6',
    icon: 'h-5 w-5'
  }
};

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      error,
      helperText,
      indeterminate = false,
      checkboxSize = 'md',
      className = '',
      id,
      disabled,
      checked,
      ...props
    },
    ref
  ) => {
    const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = !!error;

    const innerRef = React.useRef<HTMLInputElement>(null);
    const combinedRef = (ref as any) || innerRef;

    React.useEffect(() => {
      if (combinedRef.current) {
        combinedRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate, combinedRef]);

    const baseStyles = `
      rounded border-2 transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-neon-green/50
      disabled:bg-gray-100 disabled:cursor-not-allowed
      cursor-pointer
    `;

    const stateStyles = hasError
      ? 'border-error-500'
      : checked || indeterminate
      ? 'border-brand-dark-green bg-brand-dark-green'
      : 'border-gray-300 hover:border-brand-dark-green';

    return (
      <div className="flex flex-col">
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <div className="relative">
              <input
                ref={combinedRef}
                type="checkbox"
                id={checkboxId}
                disabled={disabled}
                checked={checked}
                className={`
                  ${baseStyles}
                  ${stateStyles}
                  ${sizeStyles[checkboxSize].checkbox}
                  ${className}
                  appearance-none
                `}
                aria-invalid={hasError}
                aria-describedby={
                  error ? `${checkboxId}-error` : helperText ? `${checkboxId}-helper` : undefined
                }
                {...props}
              />
              {(checked || indeterminate) && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {indeterminate ? (
                    <Minus className={`${sizeStyles[checkboxSize].icon} text-white`} />
                  ) : (
                    <Check className={`${sizeStyles[checkboxSize].icon} text-white`} />
                  )}
                </div>
              )}
            </div>
          </div>

          {label && (
            <label
              htmlFor={checkboxId}
              className={`
                ml-2 text-sm font-medium text-gray-700 cursor-pointer
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {label}
              {props.required && <span className="text-error-500 ml-1">*</span>}
            </label>
          )}
        </div>

        {error && (
          <p id={`${checkboxId}-error`} className="mt-1.5 ml-7 text-sm text-error-600">
            {error}
          </p>
        )}

        {!error && helperText && (
          <p id={`${checkboxId}-helper`} className="mt-1.5 ml-7 text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

// ============================================================
// Checkbox Group Component
// ============================================================

export interface CheckboxGroupOption {
  value: string | number;
  label: string | React.ReactNode;
  disabled?: boolean;
}

export interface CheckboxGroupProps {
  label?: string;
  error?: string;
  helperText?: string;
  options: CheckboxGroupOption[];
  value: (string | number)[];
  onChange: (value: (string | number)[]) => void;
  disabled?: boolean;
  required?: boolean;
  orientation?: 'vertical' | 'horizontal';
  checkboxSize?: 'sm' | 'md' | 'lg';
}

export const CheckboxGroup: React.FC<CheckboxGroupProps> = ({
  label,
  error,
  helperText,
  options,
  value,
  onChange,
  disabled = false,
  required = false,
  orientation = 'vertical',
  checkboxSize = 'md'
}) => {
  const handleChange = (optionValue: string | number, checked: boolean) => {
    if (checked) {
      onChange([...value, optionValue]);
    } else {
      onChange(value.filter((v) => v !== optionValue));
    }
  };

  const groupId = `checkbox-group-${Math.random().toString(36).substr(2, 9)}`;
  const hasError = !!error;

  return (
    <div>
      {label && (
        <div className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </div>
      )}

      <div
        role="group"
        aria-labelledby={label ? groupId : undefined}
        className={`
          flex gap-4
          ${orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap'}
        `}
      >
        {options.map((option) => (
          <Checkbox
            key={option.value}
            label={option.label}
            checked={value.includes(option.value)}
            onChange={(e) => handleChange(option.value, e.target.checked)}
            disabled={disabled || option.disabled}
            checkboxSize={checkboxSize}
          />
        ))}
      </div>

      {error && (
        <p className="mt-2 text-sm text-error-600">
          {error}
        </p>
      )}

      {!error && helperText && (
        <p className="mt-2 text-sm text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  );
};

CheckboxGroup.displayName = 'CheckboxGroup';

// ============================================================
// Radio Component
// ============================================================

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string | React.ReactNode;
  error?: string;
  helperText?: string;
  radioSize?: 'sm' | 'md' | 'lg';
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  (
    {
      label,
      error,
      helperText,
      radioSize = 'md',
      className = '',
      id,
      disabled,
      checked,
      ...props
    },
    ref
  ) => {
    const radioId = id || `radio-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = !!error;

    const baseStyles = `
      rounded-full border-2 transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-neon-green/50
      disabled:bg-gray-100 disabled:cursor-not-allowed
      cursor-pointer appearance-none
    `;

    const stateStyles = hasError
      ? 'border-error-500'
      : checked
      ? 'border-brand-dark-green'
      : 'border-gray-300 hover:border-brand-dark-green';

    const innerDotStyles = checked
      ? 'after:content-[""] after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:bg-brand-dark-green'
      : '';

    const dotSizes = {
      sm: 'after:w-2 after:h-2',
      md: 'after:w-2.5 after:h-2.5',
      lg: 'after:w-3 after:h-3'
    };

    return (
      <div className="flex flex-col">
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              ref={ref}
              type="radio"
              id={radioId}
              disabled={disabled}
              checked={checked}
              className={`
                ${baseStyles}
                ${stateStyles}
                ${sizeStyles[radioSize].checkbox}
                ${innerDotStyles}
                ${dotSizes[radioSize]}
                ${className}
                relative
              `}
              aria-invalid={hasError}
              aria-describedby={
                error ? `${radioId}-error` : helperText ? `${radioId}-helper` : undefined
              }
              {...props}
            />
          </div>

          {label && (
            <label
              htmlFor={radioId}
              className={`
                ml-2 text-sm font-medium text-gray-700 cursor-pointer
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {label}
              {props.required && <span className="text-error-500 ml-1">*</span>}
            </label>
          )}
        </div>

        {error && (
          <p id={`${radioId}-error`} className="mt-1.5 ml-7 text-sm text-error-600">
            {error}
          </p>
        )}

        {!error && helperText && (
          <p id={`${radioId}-helper`} className="mt-1.5 ml-7 text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Radio.displayName = 'Radio';

// ============================================================
// Radio Group Component
// ============================================================

export interface RadioGroupOption {
  value: string | number;
  label: string | React.ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps {
  label?: string;
  error?: string;
  helperText?: string;
  options: RadioGroupOption[];
  value: string | number;
  onChange: (value: string | number) => void;
  name: string;
  disabled?: boolean;
  required?: boolean;
  orientation?: 'vertical' | 'horizontal';
  radioSize?: 'sm' | 'md' | 'lg';
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  label,
  error,
  helperText,
  options,
  value,
  onChange,
  name,
  disabled = false,
  required = false,
  orientation = 'vertical',
  radioSize = 'md'
}) => {
  const groupId = `radio-group-${Math.random().toString(36).substr(2, 9)}`;
  const hasError = !!error;

  return (
    <div>
      {label && (
        <div id={groupId} className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </div>
      )}

      <div
        role="radiogroup"
        aria-labelledby={label ? groupId : undefined}
        className={`
          flex gap-4
          ${orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap'}
        `}
      >
        {options.map((option) => (
          <Radio
            key={option.value}
            name={name}
            label={option.label}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            disabled={disabled || option.disabled}
            radioSize={radioSize}
          />
        ))}
      </div>

      {error && (
        <p className="mt-2 text-sm text-error-600">
          {error}
        </p>
      )}

      {!error && helperText && (
        <p className="mt-2 text-sm text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  );
};

RadioGroup.displayName = 'RadioGroup';

// ============================================================
// Switch Component
// ============================================================

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string | React.ReactNode;
  error?: string;
  helperText?: string;
  switchSize?: 'sm' | 'md' | 'lg';
  labelPosition?: 'left' | 'right';
}

const switchSizes = {
  sm: {
    container: 'w-8 h-4',
    toggle: 'h-3 w-3',
    translate: 'translate-x-4'
  },
  md: {
    container: 'w-11 h-6',
    toggle: 'h-5 w-5',
    translate: 'translate-x-5'
  },
  lg: {
    container: 'w-14 h-7',
    toggle: 'h-6 w-6',
    translate: 'translate-x-7'
  }
};

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  (
    {
      label,
      error,
      helperText,
      switchSize = 'md',
      labelPosition = 'right',
      className = '',
      id,
      disabled,
      checked,
      ...props
    },
    ref
  ) => {
    const switchId = id || `switch-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = !!error;

    return (
      <div className="flex flex-col">
        <div className="flex items-center">
          {label && labelPosition === 'left' && (
            <label
              htmlFor={switchId}
              className={`
                mr-3 text-sm font-medium text-gray-700 cursor-pointer
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {label}
              {props.required && <span className="text-error-500 ml-1">*</span>}
            </label>
          )}

          <button
            type="button"
            role="switch"
            id={switchId}
            aria-checked={checked}
            disabled={disabled}
            onClick={() => {
              const event = {
                target: { checked: !checked }
              } as React.ChangeEvent<HTMLInputElement>;
              props.onChange?.(event);
            }}
            className={`
              relative inline-flex flex-shrink-0 rounded-full
              transition-colors duration-200 ease-in-out
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-neon-green/50
              disabled:opacity-50 disabled:cursor-not-allowed
              ${checked ? 'bg-brand-dark-green' : 'bg-gray-300'}
              ${switchSizes[switchSize].container}
              ${className}
            `}
          >
            <input
              ref={ref}
              type="checkbox"
              className="sr-only"
              checked={checked}
              disabled={disabled}
              aria-invalid={hasError}
              {...props}
            />
            <span
              className={`
                pointer-events-none inline-block rounded-full bg-white shadow-lg
                transform transition-transform duration-200 ease-in-out
                ${switchSizes[switchSize].toggle}
                ${checked ? switchSizes[switchSize].translate : 'translate-x-0.5'}
              `}
            />
          </button>

          {label && labelPosition === 'right' && (
            <label
              htmlFor={switchId}
              className={`
                ml-3 text-sm font-medium text-gray-700 cursor-pointer
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {label}
              {props.required && <span className="text-error-500 ml-1">*</span>}
            </label>
          )}
        </div>

        {error && (
          <p className="mt-1.5 text-sm text-error-600">
            {error}
          </p>
        )}

        {!error && helperText && (
          <p className="mt-1.5 text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Switch.displayName = 'Switch';
