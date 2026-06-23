/**
 * habitCoach — deterministic, no-AI coaching for a struggling habit.
 *
 * Turns a `HabitHealthAssessment` (+ a few light signals) into a small coach
 * card shown inside the expanded habit card on the Today tab. It is intentionally
 * deterministic so it works offline and needs no edge function; when an AI coach
 * hook is wired in, `aiPrompt` gives it a ready starter question.
 *
 * Pure module — no React, no IO. Easy to unit-test.
 */

import type { HabitHealthAssessment, HabitHealthState } from './habitHealth';

export type HabitCoachTip = {
  id: string;
  /** Short, scannable headline for the tip. */
  label: string;
  /** One sentence of concrete guidance. */
  detail: string;
};

export type HabitCoachCard = {
  state: Exclude<HabitHealthState, 'active'>;
  /** Encouraging, non-judgemental headline keyed to the health state. */
  headline: string;
  /** A plain-language read of why the habit is flagged (derived from signals). */
  message: string;
  /** Up to 3 ordered, actionable tips (most impactful first). */
  tips: HabitCoachTip[];
  /** Ready-made starter question for an AI coach, when one is available. */
  aiPrompt: string;
};

export type HabitCoachSignals = {
  habitName: string;
  assessment: HabitHealthAssessment;
  /** 7-day adherence percentage, when known. */
  adherencePercent: number | null;
  streakDays: number;
  /** Whether a lighter version (downshift tier / smaller stage) is available. */
  hasDownshiftOption: boolean;
  /** Whether the habit has a "where & how" environment cue set. */
  hasEnvironmentCue: boolean;
};

export function isStrugglingHealthState(
  state: HabitHealthState,
): state is Exclude<HabitHealthState, 'active'> {
  return state === 'at_risk' || state === 'stalled' || state === 'in_review';
}

const MAX_TIPS = 3;

function headlineFor(state: Exclude<HabitHealthState, 'active'>): string {
  switch (state) {
    case 'at_risk':
      return "Let's protect this one";
    case 'stalled':
      return 'Time for a gentle restart';
    case 'in_review':
      return "Let's make a call together";
  }
}

function messageFor(signals: HabitCoachSignals): string {
  const { assessment, adherencePercent } = signals;
  const days = assessment.daysSinceCompletion;
  switch (assessment.state as Exclude<HabitHealthState, 'active'>) {
    case 'at_risk':
      return adherencePercent != null
        ? `You've kept this going about ${adherencePercent}% of the time lately — slipping, but far from gone. A tiny win today turns it around.`
        : 'This habit is starting to slip. A tiny win today turns it around.';
    case 'stalled':
      return days != null
        ? `It's been ${days} days since the last rep. Momentum stalls quietly — one small rep is all it takes to wake it back up.`
        : "Momentum has stalled. One small rep is all it takes to wake it back up.";
    case 'in_review':
      return days != null
        ? `No rep in ${days} days. That's a signal to decide on purpose — revive it smaller, reshape it, or retire it. Any choice is progress.`
        : "It's been a long pause. Decide on purpose — revive it smaller, reshape it, or retire it. Any choice is progress.";
  }
}

/**
 * Build the coach card for a habit, or `null` when the habit is healthy
 * (`active`) and needs no coaching.
 */
export function buildHabitCoachCard(signals: HabitCoachSignals): HabitCoachCard | null {
  const state = signals.assessment.state;
  if (!isStrugglingHealthState(state)) {
    return null;
  }

  const tips: HabitCoachTip[] = [];

  // 1) Shrink it — the highest-leverage move for a slipping habit.
  if (signals.hasDownshiftOption) {
    tips.push({
      id: 'shrink',
      label: 'Shrink it',
      detail: 'Use the smallest version above (Minimum) today — keeping the streak alive beats a perfect rep.',
    });
  } else {
    tips.push({
      id: 'shrink',
      label: 'Shrink it',
      detail: 'Cut today’s target down to the smallest version you’ll definitely do — two minutes counts.',
    });
  }

  // 2) Anchor it — only when there is no environment cue yet.
  if (!signals.hasEnvironmentCue) {
    tips.push({
      id: 'anchor',
      label: 'Anchor it',
      detail: 'Add a “where & how” cue in the habit details so it has an obvious trigger in your day.',
    });
  }

  // 3) State-specific closing move.
  if (state === 'in_review') {
    tips.push({
      id: 'decide',
      label: 'Decide on purpose',
      detail: 'Open the review options to redesign, replace, or retire it — closing the loop is a win either way.',
    });
  } else if (state === 'stalled') {
    tips.push({
      id: 'restart',
      label: 'Restart today',
      detail: 'Do one rep right now, even a tiny one — a single completion resets the stalled clock.',
    });
  } else {
    tips.push({
      id: 'protect',
      label: 'Protect the streak',
      detail: 'Aim to just show up at minimum on your scheduled days this week — consistency over intensity.',
    });
  }

  return {
    state,
    headline: headlineFor(state),
    message: messageFor(signals),
    tips: tips.slice(0, MAX_TIPS),
    aiPrompt: `I'm struggling to keep up my habit "${signals.habitName}". ${signals.assessment.rationale} What's one small, realistic change that would help me get back on track?`,
  };
}
