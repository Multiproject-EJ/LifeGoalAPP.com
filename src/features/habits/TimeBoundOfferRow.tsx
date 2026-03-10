import { useMemo } from 'react';

export type TimeBoundOfferId =
  | 'vision_star'
  | 'daily_treat'
  | 'lucky_roll'
  | 'spin_wheel'
  | 'boss_challenge'
  | 'egg_hatch'
  | 'mystery_stop';

export type TimeBoundOfferItem = {
  id: TimeBoundOfferId;
  label: string;
  icon: string;
  expiresAtMs: number | null;
  isCollected: boolean;
  isVisible: boolean;
  sortPriority?: number;
};

type TimeBoundOfferRowProps = {
  offers: TimeBoundOfferItem[];
  onOfferClick: (offerId: TimeBoundOfferId) => void;
};

function formatOfferCountdown(expiresAtMs: number | null): string {
  if (!expiresAtMs) return 'Live';
  const remainingMs = expiresAtMs - Date.now();
  if (remainingMs <= 0) return 'Expired';

  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${Math.max(0, minutes)}m`;
}

export function TimeBoundOfferRow({ offers, onOfferClick }: TimeBoundOfferRowProps) {
  const visibleOffers = useMemo(() => offers.filter((offer) => offer.isVisible), [offers]);

  const sorted = useMemo(() => {
    const active = visibleOffers
      .filter((offer) => !offer.isCollected)
      .sort((a, b) => {
        const aExpiry = a.expiresAtMs ?? Number.MAX_SAFE_INTEGER;
        const bExpiry = b.expiresAtMs ?? Number.MAX_SAFE_INTEGER;
        if (aExpiry !== bExpiry) return aExpiry - bExpiry;
        return (a.sortPriority ?? 999) - (b.sortPriority ?? 999);
      });

    const collected = visibleOffers
      .filter((offer) => offer.isCollected)
      .sort((a, b) => {
        const aExpiry = a.expiresAtMs ?? Number.MAX_SAFE_INTEGER;
        const bExpiry = b.expiresAtMs ?? Number.MAX_SAFE_INTEGER;
        if (aExpiry !== bExpiry) return aExpiry - bExpiry;
        return (a.sortPriority ?? 999) - (b.sortPriority ?? 999);
      });

    const merged = [...active, ...collected];
    return merged.slice(0, 4);
  }, [visibleOffers]);

  const padded = useMemo(() => {
    if (sorted.length >= 4) return sorted;
    const placeholders = Array.from({ length: 4 - sorted.length }, (_, idx) => ({
      id: `placeholder_${idx}` as TimeBoundOfferId,
      label: 'Waiting',
      icon: '⏳',
      expiresAtMs: null,
      isCollected: true,
      isVisible: true,
    }));
    return [...sorted, ...placeholders];
  }, [sorted]);

  return (
    <section className="time-bound-offers" aria-label="Time-bound offers">
      {padded.map((offer) => {
        const isPlaceholder = offer.id.startsWith('placeholder_');
        const isDone = offer.isCollected || isPlaceholder;
        const badgeLabel = isDone ? '✓ Done' : formatOfferCountdown(offer.expiresAtMs);

        return (
          <button
            key={`${offer.id}-${offer.label}`}
            type="button"
            className={`time-bound-offers__item ${isDone ? 'time-bound-offers__item--done' : ''}`}
            onClick={() => !isDone && !isPlaceholder && onOfferClick(offer.id)}
            disabled={isDone || isPlaceholder}
            aria-label={`${offer.label} ${isDone ? 'done' : badgeLabel}`}
          >
            <span className="time-bound-offers__circle" aria-hidden="true">
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
