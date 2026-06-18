import { useEffect, useMemo, useState } from 'react';
import { selectOffersForDisplay } from './timeBoundOfferSort';

export type EggHatchOfferId = `egg_hatch_${number}`;

export type TimeBoundOfferId =
  | 'vision_star'
  | 'daily_treats'
  | 'holiday_calendar'
  | 'todays_offer'
  | 'egg_hatch'
  | 'island_run'
  | 'zen_tree_water'
  | 'feed_creatures';

export type TimeBoundOfferKey = TimeBoundOfferId | EggHatchOfferId | `placeholder_${number}`;

export type TimeBoundOfferItem = {
  id: TimeBoundOfferKey;
  label: string;
  icon: string;
  expiresAtMs: number | null;
  badgeLabelOverride?: string;
  isCollected: boolean;
  isVisible: boolean;
  isActionable?: boolean;
  isPlaceholder?: boolean;
  visualVariant?: 'bonus' | 'vision-star';
  sortPriority?: number;
  slotRole?: 'core' | 'filler';
};

type TimeBoundOfferRowProps = {
  offers: TimeBoundOfferItem[];
  onOfferClick: (offerId: TimeBoundOfferId | EggHatchOfferId) => void;
  daysAgo?: number;
};

function formatOfferCountdown(expiresAtMs: number | null, nowMs: number): string {
  if (!expiresAtMs) return 'Live';
  const remainingMs = expiresAtMs - nowMs;
  if (remainingMs <= 0) return '0s';

  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function TimeBoundOfferRow({ offers, onOfferClick, daysAgo = 0 }: TimeBoundOfferRowProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const isBackInTime = daysAgo > 0;

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const sorted = useMemo(() => selectOffersForDisplay(offers), [offers]);

  const padded = useMemo(() => {
    if (sorted.length >= 4) return sorted;
    const placeholders: TimeBoundOfferItem[] = Array.from({ length: 4 - sorted.length }, (_, idx) => ({
      id: `placeholder_${idx}`,
      label: 'Waiting',
      icon: '⏳',
      expiresAtMs: null,
      badgeLabelOverride: 'Soon',
      isCollected: false,
      isVisible: true,
      isActionable: false,
      isPlaceholder: true,
    }));
    return [...sorted, ...placeholders];
  }, [sorted]);

  return (
    <section className={`time-bound-offers${isBackInTime ? ' time-bound-offers--past' : ''}`} aria-label="Time-bound offers">
      {padded.map((offer) => {
        const isPlaceholder = offer.isPlaceholder === true;
        const isDone = offer.isCollected && !isPlaceholder;
        const isActionable = offer.isActionable ?? (!isDone && !isPlaceholder);
        const badgeLabel = isBackInTime
          ? `${daysAgo} day${daysAgo === 1 ? '' : 's'} ago`
          : isPlaceholder
          ? offer.badgeLabelOverride ?? 'Soon'
          : offer.badgeLabelOverride ?? (isDone ? '✓ Done' : formatOfferCountdown(offer.expiresAtMs, nowMs));
        const itemStateClass = [
          isPlaceholder
            ? 'time-bound-offers__item--placeholder'
            : isDone
              ? 'time-bound-offers__item--done'
              : isActionable
                ? 'time-bound-offers__item--actionable'
                : '',
          offer.visualVariant === 'bonus' && !isPlaceholder && !isDone
            ? 'time-bound-offers__item--bonus-ready'
            : '',
          offer.visualVariant === 'vision-star' && !isPlaceholder && !isDone
            ? 'time-bound-offers__item--vision-star'
            : '',
        ].filter(Boolean).join(' ');

        return (
          <button
            key={`${offer.id}-${offer.label}`}
            type="button"
            className={`time-bound-offers__item ${itemStateClass}`.trim()}
            onClick={() => !isDone && !isPlaceholder && onOfferClick(offer.id as TimeBoundOfferId | EggHatchOfferId)}
            disabled={isDone || isPlaceholder}
            aria-label={`${offer.label} ${isPlaceholder ? 'placeholder' : isDone ? 'done' : badgeLabel}`}
          >
            {isBackInTime ? (
              <span className="time-bound-offers__poof" aria-hidden="true">💨</span>
            ) : (
              <span className="time-bound-offers__circle" aria-hidden="true">
                {isActionable ? <span className="time-bound-offers__notification" /> : null}
                <span className="time-bound-offers__icon">{offer.icon}</span>
                <span className="time-bound-offers__badge">{badgeLabel}</span>
              </span>
            )}
            {isBackInTime ? <span className="time-bound-offers__ago-label">{badgeLabel}</span> : null}
            <span className="time-bound-offers__label">{offer.label}</span>
          </button>
        );
      })}
    </section>
  );
}

export default TimeBoundOfferRow;
