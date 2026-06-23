/**
 * habitChainLogic — pure, dependency-free logic for the keystone / chain-reaction
 * habit analysis. No React, no IO, no Supabase. Safe to unit-test in isolation.
 *
 * A "chain link" records the user's (or an AI hypothesis's) belief that completing
 * one habit tends to make another habit — or a Life Wheel area — easier or harder.
 * We deliberately speak in terms of *association*, never causation:
 *   "On days you do this, these tend to feel easier."
 */

export type HabitLinkDirection = 'positive' | 'negative';
export type HabitLinkStrength = 'weak' | 'medium' | 'strong';
export type HabitLinkConsistency = 'rare' | 'sometimes' | 'often';
/** Evidence provenance — keeps user-confirmed beliefs distinct from AI hypotheses. */
export type HabitLinkEvidence = 'user_confirmed' | 'ai_hypothesis';
export type HabitLinkStatus = 'active' | 'dismissed' | 'archived';

/** The Life Wheel areas a habit can ripple into (mirrors lifeWheelTaxonomy). */
export type HabitLinkLifeArea =
  | 'Health'
  | 'Mind'
  | 'Work'
  | 'Money'
  | 'Love'
  | 'Connections'
  | 'Home'
  | 'Fun';

export type HabitChainLink = {
  id: string;
  sourceHabitId: string;
  /** Set when the ripple target is another tracked habit. */
  targetHabitId: string | null;
  /** Set when the ripple target is a Life Wheel area instead of a specific habit. */
  lifeArea: HabitLinkLifeArea | null;
  direction: HabitLinkDirection;
  strength: HabitLinkStrength;
  consistency: HabitLinkConsistency;
  evidence: HabitLinkEvidence;
  status: HabitLinkStatus;
  note: string | null;
};

/**
 * Exploratory classifications — these are gentle, non-final labels the user can
 * always disagree with. They are never presented as a diagnosis.
 */
export type HabitChainClassification =
  | 'keystone'
  | 'support'
  | 'isolated'
  | 'friction'
  | 'negative_cascade';

export type HabitChainSummary = {
  classification: HabitChainClassification;
  positiveCount: number;
  negativeCount: number;
  /** Distinct downstream targets (habits + areas) reached by positive links. */
  distinctPositiveTargets: number;
  /** True when there are repeatable positive ripples across several areas. */
  isPossibleKeystone: boolean;
};

/** Minimum distinct positive ripples before we *gently* suggest "possible keystone". */
export const KEYSTONE_THRESHOLD = 3;

function targetKey(link: HabitChainLink): string {
  if (link.targetHabitId) return `habit:${link.targetHabitId}`;
  if (link.lifeArea) return `area:${link.lifeArea}`;
  return 'unknown';
}

/**
 * Derive a soft, exploratory classification from the active links only.
 * Dismissed/archived links never count toward a classification.
 */
export function classifyHabitChain(links: readonly HabitChainLink[]): HabitChainSummary {
  const active = links.filter((link) => link.status === 'active');
  const positives = active.filter((link) => link.direction === 'positive');
  const negatives = active.filter((link) => link.direction === 'negative');

  const distinctPositiveTargets = new Set(positives.map(targetKey)).size;
  const isPossibleKeystone = distinctPositiveTargets >= KEYSTONE_THRESHOLD;

  let classification: HabitChainClassification;
  if (isPossibleKeystone) {
    classification = 'keystone';
  } else if (negatives.length >= 2 && negatives.length >= positives.length) {
    classification = 'negative_cascade';
  } else if (positives.length >= 1) {
    classification = 'support';
  } else if (negatives.length >= 1) {
    classification = 'friction';
  } else {
    classification = 'isolated';
  }

  return {
    classification,
    positiveCount: positives.length,
    negativeCount: negatives.length,
    distinctPositiveTargets,
    isPossibleKeystone,
  };
}

/** Human, non-clinical copy for each classification. */
export function describeChainClassification(classification: HabitChainClassification): {
  label: string;
  blurb: string;
} {
  switch (classification) {
    case 'keystone':
      return {
        label: 'Possible keystone',
        blurb: 'This habit may make several other things easier. Worth protecting.',
      };
    case 'support':
      return {
        label: 'Support habit',
        blurb: 'This habit seems to give a little lift to something else.',
      };
    case 'negative_cascade':
      return {
        label: 'Possible knock-on costs',
        blurb: 'On some days this may make a few things harder. Just something to watch.',
      };
    case 'friction':
      return {
        label: 'Some friction',
        blurb: 'This one may make something else a little harder sometimes.',
      };
    case 'isolated':
    default:
      return {
        label: 'Not enough information yet',
        blurb: 'Add a ripple effect when you notice one — no rush.',
      };
  }
}

/* ------------------------------------------------------------------ */
/* AI suggestion parsing & validation                                  */
/* ------------------------------------------------------------------ */

export type ChainSuggestion = {
  /** Short label for the downstream habit or life area. */
  targetLabel: string;
  targetKind: 'habit' | 'life_area';
  direction: HabitLinkDirection;
  /** One short, non-causal sentence explaining the *possible* association. */
  rationale: string;
  confidence: 'low' | 'medium' | 'high';
};

export type ChainSuggestionResponse = {
  suggestions: ChainSuggestion[];
  safetyNote: string | null;
};

/** Max suggestions we will ever surface at once — keeps choices few. */
export const MAX_CHAIN_SUGGESTIONS = 4;

const DIRECTIONS: HabitLinkDirection[] = ['positive', 'negative'];
const CONFIDENCES: ChainSuggestion['confidence'][] = ['low', 'medium', 'high'];

function clampText(value: unknown, limit: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, limit);
}

/**
 * Validate a raw AI response (already JSON-parsed) into a safe, bounded shape.
 * Returns null when the payload is unusable. Never throws.
 *
 * Importantly, this rejects causal/diagnostic claims at the schema boundary by
 * only keeping the bounded fields we render — raw model text never reaches the UI.
 */
export function validateChainSuggestionResponse(raw: unknown): ChainSuggestionResponse | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  const rawList = Array.isArray(obj.suggestions) ? obj.suggestions : null;
  if (!rawList) return null;

  const suggestions: ChainSuggestion[] = [];
  for (const item of rawList) {
    if (suggestions.length >= MAX_CHAIN_SUGGESTIONS) break;
    if (!item || typeof item !== 'object') continue;
    const entry = item as Record<string, unknown>;

    const targetLabel = clampText(entry.target_label ?? entry.targetLabel, 60);
    const rationale = clampText(entry.rationale, 160);
    const targetKindRaw = clampText(entry.target_kind ?? entry.targetKind, 20);
    const directionRaw = clampText(entry.direction, 20) as HabitLinkDirection | null;
    const confidenceRaw = clampText(entry.confidence, 20) as ChainSuggestion['confidence'] | null;

    if (!targetLabel || !rationale) continue;
    if (!directionRaw || !DIRECTIONS.includes(directionRaw)) continue;
    const confidence = confidenceRaw && CONFIDENCES.includes(confidenceRaw) ? confidenceRaw : 'low';
    const targetKind = targetKindRaw === 'habit' ? 'habit' : 'life_area';

    suggestions.push({
      targetLabel,
      targetKind,
      direction: directionRaw,
      rationale,
      confidence,
    });
  }

  if (suggestions.length === 0) return null;

  return {
    suggestions,
    safetyNote: clampText(obj.safety_note ?? obj.safetyNote, 240),
  };
}
