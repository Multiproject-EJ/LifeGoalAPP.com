import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { lockPageScroll } from '../../../../../utils/scrollLock';
import './ConcordFirstContactTransmission.css';

export interface ConcordFirstContactTransmissionProps {
  isOpen: boolean;
  speakerName: string;
  headline?: string;
  text: string;
  secondaryText?: string;
  objectiveText?: string;
  ctaLabel: string;
  portraitSrc?: string;
  onSignalLock?: () => void;
  onAcknowledge: () => void;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * The Concord's first translated call. Presentation-only: the technology is
 * already active and the narrative controller owns the one-time seen marker.
 */
export function ConcordFirstContactTransmission({
  isOpen,
  speakerName,
  headline = 'FIRST CONTACT',
  text,
  secondaryText,
  objectiveText,
  ctaLabel,
  portraitSrc = '/assets/island_caretakers/001/IMG_caretaker_3d_blue.webp',
  onSignalLock,
  onAcknowledge,
}: ConcordFirstContactTransmissionProps) {
  const titleId = useId();
  const descriptionId = useId();
  const continueRef = useRef<HTMLButtonElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const onSignalLockRef = useRef(onSignalLock);
  const onAcknowledgeRef = useRef(onAcknowledge);
  const reducedMotion = prefersReducedMotion();

  onSignalLockRef.current = onSignalLock;
  onAcknowledgeRef.current = onAcknowledge;

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined;
    lastFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const releaseScroll = lockPageScroll(['body', 'documentElement']);
    const focusTimer = window.setTimeout(() => continueRef.current?.focus(), reducedMotion ? 0 : 1250);
    const signalTimer = window.setTimeout(() => onSignalLockRef.current?.(), reducedMotion ? 0 : 760);
    return () => {
      window.clearTimeout(focusTimer);
      window.clearTimeout(signalTimer);
      releaseScroll();
      lastFocusedRef.current?.focus?.();
    };
  }, [isOpen, reducedMotion]);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onAcknowledgeRef.current();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const body = (
    <div
      className="island-run-overlay-root concord-first-contact"
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      role="presentation"
    >
      <div className="concord-first-contact__backdrop" aria-hidden="true" />
      <section
        className="concord-first-contact__console"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <div className="concord-first-contact__edge concord-first-contact__edge--left" aria-hidden="true" />
        <div className="concord-first-contact__edge concord-first-contact__edge--right" aria-hidden="true" />

        <header className="concord-first-contact__header">
          <div className="concord-first-contact__identity">
            <span className="concord-first-contact__glyph" aria-hidden="true">◈</span>
            <span>THE CONCORD</span>
          </div>
          <div className="concord-first-contact__signal" aria-label="Translation signal locked">
            <i /><i /><i /><i />
            <span>LOCKED</span>
          </div>
        </header>

        <div className="concord-first-contact__screen">
          <div className="concord-first-contact__scan" aria-hidden="true" />
          <div className="concord-first-contact__reticle" aria-hidden="true" />
          <div className="concord-first-contact__live-chip"><span aria-hidden="true" /> LIVE TRANSLATION</div>

          <div className="concord-first-contact__portrait-stage">
            <div className="concord-first-contact__portrait-halo" aria-hidden="true" />
            <img
              className="concord-first-contact__portrait"
              src={portraitSrc}
              alt={`${speakerName}, the Luma Isle caretaker`}
            />
            <div className="concord-first-contact__translation-wave" aria-hidden="true">
              {Array.from({ length: 18 }, (_, index) => <i key={index} />)}
            </div>
          </div>

          <div className="concord-first-contact__speaker">
            <span>CARETAKER CHANNEL</span>
            <strong>{speakerName}</strong>
          </div>

          <div className="concord-first-contact__message">
            <p className="concord-first-contact__eyebrow">{headline}</p>
            <h2 id={titleId}>{text}</h2>
            {secondaryText ? <p id={descriptionId}>{secondaryText}</p> : <p id={descriptionId}>The Concord has translated its first island voice.</p>}
          </div>

          {objectiveText ? (
            <div className="concord-first-contact__mission">
              <span aria-hidden="true">✦</span>
              <p><small>SHARED PURPOSE</small>{objectiveText}</p>
            </div>
          ) : null}
        </div>

        <footer className="concord-first-contact__footer">
          <button
            ref={continueRef}
            type="button"
            className="concord-first-contact__continue"
            onClick={onAcknowledge}
          >
            <span>{ctaLabel}</span>
            <b aria-hidden="true">›</b>
          </button>
          <p>Creature · Caretaker · Story channels now available</p>
        </footer>
      </section>
    </div>
  );

  return typeof document === 'undefined' ? body : createPortal(body, document.body);
}
