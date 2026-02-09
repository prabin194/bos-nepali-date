import React from 'react';
import clsx from 'clsx';

type PickerInputProps = {
  value: string;
  placeholder: string;
  inputClassName?: string;
  inputPattern?: string | false;
  label: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus: () => void;
  onToggle: () => void;
};

export const PickerInput: React.FC<PickerInputProps> = ({
  value,
  placeholder,
  inputClassName,
  inputPattern,
  label,
  onChange,
  onFocus,
  onToggle,
}) => (
  <div className="np-input-wrapper" onClick={onFocus}>
    <input
      className={clsx('np-input', inputClassName)}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onFocus={onFocus}
      inputMode="numeric"
      pattern={inputPattern === false ? undefined : inputPattern}
      maxLength={10}
      aria-label={label}
    />
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
  </div>
);
