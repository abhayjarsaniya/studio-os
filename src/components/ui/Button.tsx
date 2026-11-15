import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'whatsapp';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-150 active:scale-[0.98] select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100';

  const sizeClasses = {
    xs: 'text-[11px] min-h-[44px] sm:min-h-[28px] px-3 sm:px-2.5 rounded-lg gap-1',
    sm: 'text-xs min-h-[48px] sm:min-h-[36px] px-4 sm:px-3 rounded-xl gap-1.5 font-medium',
    md: 'text-sm min-h-[48px] sm:min-h-[44px] px-5 sm:px-4 rounded-xl gap-2 font-semibold',
    lg: 'text-base min-h-[52px] sm:min-h-[48px] px-6 sm:px-6 rounded-xl gap-2.5 font-bold'
  }[size];

  const variantClasses = {
    primary: 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm shadow-zinc-900/10 active:bg-zinc-950',
    secondary: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200/80 active:bg-zinc-200',
    outline: 'border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 hover:border-zinc-300 shadow-xs',
    ghost: 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm shadow-rose-600/15',
    whatsapp: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20'
  }[variant];

  return (
    <button
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      <span>{children}</span>
    </button>
  );
};
