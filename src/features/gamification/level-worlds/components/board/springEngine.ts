// ─── Lightweight spring physics engine ───────────────────────────────────────
// Replaces hard CSS transitions with physically-motivated damped springs.
// ~80 LOC, zero dependencies.  Used by useBoardCamera & useTokenAnimation.

export interface SpringConfig {
  /** Stiffness — higher = snappier.  Good range: 80–400 */
  stiffness: number;
  /** Damping — higher = less oscillation.  Good range: 12–40 */
  damping: number;
  /** Mass — usually 1.  Higher = more sluggish */
  mass: number;
  /** When |velocity| + |displacement| < precision we consider it "at rest" */
  precision: number;
}

export const SPRING_PRESETS = {
  /** Smooth follow — gentle, cinematic camera tracking */
  smooth: { stiffness: 120, damping: 20, mass: 1, precision: 0.01 } satisfies SpringConfig,
  /** Snappy — quick focus transitions, UI interactions */
  snappy: { stiffness: 300, damping: 26, mass: 1, precision: 0.01 } satisfies SpringConfig,
  /** Bouncy — token land, impact effects */
  bouncy: { stiffness: 200, damping: 12, mass: 1, precision: 0.01 } satisfies SpringConfig,
  /** Stiff — near-instant, subtle shake */
  stiff: { stiffness: 500, damping: 35, mass: 1, precision: 0.02 } satisfies SpringConfig,
} as const;

export interface SpringState {
  /** Current value */
  value: number;
  /** Current velocity */
  velocity: number;
  /** Target value */
  target: number;
  /** Whether the spring is at rest (close enough to target with near-zero velocity) */
  atRest: boolean;
}

/**
 * Creates a spring state initialized at a given value (at rest).
 */
export function createSpring(initial: number): SpringState {
  return { value: initial, velocity: 0, target: initial, atRest: true };
}

/**
 * Advance a spring by `dt` seconds using semi-implicit Euler integration.
 * Mutates and returns the same object for GC-friendliness in animation loops.
 */
export function stepSpring(spring: SpringState, config: SpringConfig, dt: number): SpringState {
  const { stiffness, damping, mass, precision } = config;
  const displacement = spring.value - spring.target;

  // F = -kx - cv  (Hooke + damping)
  const acceleration = (-stiffness * displacement - damping * spring.velocity) / mass;

  // Semi-implicit Euler: update velocity first, then position
  spring.velocity += acceleration * dt;
  spring.value += spring.velocity * dt;

  // Rest detection
  if (Math.abs(spring.velocity) < precision && Math.abs(displacement) < precision) {
    spring.value = spring.target;
    spring.velocity = 0;
    spring.atRest = true;
  } else {
    spring.atRest = false;
  }

  return spring;
}

/**
 * Step a batch of named springs.  Returns true if *any* spring is still active.
 */
export function stepSprings<K extends string>(
  springs: Record<K, SpringState>,
  config: SpringConfig,
  dt: number,
): boolean {
  let anyActive = false;
  for (const key of Object.keys(springs) as K[]) {
    stepSpring(springs[key], config, dt);
    if (!springs[key].atRest) anyActive = true;
  }
  return anyActive;
}
