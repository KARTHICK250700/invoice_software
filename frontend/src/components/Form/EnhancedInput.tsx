import React, { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, AlertCircle, Check } from 'lucide-react';

interface EnhancedInputProps {
  label: string;
  type?: 'text' | 'email' | 'password' | 'tel' | 'number' | 'currency';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helpText?: string;
  autoFormat?: boolean;
  maxLength?: number;
  pattern?: RegExp;
  icon?: React.ComponentType<any>;
  validation?: {
    rules: Array<{
      test: (value: string) => boolean;
      message: string;
    }>;
    validateOnBlur?: boolean;
    validateOnChange?: boolean;
  };
}

export default function EnhancedInput({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error,
  helpText,
  autoFormat = false,
  maxLength,
  pattern,
  icon: Icon,
  validation
}: EnhancedInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [localError, setLocalError] = useState('');
  const [isValid, setIsValid] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatValue = (inputValue: string, inputType: string): string => {
    if (!autoFormat) return inputValue;

    switch (inputType) {
      case 'tel':
        // Format phone number: (123) 456-7890
        const digits = inputValue.replace(/\D/g, '');
        if (digits.length <= 10) {
          const match = digits.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
          if (match) {
            return `${match[1]}${match[2] ? '-' + match[2] : ''}${match[3] ? '-' + match[3] : ''}`;
          }
        }
        return digits.slice(0, 10);

      case 'currency':
        // Format currency: ₹1,234.56
        const numericValue = inputValue.replace(/[^\d.]/g, '');
        const parts = numericValue.split('.');
        if (parts[0]) {
          parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        }
        if (parts[1]) {
          parts[1] = parts[1].slice(0, 2); // Limit to 2 decimal places
        }
        return parts.length > 1 ? `${parts[0]}.${parts[1]}` : parts[0];

      default:
        return inputValue;
    }
  };

  const validateInput = (inputValue: string): boolean => {
    if (!validation) return true;

    for (const rule of validation.rules) {
      if (!rule.test(inputValue)) {
        setLocalError(rule.message);
        return false;
      }
    }

    setLocalError('');
    return true;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;

    // Apply length restriction
    if (maxLength && newValue.length > maxLength) {
      newValue = newValue.slice(0, maxLength);
    }

    // Apply pattern restriction
    if (pattern && newValue && !pattern.test(newValue)) {
      return; // Don't update if pattern doesn't match
    }

    // Format the value
    const formattedValue = formatValue(newValue, type);
    onChange(formattedValue);

    // Validate on change if enabled
    if (validation?.validateOnChange) {
      const valid = validateInput(formattedValue);
      setIsValid(valid);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);

    // Validate on blur if enabled
    if (validation?.validateOnBlur) {
      const valid = validateInput(value);
      setIsValid(valid);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    setLocalError(''); // Clear error on focus
  };

  useEffect(() => {
    // Initial validation
    if (validation && value) {
      const valid = validateInput(value);
      setIsValid(valid);
    }
  }, [value, validation]);

  const displayError = error || localError;
  const inputType = type === 'password' && showPassword ? 'text' :
                   type === 'currency' ? 'text' : type;

  const inputClassName = `
    w-full px-4 py-3 border rounded-lg transition-all duration-200 outline-none
    ${Icon ? 'pl-11' : 'pl-4'}
    ${type === 'password' ? 'pr-11' : 'pr-4'}
    ${type === 'currency' ? 'pl-8' : ''}
    ${displayError
      ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
      : isValid
        ? 'border-green-300 focus:border-green-500 focus:ring-2 focus:ring-green-500/20'
        : 'border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'
    }
    ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}
    dark:bg-gray-800 dark:border-gray-600 dark:text-white
    ${isFocused ? 'shadow-lg' : ''}
  `.trim();

  const labelClassName = `
    block text-sm font-medium mb-2 transition-colors duration-200
    ${displayError ? 'text-red-700' : isValid ? 'text-green-700' : 'text-gray-700'}
    dark:text-gray-300
  `.trim();

  return (
    <div className="space-y-1">
      <label className={labelClassName}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="relative">
        {Icon && (
          <Icon className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors duration-200 ${
            displayError ? 'text-red-400' : isValid ? 'text-green-400' : 'text-gray-400'
          }`} />
        )}

        {type === 'currency' && (
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
            ₹
          </span>
        )}

        <input
          ref={inputRef}
          type={inputType}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClassName}
        />

        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}

        {/* Validation indicators */}
        {(displayError || isValid) && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {displayError ? (
              <AlertCircle className="w-5 h-5 text-red-500" />
            ) : isValid ? (
              <Check className="w-5 h-5 text-green-500" />
            ) : null}
          </div>
        )}
      </div>

      {/* Error message */}
      {displayError && (
        <div className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4" />
          {displayError}
        </div>
      )}

      {/* Help text */}
      {helpText && !displayError && (
        <p className="text-sm text-gray-500 dark:text-gray-400">{helpText}</p>
      )}

      {/* Character count */}
      {maxLength && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-right">
          {value.length}/{maxLength}
        </p>
      )}
    </div>
  );
}