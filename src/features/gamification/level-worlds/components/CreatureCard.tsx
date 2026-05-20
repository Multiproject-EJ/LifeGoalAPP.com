import React from 'react';
import type { CreatureDefinition } from '../services/creatureCatalog';
import { getCreatureCardMetadata, type CreatureCardMetadata } from '../services/creatureCardCatalog';
import { resolveCreatureArtManifest } from '../services/creatureImageManifest';
import { applyCreatureArtFallback } from './creatureArtFallback';

export interface CreatureCardProps {
  creature: CreatureDefinition;
  metadata?: CreatureCardMetadata;
  owned?: boolean;
  locked?: boolean;
  active?: boolean;
  shiny?: boolean;
  foil?: 'none' | 'soft' | 'premium';
  className?: string;
}

export function CreatureCard(props: CreatureCardProps): React.JSX.Element {
  const {
    creature,
    metadata = getCreatureCardMetadata(creature),
    owned = true,
    locked = false,
    active = false,
    shiny = false,
    foil = 'none',
    className = '',
  } = props;
  const art = resolveCreatureArtManifest(creature);
  const stateLabel = active ? 'Active Companion' : locked ? 'Locked' : owned ? 'Owned' : 'Preview';
  const classNames = [
    'creature-card',
    `creature-card--${metadata.theme.tier}`,
    `creature-card--zone-${metadata.theme.shipZone}`,
    owned ? 'creature-card--owned' : 'creature-card--preview',
    locked ? 'creature-card--locked' : '',
    active ? 'creature-card--active' : '',
    shiny ? 'creature-card--shiny-ready' : '',
    foil !== 'none' ? `creature-card--foil-${foil}` : '',
    className,
  ].filter((classNamePart) => classNamePart.length > 0).join(' ');

  return (
    <article className={classNames} aria-label={`${metadata.displayName} creature card`}>
      <div className="creature-card__inner">
        <header className="creature-card__topbar">
          <div>
            <p className="creature-card__eyebrow">{metadata.rarityLabel} · {metadata.theme.accent}</p>
            <h4 className="creature-card__name">{metadata.displayName}</h4>
          </div>
          <div className="creature-card__badges" aria-label={`${metadata.powerLabel}, ${stateLabel}`}>
            <span className="creature-card__power">{metadata.powerLabel}</span>
            <span className="creature-card__state">{stateLabel}</span>
          </div>
        </header>

        <div className="creature-card__art-window">
          <img
            className="creature-card__background"
            src={art.backgroundSrc}
            alt=""
            aria-hidden="true"
            loading="lazy"
          />
          <img
            className="creature-card__art"
            src={locked ? art.silhouetteSrc : art.cutoutSrc}
            alt={locked ? `${metadata.displayName} locked silhouette` : `${metadata.displayName} creature art`}
            loading="lazy"
            onError={(event) => {
              applyCreatureArtFallback(event, {
                pngSrc: locked ? undefined : art.cutoutPngSrc,
                silhouetteSrc: art.silhouetteSrc,
              });
            }}
          />
          <span className="creature-card__emoji-fallback" style={{ display: 'none' }} aria-hidden="true">{art.emojiFallback}</span>
        </div>

        <section className="creature-card__body">
          <div className="creature-card__identity-row">
            <p className="creature-card__title">{metadata.shortTitle}</p>
            <p className="creature-card__stat">{metadata.statLine}</p>
          </div>
          <div className="creature-card__ability">
            <p className="creature-card__ability-name">{metadata.passiveName}</p>
            <p className="creature-card__ability-text">{metadata.passiveText}</p>
          </div>
          <blockquote className="creature-card__quote">“{metadata.flavorQuote}”</blockquote>
        </section>
      </div>
    </article>
  );
}
