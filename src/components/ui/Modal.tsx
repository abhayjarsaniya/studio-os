import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showClose?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
  showClose = true
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    '2xl': 'max-w-4xl'
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs transition-opacity" 
        onClick={onClose}
      />

      {/* Dialog container */}
      <div 
        className={`relative w-full ${maxWidthClasses} bg-white rounded-t-3xl sm:rounded-2xl border-t sm:border border-zinc-200 shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden z-10 transition-transform duration-200`}
      >
        {/* Mobile handle */}
        <div className="w-14 h-1.5 bg-zinc-300 rounded-full mx-auto my-2.5 sm:hidden" />

        {/* Header */}
        {(title || showClose) && (
          <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-zinc-100 flex items-center justify-between shrink-0">
            <div>
              {title && <h3 className="text-base sm:text-lg font-semibold text-zinc-900 font-display">{title}</h3>}
              {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
            </div>
            {showClose && (
              <button
                onClick={onClose}
                className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5 sm:w-4 sm:h-4" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
};
