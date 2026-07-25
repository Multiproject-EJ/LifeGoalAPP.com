/**
 * minigameJuice.ts — shared, pure "game feel" primitives for the event
 * mini-games (`src/features/gamification/games/`).
 *
 * The Fortune Engine rebuild established the house rendering language
 * (supersampled canvas, gradient materials, glow, custom glyphs). The pieces
 * of that language which are *maths rather than pixels* live here so every
 * mini-game shares one implementation and the behaviour is covered by the
 * Island Run service test suite.
 *
 * Everything in this module is deterministic and side-effect free:
 * - randomness is threaded through an explicit xorshift `rngState`, mirroring
 *   `rollCompanionFeastDropTier` / `rollFortuneWheelSlot`;
 * - simulation steps take `dtMs` and return new objects, never mutating input;
 * - nothing here touches the DOM. Canvas drawing helpers that need a
 *   `CanvasRenderingContext2D` live in `games/_shared/minigameCanvasKit.ts`.
 *
 * Reduced-motion is a *caller* concern: a renderer that respects
 * `prefers-reduced-motion` simply skips spawning bursts/shake rather than
 * asking this module to no-op.
 */

// ---------------------------------------------------------------------------
// Deterministic RNG (xorshift32, matching the other mini-game engines)
// ---------------------------------------------------------------------------

/** Advance an xorshift32 state. Never returns 0 (which would latch the state). */
export function nextMinigameJuiceRng(state: number): number {
  let s = Math.floor(state) || 1;
  s ^= s << 13;
  s ^= s >>> 17;
  s ^= s << 5;
  return (s | 0) || 1;
}

/** Advance the state and return a float in [0, 1). */
function nextUnitFloat(state: number): [value: number, nextState: number] {
  const next = nextMinigameJuiceRng(state);
  return [(next >>> 0) / 4294967296, next];
}

// ---------------------------------------------------------------------------
// Particles
// ---------------------------------------------------------------------------

export interface MinigameParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Milliseconds of life remaining; the particle is dropped at <= 0. */
  lifeMsRemaining: number;
  /** Original lifetime, so renderers can derive a 0..1 fade. */
  lifeMsTotal: number;
  radius: number;
  /** Index into a caller-supplied palette — keeps this module colour-agnostic. */
  paletteIndex: number;
  rotationRad: number;
  spinRadPerSec: number;
}

export interface MinigameParticleBurstOptions {
  x: number;
  y: number;
  count: number;
  /** Mean launch speed in units/second. */
  speed: number;
  /** Cone half-width in radians. Defaults to a full circle. */
  spreadRad?: number;
  /** Cone centre in radians (0 = right, -PI/2 = up). Ignored for full circles. */
  angleRad?: number;
  lifeMs: number;
  radius: number;
  /** Number of colours in the caller's palette; indexes are spread across it. */
  paletteSize?: number;
  rngState: number;
}

/**
 * Spawn a radial burst. Speed, angle, life and radius each get a deterministic
 * ±40% jitter so bursts never look like a rigid starburst.
 */
export function createMinigameParticleBurst(
  options: MinigameParticleBurstOptions,
): [particles: MinigameParticle[], nextRngState: number] {
  const count = Math.max(0, Math.floor(options.count));
  const paletteSize = Math.max(1, Math.floor(options.paletteSize ?? 1));
  const fullCircle = options.spreadRad === undefined;
  const spread = fullCircle ? Math.PI * 2 : Math.max(0, options.spreadRad ?? 0);
  const centre = options.angleRad ?? 0;

  const particles: MinigameParticle[] = [];
  let rng = Math.floor(options.rngState) || 1;

  for (let index = 0; index < count; index += 1) {
    let angleRoll: number;
    let speedRoll: number;
    let lifeRoll: number;
    let sizeRoll: number;
    [angleRoll, rng] = nextUnitFloat(rng);
    [speedRoll, rng] = nextUnitFloat(rng);
    [lifeRoll, rng] = nextUnitFloat(rng);
    [sizeRoll, rng] = nextUnitFloat(rng);

    // Even angular distribution plus jitter, so bursts read as organic.
    const evenAngle = fullCircle
      ? (index / count) * Math.PI * 2
      : centre - spread / 2 + (index / Math.max(1, count - 1)) * spread;
    const angle = evenAngle + (angleRoll - 0.5) * (spread / Math.max(1, count)) * 2;
    const speed = options.speed * (0.6 + speedRoll * 0.8);
    const lifeMs = options.lifeMs * (0.6 + lifeRoll * 0.8);

    particles.push({
      x: options.x,
      y: options.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      lifeMsRemaining: lifeMs,
      lifeMsTotal: lifeMs,
      radius: options.radius * (0.6 + sizeRoll * 0.8),
      paletteIndex: index % paletteSize,
      rotationRad: angle,
      spinRadPerSec: (speedRoll - 0.5) * 12,
    });
  }

  return [particles, rng];
}

export interface MinigameParticleStepOptions {
  dtMs: number;
  /** Downward acceleration in units/second². */
  gravity?: number;
  /** Velocity retained per second (1 = frictionless). */
  drag?: number;
}

/**
 * Advance every particle and drop the expired ones. Pure: returns a new array
 * of new objects.
 */
export function stepMinigameParticles(
  particles: readonly MinigameParticle[],
  options: MinigameParticleStepOptions,
): MinigameParticle[] {
  // Clamp dt so a backgrounded tab resuming doesn't teleport particles.
  const dtMs = Math.max(0, Math.min(64, options.dtMs));
  const dt = dtMs / 1000;
  const gravity = options.gravity ?? 0;
  const dragPerSecond = options.drag ?? 1;
  const drag = dragPerSecond === 1 ? 1 : Math.pow(dragPerSecond, dt);

  const next: MinigameParticle[] = [];
  for (const particle of particles) {
    const lifeMsRemaining = particle.lifeMsRemaining - dtMs;
    if (lifeMsRemaining <= 0) continue;
    const vy = (particle.vy + gravity * dt) * drag;
    const vx = particle.vx * drag;
    next.push({
      ...particle,
      x: particle.x + vx * dt,
      y: particle.y + vy * dt,
      vx,
      vy,
      lifeMsRemaining,
      rotationRad: particle.rotationRad + particle.spinRadPerSec * dt,
    });
  }
  return next;
}

/** 0..1 remaining-life ratio, for fades and shrink-out. */
export function resolveMinigameParticleFade(particle: MinigameParticle): number {
  if (particle.lifeMsTotal <= 0) return 0;
  return Math.max(0, Math.min(1, particle.lifeMsRemaining / particle.lifeMsTotal));
}

// ---------------------------------------------------------------------------
// Screen shake
// ---------------------------------------------------------------------------

export interface MinigameShakeState {
  /** Peak offset in logical units at full strength. */
  magnitude: number;
  remainingMs: number;
  totalMs: number;
  rngState: number;
}

export const MINIGAME_SHAKE_NONE: MinigameShakeState = Object.freeze({
  magnitude: 0,
  remainingMs: 0,
  totalMs: 0,
  rngState: 1,
});

/**
 * Start a shake. Re-triggering while one is live keeps the stronger of the
 * two so a big merge is never softened by a small one landing a frame later.
 */
export function createMinigameShake(options: {
  magnitude: number;
  durationMs: number;
  rngState?: number;
  previous?: MinigameShakeState | null;
}): MinigameShakeState {
  const magnitude = Math.max(0, options.magnitude);
  const durationMs = Math.max(0, options.durationMs);
  const previous = options.previous;
  if (previous && previous.remainingMs > 0 && previous.magnitude > magnitude) {
    return previous;
  }
  return {
    magnitude,
    remainingMs: durationMs,
    totalMs: durationMs,
    rngState: Math.floor(options.rngState ?? Date.now()) || 1,
  };
}

export interface MinigameShakeStepResult {
  state: MinigameShakeState;
  offsetX: number;
  offsetY: number;
}

/**
 * Advance a shake and return the offset to translate the scene by this frame.
 * Amplitude decays linearly to zero so the scene always settles exactly.
 */
export function stepMinigameShake(
  state: MinigameShakeState,
  dtMs: number,
): MinigameShakeStepResult {
  const remainingMs = Math.max(0, state.remainingMs - Math.max(0, dtMs));
  if (remainingMs <= 0 || state.totalMs <= 0 || state.magnitude <= 0) {
    return {
      state: { ...state, remainingMs: 0 },
      offsetX: 0,
      offsetY: 0,
    };
  }

  const decay = remainingMs / state.totalMs;
  let xRoll: number;
  let yRoll: number;
  let rng = state.rngState;
  [xRoll, rng] = nextUnitFloat(rng);
  [yRoll, rng] = nextUnitFloat(rng);
  const amplitude = state.magnitude * decay;

  return {
    state: { ...state, remainingMs, rngState: rng },
    offsetX: (xRoll - 0.5) * 2 * amplitude,
    offsetY: (yRoll - 0.5) * 2 * amplitude,
  };
}

// ---------------------------------------------------------------------------
// Number tweening (score counters that roll up instead of snapping)
// ---------------------------------------------------------------------------

/**
 * Ease a displayed number toward its target. Uses exponential approach with a
 * minimum step so large jumps feel fast and the last unit still lands: the
 * result snaps exactly to `target` once within one unit.
 */
export function stepMinigameNumberTween(options: {
  current: number;
  target: number;
  dtMs: number;
  /** Fraction of the remaining gap closed per second. */
  approachPerSecond?: number;
  /** Minimum units travelled per second, so slow tails still finish. */
  minUnitsPerSecond?: number;
}): number {
  const target = options.target;
  const current = options.current;
  const gap = target - current;
  if (gap === 0) return target;

  const dt = Math.max(0, Math.min(64, options.dtMs)) / 1000;
  if (dt === 0) return current;

  const approach = options.approachPerSecond ?? 8;
  const minUnits = options.minUnitsPerSecond ?? 12;
  const direction = Math.sign(gap);
  const magnitude = Math.abs(gap);

  const exponentialStep = magnitude * (1 - Math.exp(-approach * dt));
  const linearStep = minUnits * dt;
  const step = Math.max(exponentialStep, linearStep);

  if (step >= magnitude) return target;
  return current + direction * step;
}

// ---------------------------------------------------------------------------
// Combo escalation
// ---------------------------------------------------------------------------

export interface MinigameComboTier {
  /** Chain length at which this tier starts. */
  minCount: number;
  label: string;
  /** 0..1 strength, for scaling shake/particles/audio at the call site. */
  intensity: number;
}

/**
 * Escalating praise ladder shared by the mini-games. Kept deliberately short:
 * the doc guidance (`monopoly-go-loop-observation-2026-07-23.md`) is that
 * momentum should read instantly, not be narrated.
 */
export const MINIGAME_COMBO_TIERS: readonly MinigameComboTier[] = Object.freeze([
  { minCount: 2, label: 'Nice', intensity: 0.25 },
  { minCount: 3, label: 'Sweet', intensity: 0.45 },
  { minCount: 4, label: 'Delicious', intensity: 0.65 },
  { minCount: 6, label: 'Feast Frenzy', intensity: 0.85 },
  { minCount: 8, label: 'LEGENDARY', intensity: 1 },
]);

/** Highest tier reached by `count`, or null below the first threshold. */
export function resolveMinigameComboTier(count: number): MinigameComboTier | null {
  const safe = Number.isFinite(count) ? Math.floor(count) : 0;
  let resolved: MinigameComboTier | null = null;
  for (const tier of MINIGAME_COMBO_TIERS) {
    if (safe >= tier.minCount) resolved = tier;
  }
  return resolved;
}

/**
 * Whether a new action continues the current chain or starts a fresh one.
 * Chains are time-windowed, so the player has to keep the tempo up.
 */
export function resolveMinigameChainCount(options: {
  previousCount: number;
  lastActionAtMs: number;
  nowMs: number;
  windowMs: number;
}): number {
  const previous = Math.max(0, Math.floor(options.previousCount));
  const elapsed = options.nowMs - options.lastActionAtMs;
  if (previous <= 0 || elapsed > options.windowMs || elapsed < 0) return 1;
  return previous + 1;
}

// ---------------------------------------------------------------------------
// Easing / pop scaling
// ---------------------------------------------------------------------------

export function easeOutCubic(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - clamped, 3);
}

/** Overshooting ease, for arrivals that should feel springy. */
export function easeOutBack(t: number, overshoot = 1.7): number {
  const clamped = Math.max(0, Math.min(1, t));
  // Pin the endpoints: the polynomial leaves float residue (~-2e-16) at t=0,
  // and callers legitimately compare an eased value against 0/1.
  if (clamped === 0) return 0;
  if (clamped === 1) return 1;
  const c3 = overshoot + 1;
  return 1 + c3 * Math.pow(clamped - 1, 3) + overshoot * Math.pow(clamped - 1, 2);
}

/**
 * Squash-and-stretch scale for a freshly spawned/merged body: overshoots past
 * 1 then settles back. Returns exactly 1 once the animation has elapsed, so
 * callers can render unconditionally.
 */
export function resolveMinigamePopScale(options: {
  ageMs: number;
  durationMs: number;
  /** Peak overshoot, e.g. 0.35 → up to 1.35×. */
  amplitude: number;
}): number {
  if (options.durationMs <= 0) return 1;
  const t = options.ageMs / options.durationMs;
  if (t <= 0) return 1 + options.amplitude;
  if (t >= 1) return 1;
  // Damped cosine: starts at +amplitude, rings down to 0.
  const decay = 1 - easeOutCubic(t);
  return 1 + options.amplitude * decay * Math.cos(t * Math.PI * 1.5);
}
