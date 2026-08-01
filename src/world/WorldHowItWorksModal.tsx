import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { lockPageScroll } from '../utils/scrollLock';
import { JourneyPreview } from './JourneyPreview';
import { SocialProof } from './SocialProof';

interface WorldHowItWorksModalProps {
  open: boolean;
  onClose: () => void;
}

export function WorldHowItWorksModal({ open, onClose }: WorldHowItWorksModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const releaseScroll = lockPageScroll(['body', 'documentElement']);

    const focusDialog = window.requestAnimationFrame(() => dialogRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute('hidden'));
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusDialog);
      document.removeEventListener('keydown', handleKeyDown);
      releaseScroll();
      previousFocusRef.current?.focus();
    };
  }, [onClose, open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="world-home__how-modal-root">
      <button
        className="world-home__how-modal-backdrop"
        type="button"
        aria-label="Close how HabitGame works"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        className="world-home__how-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="world-home-how-modal-title"
        tabIndex={-1}
      >
        <header className="world-home__how-modal-header">
          <div>
            <p>THE HABITGAME PHILOSOPHY</p>
            <h2 id="world-home-how-modal-title">How does it work?</h2>
            <span>A kinder loop between play, reflection, and the life waiting outside the screen.</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="world-home__how-modal-scroll">
          <JourneyPreview />

          <section className="world-home__restart-card" aria-labelledby="world-home-modal-gentle-title">
            <p className="world-home__restart-eyebrow" aria-hidden="true">GENTLE BY DESIGN</p>
            <h2 className="world-home__restart-title" id="world-home-modal-gentle-title">
              No perfect streak required.
            </h2>
            <p className="world-home__restart-copy">
              Life has pauses, setbacks, and restarts. HabitGame is built to welcome you back,
              help you adjust what didn&apos;t work, and continue your quest gently.
            </p>
          </section>

          <SocialProof />

          <button className="world-home__how-modal-return" type="button" onClick={onClose}>
            <span aria-hidden="true">←</span> Back to the world
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
