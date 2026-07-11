/**
 * fortuneEngineProgression.ts — pure campaign rules for The Fortune Engine
 * timed event (the `lucky_spin` rotation slot).
 *
 * Three overlapping progression systems (all persisted per event in
 * `fortuneEngineProgressByEvent`):
 *   1. Per-run rewards — dice/essence collected inside a run (handled by
 *      `fortuneEngineGame.ts` + the state actions).
 *   2. Event reward track — every run's score feeds event points; visible
 *      milestones become claimable as the track fills. Claims flow through
 *      the canonical `claimFortuneEngineMilestoneReward` action.
 *   3. Jackpot assembly — nine Fortune Core fragments light up a 3×3 grid.
 *      Completing the grid unlocks the ticket-free finale ("Stabilise the
 *      Fortune Core"), whose success ends the event with a final reward.
 *
 * Ticket economy: 1 event ticket per launch, spent through the canonical
 * `applyFortuneEngineLaunch` action. The first launch of each day is the
 * free Golden Launch (better minimum rewards: it guarantees a fragment on a
 * finished run).
 *
 * Everything here is deterministic and side-effect free so the Island Run
 * service test suite can exercise the rules.
 */
import type { FortuneEngineProgressEntry } from './islandRunGameStateStore';

// ---------------------------------------------------------------------------
// Ticket economy — 1 ticket per launch + the daily free Golden Launch
// ---------------------------------------------------------------------------

/** Every Fortune Engine launch costs this many event tickets. */
export const FORTUNE_ENGINE_LAUNCH_TICKET_COST = 1;

/** Local-time day key (YYYY-MM-DD) used to gate the daily Golden Launch. */
export function getFortuneEngineDayKey(nowMs: number): string {
  const date = new Date(Math.max(0, Math.floor(nowMs)));
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** True when today's free Golden Launch has not been used yet. */
export function isFortuneGoldenLaunchAvailable(
  progress: Pick<FortuneEngineProgressEntry, 'goldenLaunchDayKey'> | null | undefined,
  nowMs: number,
): boolean {
  return (progress?.goldenLaunchDayKey ?? null) !== getFortuneEngineDayKey(nowMs);
}

/** Whether the player can start a run right now (golden or ticket-funded). */
export function canLaunchFortuneEngine(options: {
  ticketsRemaining: number;
  goldenLaunchAvailable: boolean;
}): boolean {
  if (options.goldenLaunchAvailable) return true;
  const tickets = Number.isFinite(options.ticketsRemaining) ? Math.floor(options.ticketsRemaining) : 0;
  return tickets >= FORTUNE_ENGINE_LAUNCH_TICKET_COST;
}

// ---------------------------------------------------------------------------
// Golden Launch streak — consecutive-day golden launches upgrade the run
// ---------------------------------------------------------------------------

/** Golden streak length that starts golden runs with a bonus multiplier. */
export const FORTUNE_GOLDEN_STREAK_MULTIPLIER_MIN_DAYS = 3;
/** Additive run multiplier granted at the streak-multiplier threshold. */
export const FORTUNE_GOLDEN_STREAK_MULTIPLIER_BONUS = 0.5;
/** Golden streak length that grants a one-hit hazard shield on golden runs. */
export const FORTUNE_GOLDEN_STREAK_SHIELD_MIN_DAYS = 5;

export interface FortuneGoldenStreakPerks {
  /** Additive run multiplier active for the whole golden run. */
  startMultiplierBonus: number;
  /** Hazard hits absorbed for free during the golden run. */
  hazardShields: number;
}

/**
 * The streak count this golden launch reaches: it extends a streak whose last
 * golden launch was yesterday (local time), otherwise it starts a new one.
 */
export function resolveNextGoldenLaunchStreak(
  progress: Pick<FortuneEngineProgressEntry, 'goldenLaunchDayKey' | 'goldenStreakCount'> | null | undefined,
  nowMs: number,
): number {
  const lastDayKey = progress?.goldenLaunchDayKey ?? null;
  if (!lastDayKey) return 1;
  const yesterdayKey = getFortuneEngineDayKey(nowMs - 24 * 60 * 60 * 1000);
  if (lastDayKey === yesterdayKey) return Math.max(0, Math.floor(progress?.goldenStreakCount ?? 0)) + 1;
  if (lastDayKey === getFortuneEngineDayKey(nowMs)) return Math.max(1, Math.floor(progress?.goldenStreakCount ?? 0));
  return 1;
}

/** Perks earned by the given Golden Launch streak length. */
export function resolveGoldenStreakPerks(streakCount: number): FortuneGoldenStreakPerks {
  const streak = Math.max(0, Math.floor(streakCount));
  return {
    startMultiplierBonus: streak >= FORTUNE_GOLDEN_STREAK_MULTIPLIER_MIN_DAYS ? FORTUNE_GOLDEN_STREAK_MULTIPLIER_BONUS : 0,
    hazardShields: streak >= FORTUNE_GOLDEN_STREAK_SHIELD_MIN_DAYS ? 1 : 0,
  };
}

// ---------------------------------------------------------------------------
// Fortune Core fragments — the 3×3 jackpot grid
// ---------------------------------------------------------------------------

export const FORTUNE_CORE_FRAGMENT_COUNT = 9;

export interface FortuneCoreFragmentMeta {
  /** 0-8, laid out row-major on the 3×3 grid. */
  fragmentId: number;
  name: string;
  icon: string;
}

export const FORTUNE_CORE_FRAGMENTS: readonly FortuneCoreFragmentMeta[] = Object.freeze([
  { fragmentId: 0, name: 'Dawn Cog', icon: '🌅' },
  { fragmentId: 1, name: 'Star Bearing', icon: '⭐' },
  { fragmentId: 2, name: 'Tide Spring', icon: '🌊' },
  { fragmentId: 3, name: 'Ember Gear', icon: '🔥' },
  { fragmentId: 4, name: 'Heart of the Engine', icon: '💠' },
  { fragmentId: 5, name: 'Gale Flywheel', icon: '🌪️' },
  { fragmentId: 6, name: 'Root Anchor', icon: '🌿' },
  { fragmentId: 7, name: 'Moon Pendulum', icon: '🌙' },
  { fragmentId: 8, name: 'Aurora Key', icon: '🔑' },
]);

/** Normalize a persisted fragment list: valid ids, deduped, sorted. */
export function resolveFortuneCoreFragmentIds(fragmentIds: unknown): number[] {
  if (!Array.isArray(fragmentIds)) return [];
  const seen = new Set<number>();
  for (const raw of fragmentIds) {
    if (typeof raw !== 'number' || !Number.isFinite(raw)) continue;
    const id = Math.floor(raw);
    if (id >= 0 && id < FORTUNE_CORE_FRAGMENT_COUNT) seen.add(id);
  }
  return Array.from(seen).sort((a, b) => a - b);
}

/** The next fragment a run should award (lowest missing id), or null when full. */
export function getNextFortuneCoreFragmentId(
  progress: Pick<FortuneEngineProgressEntry, 'fragmentIds'> | null | undefined,
): number | null {
  const owned = new Set(resolveFortuneCoreFragmentIds(progress?.fragmentIds ?? []));
  for (let id = 0; id < FORTUNE_CORE_FRAGMENT_COUNT; id += 1) {
    if (!owned.has(id)) return id;
  }
  return null;
}

export function isFortuneCoreComplete(
  progress: Pick<FortuneEngineProgressEntry, 'fragmentIds'> | null | undefined,
): boolean {
  return resolveFortuneCoreFragmentIds(progress?.fragmentIds ?? []).length >= FORTUNE_CORE_FRAGMENT_COUNT;
}

/**
 * Pity system: after this many consecutive fragmentless runs, the next run
 * drops a fragment for free. Keeps the 3×3 core deterministic-adjacent — a
 * player can always plan a route to the finale.
 */
export const FORTUNE_FRAGMENT_PITY_RUNS = 4;

/**
 * Light up to `count` missing fragments (lowest slots first). Pure; returns
 * the new ledger plus the ids that were actually awarded.
 */
export function awardFortuneCoreFragments(
  fragmentIds: readonly number[],
  count: number,
): { fragmentIds: number[]; awardedIds: number[] } {
  const owned = new Set(resolveFortuneCoreFragmentIds([...fragmentIds]));
  const awardedIds: number[] = [];
  const wanted = Math.max(0, Math.floor(count));
  for (let id = 0; id < FORTUNE_CORE_FRAGMENT_COUNT && awardedIds.length < wanted; id += 1) {
    if (owned.has(id)) continue;
    owned.add(id);
    awardedIds.push(id);
  }
  return { fragmentIds: Array.from(owned).sort((a, b) => a - b), awardedIds };
}

/** The finale is playable once the core is complete and not yet stabilised. */
export function isFortuneFinaleUnlocked(
  progress: Pick<FortuneEngineProgressEntry, 'fragmentIds' | 'finaleCompleted'> | null | undefined,
): boolean {
  if (!progress) return false;
  return isFortuneCoreComplete(progress) && !progress.finaleCompleted;
}

// ---------------------------------------------------------------------------
// Event reward track — run scores travel along visible milestones
// ---------------------------------------------------------------------------

export interface FortuneEngineMilestoneReward {
  dicePool?: number;
  essence?: number;
  shards?: number;
  /** Event tickets returned into this event's ticket bucket. */
  eventTickets?: number;
  /** Fortune Core fragments lit up (lowest missing slots first). */
  coreFragments?: number;
}

export interface FortuneEngineMilestone {
  id: string;
  /** Cumulative event points required to unlock. */
  pointsRequired: number;
  rewardLabel: string;
  reward: FortuneEngineMilestoneReward;
}

export const FORTUNE_ENGINE_MILESTONES: readonly FortuneEngineMilestone[] = Object.freeze([
  { id: 'fortune_1', pointsRequired: 50, rewardLabel: '+5 Dice', reward: { dicePool: 5 } },
  { id: 'fortune_2', pointsRequired: 120, rewardLabel: '+60 Essence +🧩 Fragment', reward: { essence: 60, coreFragments: 1 } },
  { id: 'fortune_3', pointsRequired: 220, rewardLabel: '+3 Event Tickets', reward: { eventTickets: 3 } },
  { id: 'fortune_4', pointsRequired: 350, rewardLabel: '+10 Dice +1 Shard +🧩 Fragment', reward: { dicePool: 10, shards: 1, coreFragments: 1 } },
  { id: 'fortune_5', pointsRequired: 500, rewardLabel: '+120 Essence +2 Shards', reward: { essence: 120, shards: 2 } },
  { id: 'fortune_6', pointsRequired: 700, rewardLabel: '+5 Event Tickets +15 Dice +🧩 Fragment', reward: { eventTickets: 5, dicePool: 15, coreFragments: 1 } },
  { id: 'fortune_7', pointsRequired: 1000, rewardLabel: '+25 Dice +4 Shards +250 Essence', reward: { dicePool: 25, shards: 4, essence: 250 } },
]);

export const FORTUNE_ENGINE_TRACK_TOTAL_POINTS =
  FORTUNE_ENGINE_MILESTONES[FORTUNE_ENGINE_MILESTONES.length - 1]?.pointsRequired ?? 0;

/** Reward granted once when the finale is stabilised (plus the trophy flag). */
export const FORTUNE_ENGINE_FINALE_REWARD: Required<Pick<FortuneEngineMilestoneReward, 'dicePool' | 'essence' | 'shards'>> = {
  dicePool: 40,
  essence: 400,
  shards: 6,
};

export const FORTUNE_ENGINE_FINALE_REWARD_LABEL = '+40 Dice +400 Essence +6 Shards + Fortune Core trophy';

export function getFortuneEngineMilestone(milestoneId: string): FortuneEngineMilestone | null {
  return FORTUNE_ENGINE_MILESTONES.find((milestone) => milestone.id === milestoneId) ?? null;
}

export function getNextFortuneEngineMilestone(
  progress: Pick<FortuneEngineProgressEntry, 'eventPoints'> | null | undefined,
): FortuneEngineMilestone | null {
  const points = Math.max(0, Math.floor(progress?.eventPoints ?? 0));
  return FORTUNE_ENGINE_MILESTONES.find((milestone) => points < milestone.pointsRequired) ?? null;
}

/** Drop unknown ids and keep claim order stable by milestone order. */
export function resolveFortuneEngineClaimedMilestoneIds(options: {
  claimedMilestoneIds?: string[];
}): string[] {
  const claimed = new Set(
    (options.claimedMilestoneIds ?? []).filter((id) =>
      FORTUNE_ENGINE_MILESTONES.some((milestone) => milestone.id === id),
    ),
  );
  return Array.from(claimed).sort((left, right) => {
    const leftIndex = FORTUNE_ENGINE_MILESTONES.findIndex((milestone) => milestone.id === left);
    const rightIndex = FORTUNE_ENGINE_MILESTONES.findIndex((milestone) => milestone.id === right);
    return leftIndex - rightIndex;
  });
}

// ---------------------------------------------------------------------------
// Progress entry lifecycle
// ---------------------------------------------------------------------------

/** Fresh progress entry for a newly opened event. */
export function createFortuneEngineProgress(nowMs: number): FortuneEngineProgressEntry {
  return {
    eventPoints: 0,
    fragmentIds: [],
    claimedMilestoneIds: [],
    totalLaunches: 0,
    bestRunScore: 0,
    goldenLaunchDayKey: null,
    goldenStreakCount: 0,
    fragmentPityCount: 0,
    finaleCompleted: false,
    updatedAtMs: Math.max(0, Math.floor(nowMs)),
  };
}

export interface FortuneEngineRunProgressResult {
  progress: FortuneEngineProgressEntry;
  /** Fragment id awarded by this run, or null when none was granted. */
  awardedFragmentId: number | null;
  /** True when the awarded fragment came from the pity counter, not the run. */
  pityFragment: boolean;
  /** True the moment this run completed the 3×3 core. */
  coreJustCompleted: boolean;
}

/**
 * Fold one finished run into campaign progress: event points accumulate,
 * best score updates, and (when the run earned one) the lowest missing
 * Fortune Core fragment lights up. Runs that earn no fragment feed the pity
 * counter — every `FORTUNE_FRAGMENT_PITY_RUNS`th fragmentless run drops one
 * for free. Pure — never mutates the input.
 */
export function applyFortuneRunToProgress(options: {
  progress: FortuneEngineProgressEntry;
  runScore: number;
  eventPoints: number;
  fragmentAwarded: boolean;
  nowMs: number;
}): FortuneEngineRunProgressResult {
  const previous = options.progress;
  const runScore = Math.max(0, Math.floor(options.runScore));
  const eventPoints = Math.max(0, Math.floor(options.eventPoints));
  const wasComplete = isFortuneCoreComplete(previous);

  let pityCount = Math.max(0, Math.floor(previous.fragmentPityCount ?? 0));
  let fragmentEarned = options.fragmentAwarded;
  let pityFragment = false;
  if (fragmentEarned) {
    pityCount = 0;
  } else if (!wasComplete) {
    pityCount += 1;
    if (pityCount >= FORTUNE_FRAGMENT_PITY_RUNS) {
      fragmentEarned = true;
      pityFragment = true;
      pityCount = 0;
    }
  }

  const awardedFragmentId = fragmentEarned ? getNextFortuneCoreFragmentId(previous) : null;
  const fragmentIds = awardedFragmentId !== null
    ? resolveFortuneCoreFragmentIds([...previous.fragmentIds, awardedFragmentId])
    : resolveFortuneCoreFragmentIds(previous.fragmentIds);

  const progress: FortuneEngineProgressEntry = {
    ...previous,
    eventPoints: Math.max(0, Math.floor(previous.eventPoints)) + eventPoints,
    fragmentIds,
    fragmentPityCount: pityCount,
    bestRunScore: Math.max(Math.max(0, Math.floor(previous.bestRunScore)), runScore),
    updatedAtMs: Math.max(0, Math.floor(options.nowMs)),
  };

  return {
    progress,
    awardedFragmentId,
    pityFragment: pityFragment && awardedFragmentId !== null,
    coreJustCompleted: !wasComplete && isFortuneCoreComplete(progress),
  };
}

// ---------------------------------------------------------------------------
// Reward track view model
// ---------------------------------------------------------------------------

export type FortuneEngineTrackNodeState = 'claimed' | 'claimable' | 'upcoming';

export interface FortuneEngineTrackNode {
  milestone: FortuneEngineMilestone;
  state: FortuneEngineTrackNodeState;
}

export interface FortuneEngineTrackViewModel {
  eventPoints: number;
  totalPoints: number;
  /** 0..1 fill for the traveling reward track. */
  fillRatio: number;
  nodes: FortuneEngineTrackNode[];
  nextMilestone: FortuneEngineMilestone | null;
  claimableCount: number;
}

export function buildFortuneEngineTrackViewModel(
  progress: Pick<FortuneEngineProgressEntry, 'eventPoints' | 'claimedMilestoneIds'> | null | undefined,
): FortuneEngineTrackViewModel {
  const eventPoints = Math.max(0, Math.floor(progress?.eventPoints ?? 0));
  const claimed = new Set(resolveFortuneEngineClaimedMilestoneIds({
    claimedMilestoneIds: progress?.claimedMilestoneIds ?? [],
  }));
  let claimableCount = 0;
  const nodes: FortuneEngineTrackNode[] = FORTUNE_ENGINE_MILESTONES.map((milestone) => {
    let state: FortuneEngineTrackNodeState = 'upcoming';
    if (claimed.has(milestone.id)) {
      state = 'claimed';
    } else if (eventPoints >= milestone.pointsRequired) {
      state = 'claimable';
      claimableCount += 1;
    }
    return { milestone, state };
  });
  const totalPoints = FORTUNE_ENGINE_TRACK_TOTAL_POINTS;
  return {
    eventPoints,
    totalPoints,
    fillRatio: totalPoints > 0 ? Math.min(1, eventPoints / totalPoints) : 0,
    nodes,
    nextMilestone: getNextFortuneEngineMilestone({ eventPoints }),
    claimableCount,
  };
}
