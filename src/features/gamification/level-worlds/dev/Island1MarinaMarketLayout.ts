/** Shared presentation geometry and pedestrian surface coordinates. No gameplay state. */
export const MARINA_DECK_Y = -2.38;
export const MARINA_WALK_Y = MARINA_DECK_Y + .13;
export const MARINA_BERTH_PITCH = 5.2;
export const MARINA_BERTH_START = 13.8 + 2 * MARINA_BERTH_PITCH;
export const MARINA_MARKET_INNER = 10.0;
export const MARINA_MARKET_OUTER = 20.8;
export const MARINA_MARKET_INNER_WALK = 11.3;
export const MARINA_MARKET_WALK_RADIUS = 17.5;
export const MARINA_CANAL_INNER = 12.5;
export const MARINA_CANAL_HALF_ANGLE = .073;
export const MARINA_BRIDGE_HALF_LENGTH = 2.8;
export const MARINA_BRIDGE_HALF_WIDTH = 1.35;
export const MARINA_BRIDGE_RISE = .9;
export const MARINA_BRIDGE_STEPS = 10;
export const MARINA_SPOKE_ANGLE = Math.PI / 5;
export const MARINA_BRIDGE_ANGLES = Array.from({ length: 5 }, (_, i) => (2 * i + .5) * MARINA_SPOKE_ANGLE);
export type MarinaPoint = [number, number, number];

export function marinaPolar(radius: number, angle: number, y = MARINA_WALK_Y): MarinaPoint {
  return [Math.sin(angle) * radius, y, Math.cos(angle) * radius];
}

export function marinaBridgeHeight(x: number): number {
  const inward = Math.max(0, Math.min(1, 1 - Math.abs(x) / MARINA_BRIDGE_HALF_LENGTH));
  return MARINA_WALK_Y + Math.ceil(inward * MARINA_BRIDGE_STEPS - 1e-8) * MARINA_BRIDGE_RISE / MARINA_BRIDGE_STEPS;
}

export function marinaBridgeAt(x: number, z: number) {
  for (const angle of MARINA_BRIDGE_ANGLES) {
    const tangent = x * Math.cos(angle) - z * Math.sin(angle);
    const radial = x * Math.sin(angle) + z * Math.cos(angle);
    if (Math.abs(tangent) <= MARINA_BRIDGE_HALF_LENGTH && Math.abs(radial - MARINA_MARKET_WALK_RADIUS) <= MARINA_BRIDGE_HALF_WIDTH) {
      return { angle, tangent, radial, height: marinaBridgeHeight(tangent) };
    }
  }
  return null;
}

export function marinaMarketSurfaceY(x: number, z: number): number | null {
  const bridge = marinaBridgeAt(x, z);
  if (bridge) return bridge.height;
  const radius = Math.hypot(x, z);
  if (radius < MARINA_MARKET_INNER - .05 || radius > MARINA_MARKET_OUTER + .05) return null;
  const angle = Math.atan2(x, z);
  const canal = radius > MARINA_CANAL_INNER && MARINA_BRIDGE_ANGLES.some(a =>
    Math.abs(Math.atan2(Math.sin(angle - a), Math.cos(angle - a))) < MARINA_CANAL_HALF_ANGLE);
  return canal ? null : MARINA_WALK_Y;
}

/** Dense points follow the same stair surface used to build the bridges. */
export function marinaMarketArc(from: number, to: number, radius = MARINA_MARKET_WALK_RADIUS): MarinaPoint[] {
  const steps = Math.max(1, Math.ceil(Math.abs(to - from) * radius / .12));
  return Array.from({ length: steps + 1 }, (_, i) => {
    const p = marinaPolar(radius, from + (to - from) * i / steps);
    p[1] = marinaMarketSurfaceY(p[0], p[2]) ?? MARINA_WALK_Y;
    return p;
  });
}
