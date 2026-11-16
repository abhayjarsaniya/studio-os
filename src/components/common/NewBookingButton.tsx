import React from 'react';
import { Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface NewBookingButtonProps {
  className?: string;
  label?: string;
  onClick?: () => void;
  fullWidthMobile?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Signature New Booking Button — Never Change Its Identity
 * 
 * Consistent signature across:
 * - Desktop Sidebar
 * - Dashboard Top Operations Bar
 * - Shoot Calendar
 * - Bookings Directory
 * - Mobile Navigation
 * 
 * Features:
 * - Medium vibrant shiny orange gradient
 * - Soft depth and warm shadow
 * - Readable white bold text
 * - Standard Plus icon
 * - Comfortable finger-friendly touch target (min 48-52px on mobile)
 */
export const NewBookingButton: React.FC<NewBookingButtonProps> = ({
  className = '',
  label = '+ New Booking',
  onClick,
  fullWidthMobile = false,
  size = 'md'
}) => {
  const { setActiveTab } = useApp();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    } else {
      setActiveTab('create-booking');
      window.location.hash = '#/app/bookings/new';
    }
  };

  const sizeClasses = {
    sm: 'min-h-[44px] px-4 py-2 text-xs font-bold rounded-xl',
    md: 'min-h-[50px] sm:min-h-[46px] px-5 py-2.5 text-sm font-bold rounded-xl',
    lg: 'min-h-[54px] sm:min-h-[50px] px-6 py-3 text-base font-bold rounded-2xl'
  }[size];

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`bg-gradient-to-r from-orange-500 via-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white tracking-tight shadow-md shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/35 border border-orange-400/30 transition-all cursor-pointer touch-manipulation active:scale-[0.98] inline-flex items-center justify-center gap-2 select-none ${sizeClasses} ${fullWidthMobile ? 'w-full sm:w-auto' : ''} ${className}`}
      aria-label="Create new booking"
    >
      <Plus className="w-4 h-4 text-white shrink-0 stroke-[2.5]" />
      <span>{label}</span>
    </button>
  );
};
