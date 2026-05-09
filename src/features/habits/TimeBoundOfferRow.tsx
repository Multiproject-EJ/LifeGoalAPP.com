import { useEffect, useMemo, useState } from 'react';

export type TimeBoundOfferId =
  | 'vision_star'
  | 'daily_treats'
  | 'holiday_calendar'
  | 'todays_offer'
  | 'egg_hatch'
  | 'island_run';

type TimeBoundOfferKey = TimeBoundOfferId | `placeholder_${number}`;

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
  sortPriority?: number;
  slotRole?: 'core' | 'filler';
};

type TimeBoundOfferRowProps = {
  offers: TimeBoundOfferItem[];
  onOfferClick: (offerId: TimeBoundOfferId) => void;
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

export function TimeBoundOfferRow({ offers, onOfferClick }: TimeBoundOfferRowProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const visibleOffers = useMemo(() => offers.filter((offer) => offer.isVisible), [offers]);

  const sorted = useMemo(() => {
    const sortByStateAndPriority = (source: TimeBoundOfferItem[]) => {
      const active = source
      .filter((offer) => !offer.isCollected)
      .sort((a, b) => {
        const aExpiry = a.expiresAtMs ?? Number.MAX_SAFE_INTEGER;
        const bExpiry = b.expiresAtMs ?? Number.MAX_SAFE_INTEGER;
        if (aExpiry !== bExpiry) return aExpiry - bExpiry;
        return (a.sortPriority ?? 999) - (b.sortPriority ?? 999);
      });

      const collected = source
      .filter((offer) => offer.isCollected)
      .sort((a, b) => {
        const aExpiry = a.expiresAtMs ?? Number.MAX_SAFE_INTEGER;
        const bExpiry = b.expiresAtMs ?? Number.MAX_SAFE_INTEGER;
        if (aExpiry !== bExpiry) return aExpiry - bExpiry;
        return (a.sortPriority ?? 999) - (b.sortPriority ?? 999);
      });

      return [...active, ...collected];
    };

    const coreOffers = visibleOffers.filter((offer) => (offer.slotRole ?? 'core') === 'core');
    const fillerOffers = visibleOffers.filter((offer) => offer.slotRole === 'filler');

    const sortedCore = sortByStateAndPriority(coreOffers).slice(0, 4);
    if (sortedCore.length >= 4) {
      return sortedCore;
    }

    const remainingSlots = 4 - sortedCore.length;
    const sortedFiller = sortByStateAndPriority(fillerOffers).slice(0, remainingSlots);
    return [...sortedCore, ...sortedFiller];
  }, [visibleOffers]);

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
    <section className="time-bound-offers" aria-label="Time-bound offers">
      {padded.map((offer) => {
        const isPlaceholder = offer.isPlaceholder === true;
        const isDone = offer.isCollected && !isPlaceholder;
        const isActionable = offer.isActionable ?? (!isDone && !isPlaceholder);
        const badgeLabel = isPlaceholder
          ? offer.badgeLabelOverride ?? 'Soon'
          : offer.badgeLabelOverride ?? (isDone ? '✓ Done' : formatOfferCountdown(offer.expiresAtMs, nowMs));
        const itemStateClass = isPlaceholder
          ? 'time-bound-offers__item--placeholder'
          : isDone
            ? 'time-bound-offers__item--done'
            : isActionable
              ? 'time-bound-offers__item--actionable'
              : '';

        return (
          <button
            key={`${offer.id}-${offer.label}`}
            type="button"
            className={`time-bound-offers__item ${itemStateClass}`.trim()}
            onClick={() => !isDone && !isPlaceholder && onOfferClick(offer.id as TimeBoundOfferId)}
            disabled={isDone || isPlaceholder}
            aria-label={`${offer.label} ${isPlaceholder ? 'placeholder' : isDone ? 'done' : badgeLabel}`}
          >
            <span className="time-bound-offers__circle" aria-hidden="true">
              {isActionable ? <span className="time-bound-offers__notification" /> : null}
              <span className="time-bound-offers__icon">{offer.icon}</span>
              <span className="time-bound-offers__badge">{badgeLabel}</span>
            </span>
            <span className="time-bound-offers__label">{offer.label}</span>
          </button>
        );
      })}
    </section>
  );
}

export default TimeBoundOfferRow;
