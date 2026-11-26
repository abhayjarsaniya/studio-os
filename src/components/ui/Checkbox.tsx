import React from 'react';
import { Check } from 'lucide-react';

export interface CheckboxProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  id,
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className = ''
}) => {
  const checkboxId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <label
      htmlFor={checkboxId}
      className={`
        inline-flex items-start gap-3 min-h-[44px] py-1.5 cursor-pointer select-none touch-manipulation group
        ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
        ${className}
      `}
    >
      <div className="relative flex items-center justify-center shrink-0 mt-0.5">
        <input
          type="checkbox"
          id={checkboxId}
          checked={checked}
          disabled={disabled}
          onChange={e => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={`
            w-5 h-5 sm:w-4.5 sm:h-4.5 rounded-lg border transition-all duration-150 flex items-center justify-center
            ${checked 
              ? 'bg-orange-500 border-orange-500 text-white shadow-xs' 
              : 'border-zinc-300 bg-white group-hover:border-zinc-400'
            }
          `}
        >
          {checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </div>
      </div>

      {(label || description) && (
        <div className="space-y-0.5">
          {label && (
            <span className="block text-xs sm:text-sm font-semibold text-zinc-900 leading-tight">
              {label}
            </span>
          )}
          {description && (
            <p className="text-xs text-zinc-500 leading-normal">
              {description}
            </p>
          )}
        </div>
      )}
    </label>
  );
};
