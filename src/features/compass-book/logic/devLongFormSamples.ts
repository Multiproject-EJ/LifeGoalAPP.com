import type { CompassAnswerValue, CompassBlockDefinition } from '../types';

/**
 * Dev long-form Compass Book (user request 2026-09-30): sample answers that
 * satisfy every answerable block, so a developer can fill the whole book in
 * one go and then edit any answer. Pure; persistence stays in useCompassBook.
 */
export function buildDevSampleAnswer(
  block: CompassBlockDefinition,
  answered: Record<string, CompassAnswerValue | undefined>,
): CompassAnswerValue | null {
  const optionIds = resolveOptionIds(block, answered);
  switch (block.type) {
    case 'single_choice':
      return optionIds[0] ? { kind: 'choice', optionId: optionIds[0] } : null;
    case 'emotion_choice':
      return optionIds[0] ? { kind: 'emotion', optionId: optionIds[0] } : null;
    case 'multi_choice': {
      const want = Math.max(1, block.minSelections ?? 1);
      const take = Math.min(optionIds.length, block.maxSelections ?? want, Math.max(want, 1));
      return take > 0 ? { kind: 'multi_choice', optionIds: optionIds.slice(0, take) } : null;
    }
    case 'ranking':
      return optionIds.length > 0 ? { kind: 'ranking', orderedOptionIds: optionIds } : null;
    case 'scale': {
      const min = block.min ?? 1;
      const max = block.max ?? 5;
      return { kind: 'scale', value: Math.round((min + max) / 2) };
    }
    case 'short_text':
    case 'reflection':
    case 'sentence_completion':
    case 'experiment':
    case 'check_in': {
      const text = `Sample: ${block.prompt.replace(/[?.:…]+$/, '').slice(0, 60)}`;
      return { kind: 'text', text: block.maxLength ? text.slice(0, block.maxLength) : text };
    }
    case 'confirmation':
      return { kind: 'confirmation', confirmed: true };
    default:
      return null;
  }
}

function resolveOptionIds(block: CompassBlockDefinition, answered: Record<string, CompassAnswerValue | undefined>): string[] {
  if (block.optionsFromAnsweredQuestionIds) {
    return block.optionsFromAnsweredQuestionIds.filter((id) => {
      const value = answered[id];
      return value?.kind === 'text' && value.text.trim().length > 0;
    });
  }
  if (block.optionsFromQuestionId) {
    const source = answered[block.optionsFromQuestionId];
    if (source?.kind === 'multi_choice') return source.optionIds;
    if (source?.kind === 'ranking') return source.orderedOptionIds;
    if (source?.kind === 'choice') return [source.optionId];
    return [];
  }
  return (block.options ?? []).map((option) => option.id);
}

/** Fill every block of an activity in order (later blocks may read earlier answers). */
export function buildDevSampleActivityAnswers(
  blocks: readonly CompassBlockDefinition[],
  existing: Record<string, CompassAnswerValue | undefined>,
  /** Chapter-wide answers: some option pools come from earlier activities. */
  chapterValues: Record<string, CompassAnswerValue | undefined> = {},
): Record<string, CompassAnswerValue> {
  const values: Record<string, CompassAnswerValue | undefined> = { ...chapterValues, ...existing };
  const filled: Record<string, CompassAnswerValue> = {};
  for (const block of blocks) {
    if (values[block.questionId]) continue;
    const sample = buildDevSampleAnswer(block, values);
    if (sample) {
      values[block.questionId] = sample;
      filled[block.questionId] = sample;
    }
  }
  return filled;
}
