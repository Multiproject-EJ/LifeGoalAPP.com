import { useState } from 'react';

import type { WisdomTreeCard } from '../services/wisdomTreeCards';

type WisdomTreeCardEncounterProps = {
  card: WisdomTreeCard;
  islandNumber: number;
  onComplete: (message: string) => void;
};

export function WisdomTreeCardEncounter({
  card,
  islandNumber,
  onComplete,
}: WisdomTreeCardEncounterProps) {
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const selectedChoice = card.choices.find((choice) => choice.id === selectedChoiceId) ?? null;

  const handleChoiceSelect = (choiceId: string) => {
    setSelectedChoiceId(choiceId);
    setIsRevealed(true);
  };

  return (
    <section className="wisdom-tree-card" aria-labelledby={`wisdom-tree-card-${card.id}`}>
      <div className="wisdom-tree-card__glow" aria-hidden="true" />
      <div className="wisdom-tree-card__header">
        <p className="wisdom-tree-card__eyebrow">Island {islandNumber} Wisdom Tree</p>
        <p className="wisdom-tree-card__category">{card.category}</p>
      </div>
      <h3 id={`wisdom-tree-card-${card.id}`} className="wisdom-tree-card__title">
        {card.title}
      </h3>
      <p className="wisdom-tree-card__story">{card.storyLine}</p>
      <div className="wisdom-tree-card__choices" aria-label="Wisdom Tree choices">
        {card.choices.map((choice) => {
          const isSelected = choice.id === selectedChoiceId;
          return (
            <button
              key={choice.id}
              type="button"
              className={`wisdom-tree-card__choice${isSelected ? ' wisdom-tree-card__choice--selected' : ''}`}
              aria-pressed={isSelected}
              onClick={() => handleChoiceSelect(choice.id)}
            >
              {choice.label}
            </button>
          );
        })}
      </div>
      {isRevealed && selectedChoice ? (
        <div className="wisdom-tree-card__reveal" role="status">
          <p>{selectedChoice.response}</p>
          <button
            type="button"
            className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary wisdom-tree-card__complete"
            onClick={() => onComplete(selectedChoice.response)}
          >
            Carry this wisdom onward
          </button>
        </div>
      ) : (
        <p className="wisdom-tree-card__hint">Choose what feels kind. You can also leave this here.</p>
      )}
    </section>
  );
}
