/**
 * companionFeastGame.ts — pure rules + physics engine for the Companion Feast
 * timed-event mini-game (drop-and-merge feast bowl).
 *
 * All logic here is deterministic and side-effect free so the React surface
 * (`src/features/gamification/games/companion-feast/`) stays a thin renderer
 * and the rules can be exercised by the Island Run service test suite.
 *
 * Canonical wiring (see docs/gameplay/MINIGAME_EVENTS_CONSOLIDATION_PLAN.md):
 * - Entry tickets are spent by the board launch path (`applyTimedEventTicketSpend`).
 * - Restart ("play again") spends 1 more ticket through the same canonical
 *   action, exposed to the game via launchConfig callbacks.
 * - Completion feeds `recordEventMinigameCompletion` for event progress.
 */

// ---------------------------------------------------------------------------
// Food tier ladder (original artwork: emoji dishes, no external branding)
// ---------------------------------------------------------------------------

export interface CompanionFeastFoodTier {
  /** 0-based ladder index. */
  tier: number;
  id: string;
  name: string;
  emoji: string;
  /** Body radius in bowl units (bowl is COMPANION_FEAST_BOWL_WIDTH wide). */
  radius: number;
  /** Score granted when a merge *produces* this tier. */
  mergeScore: number;
  /** Fill color behind the emoji. */
  color: string;
}

export const COMPANION_FEAST_FOOD_TIERS: readonly CompanionFeastFoodTier[] = Object.freeze([
  { tier: 0, id: 'moon_berry', name: 'Moon Berry', emoji: '🫐', radius: 13, mergeScore: 0, color: '#4c6ef5' },
  { tier: 1, id: 'ember_cherry', name: 'Ember Cherry', emoji: '🍒', radius: 17, mergeScore: 2, color: '#e0475f' },
  { tier: 2, id: 'sun_plum', name: 'Sun Plum', emoji: '🍑', radius: 22, mergeScore: 5, color: '#f2a65a' },
  { tier: 3, id: 'glow_apple', name: 'Glow Apple', emoji: '🍎', radius: 28, mergeScore: 9, color: '#d64550' },
  { tier: 4, id: 'honey_bun', name: 'Honey Bun', emoji: '🥯', radius: 34, mergeScore: 14, color: '#c98a2c' },
  { tier: 5, id: 'cheese_moon', name: 'Cheese Moon', emoji: '🧀', radius: 41, mergeScore: 21, color: '#e9b949' },
  { tier: 6, id: 'tide_pie', name: 'Tide Pie', emoji: '🥧', radius: 49, mergeScore: 30, color: '#b07b4f' },
  { tier: 7, id: 'hearth_pumpkin', name: 'Hearth Pumpkin', emoji: '🎃', radius: 58, mergeScore: 42, color: '#e07b2f' },
  { tier: 8, id: 'stew_cauldron', name: 'Stew Cauldron', emoji: '🍲', radius: 68, mergeScore: 58, color: '#7a5c3e' },
  { tier: 9, id: 'royal_cake', name: 'Royal Cake', emoji: '🎂', radius: 79, mergeScore: 80, color: '#d98cb3' },
  { tier: 10, id: 'grand_feast', name: 'Grand Feast', emoji: '✨', radius: 91, mergeScore: 120, color: '#f3d16b' },
]);

export const COMPANION_FEAST_MAX_TIER = COMPANION_FEAST_FOOD_TIERS.length - 1;

/** Only the small tiers can be dropped by the player. */
export const COMPANION_FEAST_MAX_DROPPABLE_TIER = 4;

export function getCompanionFeastFoodTier(tier: number): CompanionFeastFoodTier {
  const clamped = Math.max(0, Math.min(COMPANION_FEAST_MAX_TIER, Math.floor(tier)));
  return COMPANION_FEAST_FOOD_TIERS[clamped];
}

// ---------------------------------------------------------------------------
// Bowl geometry / physics constants (logical units; renderer scales to px)
// ---------------------------------------------------------------------------

export const COMPANION_FEAST_BOWL_WIDTH = 360;
export const COMPANION_FEAST_BOWL_HEIGHT = 520;
/** Y coordinate of the danger line, measured from the bowl top. */
export const COMPANION_FEAST_DANGER_LINE_Y = 96;
/** Continuous overflow time above the danger line before the run ends. */
export const COMPANION_FEAST_DANGER_GRACE_MS = 2200;
/** Freshly dropped food is exempt from danger checks for this long. */
export const COMPANION_FEAST_SPAWN_GRACE_MS = 1300;

export interface CompanionFeastPhysicsConfig {
  width: number;
  height: number;
  /** Gravity in units/s². */
  gravity: number;
  /** Bounce energy retention 0..1. */
  restitution: number;
  /** Horizontal velocity damping per second (0..1 kept). */
  airDrag: number;
}

export const COMPANION_FEAST_DEFAULT_PHYSICS: CompanionFeastPhysicsConfig = Object.freeze({
  width: COMPANION_FEAST_BOWL_WIDTH,
  height: COMPANION_FEAST_BOWL_HEIGHT,
  gravity: 1900,
  restitution: 0.18,
  airDrag: 0.985,
});

export interface CompanionFeastBody {
  id: number;
  tier: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  /** Remaining spawn-grace window (danger-line exemption). */
  spawnGraceMsRemaining: number;
}

export interface CompanionFeastMergeEvent {
  /** Tier of the two merged pieces. */
  fromTier: number;
  /** Resulting tier, or null when two max-tier dishes vanish in celebration. */
  toTier: number | null;
  /** Score granted by this merge. */
  score: number;
  x: number;
  y: number;
}

export interface CompanionFeastStepResult {
  bodies: CompanionFeastBody[];
  merges: CompanionFeastMergeEvent[];
  /** True when at least one settled body sits above the danger line. */
  dangerActive: boolean;
}

/** Score for merging two pieces of `fromTier` together. */
export function resolveCompanionFeastMergeScore(fromTier: number): number {
  const next = fromTier + 1;
  if (next > COMPANION_FEAST_MAX_TIER) {
    // Two Grand Feasts celebrate and clear the plates: big flat bonus.
    return getCompanionFeastFoodTier(COMPANION_FEAST_MAX_TIER).mergeScore * 2;
  }
  return getCompanionFeastFoodTier(next).mergeScore;
}

let bodyIdCounter = 1;

export function createCompanionFeastBody(options: {
  tier: number;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  spawnGraceMsRemaining?: number;
}): CompanionFeastBody {
  const tierInfo = getCompanionFeastFoodTier(options.tier);
  return {
    id: bodyIdCounter++,
    tier: tierInfo.tier,
    x: options.x,
    y: options.y,
    vx: options.vx ?? 0,
    vy: options.vy ?? 0,
    radius: tierInfo.radius,
    spawnGraceMsRemaining: options.spawnGraceMsRemaining ?? COMPANION_FEAST_SPAWN_GRACE_MS,
  };
}

const SETTLED_SPEED_THRESHOLD = 26;

/**
 * Advance the bowl simulation by `dtMs`. Pure: returns new body objects and a
 * list of merge events; never mutates the input array or its members.
 *
 * Model: circles under gravity with wall/floor clamping, pairwise positional
 * separation, and same-tier contact merging (each body merges at most once
 * per step).
 */
export function stepCompanionFeastPhysics(
  inputBodies: readonly CompanionFeastBody[],
  config: CompanionFeastPhysicsConfig,
  dtMs: number,
): CompanionFeastStepResult {
  const dt = Math.max(0, Math.min(50, dtMs)) / 1000;
  const drag = Math.pow(config.airDrag, dt * 60);
  let bodies: CompanionFeastBody[] = inputBodies.map((b) => ({
    ...b,
    vy: b.vy + config.gravity * dt,
    vx: b.vx * drag,
    x: b.x + b.vx * dt,
    y: b.y + (b.vy + config.gravity * dt) * dt,
    spawnGraceMsRemaining: Math.max(0, b.spawnGraceMsRemaining - dtMs),
  }));

  // Wall + floor constraints.
  for (const b of bodies) {
    if (b.x - b.radius < 0) {
      b.x = b.radius;
      b.vx = Math.abs(b.vx) * config.restitution;
    } else if (b.x + b.radius > config.width) {
      b.x = config.width - b.radius;
      b.vx = -Math.abs(b.vx) * config.restitution;
    }
    if (b.y + b.radius > config.height) {
      b.y = config.height - b.radius;
      b.vy = -Math.abs(b.vy) * config.restitution;
      if (Math.abs(b.vy) < 40) b.vy = 0;
      b.vx *= 0.94;
    }
  }

  // Pairwise collisions + merge detection (up to a few relaxation passes).
  const merges: CompanionFeastMergeEvent[] = [];
  const mergedIds = new Set<number>();
  for (let pass = 0; pass < 3; pass += 1) {
    for (let i = 0; i < bodies.length; i += 1) {
      const a = bodies[i];
      if (mergedIds.has(a.id)) continue;
      for (let j = i + 1; j < bodies.length; j += 1) {
        const b = bodies[j];
        if (mergedIds.has(b.id) || mergedIds.has(a.id)) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const minDist = a.radius + b.radius;
        const distSq = dx * dx + dy * dy;
        if (distSq >= minDist * minDist) continue;
        const dist = Math.sqrt(distSq) || 0.0001;

        if (pass === 0 && a.tier === b.tier) {
          // Merge: replace both with the next tier at the contact midpoint.
          mergedIds.add(a.id);
          mergedIds.add(b.id);
          const nextTier = a.tier + 1;
          const score = resolveCompanionFeastMergeScore(a.tier);
          const midX = (a.x + b.x) / 2;
          const midY = (a.y + b.y) / 2;
          merges.push({
            fromTier: a.tier,
            toTier: nextTier > COMPANION_FEAST_MAX_TIER ? null : nextTier,
            score,
            x: midX,
            y: midY,
          });
          continue;
        }

        // Positional separation weighted by area (bigger pieces move less).
        const overlap = minDist - dist;
        const nx = dx / dist;
        const ny = dy / dist;
        const massA = a.radius * a.radius;
        const massB = b.radius * b.radius;
        const total = massA + massB;
        const pushA = (overlap * massB) / total;
        const pushB = (overlap * massA) / total;
        a.x -= nx * pushA;
        a.y -= ny * pushA;
        b.x += nx * pushB;
        b.y += ny * pushB;

        // Simple impulse along the normal.
        const rvx = b.vx - a.vx;
        const rvy = b.vy - a.vy;
        const relNormal = rvx * nx + rvy * ny;
        if (relNormal < 0) {
          const impulse = (-(1 + config.restitution) * relNormal) / (1 / massA + 1 / massB);
          a.vx -= (impulse * nx) / massA;
          a.vy -= (impulse * ny) / massA;
          b.vx += (impulse * nx) / massB;
          b.vy += (impulse * ny) / massB;
        }
      }
    }
  }

  if (mergedIds.size > 0) {
    bodies = bodies.filter((b) => !mergedIds.has(b.id));
    for (const merge of merges) {
      if (merge.toTier === null) continue;
      bodies.push(
        createCompanionFeastBody({
          tier: merge.toTier,
          x: merge.x,
          y: merge.y,
          vy: -60,
          spawnGraceMsRemaining: COMPANION_FEAST_SPAWN_GRACE_MS,
        }),
      );
    }
  }

  // Danger detection: settled bodies whose top edge crosses the danger line.
  let dangerActive = false;
  for (const b of bodies) {
    if (b.spawnGraceMsRemaining > 0) continue;
    const speed = Math.abs(b.vx) + Math.abs(b.vy);
    if (speed > SETTLED_SPEED_THRESHOLD) continue;
    if (b.y - b.radius < COMPANION_FEAST_DANGER_LINE_Y) {
      dangerActive = true;
      break;
    }
  }

  return { bodies, merges, dangerActive };
}

/**
 * Accumulate the danger timer. Returns the new elapsed value and whether the
 * run should end (elapsed reached `COMPANION_FEAST_DANGER_GRACE_MS`).
 */
export function advanceCompanionFeastDangerTimer(options: {
  dangerActive: boolean;
  elapsedDangerMs: number;
  dtMs: number;
}): { elapsedDangerMs: number; gameOver: boolean } {
  const elapsed = options.dangerActive
    ? options.elapsedDangerMs + Math.max(0, options.dtMs)
    : 0;
  return {
    elapsedDangerMs: elapsed,
    gameOver: elapsed >= COMPANION_FEAST_DANGER_GRACE_MS,
  };
}

// ---------------------------------------------------------------------------
// Creature Nudge (once-per-run bowl shake)
// ---------------------------------------------------------------------------

/**
 * Apply the once-per-run Creature Nudge: a gentle deterministic shake that
 * loosens stuck food. Pure — returns new body objects.
 */
export function applyCompanionFeastNudge(
  bodies: readonly CompanionFeastBody[],
  seed: number,
): CompanionFeastBody[] {
  let state = Math.floor(seed) || 1;
  const nextRandom = () => {
    // xorshift32 — deterministic for tests.
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 1000) / 1000;
  };
  return bodies.map((b) => ({
    ...b,
    vx: b.vx + (nextRandom() - 0.5) * 260,
    vy: b.vy - (60 + nextRandom() * 140),
  }));
}

// ---------------------------------------------------------------------------
// Drop queue (seeded, weighted toward small food)
// ---------------------------------------------------------------------------

/**
 * Deterministic droppable-tier roll. Weighted so early tiers dominate:
 * tier 0-2 are common, tier 3-4 rarer. `state` advances xorshift-style so
 * callers can chain rolls: `const [tier, next] = rollCompanionFeastDropTier(s)`.
 */
export function rollCompanionFeastDropTier(state: number): [tier: number, nextState: number] {
  let s = Math.floor(state) || 1;
  s ^= s << 13;
  s ^= s >>> 17;
  s ^= s << 5;
  const roll = (s >>> 0) % 100;
  let tier: number;
  if (roll < 32) tier = 0;
  else if (roll < 60) tier = 1;
  else if (roll < 82) tier = 2;
  else if (roll < 94) tier = 3;
  else tier = 4;
  return [Math.min(tier, COMPANION_FEAST_MAX_DROPPABLE_TIER), s | 0];
}

// ---------------------------------------------------------------------------
// Result tiers + rewards (existing currencies only — no new currency)
// ---------------------------------------------------------------------------

export type CompanionFeastResultTierId = 'nibble' | 'snack' | 'banquet' | 'grand_feast';

export interface CompanionFeastResultTier {
  id: CompanionFeastResultTierId;
  label: string;
  emoji: string;
  minScore: number;
  /** Reward paid through the standard minigame reward shape (dice only). */
  rewardDice: number;
}

export const COMPANION_FEAST_RESULT_TIERS: readonly CompanionFeastResultTier[] = Object.freeze([
  { id: 'nibble', label: 'Nibble', emoji: '🍽️', minScore: 0, rewardDice: 1 },
  { id: 'snack', label: 'Hearty Snack', emoji: '🥣', minScore: 120, rewardDice: 2 },
  { id: 'banquet', label: 'Banquet', emoji: '🍲', minScore: 320, rewardDice: 3 },
  { id: 'grand_feast', label: 'Grand Feast', emoji: '✨', minScore: 700, rewardDice: 5 },
]);

export function resolveCompanionFeastResultTier(score: number): CompanionFeastResultTier {
  const safeScore = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;
  let resolved = COMPANION_FEAST_RESULT_TIERS[0];
  for (const tier of COMPANION_FEAST_RESULT_TIERS) {
    if (safeScore >= tier.minScore) resolved = tier;
  }
  return resolved;
}

// ---------------------------------------------------------------------------
// Run entry / restart guards
// ---------------------------------------------------------------------------

export const COMPANION_FEAST_RUN_TICKET_COST = 1;

/**
 * Whether a new run can start. The first run of a launch is pre-paid by the
 * board's entry-spend path; replays require one more ticket.
 */
export function canStartCompanionFeastRun(options: {
  entryRunAvailable: boolean;
  ticketsRemaining: number;
}): boolean {
  if (options.entryRunAvailable) return true;
  const tickets = Number.isFinite(options.ticketsRemaining)
    ? Math.floor(options.ticketsRemaining)
    : 0;
  return tickets >= COMPANION_FEAST_RUN_TICKET_COST;
}
