/**
 * Builds the Identity Library: the single list of everything the player can
 * take to build or sharpen their card — the foundation test plus every
 * micro-test, each with its real state.
 *
 * This is the one source of truth for "what can I take right now". The badge
 * (useMicroTestBadge) and this list both resolve availability through
 * evaluateAvailableMicroTests, so they can never disagree — previously the
 * badge could light up for the 90-day recheck while the panel, which filtered
 * purely on completion, offered nothing.
 */

import { MICRO_TEST_REGISTRY, type MicroTestDefinition } from './microTests/microTestData';
import {
  MICRO_TEST_TRIGGERS,
  SELF_SERVE_MICRO_TEST_IDS,
  evaluateAvailableMicroTests,
  type PlayerState,
} from './microTests/microTestTriggers';
import type { MicroTestResult } from './microTests/microTestScoring';

export type IdentityTestStatus = 'available' | 'completed' | 'locked';

export type IdentityTestEntry = {
  /** Stable row id. For micro-tests this is the micro-test id. */
  id: string;
  kind: 'foundation' | 'micro';
  icon: string;
  title: string;
  subtitle: string;
  durationLabel: string;
  status: IdentityTestStatus;
  /** Short state chip, e.g. "New", "Due again", "Taken Mar 3", "Coming soon". */
  statusLabel: string;
  /** Button copy, or null when the row is not actionable. */
  actionLabel: string | null;
  lastTakenAt: string | null;
};

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : DATE_FORMATTER.format(date);
}

function formatDuration(seconds: number): string {
  return seconds >= 90 ? `~${Math.round(seconds / 60)} min` : `~${seconds}s`;
}

/**
 * Human label for why a micro-test is not yet takeable. Tests without a
 * reachable UI read as "Coming soon" regardless of their trigger conditions —
 * quoting a condition we don't actually honour would be a lie the player could
 * satisfy and still find nothing.
 */
function lockedLabel(microTestId: string): string {
  if (!SELF_SERVE_MICRO_TEST_IDS.has(microTestId)) return 'Coming soon';

  const condition = MICRO_TEST_TRIGGERS.find((trigger) => trigger.microTestId === microTestId)
    ?.condition;
  if (condition?.minStreakDays) return `Unlocks at a ${condition.minStreakDays}-day streak`;
  if (condition?.minLevel) return `Unlocks at level ${condition.minLevel}`;
  if (condition?.minDaysSinceFoundation) {
    return `Unlocks ${condition.minDaysSinceFoundation} days after your foundation test`;
  }
  return 'Locked';
}

function latestResultFor(
  results: readonly MicroTestResult[],
  microTestId: string,
): MicroTestResult | null {
  let latest: MicroTestResult | null = null;
  for (const result of results) {
    if (result.microTestId !== microTestId) continue;
    if (!latest || result.takenAt.getTime() > latest.takenAt.getTime()) latest = result;
  }
  return latest;
}

function buildFoundationEntry(
  foundationTakenAt: string | null,
  foundationTaken: boolean,
  questionCount: number,
): IdentityTestEntry {
  const taken = formatDate(foundationTakenAt);
  // A hand can exist without a saved record — a guest, or a result that has not
  // synced yet — so completion is driven by the flag, not the timestamp.
  const statusLabel = foundationTaken
    ? taken
      ? `Taken ${taken}`
      : 'Taken this session'
    : 'Not taken yet';

  return {
    id: 'foundation',
    kind: 'foundation',
    icon: '🪪',
    title: 'Foundation test',
    subtitle: foundationTaken
      ? 'Your base hand. Retake it whenever you feel you have changed.'
      : 'Answer a few prompts to deal your first hand of archetype cards.',
    durationLabel: `${questionCount} questions`,
    status: foundationTaken ? 'completed' : 'available',
    statusLabel,
    actionLabel: foundationTaken ? 'Retake' : 'Take the test',
    lastTakenAt: foundationTakenAt,
  };
}

function buildMicroEntry(
  definition: MicroTestDefinition,
  isAvailable: boolean,
  lastResult: MicroTestResult | null,
): IdentityTestEntry {
  const lastTakenAt = lastResult ? lastResult.takenAt.toISOString() : null;
  const taken = formatDate(lastTakenAt);

  let status: IdentityTestStatus;
  let statusLabel: string;
  let actionLabel: string | null;

  if (isAvailable) {
    status = 'available';
    // Available *and* previously taken means a repeatable trigger came due
    // again (e.g. the quarterly recheck), not a brand-new test.
    statusLabel = lastResult ? 'Due again' : 'New';
    actionLabel = lastResult ? 'Retake' : 'Take';
  } else if (lastResult) {
    status = 'completed';
    statusLabel = taken ? `Completed ${taken}` : 'Completed';
    actionLabel = null;
  } else {
    status = 'locked';
    statusLabel = lockedLabel(definition.id);
    actionLabel = null;
  }

  return {
    id: definition.id,
    kind: 'micro',
    icon: definition.icon,
    title: definition.title,
    subtitle: definition.subtitle,
    durationLabel: formatDuration(definition.estimatedSeconds),
    status,
    statusLabel,
    actionLabel,
    lastTakenAt,
  };
}

const STATUS_ORDER: Record<IdentityTestStatus, number> = {
  available: 0,
  completed: 1,
  locked: 2,
};

export function buildIdentityLibrary(params: {
  foundationTakenAt: string | null;
  /** Defaults to "a record exists"; pass true for an unsaved in-session hand. */
  foundationTaken?: boolean;
  foundationQuestionCount: number;
  microResults: readonly MicroTestResult[];
  playerState: PlayerState;
}): IdentityTestEntry[] {
  const { foundationTakenAt, foundationQuestionCount, microResults, playerState } = params;
  const foundationTaken = params.foundationTaken ?? Boolean(foundationTakenAt);

  const availableIds = new Set(
    evaluateAvailableMicroTests(playerState).map((trigger) => trigger.microTestId),
  );

  const microEntries = Object.values(MICRO_TEST_REGISTRY)
    .map((definition) =>
      buildMicroEntry(
        definition,
        availableIds.has(definition.id),
        latestResultFor(microResults, definition.id),
      ),
    )
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  return [
    buildFoundationEntry(foundationTakenAt, foundationTaken, foundationQuestionCount),
    ...microEntries,
  ];
}

/** Rows the player can act on right now — drives the "N ready" hub count. */
export function countActionableTests(entries: readonly IdentityTestEntry[]): number {
  return entries.filter((entry) => entry.kind === 'micro' && entry.status === 'available').length;
}
