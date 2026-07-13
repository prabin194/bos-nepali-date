import React from 'react';
import { cn } from '../utils/classnames';

type PickerInputProps = {
  value: string;
  placeholder: string;
  inputClassName?: string;
  inputPattern?: string | false;
  name?: string;
  label: string;
  htmlId?: string;
  allowClear?: boolean;
  disabled?: boolean;
  inputReadOnly?: boolean;
  autoFocus?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear?: () => void;
  onFocus: () => void;
  onBlur?: () => void;
  onToggle: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  maxLength?: number;
};

export const PickerInput: React.FC<PickerInputProps> = ({
  value,
  placeholder,
  inputClassName,
  inputPattern,
  name,
  label,
  htmlId,
  allowClear = false,
  disabled = false,
  inputReadOnly = false,
  autoFocus = false,
  onChange,
  onClear,
  onFocus,
  onBlur,
  onToggle,
  onKeyDown,
  maxLength = 10,
}) => (
  <div className="np-input-wrapper" onClick={disabled ? undefined : onFocus}>
    <input
      id={htmlId}
      className={cn('np-input', inputClassName)}
      name={name}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onFocus={disabled ? undefined : onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      inputMode="numeric"
      pattern={inputPattern === false ? undefined : inputPattern}
      maxLength={maxLength}
      aria-label={label}
      disabled={disabled}
      readOnly={inputReadOnly}
      autoFocus={autoFocus}
    />
    {allowClear && value && onClear && (
      <button
        type="button"
        className="np-clear-btn"
        onClick={(e) => {
          e.stopPropagation();
          onClear();
        }}
        aria-label="Clear date"
      >
        ✕
      </button>
    )}
    {!disabled && (
      <button
        type="button"
        className="np-toggle"
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        aria-label="Toggle date picker"
      >
        <svg
          className="np-toggle__icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>
    )}
  </div>
);
