/**
 * fortuneEngineGame.ts — pure gameplay rules for The Fortune Engine, the
 * timed-event mini-game that replaces the old Lucky Spin placeholder on the
 * `lucky_spin` rotation slot.
 *
 * One launch = one run:
 *   1. Spin the outer route wheel. The landed route flavors the whole run
 *      (extra treasure, a starting multiplier, more hazards, longer ring
 *      timers, or a guaranteed Fortune Core fragment).
 *   2. Play up to three increasingly fast circular timing rings. A pointer
 *      sweeps the ring; tapping collects the segment under the pointer.
 *   3. After each ring the player banks the run or goes deeper for a higher
 *      multiplier. Hitting too many hazards crushes the run (half points),
 *      but a run never pays absolutely nothing.
 *
 * Everything here is deterministic and side-effect free (xorshift rng state
 * is threaded by the caller) so the Island Run service test suite can
 * exercise the rules directly. Rendering/input lives in
 * `games/fortune-engine/FortuneEngineMinigame.tsx`; persistence and the
 * milestone/fragment campaign live in `fortuneEngineProgression.ts`.
 */

// ---------------------------------------------------------------------------
// Deterministic rng (xorshift32, same convention as companionFeastGame)
// ---------------------------------------------------------------------------

/** Advance the xorshift32 state. Callers chain: `s = nextFortuneRng(s)`. */
export function nextFortuneRng(state: number): number {
  let s = Math.floor(state) || 1;
  s ^= s << 13;
  s ^= s >>> 17;
  s ^= s << 5;
  return s | 0;
}

/** Roll an integer in [0, maxExclusive) and return the advanced state. */
export function rollFortuneInt(state: number, maxExclusive: number): [value: number, nextState: number] {
  const s = nextFortuneRng(state);
  const bound = Math.max(1, Math.floor(maxExclusive));
  return [(s >>> 0) % bound, s];
}

// ---------------------------------------------------------------------------
// Route wheel — the launch spin that flavors the run
// ---------------------------------------------------------------------------

export type FortuneRouteId = 'treasure' | 'multiplier' | 'risk' | 'chrono' | 'jackpot';

export interface FortuneRoute {
  id: FortuneRouteId;
  name: string;
  icon: string;
  /** Short banner line shown after the wheel lands. */
  flavor: string;
  /** Additive starting run multiplier (base is 1). */
  startMultiplierBonus: number;
  /** Extra reward segments injected into every ring. */
  extraRewardSegments: number;
  /** Extra hazard segments injected into every ring. */
  extraHazardSegments: number;
  /** Bonus milliseconds added to every ring timer. */
  ringTimeBonusMs: number;
  /** Completed (banked or ring-3-finished) runs always yield a fragment. */
  guaranteesFragment: boolean;
  /** Multiplier applied to reward segment point values. */
  rewardValueMultiplier: number;
}

export const FORTUNE_ROUTES: Record<FortuneRouteId, FortuneRoute> = {
  treasure: {
    id: 'treasure',
    name: 'Treasure Route',
    icon: '💰',
    flavor: 'The rings overflow with reward nodes. Collect everything!',
    startMultiplierBonus: 0,
    extraRewardSegments: 3,
    extraHazardSegments: 0,
    ringTimeBonusMs: 0,
    guaranteesFragment: false,
    rewardValueMultiplier: 1,
  },
  multiplier: {
    id: 'multiplier',
    name: 'Multiplier Route',
    icon: '✨',
    flavor: 'The engine hums — every reward this run is doubled.',
    startMultiplierBonus: 1,
    extraRewardSegments: 0,
    extraHazardSegments: 0,
    ringTimeBonusMs: 0,
    guaranteesFragment: false,
    rewardValueMultiplier: 1,
  },
  risk: {
    id: 'risk',
    name: 'Risk Route',
    icon: '🔥',
    flavor: 'Corrupted sectors spread… but the treasure burns brighter.',
    startMultiplierBonus: 0,
    extraRewardSegments: 0,
    extraHazardSegments: 2,
    ringTimeBonusMs: 0,
    guaranteesFragment: false,
    rewardValueMultiplier: 2,
  },
  chrono: {
    id: 'chrono',
    name: 'Chrono Route',
    icon: '⏳',
    flavor: 'Time dilates inside the engine — every ring runs longer.',
    startMultiplierBonus: 0,
    extraRewardSegments: 0,
    extraHazardSegments: 0,
    ringTimeBonusMs: 4000,
    guaranteesFragment: false,
    rewardValueMultiplier: 1,
  },
  jackpot: {
    id: 'jackpot',
    name: 'Jackpot Fragment',
    icon: '🧩',
    flavor: 'A Fortune Core fragment is loose in the rings — finish the run to claim it!',
    startMultiplierBonus: 0,
    extraRewardSegments: 1,
    extraHazardSegments: 0,
    ringTimeBonusMs: 0,
    guaranteesFragment: true,
    rewardValueMultiplier: 1,
  },
};

/**
 * The visual route wheel: a fixed 10-slot layout so the spin animation and
 * the weighted odds share one source of truth (treasure 3, multiplier 2,
 * risk 2, chrono 2, jackpot 1 → jackpot is the rare slice).
 */
export const FORTUNE_WHEEL_SLOTS: readonly FortuneRouteId[] = Object.freeze([
  'treasure',
  'multiplier',
  'risk',
  'treasure',
  'chrono',
  'jackpot',
  'treasure',
  'multiplier',
  'risk',
  'chrono',
]);

/** Spin the route wheel: returns the landed slot index and advanced rng state. */
export function rollFortuneWheelSlot(state: number): [slotIndex: number, nextState: number] {
  return rollFortuneInt(state, FORTUNE_WHEEL_SLOTS.length);
}

export function getFortuneRouteForSlot(slotIndex: number): FortuneRoute {
  const slot = FORTUNE_WHEEL_SLOTS[Math.max(0, Math.floor(slotIndex)) % FORTUNE_WHEEL_SLOTS.length];
  return FORTUNE_ROUTES[slot];
}

// ---------------------------------------------------------------------------
// Timing rings — the wheel becomes the level
// ---------------------------------------------------------------------------

export const FORTUNE_RING_COUNT = 3;
export const FORTUNE_RING_SEGMENT_COUNT = 12;
/** Base ring timer (per ring) before route/chrono bonuses. */
export const FORTUNE_RING_BASE_DURATION_MS = 10_000;
/** Pointer revolution time per ring — deeper rings sweep faster. */
export const FORTUNE_RING_REVOLUTION_MS: readonly number[] = Object.freeze([3000, 2200, 1500]);
/** Run ends (crushed) when this many hazards are hit. */
export const FORTUNE_RUN_HAZARD_LIMIT = 3;
/** Multiplier earned by continuing into ring 2 / ring 3. */
export const FORTUNE_RING_MULTIPLIER_BY_INDEX: readonly number[] = Object.freeze([1, 1.5, 2]);
/** Consolation floor: even a crushed run banks this many points. */
export const FORTUNE_RUN_MIN_POINTS = 5;
/** Milliseconds of ring time restored by a ⏳ time segment. */
export const FORTUNE_TIME_SEGMENT_BONUS_MS = 2000;

export type FortuneSegmentKind = 'points' | 'dice' | 'essence' | 'time' | 'hazard' | 'empty';

export interface FortuneRingSegment {
  kind: FortuneSegmentKind;
  /** Points for `points` segments, dice for `dice`, essence for `essence`. */
  value: number;
  /** Set once the segment has been collected (taps on it become no-ops). */
  collected: boolean;
}

export interface FortuneRing {
  ringIndex: number;
  segments: FortuneRingSegment[];
  durationMs: number;
  revolutionMs: number;
}

/**
 * Base segment mix per ring before route adjustments. Deeper rings carry
 * richer rewards and more hazards.
 */
function baseSegmentBag(ringIndex: number): FortuneSegmentKind[] {
  if (ringIndex <= 0) {
    return ['points', 'points', 'points', 'points', 'points', 'dice', 'essence', 'time', 'hazard', 'hazard', 'empty', 'empty'];
  }
  if (ringIndex === 1) {
    return ['points', 'points', 'points', 'points', 'dice', 'dice', 'essence', 'time', 'hazard', 'hazard', 'hazard', 'empty'];
  }
  return ['points', 'points', 'points', 'points', 'dice', 'dice', 'essence', 'essence', 'hazard', 'hazard', 'hazard', 'hazard'];
}

/** Point value for a reward segment on the given ring (pre-route multiplier). */
function baseSegmentValue(kind: FortuneSegmentKind, ringIndex: number, roll: number): number {
  switch (kind) {
    case 'points':
      // Escalating per ring: ring 1 pays 6-9, ring 2 pays 12-17, ring 3 pays 18-25.
      return (4 + ringIndex * 4 + (ringIndex + 1) * 2) + (roll % (4 + ringIndex * 2));
    case 'dice':
      return 1 + Math.floor(ringIndex / 2) + (roll % 2);
    case 'essence':
      return 4 + ringIndex * 3 + (roll % 4);
    case 'time':
      return FORTUNE_TIME_SEGMENT_BONUS_MS;
    default:
      return 0;
  }
}

/**
 * Build one ring for the run. Deterministic for a given rng state: the base
 * bag is adjusted by the route (extra rewards replace empties, extra hazards
 * replace low-value slots), shuffled, and values are rolled per segment.
 */
export function buildFortuneRing(options: {
  ringIndex: number;
  route: FortuneRoute;
  rngState: number;
}): [ring: FortuneRing, nextState: number] {
  const ringIndex = Math.max(0, Math.min(FORTUNE_RING_COUNT - 1, Math.floor(options.ringIndex)));
  const { route } = options;
  let state = options.rngState;

  const bag = baseSegmentBag(ringIndex);
  for (let i = 0; i < route.extraRewardSegments; i += 1) {
    const emptyIndex = bag.indexOf('empty');
    const target = emptyIndex >= 0 ? emptyIndex : bag.indexOf('hazard');
    if (target >= 0) bag[target] = 'points';
  }
  for (let i = 0; i < route.extraHazardSegments; i += 1) {
    const emptyIndex = bag.indexOf('empty');
    const target = emptyIndex >= 0 ? emptyIndex : bag.indexOf('time');
    if (target >= 0) bag[target] = 'hazard';
  }

  // Fisher–Yates shuffle threaded through the rng state.
  for (let i = bag.length - 1; i > 0; i -= 1) {
    const [j, next] = rollFortuneInt(state, i + 1);
    state = next;
    const tmp = bag[i];
    bag[i] = bag[j];
    bag[j] = tmp;
  }

  const segments: FortuneRingSegment[] = bag.map((kind) => {
    const [roll, next] = rollFortuneInt(state, 1000);
    state = next;
    const rawValue = baseSegmentValue(kind, ringIndex, roll);
    const value = kind === 'points' ? rawValue * route.rewardValueMultiplier : rawValue;
    return { kind, value, collected: false };
  });

  return [
    {
      ringIndex,
      segments,
      durationMs: FORTUNE_RING_BASE_DURATION_MS + route.ringTimeBonusMs,
      revolutionMs: FORTUNE_RING_REVOLUTION_MS[ringIndex] ?? FORTUNE_RING_REVOLUTION_MS[FORTUNE_RING_REVOLUTION_MS.length - 1],
    },
    state,
  ];
}

/** Map a pointer angle (degrees, 0 = top, clockwise) to its segment index. */
export function resolveFortuneSegmentIndexForAngle(angleDeg: number, segmentCount = FORTUNE_RING_SEGMENT_COUNT): number {
  const count = Math.max(1, Math.floor(segmentCount));
  const normalized = ((angleDeg % 360) + 360) % 360;
  return Math.floor(normalized / (360 / count)) % count;
}

export interface FortuneTapOutcome {
  segmentIndex: number;
  kind: FortuneSegmentKind;
  points: number;
  dice: number;
  essence: number;
  timeBonusMs: number;
  hazardHit: boolean;
  /** False when the tap landed on an already-collected or empty segment. */
  collectedSomething: boolean;
  /** New segments array with the tapped segment marked collected. */
  segments: FortuneRingSegment[];
}

/**
 * Resolve one tap at the given segment. Pure: returns a new segments array.
 * Hazards are re-tappable only once (they mark collected too, so a single
 * corrupted sector can't instantly drain the whole hazard allowance).
 */
export function resolveFortuneTap(segments: readonly FortuneRingSegment[], segmentIndex: number): FortuneTapOutcome {
  const index = Math.max(0, Math.floor(segmentIndex)) % Math.max(1, segments.length);
  const segment = segments[index];
  const noop: FortuneTapOutcome = {
    segmentIndex: index,
    kind: segment?.kind ?? 'empty',
    points: 0,
    dice: 0,
    essence: 0,
    timeBonusMs: 0,
    hazardHit: false,
    collectedSomething: false,
    segments: [...segments],
  };
  if (!segment || segment.collected || segment.kind === 'empty') return noop;

  const nextSegments = segments.map((entry, i) => (i === index ? { ...entry, collected: true } : entry));
  return {
    segmentIndex: index,
    kind: segment.kind,
    points: segment.kind === 'points' ? segment.value : 0,
    dice: segment.kind === 'dice' ? segment.value : 0,
    essence: segment.kind === 'essence' ? segment.value : 0,
    timeBonusMs: segment.kind === 'time' ? segment.value : 0,
    hazardHit: segment.kind === 'hazard',
    collectedSomething: true,
    segments: nextSegments,
  };
}

// ---------------------------------------------------------------------------
// Run outcome — bank / go deeper / crushed
// ---------------------------------------------------------------------------

/** Multiplier the run is worth while playing the given ring. */
export function resolveFortuneRunMultiplier(options: {
  ringIndex: number;
  route: FortuneRoute;
}): number {
  const ringMultiplier = FORTUNE_RING_MULTIPLIER_BY_INDEX[
    Math.max(0, Math.min(FORTUNE_RING_MULTIPLIER_BY_INDEX.length - 1, Math.floor(options.ringIndex)))
  ];
  return ringMultiplier + options.route.startMultiplierBonus;
}

export type FortuneRunEnd = 'banked' | 'completed' | 'crushed';

export interface FortuneRunOutcome {
  /** Final run score after multiplier (and crush penalty). */
  runScore: number;
  /** Event points fed into the milestone reward track. */
  eventPoints: number;
  dice: number;
  essence: number;
  /** True when this run should award a Fortune Core fragment. */
  fragmentAwarded: boolean;
  end: FortuneRunEnd;
}

/**
 * Fold a finished run into its final rewards.
 * - `banked` / `completed` keep everything at the active multiplier.
 * - `crushed` (hazard limit) halves points and drops half the collected
 *   currencies — but a run always pays at least the consolation floor and
 *   never awards a fragment.
 * - Fragments come from the jackpot route or a golden launch, and only on
 *   runs that finish standing.
 */
export function resolveFortuneRunOutcome(options: {
  rawPoints: number;
  dice: number;
  essence: number;
  ringIndex: number;
  route: FortuneRoute;
  end: FortuneRunEnd;
  goldenLaunch?: boolean;
}): FortuneRunOutcome {
  const rawPoints = Math.max(0, Math.floor(options.rawPoints));
  const dice = Math.max(0, Math.floor(options.dice));
  const essence = Math.max(0, Math.floor(options.essence));
  const multiplier = resolveFortuneRunMultiplier({ ringIndex: options.ringIndex, route: options.route });
  const crushed = options.end === 'crushed';

  const multiplied = Math.floor(rawPoints * multiplier);
  const runScore = Math.max(FORTUNE_RUN_MIN_POINTS, crushed ? Math.floor(multiplied / 2) : multiplied);
  const keptDice = crushed ? Math.floor(dice / 2) : dice;
  const keptEssence = crushed ? Math.floor(essence / 2) : essence;
  const fragmentAwarded = !crushed && (options.route.guaranteesFragment || options.goldenLaunch === true);

  return {
    runScore,
    eventPoints: runScore,
    dice: keptDice,
    essence: keptEssence,
    fragmentAwarded,
    end: options.end,
  };
}

// ---------------------------------------------------------------------------
// Finale — Stabilise the Fortune Core (ticket-free once 9 fragments glow)
// ---------------------------------------------------------------------------

export const FORTUNE_FINALE_DURATION_MS = 20_000;
export const FORTUNE_FINALE_TARGET_COUNT = 3;
export const FORTUNE_FINALE_REVOLUTION_MS = 1300;

/**
 * Choose the finale's three stabiliser segments (distinct indices on the
 * 12-slot ring). Deterministic for a given rng state.
 */
export function rollFortuneFinaleTargets(state: number): [targets: number[], nextState: number] {
  let s = state;
  const targets = new Set<number>();
  while (targets.size < FORTUNE_FINALE_TARGET_COUNT) {
    const [index, next] = rollFortuneInt(s, FORTUNE_RING_SEGMENT_COUNT);
    s = next;
    targets.add(index);
  }
  return [Array.from(targets).sort((a, b) => a - b), s];
}
