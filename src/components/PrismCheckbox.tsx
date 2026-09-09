import React from 'react';

export interface PrismCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: 'small' | 'default' | 'large';
  iconOnly?: boolean;
  className?: string;
  id?: string;
}

export const PrismCheckbox: React.FC<PrismCheckboxProps> = ({
  checked,
  onChange,
  label = 'Trust this device',
  description,
  disabled = false,
  size = 'default',
  iconOnly = false,
  className = '',
  id,
}) => {
  const sizeClass =
    size === 'small'
      ? 'prism-checkbox--small'
      : size === 'large'
      ? 'prism-checkbox--large'
      : '';
  const iconClass = iconOnly ? 'prism-checkbox--icon-only' : '';

  return (
    <label className={`prism-checkbox ${sizeClass} ${iconClass} ${className}`.trim()}>
      <input
        id={id}
        className="prism-checkbox__input"
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        aria-label={label}
      />

      <span className="prism-checkbox__box" aria-hidden="true">
        <span className="prism-checkbox__grid"></span>
        <span className="prism-checkbox__glow"></span>

        <svg
          className="prism-checkbox__check"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M5 12.5L9.5 17L19 7.5"></path>
        </svg>

        <span className="prism-checkbox__particle prism-checkbox__particle--1"></span>
        <span className="prism-checkbox__particle prism-checkbox__particle--2"></span>
        <span className="prism-checkbox__particle prism-checkbox__particle--3"></span>
        <span className="prism-checkbox__particle prism-checkbox__particle--4"></span>
        <span className="prism-checkbox__particle prism-checkbox__particle--5"></span>
        <span className="prism-checkbox__particle prism-checkbox__particle--6"></span>
      </span>

      {!iconOnly && (label || description) && (
        <span className="prism-checkbox__content">
          {label && <span className="prism-checkbox__label">{label}</span>}
          {description && <span className="prism-checkbox__description">{description}</span>}
        </span>
      )}
    </label>
  );
};
