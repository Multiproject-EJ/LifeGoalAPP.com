import React from 'react';
import { createPortal } from 'react-dom';

export type IslandNarrativeToastProps = {
  isOpen: boolean;
  speakerName: string;
  text: string;
  supportingLabel?: string;
  durationMs?: number;
  onDismiss: () => void;
};

const DEFAULT_DURATION_MS = 3600;

export function IslandNarrativeToast({
  isOpen,
  speakerName,
  text,
  supportingLabel,
  durationMs = DEFAULT_DURATION_MS,
  onDismiss,
}: IslandNarrativeToastProps): React.JSX.Element | null {
  React.useEffect(() => {
    if (!isOpen) return undefined;
    const timer = window.setTimeout(onDismiss, Math.max(1200, durationMs));
    return () => window.clearTimeout(timer);
  }, [durationMs, isOpen, onDismiss]);

  if (!isOpen) return null;

  const toast = (
    <div className="island-narrative-toast" role="status" aria-live="polite" data-reduced-motion-safe="true">
      <button type="button" className="island-narrative-toast__card" onClick={onDismiss} aria-label="Dismiss narrative note">
        <span className="island-narrative-toast__emblem" aria-hidden="true">✦</span>
        <span className="island-narrative-toast__copy">
          {supportingLabel ? <span className="island-narrative-toast__label">{supportingLabel}</span> : null}
          <span className="island-narrative-toast__speaker">{speakerName}</span>
          <span className="island-narrative-toast__text">{text}</span>
        </span>
      </button>
    </div>
  );

  if (typeof document === 'undefined') return toast;
  return createPortal(toast, document.body);
}
