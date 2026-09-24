import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { applyCreatureArtFallback } from './creatureArtFallback';
import { CelebrationFireworks } from '../../../../components/CelebrationFireworks';
import { lockPageScroll } from '../../../../utils/scrollLock';
import { CreatureHatchThreeExperience } from './CreatureHatchThreeExperience';
import { isEggHatchThreeCreature } from '../services/eggHatchThreePresentation';
import { getEggStageArtSrc } from '../services/eggService';
import './CreatureHatchRevealModal.css';

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
  progressLabel?: string;
  continueLabel?: string;
}

function stars(rarity: CreatureHatchRevealModalProps['rarity']): string {
  if (rarity === 'mythic') return '★★★★★';
  if (rarity === 'rare') return '★★★☆☆';
  return '★☆☆☆☆';
}

export function CreatureHatchRevealModal(props: CreatureHatchRevealModalProps): React.JSX.Element | null {
  const [isHatchComplete, setIsHatchComplete] = useState(false);
  const usesThreeHatch = isEggHatchThreeCreature(props.creatureId);
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!props.open) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, [props.open]);

  useEffect(() => {
    if (!props.open) return undefined;
    return lockPageScroll(['body', 'documentElement']);
  }, [props.open]);

  useEffect(() => {
    if (props.open) setIsHatchComplete(false);
  }, [props.open, props.creatureId]);

  useEffect(() => {
    if (!props.open || usesThreeHatch) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => setIsHatchComplete(true), reduced ? 250 : 2200);
    return () => window.clearTimeout(timer);
  }, [props.open, props.creatureId, usesThreeHatch]);

  if (!props.open) return null;

  const modal = (
    <div ref={dialog} className="island-run-hatch-reveal" role="dialog" aria-modal="true" aria-label="Creature hatch reveal"
      onKeyDown={(event) => {
        if (event.key === 'Escape') props.onClose();
        if (event.key !== 'Tab') return;
        const buttons = Array.from(dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
        const first = buttons[0]; const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}>
      {props.rarity !== 'common' ? (
        <CelebrationFireworks variant={props.rarity === 'mythic' ? 'hero' : 'rapid'} />
      ) : null}
      <div className={`island-run-hatch-reveal__card island-run-hatch-reveal__card--${props.rarity}`}>
        <div className="island-run-hatch-reveal__header">
          {props.progressLabel ? <p role="status">{props.progressLabel}</p> : null}
          <p className="island-run-hatch-reveal__title">{isHatchComplete ? props.creatureName : 'Someone is ready to meet you'}</p>
          {isHatchComplete && props.creatureScore > 0 ? <p className="island-run-hatch-reveal__score">Score {props.creatureScore}</p> : null}
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
          <div className={`island-run-hatch-reveal__hero ${isHatchComplete ? 'egg-reveal-arrival' : 'egg-reveal-incubating'}`}>
            {!isHatchComplete ? <img className="island-run-hatch-reveal__art egg-reveal-shell"
              src={getEggStageArtSrc(props.rarity, 3)} alt="Your egg is cracking open" /> : <>
            <img
              className="island-run-hatch-reveal__art"
              src={props.imageSrc}
              alt={`${props.creatureName} revealed creature`}
              onError={(event) => {
                applyCreatureArtFallback(event, { pngSrc: props.pngFallbackSrc, silhouetteSrc: props.silhouetteSrc });
              }}
            />
            <span className="island-run-hatch-reveal__emoji" style={{ display: 'none' }} aria-hidden="true">{props.fallbackEmoji}</span>
            </>}
          </div>
        )}
        <p className="island-run-hatch-reveal__rarity">{props.rarity.toUpperCase()} · {stars(props.rarity)}</p>
        <p className="island-run-hatch-reveal__confirm">
          {isHatchComplete ? 'Added to Sanctuary · creature card next' : 'Opening your egg…'}
        </p>
      </div>
      <div className="island-run-hatch-reveal__actions">
        {props.onSetCompanion && isHatchComplete ? (
          <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary" onClick={props.onSetCompanion}>
            Set as Companion
          </button>
        ) : null}
        <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary" onClick={props.onClose}>
          {props.continueLabel ?? (isHatchComplete ? 'Reveal Creature Card' : 'Skip to Creature Card')}
        </button>
      </div>
    </div>
  );

  return typeof document === 'undefined' ? modal : createPortal(modal, document.body);
}
