import React from 'react';
import { createPortal } from 'react-dom';

export type IslandNarrativeToastVariant = 'default' | 'landmark_whisper';

export type IslandNarrativeToastProps = {
  isOpen: boolean;
  speakerName: string;
  text: string;
  supportingLabel?: string;
  durationMs?: number;
  variant?: IslandNarrativeToastVariant;
  landmarkLabel?: string;
  landmarkIcon?: string;
  onDismiss: () => void;
};

const DEFAULT_DURATION_MS = 3600;

export function IslandNarrativeToast({
  isOpen,
  speakerName,
  text,
  supportingLabel,
  durationMs = DEFAULT_DURATION_MS,
  variant = 'default',
  landmarkLabel,
  landmarkIcon,
  onDismiss,
}: IslandNarrativeToastProps): React.JSX.Element | null {
  React.useEffect(() => {
    if (!isOpen) return undefined;
    const timer = window.setTimeout(onDismiss, Math.max(1200, durationMs));
    return () => window.clearTimeout(timer);
  }, [durationMs, isOpen, onDismiss]);

  if (!isOpen) return null;

  const isLandmarkWhisper = variant === 'landmark_whisper';
  const rootClassName = `island-run-overlay-root island-narrative-toast${isLandmarkWhisper ? ' island-narrative-toast--landmark-whisper' : ''}`;
  const cardClassName = `island-narrative-toast__card${isLandmarkWhisper ? ' island-narrative-toast__card--landmark-whisper' : ''}`;
  const visibleLabel = supportingLabel ?? (isLandmarkWhisper ? 'Landmark Whisper' : undefined);
  const emblem = isLandmarkWhisper ? (landmarkIcon ?? '☾') : '✦';
  const dismissLabel = isLandmarkWhisper ? `Dismiss Landmark Whisper from ${speakerName}` : 'Dismiss narrative note';

  const toast = (
    <div className={rootClassName} role="status" aria-live="polite" data-reduced-motion-safe="true" data-toast-variant={variant}>
      <button type="button" className={cardClassName} onClick={onDismiss} aria-label={dismissLabel}>
        <span className="island-narrative-toast__emblem" aria-hidden="true">{emblem}</span>
        <span className="island-narrative-toast__copy">
          {visibleLabel ? <span className="island-narrative-toast__label">{visibleLabel}</span> : null}
          <span className="island-narrative-toast__speaker">{speakerName}</span>
          {landmarkLabel ? <span className="island-narrative-toast__landmark">{landmarkLabel}</span> : null}
          <span className="island-narrative-toast__text">{text}</span>
        </span>
      </button>
    </div>
  );

  if (typeof document === 'undefined') return toast;
  return createPortal(toast, document.body);
}
