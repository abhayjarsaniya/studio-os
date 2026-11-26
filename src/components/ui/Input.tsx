import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  icon,
  rightElement,
  className = '',
  id,
  disabled,
  ...props
}, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5 font-sans">
      {label && (
        <label 
          htmlFor={inputId} 
          className="block text-xs sm:text-sm font-semibold text-zinc-700"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3.5 sm:left-3 text-zinc-400 pointer-events-none flex items-center justify-center shrink-0">
            {icon}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          className={`
            w-full min-h-[48px] sm:min-h-[42px] px-3.5 sm:px-3
            text-base sm:text-sm text-zinc-900 bg-white
            rounded-xl border transition-all duration-150
            placeholder:text-zinc-400
            touch-manipulation
            focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500
            disabled:bg-zinc-50 disabled:text-zinc-400 disabled:cursor-not-allowed
            ${icon ? 'pl-10 sm:pl-9' : ''}
            ${rightElement ? 'pr-11 sm:pr-10' : ''}
            ${error 
              ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-500/20' 
              : 'border-zinc-300 hover:border-zinc-400'
            }
            ${className}
          `}
          {...props}
        />

        {rightElement && (
          <div className="absolute right-3 sm:right-2.5 flex items-center shrink-0">
            {rightElement}
          </div>
        )}
      </div>

      {error ? (
        <p className="text-xs text-rose-600 font-medium pl-1">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-zinc-500 pl-1">{helperText}</p>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';
