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
    primary: 'bg-gradient-to-r from-orange-500 via-orange-500 to-amber-600 hover:from-orange-600 hover:via-orange-600 hover:to-amber-700 text-white shadow-sm shadow-orange-500/25 border border-orange-400/20 active:brightness-95 font-bold',
    secondary: 'bg-orange-50 text-orange-900 hover:bg-orange-100 border border-orange-200/80 active:bg-orange-200 font-semibold',
    outline: 'border border-zinc-200 bg-white text-zinc-800 hover:bg-orange-50/50 hover:text-orange-900 hover:border-orange-200 shadow-xs font-semibold',
    ghost: 'text-zinc-600 hover:text-orange-900 hover:bg-orange-50/60 font-semibold',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm shadow-rose-600/15 font-bold',
    whatsapp: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 font-bold'
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
