/**
 * Shared per-block slot builders so every Compass answering surface (the
 * Player-Menu guided flow and the in-game stop fragment) renders the goals/habits
 * picker and the optional AI "Help me think" affordance identically.
 */

import type { ReactNode } from 'react';
import type {
  CompassAnswerValue,
  CompassBlockDefinition,
  CompassBookChapterId,
} from '../types';
import { CompassAIHelper } from './CompassAIHelper';
import { CompassPlayerPicker } from './CompassPlayerPicker';
import { isCompassAiAvailable } from '../services/compassAi';
import { optionsForPickSource, pickSourceNoun, type CompassPlayerData } from '../logic/playerOptions';

type DraftValues = Record<string, CompassAnswerValue | undefined>;
type OnChange = (questionId: string, value: CompassAnswerValue | undefined) => void;

/** Block types the "Help me think" affordance can assist with. */
const AI_HELP_BLOCK_TYPES = new Set([
  'single_choice',
  'multi_choice',
  'emotion_choice',
  'short_text',
  'reflection',
  'sentence_completion',
]);

/** A `renderPick` slot: tap one of the player's real goals/habits to fill a text answer. */
export function makePickSlot(
  playerData: CompassPlayerData,
  onChange: OnChange,
): (block: CompassBlockDefinition) => ReactNode {
  return (block) => {
    if (!block.pickFrom) return null;
    const options = optionsForPickSource(playerData, block.pickFrom);
    if (options.length === 0) return null;
    const refKind = block.pickFrom === 'player_goals' ? 'goal' : 'habit';
    return (
      <CompassPlayerPicker
        options={options}
        sourceNoun={pickSourceNoun(block.pickFrom)}
        onPick={(option) =>
          onChange(block.questionId, {
            kind: 'text',
            text: option.label,
            sourceRef: { kind: refKind, id: option.id },
          })
        }
      />
    );
  };
}

/**
 * A `renderHelp` slot, or `undefined` when no AI backend is available (so the
 * surface degrades silently to fixed-guided).
 */
export function makeHelpSlot(
  chapterId: CompassBookChapterId,
  draft: DraftValues,
  onChange: OnChange,
): ((block: CompassBlockDefinition) => ReactNode) | undefined {
  if (!isCompassAiAvailable()) return undefined;
  return (block) =>
    AI_HELP_BLOCK_TYPES.has(block.type) ? (
      <CompassAIHelper
        chapterId={chapterId}
        block={block}
        currentText={draft[block.questionId]?.kind === 'text' ? (draft[block.questionId] as { kind: 'text'; text: string }).text : undefined}
        onApply={(value) => onChange(block.questionId, value)}
      />
    ) : null;
}
