/**
 * tipOfDayContent — pure, deterministic card-deck builder for the "Tip of the Day
 * — AI Coach" modal. No React, no IO, so it is trivially unit-testable.
 *
 * The North Star of Tip of the Day is to *improve* habits. Each day the modal
 * shows one of three short, scannable card decks (one idea per card, never a wall
 * of text):
 *
 *   1. reshape_struggling — take a failing habit and teach the habit loop
 *      (cue → craving → routine → reward), then suggest a creative, *satisfying*
 *      change that keeps the habit but makes it acceptable.
 *   2. habit_science — a "Did you know?" micro-lesson about how habits work,
 *      anchored to one of the user's own habits.
 *   3. environment_cue — an environment-design tip: make the cue for a good habit
 *      obvious in the space around you.
 *
 * The AI layer (tipOfDayAi.ts) can enrich the reshape deck; when AI is
 * unavailable everything here still produces a complete, useful deck.
 */

import { buildHabitCoachCard, type HabitCoachSignals } from '../habits/habitCoach';
import type { HabitHealthAssessment } from '../habits/habitHealth';

export type TipVariation = 'reshape_struggling' | 'habit_science' | 'environment_cue';

/** A single full-screen card/slide in the deck. Keep `body` short and scannable. */
export interface TipCard {
  /** Stable id for React keys + telemetry. */
  id: string;
  /** Small eyebrow label above the heading, e.g. "Did you know?" or "The cue". */
  kicker?: string;
  /** Large emoji shown at the top of the card. */
  emoji?: string;
  /** Short headline. */
  heading: string;
  /** One or two short sentences. No dense paragraphs. */
  body: string;
}

/**
 * A concrete, reversible change the closing card can apply in one tap. Today the
 * only kind is shrinking a quantity/duration target — the canonical "make it
 * smaller" move — executed through the guardrailed habit-adjustment service.
 */
export interface TipApplyAction {
  kind: 'shrink_target';
  habitId: string;
  currentTarget: number;
  newTarget: number;
  unit: string | null;
  /** Button label, e.g. "Shrink to 4 glasses today". */
  label: string;
  changeDescription: string;
}

export interface TipDeck {
  variation: TipVariation;
  /** The habit the tip is about, when applicable. */
  habitId: string | null;
  habitTitle: string | null;
  cards: TipCard[];
  /** Label for the closing primary action button. */
  primaryCtaLabel: string;
  /** What the primary action records as `action_taken`. */
  primaryCtaAction: 'applied' | 'captured' | 'dismissed';
  /** When present, the closing CTA applies this change in one tap. */
  applyAction?: TipApplyAction | null;
}

/** A "did you try yesterday's tip?" check-in shown at the top of today's deck. */
export interface TipCheckIn {
  /** tip_of_day_log row id of the tip being asked about. */
  tipId: string;
  habitTitle: string | null;
  /** Short summary of what that tip suggested. */
  suggestionText: string;
}

/** Minimal shape this module needs from a habit (decoupled from HabitV2Row). */
export interface TipHabitInput {
  id: string;
  title: string;
  emoji: string | null;
  /** Free-text "where & how" environment cue, when set. */
  habitEnvironment: string | null;
  /** The user's stated reason / intent for the habit, when set. */
  habitIntent: string | null;
  /** Habit type — drives whether a one-tap "shrink target" apply is possible. */
  type?: 'boolean' | 'quantity' | 'duration';
  /** Current numeric target, for quantity/duration habits. */
  targetNum?: number | null;
  /** Unit label for the target, e.g. "glasses", "minutes". */
  targetUnit?: string | null;
}

/**
 * Build a safe "shrink the target" apply action for a quantity/duration habit,
 * or null when shrinking doesn't apply (boolean habits, or target already tiny).
 * Halves the target, floored, never below 1.
 */
export function buildShrinkApplyAction(habit: TipHabitInput): TipApplyAction | null {
  if (habit.type !== 'quantity' && habit.type !== 'duration') return null;
  const current = habit.targetNum ?? null;
  if (current == null || current < 2) return null;

  const next = Math.max(1, Math.floor(current / 2));
  if (next >= current) return null;

  const unit = habit.targetUnit?.trim() || null;
  const unitSuffix = unit ? ` ${unit}` : '';
  return {
    kind: 'shrink_target',
    habitId: habit.id,
    currentTarget: current,
    newTarget: next,
    unit,
    label: `Shrink to ${next}${unitSuffix} today`,
    changeDescription: `Lower target from ${current}${unitSuffix} to ${next}${unitSuffix}`,
  };
}

export interface TipHealthInput {
  habitId: string;
  assessment: HabitHealthAssessment;
  /** 7-day adherence percentage, when known. */
  adherencePercent: number | null;
  /** Whether the habit has 2+ scheduled days in the 7-day window (enough signal). */
  hasEnoughSignal: boolean;
}

const VARIATION_ROTATION: TipVariation[] = [
  'reshape_struggling',
  'habit_science',
  'environment_cue',
];

/**
 * Deterministically rotate the variation by day so the same day always yields the
 * same starting variation (callers may still fall back to another variation when
 * the chosen one has no suitable habit).
 */
export function pickVariationForDate(date: Date): TipVariation {
  const dayIndex = Math.floor(date.getTime() / (24 * 60 * 60 * 1000));
  return VARIATION_ROTATION[((dayIndex % VARIATION_ROTATION.length) + VARIATION_ROTATION.length) % VARIATION_ROTATION.length];
}

function severityRank(state: HabitHealthAssessment['state']): number {
  switch (state) {
    case 'in_review':
      return 3;
    case 'stalled':
      return 2;
    case 'at_risk':
      return 1;
    default:
      return 0;
  }
}

/** Pick the single most-struggling habit with enough signal, or null. */
export function pickStrugglingHabit(
  habits: TipHabitInput[],
  health: TipHealthInput[],
): { habit: TipHabitInput; health: TipHealthInput } | null {
  const byId = new Map(habits.map((h) => [h.id, h] as const));
  const candidates = health
    .filter((h) => h.hasEnoughSignal && severityRank(h.assessment.state) > 0 && byId.has(h.habitId))
    .sort((a, b) => severityRank(b.assessment.state) - severityRank(a.assessment.state));
  const top = candidates[0];
  if (!top) return null;
  return { habit: byId.get(top.habitId)!, health: top };
}

/** Pick a habit to anchor a non-reshape tip to (prefers one without a cue/intent set). */
export function pickAnchorHabit(habits: TipHabitInput[]): TipHabitInput | null {
  if (habits.length === 0) return null;
  const needsEnvironment = habits.find((h) => !h.habitEnvironment || h.habitEnvironment.trim().length === 0);
  return needsEnvironment ?? habits[0];
}

const HABIT_NOUN = (habit: TipHabitInput): string => habit.title.trim() || 'this habit';

/**
 * Variation 1 — reshape a struggling habit. Deterministic fallback used when the
 * AI layer is unavailable; reuses the offline habit coach for the closing tips.
 */
export function buildReshapeDeck(input: {
  habit: TipHabitInput;
  health: TipHealthInput;
  streakDays?: number;
  hasDownshiftOption?: boolean;
  /** Short, comma-joined cue labels from the user's own captured insights. */
  cueHint?: string | null;
}): TipDeck {
  const { habit, health } = input;
  const cueHint = input.cueHint?.trim() || null;
  const signals: HabitCoachSignals = {
    habitName: HABIT_NOUN(habit),
    assessment: health.assessment,
    adherencePercent: health.adherencePercent,
    streakDays: input.streakDays ?? 0,
    hasDownshiftOption: input.hasDownshiftOption ?? false,
    hasEnvironmentCue: Boolean(habit.habitEnvironment && habit.habitEnvironment.trim().length > 0),
  };
  const coach = buildHabitCoachCard(signals);
  const topTip = coach?.tips[0];
  const applyAction = buildShrinkApplyAction(habit);

  const cards: TipCard[] = [
    {
      id: 'reshape-intro',
      kicker: 'Did you know?',
      emoji: '🔁',
      heading: 'A habit is an algorithm',
      body: 'Every habit runs the same 4-step loop: cue → craving → routine → reward. To change a habit, you tweak the loop — not your willpower.',
    },
    {
      id: 'reshape-habit',
      kicker: 'Today’s focus',
      emoji: habit.emoji ?? '🎯',
      heading: HABIT_NOUN(habit),
      body: coach?.message ?? 'This one has been slipping lately. Let’s reshape the loop so it’s easier to keep.',
    },
    {
      id: 'reshape-cue',
      kicker: 'The cue',
      emoji: '⏰',
      heading: 'What triggers it?',
      body: cueHint
        ? `You’ve flagged this slips when: ${cueHint}. That’s your cue — name it and you can aim it.`
        : 'The cue is the trigger that fires the routine — a time of day, or a follow-on to a state like bored, tired, hungry or anxious. Spot the cue and you can aim it.',
    },
    {
      id: 'reshape-reward',
      kicker: 'The reward',
      emoji: '🎁',
      heading: 'What’s the payoff?',
      body: 'Your brain repeats the loop for the reward it craves. Keep the reward, change the routine — that’s how a habit bends without breaking.',
    },
    {
      id: 'reshape-suggestion',
      kicker: 'Try this',
      emoji: '✨',
      heading: topTip?.label ?? 'Make it satisfying',
      body: topTip?.detail ?? 'Shrink the habit to the smallest version you’ll actually do today, and give yourself an instant, satisfying win when you finish.',
    },
  ];

  return {
    variation: 'reshape_struggling',
    habitId: habit.id,
    habitTitle: habit.title,
    cards,
    primaryCtaLabel: applyAction ? applyAction.label : 'I’ll try this today',
    primaryCtaAction: 'applied',
    applyAction,
  };
}

/**
 * Extract a short, human summary of what a stored tip deck suggested, for the
 * "did you try yesterday's tip?" check-in. Pure — operates on a parsed payload.
 */
export function extractSuggestionSummary(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const cards = (payload as { cards?: unknown }).cards;
  if (!Array.isArray(cards) || cards.length === 0) return null;

  const isCard = (c: unknown): c is TipCard =>
    Boolean(c) && typeof c === 'object' && typeof (c as TipCard).heading === 'string';

  const typed = cards.filter(isCard);
  if (typed.length === 0) return null;

  const preferred =
    typed.find((c) => c.id === 'reshape-suggestion') ??
    typed.find((c) => c.id === 'env-apply') ??
    typed[typed.length - 1];

  const heading = preferred.heading.trim();
  const body = preferred.body.trim();
  if (heading && body) return `${heading} — ${body}`;
  return heading || body || null;
}

/** Variation 2 — "Did you know?" habit-science micro-lesson anchored to a habit. */
export function buildScienceDeck(habit: TipHabitInput | null): TipDeck {
  const name = habit ? HABIT_NOUN(habit) : 'your habits';
  const cards: TipCard[] = [
    {
      id: 'science-intro',
      kicker: 'Did you know?',
      emoji: '🧠',
      heading: 'Habits run on autopilot',
      body: 'Once learned, a habit is handed to your subconscious. At the cue, it pushes the craving up to your conscious mind — like a bribe you already accepted.',
    },
    {
      id: 'science-loop',
      kicker: 'The loop',
      emoji: '🔁',
      heading: 'Cue → craving → routine → reward',
      body: 'Cue starts it, craving motivates it, routine is the action, reward teaches your brain to do it again. Every habit, good or bad, follows this loop.',
    },
    {
      id: 'science-cue',
      kicker: 'The cue is key',
      emoji: '⏰',
      heading: 'Two kinds of trigger',
      body: 'Some cues are an internal clock (fully automatic). Others chain off a state — bored, hungry, angry, anxious, tired, thirsty. The rest live in your environment.',
    },
    {
      id: 'science-apply',
      kicker: 'Try it on',
      emoji: habit?.emoji ?? '🎯',
      heading: name,
      body: habit
        ? `Next time ${name} is due, notice the cue — what just happened right before? Naming it is the first step to steering it.`
        : 'Pick one habit and watch for its cue this week. Naming the trigger is the first step to steering it.',
    },
  ];

  return {
    variation: 'habit_science',
    habitId: habit?.id ?? null,
    habitTitle: habit?.title ?? null,
    cards,
    primaryCtaLabel: 'Got it',
    primaryCtaAction: 'dismissed',
  };
}

/** Variation 3 — environment-design tip: make the good cue obvious around you. */
export function buildEnvironmentDeck(habit: TipHabitInput | null): TipDeck {
  const name = habit ? HABIT_NOUN(habit) : 'a habit you care about';
  const hasCue = Boolean(habit?.habitEnvironment && habit.habitEnvironment.trim().length > 0);
  const cards: TipCard[] = [
    {
      id: 'env-intro',
      kicker: 'Did you know?',
      emoji: '🌱',
      heading: 'Your space is a cue',
      body: 'Most everyday habits are triggered by what’s around you. Change the environment and you change which habits fire — no willpower required.',
    },
    {
      id: 'env-make-obvious',
      kicker: 'Make it obvious',
      emoji: '👀',
      heading: 'Put the cue in plain sight',
      body: 'To do more of a habit, leave its trigger where you can’t miss it — book on the pillow, bottle on the desk, shoes by the door.',
    },
    {
      id: 'env-make-invisible',
      kicker: 'The flip side',
      emoji: '🙈',
      heading: 'Hide the bad cue',
      body: 'To do less of a habit, hide its cue: phone in another room, snacks out of sight. Out of sight really is out of mind.',
    },
    {
      id: 'env-apply',
      kicker: 'Try this',
      emoji: habit?.emoji ?? '🏠',
      heading: name,
      body: hasCue && habit?.habitEnvironment
        ? `Your cue is “${habit.habitEnvironment.trim()}”. Walk over and set it up now so future-you just follows it.`
        : `Pick one spot and place an obvious trigger for ${name} there today. Let the room do the remembering.`,
    },
  ];

  return {
    variation: 'environment_cue',
    habitId: habit?.id ?? null,
    habitTitle: habit?.title ?? null,
    cards,
    primaryCtaLabel: 'Set it up',
    primaryCtaAction: 'applied',
  };
}

/**
 * Choose the day's deck. Starts from the date-rotated variation, but degrades
 * gracefully: reshape needs a struggling habit, and the anchored variations need
 * at least one habit. When nothing fits, returns a science deck (works with zero
 * habits) so the user always sees a useful tip.
 */
export function selectTipDeck(input: {
  habits: TipHabitInput[];
  health: TipHealthInput[];
  date: Date;
}): TipDeck {
  const { habits, health, date } = input;
  const order = orderedVariationsForDate(date);

  for (const variation of order) {
    if (variation === 'reshape_struggling') {
      const struggling = pickStrugglingHabit(habits, health);
      if (struggling) {
        return buildReshapeDeck({ habit: struggling.habit, health: struggling.health });
      }
    } else if (variation === 'environment_cue') {
      if (habits.length > 0) {
        return buildEnvironmentDeck(pickAnchorHabit(habits));
      }
    } else if (variation === 'habit_science') {
      return buildScienceDeck(pickAnchorHabit(habits));
    }
  }

  return buildScienceDeck(pickAnchorHabit(habits));
}

/** Variations to try in priority order, starting from the date-rotated one. */
export function orderedVariationsForDate(date: Date): TipVariation[] {
  const start = pickVariationForDate(date);
  const startIndex = VARIATION_ROTATION.indexOf(start);
  return VARIATION_ROTATION.map((_, i) => VARIATION_ROTATION[(startIndex + i) % VARIATION_ROTATION.length]);
}
