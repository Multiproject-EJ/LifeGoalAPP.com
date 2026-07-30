import type React from 'react';
import { applyCreatureArtFallback } from '../gamification/level-worlds/components/creatureArtFallback';
import type { FeedPetCompanionPresentation } from './feedPetCompanionPresentation';

export interface FeedPetModalProps {
  companion: FeedPetCompanionPresentation | null;
  isClaiming: boolean;
  hasClaimedToday: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onFeed: () => void;
}

export function FeedPetModal(props: FeedPetModalProps): React.JSX.Element {
  const {
    companion,
    isClaiming,
    hasClaimedToday,
    errorMessage,
    onClose,
    onFeed,
  } = props;
  const title = companion ? `Feed ${companion.name}` : 'Feed Pet';
  const subtitle = companion
    ? `${companion.name} is ready for today's care. Feeding grants +15 🎲 dice.`
    : 'Choose an active companion in the Sanctuary to bring them into this daily moment. +15 🎲 dice reward.';

  return (
    <div
      className="habit-day-nav__vision-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className={`habit-day-nav__vision-modal habit-day-nav__feed-creatures-modal${
          companion ? ` habit-day-nav__feed-creatures-modal--${companion.tier}` : ''
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="habit-day-nav__vision-modal-close"
          onClick={onClose}
          aria-label="Close feed pet"
        >
          ×
        </button>
        <div className="habit-day-nav__todays-offer-body habit-day-nav__feed-creatures-body">
          <p className="habit-day-nav__feed-creatures-kicker">
            {companion ? 'Your active companion' : 'Your sanctuary'}
          </p>

          {companion ? (
            <div
              className="habit-day-nav__feed-creatures-stage"
              data-creature-id={companion.creatureId}
              aria-label={`${companion.name}, ${companion.rarityLabel} ${companion.affinity} companion`}
            >
              <span className="habit-day-nav__feed-creatures-aura" aria-hidden="true" />
              <img
                className="habit-day-nav__feed-creatures-art"
                src={companion.cutoutSrc}
                alt={`${companion.name}, your active companion`}
                onError={(event) => {
                  applyCreatureArtFallback(event, {
                    pngSrc: companion.cutoutPngSrc,
                    silhouetteSrc: companion.silhouetteSrc,
                  });
                }}
              />
              <span className="habit-day-nav__feed-creatures-fallback" aria-hidden="true">
                {companion.emojiFallback}
              </span>
            </div>
          ) : (
            <div className="habit-day-nav__feed-creatures-stage habit-day-nav__feed-creatures-stage--empty" aria-hidden="true">
              <span className="habit-day-nav__feed-creatures-empty-icon">🐾</span>
            </div>
          )}

          <p className="habit-day-nav__todays-offer-title habit-day-nav__feed-creatures-title">{title}</p>

          {companion ? (
            <div className="habit-day-nav__feed-creatures-meta" aria-label="Companion details">
              <span>{companion.rarityLabel}</span>
              <span>{companion.affinity}</span>
              <span>Bond Lv. {companion.bondLevel}</span>
            </div>
          ) : null}

          <p className="habit-day-nav__todays-offer-subtitle habit-day-nav__feed-creatures-subtitle">
            {subtitle}
          </p>
          <button
            type="button"
            className="habit-day-nav__todays-offer-buy habit-day-nav__feed-creatures-feed-button"
            disabled={isClaiming || hasClaimedToday}
            onClick={onFeed}
          >
            {isClaiming
              ? 'Feeding…'
              : hasClaimedToday
                ? companion
                  ? `✓ ${companion.name} fed today`
                  : '✓ Fed today'
                : companion
                  ? `Feed ${companion.name}`
                  : 'Feed Now'}
          </button>
          {errorMessage ? (
            <p className="habit-day-nav__bonus-error" role="status" aria-live="polite">
              {errorMessage}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
