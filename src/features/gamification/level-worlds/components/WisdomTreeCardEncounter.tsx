import { useState } from 'react';

import { getLifeWheelAreaMeta } from '../../../life-wheel/lifeWheelTaxonomy';
import type { WisdomTreeCard } from '../services/wisdomTreeCards';
import {
  WisdomLifeAreaWheel,
  type WisdomLifeAreaMatch,
} from './WisdomLifeAreaWheel';

type WisdomTreeCardEncounterProps = {
  card: WisdomTreeCard;
  islandNumber: number;
  onComplete: (message: string) => void;
};

const CATEGORY_GLYPHS: Record<WisdomTreeCard['category'], string> = {
  Flame: '✦',
  Hearth: '⌂',
  Tide: '≈',
  Storm: 'ϟ',
  Bloom: '❀',
  Mirror: '◈',
};

export function WisdomTreeCardEncounter({
  card,
  islandNumber,
  onComplete,
}: WisdomTreeCardEncounterProps) {
  const [selectedMatch, setSelectedMatch] = useState<WisdomLifeAreaMatch | null>(null);
  const [matchConfirmed, setMatchConfirmed] = useState(false);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const selectedChoice = card.choices.find((choice) => choice.id === selectedChoiceId) ?? null;
  const selectedAreaMeta = selectedMatch && selectedMatch !== 'no_match'
    ? getLifeWheelAreaMeta(selectedMatch)
    : null;
  const matchLabel = selectedAreaMeta?.shortLabel ?? 'No clear match';

  const handleMatch = (match: WisdomLifeAreaMatch) => {
    setSelectedMatch(match);
    setSelectedChoiceId(null);
    setMatchConfirmed(true);
  };

  const handleComplete = () => {
    if (!selectedChoice) return;
    onComplete(`${matchLabel}: ${selectedChoice.response}`);
  };

  return (
    <section className="wisdom-tree-card" aria-labelledby={`wisdom-tree-card-${card.id}`}>
      <div className="wisdom-tree-card__aurora" aria-hidden="true" />
      <div className="wisdom-tree-card__stars" aria-hidden="true">
        <span>✦</span>
        <span>·</span>
        <span>✧</span>
        <span>·</span>
      </div>

      <header className="wisdom-tree-card__hero">
        <div className="wisdom-tree-card__sigil" aria-hidden="true">
          <span>{CATEGORY_GLYPHS[card.category]}</span>
        </div>
        <div>
          <p className="wisdom-tree-card__eyebrow">Island {islandNumber} · Wisdom Stop</p>
          <h3 id={`wisdom-tree-card-${card.id}`} className="wisdom-tree-card__title">
            Match the hidden signal
          </h3>
        </div>
        <p className="wisdom-tree-card__category">{card.category}</p>
      </header>

      {!matchConfirmed ? (
        <>
          <div className="wisdom-tree-card__clue">
            <span aria-hidden="true">“</span>
            <div>
              <strong>{card.title}</strong>
              <p>{card.storyLine}</p>
            </div>
          </div>
          <div className="wisdom-tree-card__step">
            <span>1</span>
            <div>
              <strong>What is this really about?</strong>
              <small>Match the words to the closest part of your life.</small>
            </div>
          </div>
          <WisdomLifeAreaWheel selectedMatch={selectedMatch} onSelect={handleMatch} />
        </>
      ) : (
        <div className="wisdom-tree-card__response-stage">
          <button
            type="button"
            className="wisdom-tree-card__back"
            onClick={() => {
              setMatchConfirmed(false);
              setSelectedChoiceId(null);
            }}
          >
            ← Spin again
          </button>

          <div className="wisdom-tree-card__match-result" role="status">
            <span aria-hidden="true">{selectedAreaMeta?.emoji ?? '○'}</span>
            <div>
              <small>Your closest match</small>
              <strong>{matchLabel}</strong>
            </div>
            <span aria-hidden="true">✓</span>
          </div>

          <div className="wisdom-tree-card__step">
            <span>2</span>
            <div>
              <strong>Choose what you carry onward</strong>
              <small>There is no wrong answer and no streak to protect.</small>
            </div>
          </div>

          <div className="wisdom-tree-card__choices" aria-label="Choose a gentle response">
            {card.choices.map((choice) => {
              const isSelected = choice.id === selectedChoiceId;
              return (
                <button
                  key={choice.id}
                  type="button"
                  className={`wisdom-tree-card__choice${isSelected ? ' wisdom-tree-card__choice--selected' : ''}`}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedChoiceId(choice.id)}
                >
                  <span aria-hidden="true">{isSelected ? '✓' : '✦'}</span>
                  <span>
                    <strong>{choice.label}</strong>
                    {isSelected ? <small>{choice.response}</small> : null}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedChoice ? (
            <div className="wisdom-tree-card__reveal">
              <p>{selectedChoice.response}</p>
              <button
                type="button"
                className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary wisdom-tree-card__complete"
                onClick={handleComplete}
              >
                Carry this wisdom onward
                <span aria-hidden="true">→</span>
              </button>
            </div>
          ) : (
            <p className="wisdom-tree-card__hint">Pick the line that feels most useful right now.</p>
          )}
        </div>
      )}
    </section>
  );
}
