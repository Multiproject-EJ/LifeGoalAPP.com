/**
 * RankBadge — presentational rank badge image.
 *
 * Resolves the badge asset through the registry (never hard-coded paths) and
 * always carries text alt for accessibility. `locked` desaturates the badge for
 * not-yet-earned ranks in the journey grid.
 */

import type { CSSProperties } from 'react';
import type { RankDefinition } from '../rankModel';
import { rankBadgeSrc, rankBadgeAlt } from '../rankAssets';
import './RankBadge.css';

export interface RankBadgeProps {
  rank: RankDefinition;
  /** Rendered pixel size (square). */
  size?: number;
  locked?: boolean;
  className?: string;
}

export function RankBadge({ rank, size = 48, locked = false, className }: RankBadgeProps) {
  const src = rankBadgeSrc(rank.id);
  const style = { '--rank-badge-size': `${size}px` } as CSSProperties;

  return (
    <span
      className={`rank-badge${locked ? ' rank-badge--locked' : ''}${className ? ` ${className}` : ''}`}
      style={style}
    >
      {src ? (
        <img
          src={src}
          alt={rankBadgeAlt(rank)}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          className="rank-badge__img"
        />
      ) : (
        // Asset-failure fallback: the rank's meaning still reads as text.
        <span className="rank-badge__fallback" aria-label={rankBadgeAlt(rank)}>
          {rank.title.charAt(0)}
        </span>
      )}
    </span>
  );
}
