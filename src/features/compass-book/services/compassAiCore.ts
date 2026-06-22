/**
 * Compass AI — pure core (no Supabase/React). Request building, defensive
 * response parsing, and mapping a suggestion onto a draft answer value.
 *
 * Privacy: a help request carries ONLY the current question (prompt + options +
 * the player's current draft for that one block). It never includes other
 * answers, other chapters, or any wider Compass data.
 *
 * AI proposes only. Nothing here writes, confirms, or auto-applies anything.
 */

import type { CompassAnswerValue, CompassBlockDefinition } from '../types';

export type CompassHelpRequest = {
  chapterId: string;
  questionId: string;
  blockType: CompassBlockDefinition['type'];
  prompt: string;
  options?: { id: string; label: string }[];
  currentDraft?: string;
};

export type CompassHelpResponse = {
  /** Tentative reflection, e.g. "One possible pattern is…". Never presented as fact. */
  suggestion: string;
  /** For choice blocks: suggested option id(s) — a proposal the player may apply. */
  recommendedOptionIds?: string[];
  /** For text blocks: a suggested draft the player may use or edit. */
  draftText?: string;
};

export type CompassHelpSource = 'supabase' | 'unavailable' | 'error';

export type CompassHelpResult = {
  data: CompassHelpResponse | null;
  source: CompassHelpSource;
  /** A short, user-facing fallback message when no suggestion is available. */
  message: string | null;
};

const TEXT_BLOCK_TYPES = new Set([
  'short_text',
  'reflection',
  'sentence_completion',
]);

/** Build the minimal, privacy-respecting help request for one block. */
export function buildCompassHelpRequest(
  chapterId: string,
  block: CompassBlockDefinition,
  currentDraft?: string,
): CompassHelpRequest {
  return {
    chapterId,
    questionId: block.questionId,
    blockType: block.type,
    prompt: block.prompt,
    options: block.options?.map((o) => ({ id: o.id, label: o.label })),
    currentDraft: currentDraft && currentDraft.trim() ? currentDraft.trim() : undefined,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Defensively parse a raw endpoint response. Returns null when there is no
 * usable suggestion (empty, malformed, refusal). Never throws.
 */
export function parseCompassHelpResponse(raw: unknown): CompassHelpResponse | null {
  const record = asRecord(raw);
  if (!record) return null;

  const suggestion = typeof record.suggestion === 'string' ? record.suggestion.trim() : '';
  const draftText =
    typeof record.draftText === 'string' && record.draftText.trim()
      ? record.draftText.trim()
      : undefined;
  const recommendedOptionIds = Array.isArray(record.recommendedOptionIds)
    ? record.recommendedOptionIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
    : undefined;

  // Require at least one usable signal.
  if (!suggestion && !draftText && !(recommendedOptionIds && recommendedOptionIds.length > 0)) {
    return null;
  }

  return {
    suggestion: suggestion || 'Here is one way to think about it.',
    draftText,
    recommendedOptionIds:
      recommendedOptionIds && recommendedOptionIds.length > 0 ? recommendedOptionIds : undefined,
  };
}

/**
 * Map a help response onto a candidate draft value for a block — used by the
 * explicit "Use this" action. Returns null when the suggestion can't be applied
 * (e.g. recommended option ids that don't exist on the block). Pure; never saves.
 */
export function applyHelpToValue(
  block: CompassBlockDefinition,
  response: CompassHelpResponse,
): CompassAnswerValue | null {
  if (TEXT_BLOCK_TYPES.has(block.type)) {
    return response.draftText ? { kind: 'text', text: response.draftText } : null;
  }

  const validIds = new Set((block.options ?? []).map((o) => o.id));
  const recommended = (response.recommendedOptionIds ?? []).filter((id) => validIds.has(id));
  if (recommended.length === 0) return null;

  if (block.type === 'multi_choice') {
    return { kind: 'multi_choice', optionIds: recommended };
  }
  if (block.type === 'emotion_choice') {
    return { kind: 'emotion', optionId: recommended[0] };
  }
  if (block.type === 'single_choice') {
    return { kind: 'choice', optionId: recommended[0] };
  }
  return null;
}
