/**
 * Lucky Spin on the board — where today's spin badge sits.
 *
 * Presentation only: the badge launches the existing daily spin wheel, whose
 * availability and rewards stay server/daily-spin owned. The badge sits a few
 * tiles ahead of the player (varying by day) so it is in view and reachable.
 */

export const LUCKY_SPIN_TILE_MIN_AHEAD = 3;
export const LUCKY_SPIN_TILE_MAX_AHEAD = 6;
/** When the wheel opens after the tile launch starts (ms). */
export const LUCKY_SPIN_LAUNCH_OPEN_MS = 950;
/** When the launch effect is removed (ms). */
export const LUCKY_SPIN_LAUNCH_TOTAL_MS = 1_650;

function hashDay(dayKey: string): number {
  let hash = 2166136261;
  for (let index = 0; index < dayKey.length; index += 1) {
    hash ^= dayKey.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

export function resolveLuckySpinTileIndex(options: { tokenIndex: number; tileCount: number; dayKey: string }): number | null {
  const { tokenIndex, tileCount, dayKey } = options;
  if (!Number.isFinite(tileCount) || tileCount <= LUCKY_SPIN_TILE_MAX_AHEAD) return null;
  const span = LUCKY_SPIN_TILE_MAX_AHEAD - LUCKY_SPIN_TILE_MIN_AHEAD + 1;
  const ahead = LUCKY_SPIN_TILE_MIN_AHEAD + (hashDay(dayKey) % span);
  const start = Number.isFinite(tokenIndex) ? Math.floor(tokenIndex) : 0;
  return (((start + ahead) % tileCount) + tileCount) % tileCount;
}

export type LuckySpinConfettiPiece = { angle: number; distance: number; delayMs: number; color: string; spin: number };

const CONFETTI_COLORS = ['#facc15', '#f472b6', '#38bdf8', '#a3e635', '#fb923c', '#c084fc'];

/** Deterministic confetti burst (no Math.random, so renders are stable). */
export function buildLuckySpinConfetti(count = 28): LuckySpinConfettiPiece[] {
  return Array.from({ length: count }, (_, index) => ({
    angle: -170 + ((index * 137.5) % 160),
    distance: 70 + ((index * 53) % 90),
    delayMs: (index * 17) % 140,
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    spin: index % 2 === 0 ? 540 : -420,
  }));
}
