/**
 * Chapter-2 shadow hint: surfaces the player's own archetype hand next to the
 * shadow activities. Shows the dominant card's pattern under stress and the
 * unplayed shadow card, plus a tap-to-fill suggestion chip (same contract as
 * the goals/habits picker — a hint, never an answer imposed on the player).
 */

import type { CompassAnswerValue, CompassBlockDefinition } from '../types';
import { INNER_COMPASS_LABELS } from '../content/chapter2InnerCompass';
import type { CompassShadowBridgeData } from '../logic/shadowBridge';

export type CompassShadowHintProps = {
  data: CompassShadowBridgeData;
  block: CompassBlockDefinition;
  selectedOptionId: string | null;
  onPick: (questionId: string, value: CompassAnswerValue) => void;
};

export function CompassShadowHint({ data, block, selectedOptionId, onPick }: CompassShadowHintProps) {
  const suggestionId = data.suggestedShadowOptionId;
  const suggestionInOptions =
    suggestionId != null && (block.options ?? []).some((option) => option.id === suggestionId);
  const suggestionLabel = suggestionId ? INNER_COMPASS_LABELS[suggestionId] ?? null : null;

  return (
    <aside className="compass-shadow-hint" aria-label="Hint from your Player Hand">
      <p className="compass-shadow-hint__eyebrow">🃏 From your Player Hand</p>
      <p className="compass-shadow-hint__line">
        Under stress, your {data.dominantIcon} <strong>{data.dominantName}</strong> tends to:{' '}
        <em>{lowerFirst(data.dominantStressBehavior)}.</em>
      </p>
      <p className="compass-shadow-hint__line">
        Your unplayed shadow card is the {data.shadowIcon} <strong>{data.shadowName}</strong> — while
        it stays unplayed, its {data.shadowGift.toLowerCase()} goes missing.
      </p>
      {suggestionInOptions && suggestionLabel ? (
        <button
          type="button"
          className={`compass-shadow-hint__chip ${
            selectedOptionId === suggestionId ? 'compass-shadow-hint__chip--on' : ''
          }`}
          onClick={() => onPick(block.questionId, { kind: 'choice', optionId: suggestionId })}
        >
          Suggested: {suggestionLabel}
        </button>
      ) : null}
      <p className="compass-shadow-hint__note">
        A shadow isn't a flaw — it's energy that needs direction. Pick what feels true, not what's
        suggested.
      </p>
    </aside>
  );
}

function lowerFirst(text: string): string {
  return text.length > 0 ? text[0].toLowerCase() + text.slice(1) : text;
}
