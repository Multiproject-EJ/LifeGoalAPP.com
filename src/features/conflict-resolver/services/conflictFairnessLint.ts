import type { ResolutionOption, SharedSummaryCard } from './conflictAiSchemas';

export type FairnessWarningCode =
  | 'side_balance_risk'
  | 'blame_language_risk'
  | 'solution_asymmetry_risk';

export type FairnessWarning = {
  code: FairnessWarningCode;
  message: string;
};

const BLAME_PATTERNS = [
  /\byou always\b/i,
  /\byou never\b/i,
  /\byou made me\b/i,
  /\byou are\b/i,
  /\bit'?s your fault\b/i,
];

const FIRST_PERSON_PATTERNS = [/\bi\b/i, /\bmy\b/i, /\bwe\b/i, /\bour\b/i];
const SECOND_PERSON_PATTERNS = [/\byou\b/i, /\byour\b/i];

function countMatches(text: string, patterns: RegExp[]): number {
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

export function lintSharedSummaryFairness(cards: SharedSummaryCard[]): FairnessWarning[] {
  const warnings: FairnessWarning[] = [];
  const combined = cards.map((card) => card.text).join(' ').toLowerCase();
  const firstPersonSignals = countMatches(combined, FIRST_PERSON_PATTERNS);
  const secondPersonSignals = countMatches(combined, SECOND_PERSON_PATTERNS);
  const blameSignals = countMatches(combined, BLAME_PATTERNS);

  if (blameSignals > 0) {
    warnings.push({
      code: 'blame_language_risk',
      message: 'Summary still contains direct-blame phrasing.',
    });
  }

  const balanceDelta = Math.abs(firstPersonSignals - secondPersonSignals);
  if (balanceDelta >= 3) {
    warnings.push({
      code: 'side_balance_risk',
      message: 'Summary framing may over-index one side of the conflict.',
    });
  }

  return warnings;
}

export function lintResolutionOptionFairness(options: ResolutionOption[]): FairnessWarning[] {
  const warnings: FairnessWarning[] = [];
  const combined = options
    .map((option) => `${option.title} ${option.description}`)
    .join(' ')
    .toLowerCase();

  const meSignals = (combined.match(/\b(i|me|my)\b/g) ?? []).length;
  const youSignals = (combined.match(/\b(you|your)\b/g) ?? []).length;
  if (Math.abs(meSignals - youSignals) >= 3) {
    warnings.push({
      code: 'solution_asymmetry_risk',
      message: 'Resolution options may be biased toward one participant.',
    });
  }

  return warnings;
}

