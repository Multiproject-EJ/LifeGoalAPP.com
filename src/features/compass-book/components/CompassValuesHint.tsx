/**
 * Chapter-2 values hint: surfaces the values the player's top archetype cards
 * tend to hold, next to the core_values question. Tap a chip to add it to the
 * selection (multi_choice) — a hint toward True North, never an imposed answer.
 */

import type { CompassAnswerValue, CompassBlockDefinition } from '../types';
import { INNER_COMPASS_LABELS } from '../content/chapter2InnerCompass';
import type { CompassShadowBridgeData } from '../logic/shadowBridge';

export type CompassValuesHintProps = {
  data: CompassShadowBridgeData;
  block: CompassBlockDefinition;
  selectedOptionIds: string[];
  onToggle: (questionId: string, value: CompassAnswerValue | undefined) => void;
};

export function CompassValuesHint({ data, block, selectedOptionIds, onToggle }: CompassValuesHintProps) {
  const optionIds = new Set((block.options ?? []).map((option) => option.id));
  const suggestions = data.suggestedValueIds.filter((id) => optionIds.has(id));
  if (suggestions.length === 0) return null;

  const toggle = (valueId: string) => {
    const on = selectedOptionIds.includes(valueId);
    const next = on
      ? selectedOptionIds.filter((id) => id !== valueId)
      : [...selectedOptionIds, valueId];
    onToggle(
      block.questionId,
      next.length > 0 ? { kind: 'multi_choice', optionIds: next } : undefined,
    );
  };

  return (
    <aside className="compass-shadow-hint" aria-label="Values hint from your Player Hand">
      <p className="compass-shadow-hint__eyebrow">🧭 From your Player Hand</p>
      <p className="compass-shadow-hint__line">
        Your {data.dominantIcon} <strong>{data.dominantName}</strong> and its supporting cards tend to
        hold these values. Tap any that ring true — or ignore them and choose your own.
      </p>
      <div className="compass-shadow-hint__chips">
        {suggestions.map((valueId) => (
          <button
            key={valueId}
            type="button"
            className={`compass-shadow-hint__chip ${
              selectedOptionIds.includes(valueId) ? 'compass-shadow-hint__chip--on' : ''
            }`}
            onClick={() => toggle(valueId)}
          >
            {INNER_COMPASS_LABELS[valueId] ?? valueId}
          </button>
        ))}
      </div>
      <p className="compass-shadow-hint__note">
        These are a starting guess from your archetypes, not a verdict on what you value.
      </p>
    </aside>
  );
}
