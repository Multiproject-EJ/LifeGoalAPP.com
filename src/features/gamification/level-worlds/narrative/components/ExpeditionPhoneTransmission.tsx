import React from 'react';
import { createPortal } from 'react-dom';
import { lockPageScroll } from '../../../../../utils/scrollLock';

export interface ExpeditionPhoneTransmissionProps {
  isOpen: boolean;
  sourceLabel: string;
  headline: string;
  text: string;
  secondaryText?: string;
  objectiveText: string;
  progressCurrent: number;
  progressTotal: number;
  ctaLabel: string;
  /** `incoming` waits for Read; `direct` assumes a phone-button click opened it. */
  entryMode?: 'incoming' | 'direct';
  onDeviceOpen?: () => void;
  onAcknowledge: () => void;
}

type ExpeditionPhonePhase = 'incoming' | 'unfolding' | 'open';

const UNFOLD_DURATION_MS = 2450;

export function ExpeditionPhoneTransmission({
  isOpen,
  sourceLabel,
  headline,
  text,
  secondaryText,
  objectiveText,
  progressCurrent,
  progressTotal,
  ctaLabel,
  entryMode = 'incoming',
  onDeviceOpen,
  onAcknowledge,
}: ExpeditionPhoneTransmissionProps): React.JSX.Element | null {
  const [phase, setPhase] = React.useState<ExpeditionPhonePhase>('incoming');
  const titleId = React.useId();
  const copyId = React.useId();
  const openButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const acknowledgeButtonRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    if (!isOpen) {
      setPhase('incoming');
      return undefined;
    }
    setPhase(entryMode === 'direct' ? 'unfolding' : 'incoming');
    if (typeof document === 'undefined') return undefined;
    const unlockScroll = lockPageScroll();
    const focusTimer = window.setTimeout(() => openButtonRef.current?.focus(), 80);
    return () => {
      window.clearTimeout(focusTimer);
      unlockScroll();
    };
  }, [entryMode, isOpen]);

  React.useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    [
      '/tech/ExpeditionPhone_v19_folded.webp',
      '/tech/ExpeditionPhone_v21_opening.webp',
      '/tech/ExpeditionPhone_v11_open_front.webp',
    ]
      .forEach((src) => {
        const image = new Image();
        image.src = src;
      });
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen || phase !== 'unfolding') return undefined;
    const reduceMotion = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => setPhase('open'), reduceMotion ? 1 : UNFOLD_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [isOpen, phase]);

  React.useEffect(() => {
    if (phase !== 'open') return;
    acknowledgeButtonRef.current?.focus();
  }, [phase]);

  if (!isOpen || typeof document === 'undefined') return null;

  const safeCurrent = Math.max(0, Math.min(Math.floor(progressCurrent), Math.max(1, Math.floor(progressTotal))));
  const safeTotal = Math.max(1, Math.floor(progressTotal));

  const beginUnfold = () => {
    if (phase !== 'incoming') return;
    onDeviceOpen?.();
    setPhase('unfolding');
  };

  return createPortal(
    <div className="expedition-phone-transmission" data-phase={phase} role="presentation">
      <div className="expedition-phone-transmission__aura" aria-hidden="true" />

      {phase === 'incoming' ? (
        <section className="expedition-phone-transmission__incoming-card" role="dialog" aria-modal="true" aria-label="Incoming message from Central Command">
          <span className="expedition-phone-transmission__incoming-signal" aria-hidden="true">
            <span>!</span>
          </span>
          <p className="expedition-phone-transmission__incoming-kicker">Bip!</p>
          <h2>Incoming message</h2>
          <p>Central Command</p>
          <button
            ref={openButtonRef}
            type="button"
            className="expedition-phone-transmission__read"
            onClick={beginUnfold}
          >
            Read
          </button>
        </section>
      ) : (
        <section
          className="expedition-phone-transmission__device"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={copyId}
        >
          <img
            className="expedition-phone-transmission__opening-animation"
            src="/tech/ExpeditionPhone_v21_opening.webp"
            alt=""
            aria-hidden="true"
          />
          <img
            className="expedition-phone-transmission__shell"
            src="/tech/ExpeditionPhone_v11_open_front.webp"
            alt=""
            aria-hidden="true"
          />
          <div className="expedition-phone-transmission__screen">
            <header className="expedition-phone-transmission__header">
              <span className="expedition-phone-transmission__secure">
                <span aria-hidden="true">▣</span> Secure transmission
              </span>
              <span className="expedition-phone-transmission__source">{sourceLabel}</span>
            </header>

            <div className="expedition-phone-transmission__mission">
              <p className="expedition-phone-transmission__mission-number">Field order</p>
              <h2 id={titleId}>{headline}</h2>
              <p id={copyId} className="expedition-phone-transmission__command">{text}</p>
              {secondaryText ? (
                <p className="expedition-phone-transmission__context">{secondaryText}</p>
              ) : null}
            </div>

            <div className="expedition-phone-transmission__objective">
              <span>
                <small>Objective</small>
                <strong>{objectiveText}</strong>
              </span>
              <b>{safeCurrent}/{safeTotal}</b>
            </div>

            <button
              ref={acknowledgeButtonRef}
              type="button"
              className="expedition-phone-transmission__accept"
              onClick={onAcknowledge}
              disabled={phase !== 'open'}
            >
              <span aria-hidden="true">◎</span>
              {ctaLabel}
            </button>
          </div>
        </section>
      )}
    </div>,
    document.body,
  );
}
