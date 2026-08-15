import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { applyCreatureArtFallback } from './creatureArtFallback';
import { CelebrationFireworks } from '../../../../components/CelebrationFireworks';
import { lockPageScroll } from '../../../../utils/scrollLock';
import { CreatureHatchThreeExperience } from './CreatureHatchThreeExperience';
import { isEggHatchThreeCreature } from '../services/eggHatchThreePresentation';

export interface CreatureHatchRevealModalProps {
  open: boolean;
  creatureName: string;
  rarity: 'common' | 'rare' | 'mythic';
  creatureScore: number;
  imageSrc: string;
  pngFallbackSrc?: string;
  silhouetteSrc?: string;
  fallbackEmoji: string;
  creatureId?: string;
  onClose: () => void;
  onSetCompanion?: () => void;
}

function stars(rarity: CreatureHatchRevealModalProps['rarity']): string {
  if (rarity === 'mythic') return '★★★★★';
  if (rarity === 'rare') return '★★★☆☆';
  return '★☆☆☆☆';
}

export function CreatureHatchRevealModal(props: CreatureHatchRevealModalProps): React.JSX.Element | null {
  const [isHatchComplete, setIsHatchComplete] = useState(false);

  useEffect(() => {
    if (!props.open) return undefined;
    return lockPageScroll(['body', 'documentElement']);
  }, [props.open]);

  useEffect(() => {
    if (props.open) setIsHatchComplete(false);
  }, [props.open, props.creatureId]);

  if (!props.open) return null;
  const usesThreeHatch = isEggHatchThreeCreature(props.creatureId);

  const modal = (
    <div className="island-run-hatch-reveal" role="dialog" aria-modal="true" aria-label="Creature hatch reveal">
      {props.rarity !== 'common' ? (
        <CelebrationFireworks variant={props.rarity === 'mythic' ? 'hero' : 'rapid'} />
      ) : null}
      <div className={`island-run-hatch-reveal__card island-run-hatch-reveal__card--${props.rarity}`}>
        <div className="island-run-hatch-reveal__header">
          <p className="island-run-hatch-reveal__title">{props.creatureName}</p>
          <p className="island-run-hatch-reveal__score">Score {props.creatureScore}</p>
        </div>
        {usesThreeHatch ? (
          <CreatureHatchThreeExperience
            tier={props.rarity}
            initialPaletteId={props.rarity === 'mythic' ? 'orchid' : props.rarity === 'rare' ? 'sunfire' : 'verdant'}
            showReplayControl
            fallbackImageSrc={props.imageSrc}
            fallbackPngSrc={props.pngFallbackSrc}
            fallbackSilhouetteSrc={props.silhouetteSrc}
            fallbackAlt={`${props.creatureName} revealed creature`}
            className="island-run-hatch-reveal__three"
            onPhaseChange={(phase) => setIsHatchComplete(phase === 'complete')}
          />
        ) : (
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
        )}
        <p className="island-run-hatch-reveal__rarity">{props.rarity.toUpperCase()} · {stars(props.rarity)}</p>
        <p className="island-run-hatch-reveal__confirm">
          {usesThreeHatch ? 'Hatched in 3D · creature card next' : 'Added to Sanctuary'}
        </p>
      </div>
      <div className="island-run-hatch-reveal__actions">
        {props.onSetCompanion ? (
          <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary" onClick={props.onSetCompanion}>
            Set as Companion
          </button>
        ) : null}
        <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary" onClick={props.onClose}>
          {usesThreeHatch ? (isHatchComplete ? 'Reveal Creature Card' : 'Skip to Creature Card') : 'Continue'}
        </button>
      </div>
    </div>
  );

  return typeof document === 'undefined' ? modal : createPortal(modal, document.body);
}
