import React from 'react';
import { X } from 'lucide-react';
import { useModalLifecycle } from '../../hooks/useModalLifecycle';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showClose?: boolean;
  isDirty?: boolean;
  confirmMessage?: string;
  className?: string;
  fullScreenOnMobile?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
  showClose = true,
  isDirty = false,
  confirmMessage,
  className = '',
  fullScreenOnMobile = false
}) => {
  const { handleAttemptClose, handleBackdropClick } = useModalLifecycle({
    isOpen,
    onClose,
    isDirty,
    confirmMessage
  });

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    '2xl': 'max-w-4xl'
  }[maxWidth];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-zinc-950/50 backdrop-blur-xs transition-opacity" 
        onClick={handleBackdropClick}
      />

      {/* Dialog container */}
      <div 
        className={`relative w-full ${maxWidthClasses} bg-white ${
          fullScreenOnMobile 
            ? 'h-[96vh] sm:h-auto rounded-t-3xl sm:rounded-2xl' 
            : 'rounded-t-3xl sm:rounded-2xl max-h-[92vh] sm:max-h-[88vh]'
        } border-t sm:border border-zinc-200 shadow-2xl flex flex-col overflow-hidden z-10 transition-transform duration-200 ${className}`}
      >
        {/* Mobile handle */}
        <div className="w-14 h-1.5 bg-zinc-300 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

        {/* Header */}
        {(title || showClose) && (
          <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-zinc-100 flex items-center justify-between shrink-0 bg-white z-10">
            <div className="min-w-0 pr-2">
              {title && <h3 className="text-base sm:text-lg font-semibold text-zinc-900 font-display truncate">{title}</h3>}
              {subtitle && <p className="text-xs text-zinc-500 mt-0.5 truncate">{subtitle}</p>}
            </div>
            {showClose && (
              <button
                type="button"
                onClick={handleAttemptClose}
                className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-700 hover:text-zinc-900 transition-colors cursor-pointer shrink-0 shadow-xs"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain flex-1 pb-safe">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
