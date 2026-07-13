import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Wires up accessible dialog behavior for a modal:
 * - Escape closes it
 * - Tab focus is trapped within the container
 * - Focus moves into the modal on open and is restored to the previously
 *   focused element on close
 *
 * Attach the returned ref to the modal's container element (give that element
 * `tabIndex={-1}` so it can receive focus as a fallback).
 */
export function useModalA11y<T extends HTMLElement>(active: boolean, onClose: () => void) {
  const containerRef = useRef<T | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const getFocusable = (): HTMLElement[] => {
      if (!container) return [];
      return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
    };

    const focusables = getFocusable();
    (focusables[0] ?? container)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !container) return;
      const current = getFocusable();
      if (current.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }
      const first = current[0];
      const last = current[current.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;
      if (event.shiftKey) {
        if (activeEl === first || !container.contains(activeEl)) {
          event.preventDefault();
          last.focus();
        }
      } else if (activeEl === last || !container.contains(activeEl)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      previouslyFocused?.focus?.();
    };
  }, [active]);

  return containerRef;
}
