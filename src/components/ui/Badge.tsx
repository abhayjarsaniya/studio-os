import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = ''
}) => {
  const sizeClasses = size === 'sm' 
    ? 'text-[11px] font-medium px-2 py-0.5' 
    : 'text-xs font-medium px-2.5 py-1';

  const variantClasses = {
    default: 'bg-zinc-100 text-zinc-700 border border-zinc-200/80',
    outline: 'border border-zinc-300 text-zinc-700 bg-white',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/70',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200/70',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200/70',
    info: 'bg-sky-50 text-sky-700 border border-sky-200/70',
    purple: 'bg-purple-50 text-purple-700 border border-purple-200/70'
  }[variant];

  return (
    <span className={`inline-flex items-center gap-1 rounded-full tracking-wide ${sizeClasses} ${variantClasses} ${className}`}>
      {children}
    </span>
  );
};
