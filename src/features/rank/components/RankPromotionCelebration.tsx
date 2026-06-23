/**
 * RankPromotionCelebration — the "Promotion Earned" moment.
 *
 * Shown once when the player's derived rank passes their acknowledged rank, at a
 * safe game-progress moment (the player menu open — never mid-reflection). For
 * multi-rank jumps it shows the final rank prominently with the skipped ranks as
 * small earned cards (the condensed presentation decision, investigation §10/§H).
 *
 * Reuses ConfettiBurst (DPR-aware, self-dismissing, honours
 * prefers-reduced-motion). Presentational — the caller persists acknowledgement
 * on continue.
 */

import { useEffect, useState } from 'react';
import type { RankDefinition } from '../rankModel';
import { ConfettiBurst } from '../../gamification/level-worlds/components/ConfettiBurst';
import { RankBadge } from './RankBadge';
import './RankPromotionCelebration.css';

export interface RankPromotionCelebrationProps {
  fromRank: RankDefinition;
  toRank: RankDefinition;
  /** Intermediate ranks crossed in a multi-rank jump (may be empty). */
  skippedRanks: RankDefinition[];
  onContinue: () => void;
}

const prefersReducedMotion = (): boolean => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

export function RankPromotionCelebration({
  fromRank,
  toRank,
  skippedRanks,
  onContinue,
}: RankPromotionCelebrationProps) {
  const reduceMotion = prefersReducedMotion();
  // Crossfade from the previous badge into the new one (skipped when reduced).
  const [revealed, setRevealed] = useState(reduceMotion);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setTimeout(() => setRevealed(true), 420);
    return () => window.clearTimeout(timer);
  }, [reduceMotion]);

  const jumped = toRank.id - fromRank.id;
  const headline = jumped > 1 ? `You advanced ${jumped} ranks` : 'Promotion Earned';

  return (
    <div className="rank-promo" role="dialog" aria-modal="true" aria-label={`Promotion to ${toRank.title}`}>
      <ConfettiBurst active variant="standard" onComplete={() => undefined} />
      <div className="rank-promo__backdrop" />
      <div className="rank-promo__content">
        <p className="rank-promo__eyebrow">{headline}</p>

        <div className={`rank-promo__badges${revealed ? ' rank-promo__badges--revealed' : ''}`}>
          <span className="rank-promo__badge rank-promo__badge--from" aria-hidden={revealed}>
            <RankBadge rank={fromRank} size={84} />
          </span>
          <span className="rank-promo__badge rank-promo__badge--to">
            <RankBadge rank={toRank} size={140} />
          </span>
        </div>

        <h2 className="rank-promo__title">{toRank.title}</h2>
        <p className="rank-promo__desc">{toRank.description}</p>

        {skippedRanks.length > 0 ? (
          <div className="rank-promo__skipped" aria-label="Ranks earned along the way">
            <span className="rank-promo__skipped-label">Also earned</span>
            <ul className="rank-promo__skipped-list">
              {skippedRanks.map((rank) => (
                <li key={rank.id} className="rank-promo__skipped-item">
                  <RankBadge rank={rank} size={32} />
                  <span className="rank-promo__skipped-name">{rank.title}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <button type="button" className="rank-promo__continue" onClick={onContinue} autoFocus>
          Continue
        </button>
      </div>
    </div>
  );
}
