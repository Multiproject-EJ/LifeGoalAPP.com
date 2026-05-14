import React from 'react';
import type { FirstSessionCreaturePackCardReveal } from '../services/islandRunFirstSessionCreaturePackAction';
import { CREATURE_CATALOG } from '../services/creatureCatalog';
import { resolveCreatureArtManifest } from '../services/creatureImageManifest';
import { applyCreatureArtFallback } from './creatureArtFallback';

export type FirstSessionCreaturePackModalPhase = 'intro' | 'opening' | 'revealed' | 'already_claimed' | 'error';

export interface FirstSessionCreaturePackModalProps {
  phase: FirstSessionCreaturePackModalPhase;
  cards: FirstSessionCreaturePackCardReveal[];
  diceGranted: number;
  isClaiming: boolean;
  errorMessage?: string | null;
  onOpenPack: () => void;
  onContinue: () => void;
}

function stars(rarity: FirstSessionCreaturePackCardReveal['tier']): string {
  if (rarity === 'mythic') return '★★★★★';
  if (rarity === 'rare') return '★★★☆☆';
  return '★☆☆☆☆';
}

function resolveCardArt(card: FirstSessionCreaturePackCardReveal): {
  cutoutSrc: string;
  cutoutPngSrc: string;
  silhouetteSrc: string;
  emojiFallback: string;
} {
  const creature = CREATURE_CATALOG.find((entry) => entry.id === card.creatureId);
  if (!creature) {
    return {
      cutoutSrc: '/assets/creature-placeholders/silhouette.webp',
      cutoutPngSrc: '/assets/creature-placeholders/silhouette.webp',
      silhouetteSrc: '/assets/creature-placeholders/silhouette.webp',
      emojiFallback: '🐾',
    };
  }
  const manifest = resolveCreatureArtManifest(creature);
  return {
    cutoutSrc: manifest.cutoutSrc,
    cutoutPngSrc: manifest.cutoutPngSrc,
    silhouetteSrc: manifest.silhouetteSrc,
    emojiFallback: manifest.emojiFallback,
  };
}

export function FirstSessionCreaturePackModal(props: FirstSessionCreaturePackModalProps): React.JSX.Element {
  const showReveal = props.phase === 'revealed' && props.cards.length > 0;
  const showContinue = props.phase === 'revealed' || props.phase === 'already_claimed' || props.phase === 'error';
  const title = props.phase === 'already_claimed'
    ? 'Creature Pack already opened'
    : 'You found your first Creature Pack!';
  const subtitle = props.phase === 'already_claimed'
    ? 'Your companions and dice bonus are already safe in your island run.'
    : 'Open it to meet your first island companions.';

  return (
    <div className="island-run-first-creature-pack" role="dialog" aria-modal="true" aria-labelledby="first-creature-pack-title">
      <section className="island-run-first-creature-pack__card">
        <div className="island-run-first-creature-pack__header">
          <p className="island-run-first-creature-pack__eyebrow">Island 1 Starter Pack</p>
          <h2 id="first-creature-pack-title">{title}</h2>
          <p>{subtitle}</p>
        </div>

        {props.phase === 'intro' ? (
          <div className="island-run-first-creature-pack__pack" aria-hidden="true">
            <span>✨</span>
            <strong>Creature Pack</strong>
          </div>
        ) : null}

        {props.phase === 'opening' ? (
          <div className="island-run-first-creature-pack__opening" role="status" aria-live="polite">
            <span className="island-run-first-creature-pack__sparkle">✨</span>
            <p>Opening your pack…</p>
          </div>
        ) : null}

        {showReveal ? (
          <>
            <div className="island-run-first-creature-pack__grid" aria-label="Revealed creature cards">
              {props.cards.map((card) => {
                const art = resolveCardArt(card);
                return (
                  <article
                    key={`${card.slotIndex}:${card.creatureId}`}
                    className={`island-run-first-creature-pack__creature island-run-first-creature-pack__creature--${card.tier}`}
                  >
                    <div className="island-run-first-creature-pack__creature-art">
                      <img
                        src={art.cutoutSrc}
                        alt={`${card.name} creature card`}
                        onError={(event) => {
                          applyCreatureArtFallback(event, { pngSrc: art.cutoutPngSrc, silhouetteSrc: art.silhouetteSrc });
                        }}
                      />
                      <span className="island-run-first-creature-pack__creature-emoji" aria-hidden="true">
                        {art.emojiFallback}
                      </span>
                    </div>
                    <h3>{card.name}</h3>
                    <p>{card.tier.toUpperCase()} · {stars(card.tier)}</p>
                  </article>
                );
              })}
            </div>
            <p className="island-run-first-creature-pack__bonus">+{props.diceGranted} dice added</p>
          </>
        ) : null}

        {props.phase === 'error' ? (
          <p className="island-run-first-creature-pack__message" role="alert">
            {props.errorMessage ?? 'This pack could not be opened right now. Please continue your island run.'}
          </p>
        ) : null}

        <div className="island-run-first-creature-pack__actions">
          {props.phase === 'intro' ? (
            <button
              type="button"
              className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
              onClick={props.onOpenPack}
              disabled={props.isClaiming}
            >
              {props.isClaiming ? 'Opening…' : 'Open Pack'}
            </button>
          ) : null}
          {showContinue ? (
            <button
              type="button"
              className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
              onClick={props.onContinue}
            >
              Continue
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
