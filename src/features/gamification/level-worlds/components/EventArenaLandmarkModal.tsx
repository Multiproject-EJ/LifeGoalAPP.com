import type { ReactNode } from 'react';
import type { IslandChampionshipPresentation } from '../narrative/islandChampionshipPresentation';
import './EventArenaLandmarkModal.css';

export type EventArenaBoostStatus = 'claimed' | 'no_active_event' | string;

type Props = {
  championship: IslandChampionshipPresentation | null;
  onOpenCeremony: () => void;
  boostStatus: EventArenaBoostStatus;
  /** Ordinary timed events are unlocked (the stadium flow owns the body). */
  ordinaryEvents: boolean;
  /** Entered by a door tile: the landmark must be completed before rolling. */
  doorRequired: boolean;
  /** False while a stadium round is owed; the player cannot leave yet. */
  canClose: boolean;
  onClose: () => void;
  onFinishOrientation?: () => void;
  onJoinOpeningGames?: () => void;
  /** The stadium activity (game choice, comparisons, save status). */
  children?: ReactNode;
};

/**
 * Stop 3 Event Arena landmark. One compact, no-scroll surface on a phone:
 * a short hero that states the single rule once, then the game choice.
 * Presentation only — every gameplay action arrives as a callback.
 */
export function EventArenaLandmarkModal({
  championship,
  onOpenCeremony,
  boostStatus,
  ordinaryEvents,
  doorRequired,
  canClose,
  onClose,
  onFinishOrientation,
  onJoinOpeningGames,
  children,
}: Props) {
  const orientation = !ordinaryEvents && boostStatus === 'no_active_event';
  const reconnecting = ordinaryEvents && boostStatus === 'no_active_event';
  return (
    <div className="island-run-overlay-root island-stop-modal-backdrop event-arena-modal-backdrop" role="presentation">
      <section className="event-arena-modal" role="dialog" aria-modal="true" aria-labelledby="event-arena-modal-title">
        <header className="event-arena-modal__header">
          <div>
            <span className="event-arena-modal__eyebrow">Landmark 3 · Event Arena</span>
            <h3 id="event-arena-modal-title">{championship?.title ?? 'Diplomatic Arena'}</h3>
          </div>
          {canClose ? (
            <button type="button" className="event-arena-modal__close" aria-label="Close Event Arena" onClick={onClose}>✕</button>
          ) : null}
        </header>

        <div className="event-arena-modal__hero">
          {championship ? <img className="event-arena-modal__hero-art" src={championship.artSrc} alt="" /> : null}
          <span className="event-arena-modal__hero-veil" aria-hidden="true" />
          <img className="event-arena-modal__emblem" src="/assets/island-run/tickets/event-arena-pass-emblem.webp" alt="" aria-hidden="true" />
          <div className="event-arena-modal__hero-copy">
            <p className="event-arena-modal__rule">
              {orientation
                ? 'Finish the quick orientation to unlock Wisdom.'
                : reconnecting
                  ? 'The event channel is reconnecting. Your stadium progress is saved.'
                  : 'Play one round — win or lose — to unlock Wisdom.'}
            </p>
            {boostStatus === 'claimed' ? (
              <span className="event-arena-modal__reward" aria-live="polite">Host gift · +3 event tickets</span>
            ) : null}
            {championship ? (
              <button type="button" className="event-arena-modal__ceremony" onClick={onOpenCeremony}>
                {championship.ceremonyCallout} <span aria-hidden="true">→</span>
              </button>
            ) : null}
          </div>
        </div>

        {doorRequired ? (
          <p className="event-arena-modal__notice" role="status"><span aria-hidden="true">🚪</span> Door entered — finish this landmark before rolling again.</p>
        ) : null}

        <div className="event-arena-modal__body">
          {orientation && onFinishOrientation ? (
            <button type="button" className="event-arena-modal__primary" onClick={onFinishOrientation}>Finish orientation</button>
          ) : null}
          {children}
          {!ordinaryEvents && onJoinOpeningGames ? (
            <button type="button" className="event-arena-modal__primary" onClick={onJoinOpeningGames}>Join the opening games</button>
          ) : null}
        </div>

        {!canClose ? (
          <p className="event-arena-modal__footer" role="status">Finish a round to leave the Arena.</p>
        ) : null}
      </section>
    </div>
  );
}
