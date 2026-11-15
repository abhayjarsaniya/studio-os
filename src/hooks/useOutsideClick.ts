import { useEffect, RefObject } from 'react';

type AnyRef = RefObject<HTMLElement | null>;

/**
 * Custom hook to detect clicks, touches, and Escape key presses outside of specified element(s).
 * Useful for dropdown menus, popovers, select drawers, and floating panels.
 * 
 * @param refs Single ref or array of refs to ignore outside clicks on
 * @param handler Callback to run when outside click / Escape occurs
 * @param enabled Whether listener is actively listening (defaults to true)
 */
export function useOutsideClick(
  refs: AnyRef | AnyRef[],
  handler: (event: MouseEvent | TouchEvent | KeyboardEvent) => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    const refList = Array.isArray(refs) ? refs : [refs];

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      // Check if clicked inside any of the refs
      const isInside = refList.some(ref => {
        return ref.current && ref.current.contains(target);
      });

      if (!isInside) {
        handler(event);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handler(event);
      }
    };

    // Attach listeners
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [refs, handler, enabled]);
}

export default useOutsideClick;
