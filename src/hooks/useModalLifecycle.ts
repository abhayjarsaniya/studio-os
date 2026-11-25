import { useEffect, useCallback } from 'react';

export interface UseModalLifecycleOptions {
  isOpen: boolean;
  onClose: () => void;
  isDirty?: boolean;
  confirmMessage?: string;
  closeOnEscape?: boolean;
  lockScroll?: boolean;
}

/**
 * Universal hook for modal lifecycles across Studio OS:
 * 1. Background body scroll locking (overflow = 'hidden') and restoration
 * 2. Escape key handling
 * 3. Unsaved changes confirmation dialog if dirty
 * 4. Outside click / backdrop click handling
 */
export function useModalLifecycle({
  isOpen,
  onClose,
  isDirty = false,
  confirmMessage = 'Discard unsaved changes? Any edits you made will not be saved.',
  closeOnEscape = true,
  lockScroll = true
}: UseModalLifecycleOptions) {
  const handleAttemptClose = useCallback(() => {
    if (isDirty) {
      if (window.confirm(confirmMessage)) {
        onClose();
      }
    } else {
      onClose();
    }
  }, [isDirty, confirmMessage, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    let originalOverflow = '';
    if (lockScroll) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        e.stopPropagation();
        handleAttemptClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (lockScroll) {
        document.body.style.overflow = originalOverflow || 'unset';
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeOnEscape, lockScroll, handleAttemptClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (e.target === e.currentTarget) {
        e.stopPropagation();
        handleAttemptClose();
      }
    },
    [handleAttemptClose]
  );

  return {
    handleAttemptClose,
    handleBackdropClick
  };
}

export default useModalLifecycle;
