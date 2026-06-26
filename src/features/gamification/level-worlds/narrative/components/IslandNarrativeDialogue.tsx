import React from 'react';
import { createPortal } from 'react-dom';
import { lockPageScroll } from '../../../../../utils/scrollLock';

export type IslandNarrativeDialogueTone = 'standard' | 'wisdom' | 'guardian';

export type IslandNarrativeDialogueProps = {
  isOpen: boolean;
  speakerName: string;
  portraitSrc?: string;
  portraitAlt?: string;
  text: string;
  secondaryText?: string;
  continueLabel?: string;
  closeLabel?: string;
  showClose?: boolean;
  tone?: IslandNarrativeDialogueTone;
  onContinue: () => void;
  onClose: () => void;
};

const DEFAULT_CONTINUE_LABEL = 'Continue';
const DEFAULT_CLOSE_LABEL = 'Close';
let islandNarrativeDialogueIdSequence = 0;

function useStableDialogueId(prefix: string) {
  const idRef = React.useRef<string>();
  if (!idRef.current) {
    islandNarrativeDialogueIdSequence += 1;
    idRef.current = `${prefix}-${islandNarrativeDialogueIdSequence}`;
  }
  return idRef.current;
}

function IslandNarrativePortrait({ speakerName, portraitSrc, portraitAlt }: Pick<IslandNarrativeDialogueProps, 'speakerName' | 'portraitSrc' | 'portraitAlt'>) {
  const [hasPortraitError, setHasPortraitError] = React.useState(false);

  React.useEffect(() => {
    setHasPortraitError(false);
  }, [portraitSrc]);

  if (!portraitSrc || hasPortraitError) {
    return (
      <div className="island-narrative-dialogue__portrait-fallback" role="img" aria-label={`${speakerName} portrait unavailable`} data-portrait-fallback="true">
        <span className="island-narrative-dialogue__portrait-orb" aria-hidden="true" />
        <span className="island-narrative-dialogue__portrait-initial" aria-hidden="true">{speakerName.trim().charAt(0).toUpperCase() || '✦'}</span>
      </div>
    );
  }

  return (
    <img
      className="island-narrative-dialogue__portrait-image"
      src={portraitSrc}
      alt={portraitAlt ?? ''}
      onError={() => setHasPortraitError(true)}
    />
  );
}

export function IslandNarrativeDialogue({
  isOpen,
  speakerName,
  portraitSrc,
  portraitAlt,
  text,
  secondaryText,
  continueLabel = DEFAULT_CONTINUE_LABEL,
  closeLabel = DEFAULT_CLOSE_LABEL,
  showClose = true,
  tone = 'standard',
  onContinue,
  onClose,
}: IslandNarrativeDialogueProps): React.JSX.Element | null {
  const titleId = useStableDialogueId('island-narrative-dialogue-title');
  const descriptionId = useStableDialogueId('island-narrative-dialogue-copy');
  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined;
    lastFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const releaseScroll = lockPageScroll(['body', 'documentElement']);
    window.setTimeout(() => dialogRef.current?.focus(), 0);

    return () => {
      releaseScroll();
      lastFocusedRef.current?.focus?.();
    };
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const dialogue = (
    <div className={`island-run-overlay-root island-narrative-dialogue island-narrative-dialogue--${tone} island-narrative-dialogue--motion-ready`} data-reduced-motion-safe="true">
      <div className="island-narrative-dialogue__backdrop" aria-hidden="true" />
      <div className="island-narrative-dialogue__viewport">
        <div
          ref={dialogRef}
          className="island-narrative-dialogue__card"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          tabIndex={-1}
        >
          <div className="island-narrative-dialogue__portrait-wrap" aria-hidden={portraitAlt ? undefined : true}>
            <IslandNarrativePortrait speakerName={speakerName} portraitSrc={portraitSrc} portraitAlt={portraitAlt} />
          </div>

          <div className="island-narrative-dialogue__content">
            {showClose ? (
              <button type="button" className="island-narrative-dialogue__close" aria-label={closeLabel} onClick={onClose}>
                <span aria-hidden="true">×</span>
              </button>
            ) : null}
            <p className="island-narrative-dialogue__speaker-kicker">Luma Isle</p>
            <h2 id={titleId} className="island-narrative-dialogue__speaker">{speakerName}</h2>
            <div id={descriptionId} className="island-narrative-dialogue__copy-wrap">
              <p className="island-narrative-dialogue__copy island-narrative-dialogue__copy--primary">{text}</p>
              {secondaryText ? <p className="island-narrative-dialogue__copy island-narrative-dialogue__copy--secondary">{secondaryText}</p> : null}
            </div>
            <div className="island-narrative-dialogue__actions">
              <button type="button" className="island-narrative-dialogue__continue" onClick={onContinue}>{continueLabel}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return dialogue;
  return createPortal(dialogue, document.body);
}
