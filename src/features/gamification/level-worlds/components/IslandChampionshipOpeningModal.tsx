import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { lockPageScroll } from '../../../../utils/scrollLock';
import type { IslandChampionshipPresentation } from '../narrative/islandChampionshipPresentation';

import './IslandChampionshipOpeningModal.css';

type IslandChampionshipOpeningModalProps = {
  championship: IslandChampionshipPresentation | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenStory?: () => void;
};

export function IslandChampionshipOpeningModal({
  championship,
  isOpen,
  onClose,
  onOpenStory,
}: IslandChampionshipOpeningModalProps) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen || !championship || typeof document === 'undefined') return undefined;

    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const releaseScroll = lockPageScroll(['body', 'documentElement']);
    const focusTimer = window.setTimeout(() => dialogRef.current?.focus(), 0);

    return () => {
      window.clearTimeout(focusTimer);
      releaseScroll();
      previousFocusRef.current?.focus?.();
    };
  }, [championship, isOpen]);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !championship) return null;

  const titleId = `championship-opening-title-${championship.championshipId}`;
  const descriptionId = `championship-opening-description-${championship.championshipId}`;
  const hasStory = Boolean(championship.manifestPath && onOpenStory);

  const modal = (
    <div
      className={`island-run-overlay-root championship-opening championship-opening--${championship.theme}`}
      data-reduced-motion-safe="true"
    >
      <div className="championship-opening__backdrop" aria-hidden="true" />
      <section
        ref={dialogRef}
        className="championship-opening__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
      >
        <img
          className="championship-opening__art"
          src={championship.portraitArtSrc}
          alt={championship.artAlt}
        />
        <div className="championship-opening__art-shade" aria-hidden="true" />
        <div className="championship-opening__glow" aria-hidden="true" />
        <div className="championship-opening__stars" aria-hidden="true">
          <span>✦</span><span>✧</span><span>✦</span>
        </div>

        <button
          type="button"
          className="championship-opening__close"
          aria-label={`Close ${championship.title}`}
          onClick={onClose}
        >
          ×
        </button>

        <div className="championship-opening__content">
          <div className="championship-opening__event-line">
            <span className="championship-opening__live-dot" aria-hidden="true" />
            <span>{championship.eyebrow}</span>
            <span aria-hidden="true">·</span>
            <span>Island {championship.islandNumber}</span>
          </div>

          <p className="championship-opening__host">Hosted by {championship.hostIslandName}</p>
          <h2 id={titleId}>{championship.title}</h2>
          <p className="championship-opening__tagline">{championship.tagline}</p>
          <p id={descriptionId} className="championship-opening__summary">{championship.summary}</p>

          <ol className="championship-opening__stages" aria-label={`${championship.title} stages`}>
            {championship.stages.map((stage, index) => (
              <li key={stage} className={index === 0 ? 'championship-opening__stage--active' : undefined}>
                <span className="championship-opening__stage-marker">{index + 1}</span>
                <span>{stage}</span>
              </li>
            ))}
          </ol>

          <div className="championship-opening__discipline-note">
            <span aria-hidden="true">✦</span>
            <span>Your Arena preferences shape the disciplines and session length. Competitive scoring stays fair.</span>
          </div>

          <div className="championship-opening__actions">
            <button type="button" className="championship-opening__primary" onClick={onClose}>
              Continue to the Arena
              <span aria-hidden="true">→</span>
            </button>
            {hasStory ? (
              <button type="button" className="championship-opening__secondary" onClick={onOpenStory}>
                Watch the opening story
              </button>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );

  return typeof document === 'undefined' ? modal : createPortal(modal, document.body);
}

