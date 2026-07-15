import React from 'react';
import { applyCreatureArtFallback } from './creatureArtFallback';
import { CelebrationFireworks } from '../../../../components/CelebrationFireworks';

export interface CreatureHatchRevealModalProps {
  open: boolean;
  creatureName: string;
  rarity: 'common' | 'rare' | 'mythic';
  creatureScore: number;
  imageSrc: string;
  pngFallbackSrc?: string;
  silhouetteSrc?: string;
  fallbackEmoji: string;
  onClose: () => void;
  onSetCompanion?: () => void;
}

function stars(rarity: CreatureHatchRevealModalProps['rarity']): string {
  if (rarity === 'mythic') return '★★★★★';
  if (rarity === 'rare') return '★★★☆☆';
  return '★☆☆☆☆';
}

export function CreatureHatchRevealModal(props: CreatureHatchRevealModalProps): React.JSX.Element | null {
  if (!props.open) return null;

  return (
    <div className="island-run-hatch-reveal" role="dialog" aria-modal="true" aria-label="Creature hatch reveal">
      {props.rarity !== 'common' ? (
        <CelebrationFireworks variant={props.rarity === 'mythic' ? 'hero' : 'rapid'} />
      ) : null}
      <div className={`island-run-hatch-reveal__card island-run-hatch-reveal__card--${props.rarity}`}>
        <div className="island-run-hatch-reveal__header">
          <p className="island-run-hatch-reveal__title">{props.creatureName}</p>
          <p className="island-run-hatch-reveal__score">Score {props.creatureScore}</p>
        </div>
        <div className="island-run-hatch-reveal__hero">
          <img
            className="island-run-hatch-reveal__art"
            src={props.imageSrc}
            alt={`${props.creatureName} revealed creature`}
            onError={(event) => {
              applyCreatureArtFallback(event, { pngSrc: props.pngFallbackSrc, silhouetteSrc: props.silhouetteSrc });
            }}
          />
          <span className="island-run-hatch-reveal__emoji" style={{ display: 'none' }} aria-hidden="true">{props.fallbackEmoji}</span>
        </div>
        <p className="island-run-hatch-reveal__rarity">{props.rarity.toUpperCase()} · {stars(props.rarity)}</p>
        <p className="island-run-hatch-reveal__confirm">Added to Sanctuary</p>
      </div>
      <div className="island-run-hatch-reveal__actions">
        {props.onSetCompanion ? (
          <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary" onClick={props.onSetCompanion}>
            Set as Companion
          </button>
        ) : null}
        <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary" onClick={props.onClose}>
          Continue
        </button>
      </div>
    </div>
  );
}
