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
// Challenge rotation — every run contains three different skill chambers
// ---------------------------------------------------------------------------

export type FortuneChallengeModeId = 'pulse' | 'echo' | 'signal';

export interface FortuneChallengeMode {
  id: FortuneChallengeModeId;
  name: string;
  instruction: string;
}

export const FORTUNE_CHALLENGE_MODES: Readonly<Record<FortuneChallengeModeId, FortuneChallengeMode>> = {
  pulse: {
    id: 'pulse',
    name: 'Pulse Chamber',
    instruction: 'Tap bright rewards as the needle crosses them.',
  },
  echo: {
    id: 'echo',
    name: 'Echo Chamber',
    instruction: 'Memorise the symbol sequence, then collect it in order.',
  },
  signal: {
    id: 'signal',
    name: 'Signal Chamber',
    instruction: 'Match the centre signal to the passing wheel symbol.',
  },
};

/**
 * Shuffle the three chamber modes once per run. Each mode appears exactly
 * once, so consecutive chambers can never repeat the same interaction.
 */
export function rollFortuneChallengeSequence(
  state: number,
): [sequence: FortuneChallengeModeId[], nextState: number] {
  const sequence: FortuneChallengeModeId[] = ['pulse', 'echo', 'signal'];
  let nextState = state;
  for (let index = sequence.length - 1; index > 0; index -= 1) {
    const [swapIndex, advanced] = rollFortuneInt(nextState, index + 1);
    nextState = advanced;
    const current = sequence[index]!;
    sequence[index] = sequence[swapIndex]!;
    sequence[swapIndex] = current;
  }
  return [sequence, nextState];
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
/**
 * Crush penalty scales with depth: a crushed run keeps 1/divisor of its
 * multiplied points (ring 1 keeps ½, ring 2 keeps ⅓, ring 3 keeps ¼) so the
 * bank-or-go-deeper checkpoint carries real risk on deeper rings.
 */
export const FORTUNE_CRUSH_KEEP_DIVISOR_BY_RING: readonly number[] = Object.freeze([2, 3, 4]);

/** Divisor applied to points when a run is crushed on the given ring. */
export function resolveFortuneCrushKeepDivisor(ringIndex: number): number {
  const index = Math.max(0, Math.min(FORTUNE_CRUSH_KEEP_DIVISOR_BY_RING.length - 1, Math.floor(ringIndex)));
  return FORTUNE_CRUSH_KEEP_DIVISOR_BY_RING[index];
}

// ---------------------------------------------------------------------------
// Perfect taps — skill tier + combo meter
// ---------------------------------------------------------------------------

/** A tap is Perfect when the pointer sits inside the middle third of a segment. */
export const FORTUNE_PERFECT_WINDOW_FRACTION = 1 / 3;
/** Points multiplier for a Perfect tap with no combo running. */
export const FORTUNE_PERFECT_BASE_MULTIPLIER = 2;
/** Extra points multiplier added per consecutive Perfect already in the combo. */
export const FORTUNE_PERFECT_COMBO_STEP = 0.5;
/** Combo stacks that still grow the multiplier (×2 → ×2.5 → ×3 → ×3.5 cap). */
export const FORTUNE_PERFECT_COMBO_CAP = 3;

/**
 * True when the pointer angle falls inside the Perfect window (the center
 * third) of whatever segment it is currently sweeping.
 */
export function isFortunePerfectTapAngle(angleDeg: number, segmentCount = FORTUNE_RING_SEGMENT_COUNT): boolean {
  const count = Math.max(1, Math.floor(segmentCount));
  const arc = 360 / count;
  const normalized = ((angleDeg % 360) + 360) % 360;
  const positionInSegment = (normalized % arc) / arc;
  const edge = (1 - FORTUNE_PERFECT_WINDOW_FRACTION) / 2;
  return positionInSegment >= edge && positionInSegment < 1 - edge;
}

/**
 * Points multiplier paid by a Perfect tap given the number of consecutive
 * Perfects already banked in the combo before this tap.
 */
export function resolveFortunePerfectPointsMultiplier(comboBeforeTap: number): number {
  const combo = Math.max(0, Math.min(FORTUNE_PERFECT_COMBO_CAP, Math.floor(comboBeforeTap)));
  return FORTUNE_PERFECT_BASE_MULTIPLIER + combo * FORTUNE_PERFECT_COMBO_STEP;
}

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

export const FORTUNE_ECHO_PREVIEW_MS = 2_400;

const ECHO_SIGNAL_KINDS: readonly FortuneSegmentKind[] = ['points', 'dice', 'essence', 'time'];

/** Build a deterministic symbol sequence using reward kinds present in the ring. */
export function rollFortuneEchoSequence(options: {
  segments: readonly FortuneRingSegment[];
  ringIndex: number;
  rngState: number;
}): [sequence: FortuneSegmentKind[], nextState: number] {
  const available = options.segments
    .filter((segment) => ECHO_SIGNAL_KINDS.includes(segment.kind) && !segment.collected)
    .map((segment) => segment.kind);
  if (available.length === 0) return [[], options.rngState];

  let state = options.rngState;
  for (let index = available.length - 1; index > 0; index -= 1) {
    const [swapIndex, advanced] = rollFortuneInt(state, index + 1);
    state = advanced;
    const current = available[index]!;
    available[index] = available[swapIndex]!;
    available[swapIndex] = current;
  }
  const wanted = Math.min(5, 3 + Math.max(0, Math.floor(options.ringIndex)));
  const sequence: FortuneSegmentKind[] = [];
  for (let index = 0; index < wanted; index += 1) {
    sequence.push(available[index % available.length]!);
  }
  return [sequence, state];
}

/** Choose the next uncollected reward kind for Signal Chamber. */
export function rollFortuneSignalTarget(options: {
  segments: readonly FortuneRingSegment[];
  rngState: number;
  previousKind?: FortuneSegmentKind | null;
}): [target: FortuneSegmentKind | null, nextState: number] {
  const present = ECHO_SIGNAL_KINDS.filter((kind) =>
    options.segments.some((segment) => segment.kind === kind && !segment.collected),
  );
  if (present.length === 0) return [null, options.rngState];
  const candidates = present.length > 1 && options.previousKind
    ? present.filter((kind) => kind !== options.previousKind)
    : present;
  const [index, nextState] = rollFortuneInt(options.rngState, candidates.length);
  return [candidates[index] ?? present[0]!, nextState];
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
  /** True when this tap landed in the Perfect window and collected a reward. */
  perfect: boolean;
  /** Consecutive-Perfect combo after this tap (misses/hazards reset to 0). */
  comboAfter: number;
  /** New segments array with the tapped segment marked collected. */
  segments: FortuneRingSegment[];
}

/**
 * Resolve one tap at the given segment. Pure: returns a new segments array.
 * Hazards are re-tappable only once (they mark collected too, so a single
 * corrupted sector can't instantly drain the whole hazard allowance).
 *
 * Perfect taps (pointer in the segment's center third) multiply the points
 * value and extend the combo; any miss, normal tap, or hazard resets it.
 */
export function resolveFortuneTap(
  segments: readonly FortuneRingSegment[],
  segmentIndex: number,
  options?: { perfect?: boolean; comboBefore?: number },
): FortuneTapOutcome {
  const index = Math.max(0, Math.floor(segmentIndex)) % Math.max(1, segments.length);
  const segment = segments[index];
  const comboBefore = Math.max(0, Math.floor(options?.comboBefore ?? 0));
  const noop: FortuneTapOutcome = {
    segmentIndex: index,
    kind: segment?.kind ?? 'empty',
    points: 0,
    dice: 0,
    essence: 0,
    timeBonusMs: 0,
    hazardHit: false,
    collectedSomething: false,
    perfect: false,
    comboAfter: 0,
    segments: [...segments],
  };
  if (!segment || segment.collected || segment.kind === 'empty') return noop;

  const nextSegments = segments.map((entry, i) => (i === index ? { ...entry, collected: true } : entry));
  const hazardHit = segment.kind === 'hazard';
  const perfect = options?.perfect === true && !hazardHit;
  const pointsMultiplier = perfect ? resolveFortunePerfectPointsMultiplier(comboBefore) : 1;
  return {
    segmentIndex: index,
    kind: segment.kind,
    points: segment.kind === 'points' ? Math.floor(segment.value * pointsMultiplier) : 0,
    dice: segment.kind === 'dice' ? segment.value : 0,
    essence: segment.kind === 'essence' ? segment.value : 0,
    timeBonusMs: segment.kind === 'time' ? segment.value : 0,
    hazardHit,
    collectedSomething: true,
    perfect,
    comboAfter: hazardHit ? 0 : perfect ? comboBefore + 1 : 0,
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
  /** Extra additive bonus (e.g. the Golden Launch streak perk). */
  bonusMultiplier?: number;
}): number {
  const ringMultiplier = FORTUNE_RING_MULTIPLIER_BY_INDEX[
    Math.max(0, Math.min(FORTUNE_RING_MULTIPLIER_BY_INDEX.length - 1, Math.floor(options.ringIndex)))
  ];
  const bonus = Number.isFinite(options.bonusMultiplier) ? Math.max(0, options.bonusMultiplier ?? 0) : 0;
  return ringMultiplier + options.route.startMultiplierBonus + bonus;
}

export type FortuneRunEnd = 'banked' | 'completed' | 'crushed';

/** Extra event points (share of run score) paid for beating your best run. */
export const FORTUNE_NEW_BEST_EVENT_BONUS_RATIO = 0.2;

export interface FortuneRunOutcome {
  /** Final run score after multiplier (and crush penalty). */
  runScore: number;
  /** Event points fed into the milestone reward track. */
  eventPoints: number;
  dice: number;
  essence: number;
  /** True when this run should award a Fortune Core fragment. */
  fragmentAwarded: boolean;
  /** True when this run beat the previous best score (pays bonus event points). */
  newBest: boolean;
  end: FortuneRunEnd;
}

/**
 * Fold a finished run into its final rewards.
 * - `banked` / `completed` keep everything at the active multiplier.
 * - `crushed` (hazard limit) keeps 1/divisor of the points (deeper rings keep
 *   less: ½ → ⅓ → ¼) and drops half the collected currencies — but a run
 *   always pays at least the consolation floor and never awards a fragment.
 * - Fragments come from the jackpot route, a golden launch, or completing the
 *   full three-ring descent — always on runs that finish standing.
 * - Beating `previousBestScore` pays bonus event points on top of the score.
 */
export function resolveFortuneRunOutcome(options: {
  rawPoints: number;
  dice: number;
  essence: number;
  ringIndex: number;
  route: FortuneRoute;
  end: FortuneRunEnd;
  goldenLaunch?: boolean;
  /** Extra additive run multiplier (Golden Launch streak perk). */
  bonusMultiplier?: number;
  /** Best run score before this run; 0/omitted means no best exists yet. */
  previousBestScore?: number;
}): FortuneRunOutcome {
  const rawPoints = Math.max(0, Math.floor(options.rawPoints));
  const dice = Math.max(0, Math.floor(options.dice));
  const essence = Math.max(0, Math.floor(options.essence));
  const multiplier = resolveFortuneRunMultiplier({
    ringIndex: options.ringIndex,
    route: options.route,
    bonusMultiplier: options.bonusMultiplier,
  });
  const crushed = options.end === 'crushed';

  const multiplied = Math.floor(rawPoints * multiplier);
  const crushDivisor = resolveFortuneCrushKeepDivisor(options.ringIndex);
  const runScore = Math.max(FORTUNE_RUN_MIN_POINTS, crushed ? Math.floor(multiplied / crushDivisor) : multiplied);
  const keptDice = crushed ? Math.floor(dice / 2) : dice;
  const keptEssence = crushed ? Math.floor(essence / 2) : essence;
  const fragmentAwarded = !crushed
    && (options.route.guaranteesFragment || options.goldenLaunch === true || options.end === 'completed');
  const previousBest = Math.max(0, Math.floor(options.previousBestScore ?? 0));
  const newBest = previousBest > 0 && runScore > previousBest;
  const eventPoints = newBest
    ? runScore + Math.floor(runScore * FORTUNE_NEW_BEST_EVENT_BONUS_RATIO)
    : runScore;

  return {
    runScore,
    eventPoints,
    dice: keptDice,
    essence: keptEssence,
    fragmentAwarded,
    newBest,
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
