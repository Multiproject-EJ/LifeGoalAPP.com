import React from 'react';
import { applyCreatureArtFallback } from './creatureArtFallback';
import type { CreatureCardSimpleView } from '../services/creatureCardV2Types';
import './CreatureCardSimpleFront.css';

export interface CreatureCardSimpleFrontProps {
  view: CreatureCardSimpleView;
  className?: string;
  progressLabel?: string;
}

export function CreatureCardSimpleFront({
  view,
  className,
  progressLabel,
}: CreatureCardSimpleFrontProps): React.JSX.Element {
  const { displayName, rarityLabel, starLabel, image, state, collection } = view;
  const resolvedProgressLabel = progressLabel ?? collection.progressLabel;

  return (
    <article
      className={[
        'creature-card-simple-front',
        `creature-card-simple-front--${view.rarity}`,
        state.active ? 'creature-card-simple-front--active' : '',
        state.locked ? 'creature-card-simple-front--locked' : '',
        state.discovered ? 'creature-card-simple-front--owned' : 'creature-card-simple-front--undiscovered',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={`${displayName} collectible card`}
    >
      <div className="creature-card-simple-front__image-wrap">
        <img
          className="creature-card-simple-front__image"
          src={image.cutoutSrc}
          alt={state.locked ? 'Locked creature silhouette' : `${displayName} cutout`}
          loading="lazy"
          onError={(event) => {
            applyCreatureArtFallback(event, {
              silhouetteSrc: image.silhouetteSrc,
            });
          }}
        />
        <span className="creature-card-simple-front__emoji" style={{ display: 'none' }} aria-hidden="true">
          {image.fallbackEmoji}
        </span>
        {state.active ? <span className="creature-card-simple-front__pill creature-card-simple-front__pill--active">Active</span> : null}
        {state.locked ? <span className="creature-card-simple-front__pill creature-card-simple-front__pill--locked">Locked</span> : null}
      </div>

      <div className="creature-card-simple-front__meta">
        <p className="creature-card-simple-front__name">{displayName}</p>
        <p className="creature-card-simple-front__rarity" aria-label={`${rarityLabel} rarity`}>
          <span className="creature-card-simple-front__stars" aria-hidden="true">{starLabel}</span>
          <span>{rarityLabel}</span>
        </p>
        {!state.locked && resolvedProgressLabel ? (
          <p className="creature-card-simple-front__progress">{resolvedProgressLabel}</p>
        ) : null}
      </div>
    </article>
  );
}
