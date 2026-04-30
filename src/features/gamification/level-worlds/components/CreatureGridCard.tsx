import React from 'react';
import { applyCreatureArtFallback } from './creatureArtFallback';

export interface CreatureGridCardProps {
  imageSrc: string;
  pngFallbackSrc?: string;
  silhouetteSrc?: string;
  fallbackEmoji: string;
  rarity: 'common' | 'rare' | 'mythic';
  active: boolean;
  locked: boolean;
  selected?: boolean;
  name?: string;
  onClick?: () => void;
}

function rarityStars(rarity: CreatureGridCardProps['rarity']): string {
  if (rarity === 'mythic') return '★★★★★';
  if (rarity === 'rare') return '★★★☆☆';
  return '★☆☆☆☆';
}

export function CreatureGridCard(props: CreatureGridCardProps): React.JSX.Element {
  const {
    imageSrc,
    pngFallbackSrc,
    silhouetteSrc,
    fallbackEmoji,
    rarity,
    active,
    locked,
    selected = false,
    name,
    onClick,
  } = props;

  return (
    <article className={`island-run-sanctuary-card island-run-sanctuary-card--minimal ${selected ? 'island-run-sanctuary-card--selected' : ''} ${locked ? 'island-run-sanctuary-card--locked' : ''}`}>
      <button
        type="button"
        className="island-run-sanctuary-card__minimal-hit"
        onClick={onClick}
        disabled={!onClick}
        aria-label={locked ? 'Locked creature slot' : `Open ${name ?? 'creature'}`}
      >
        <div className={`island-run-sanctuary-card__minimal-frame island-run-sanctuary-card__minimal-frame--${rarity}`}>
          <img
            className="island-run-sanctuary-card__minimal-art"
            src={imageSrc}
            alt={locked ? 'Locked creature silhouette' : `${name ?? 'Creature'} portrait`}
            loading="lazy"
            onError={(event) => {
              applyCreatureArtFallback(event, { pngSrc: pngFallbackSrc, silhouetteSrc });
            }}
          />
          <span className="island-run-sanctuary-card__minimal-emoji" style={{ display: 'none' }} aria-hidden="true">{fallbackEmoji}</span>
          {active ? <span className="island-run-sanctuary-card__active-marker" title="Active companion">★</span> : null}
          {locked ? <span className="island-run-sanctuary-card__locked-label">Locked</span> : null}
        </div>
        <p className="island-run-sanctuary-card__minimal-stars" aria-label={`${rarity} rarity`}>{rarityStars(rarity)}</p>
      </button>
    </article>
  );
}
