import type { SpinPrize } from '../types/gamification';

/**
 * Super Slice luck: several player-friendly boosts, bounded by hard caps so the
 * slice stays special.
 *
 * - Cooldown cap: at most one Super Slice per 7 days. Nothing overrides it.
 * - Comeback luck: x3 odds after 3-6 days without a spin, x5 after 7+.
 * - Bad-luck protection: odds creep up after 20 spins without one and the
 *   45th such spin is guaranteed. Only spins since the Super Slice launched
 *   count, so existing players are not all "owed" one on day one.
 * - New-player hook: a player who has never had one is guaranteed it by their
 *   7th spin ever.
 * - Combined boosts never exceed x5.
 *
 * The result is shown to the player (a "Lucky xN" badge), so the odds are never
 * silently changed on a wheel that can be boosted with money.
 */

export const SUPER_SLICE_LAUNCHED_AT_MS = Date.UTC(2026, 8, 26);
export const SUPER_SLICE_COOLDOWN_DAYS = 7;
export const SUPER_SLICE_MAX_LUCK = 5;
export const SUPER_SLICE_PITY_START_SPINS = 20;
export const SUPER_SLICE_PITY_GUARANTEE_SPINS = 45;
export const SUPER_SLICE_NEW_PLAYER_GUARANTEE_SPINS = 7;
/** Enough history to see the last Super Slice and a full pity window. */
export const SUPER_SLICE_HISTORY_WINDOW = 60;

const DAY_MS = 24 * 60 * 60 * 1000;

export type SuperSliceLuckReason = 'comeback' | 'bad_luck_protection' | 'new_player';

export interface SuperSliceHistoryEntry {
  prizeType: string;
  spunAtMs: number;
}

export interface SuperSliceLuck {
  /** Weight multiplier for the Super Slice; 0 while on cooldown. */
  multiplier: number;
  guaranteed: boolean;
  onCooldown: boolean;
  reasons: SuperSliceLuckReason[];
}

export const NEUTRAL_SUPER_SLICE_LUCK: SuperSliceLuck = {
  multiplier: 1,
  guaranteed: false,
  onCooldown: false,
  reasons: [],
};

/** Accepts both database rows (snake_case) and demo-storage rows (camelCase). */
export function normalizeSuperSliceHistory(rows: readonly unknown[] | null | undefined): SuperSliceHistoryEntry[] {
  return (rows ?? []).flatMap((row) => {
    if (!row || typeof row !== 'object') return [];
    const record = row as Record<string, unknown>;
    const prizeType = record.prizeType ?? record.prize_type;
    const spunAt = record.spunAt ?? record.spun_at;
    const spunAtMs = typeof spunAt === 'string' ? Date.parse(spunAt) : Number.NaN;
    return typeof prizeType === 'string' && Number.isFinite(spunAtMs) ? [{ prizeType, spunAtMs }] : [];
  });
}

export function resolveSuperSliceLuck(input: {
  /** Newest first. */
  history: readonly SuperSliceHistoryEntry[];
  totalSpinsUsed: number;
  lastSpinDate: string | null;
  nowMs: number;
}): SuperSliceLuck {
  const lastSuper = input.history.find((entry) => entry.prizeType === 'super');
  if (lastSuper && input.nowMs - lastSuper.spunAtMs < SUPER_SLICE_COOLDOWN_DAYS * DAY_MS) {
    return { multiplier: 0, guaranteed: false, onCooldown: true, reasons: [] };
  }

  const countFromMs = Math.max(SUPER_SLICE_LAUNCHED_AT_MS, lastSuper?.spunAtMs ?? 0);
  const spinsSinceSuper = input.history.filter((entry) => entry.spunAtMs > countFromMs).length;
  const reasons: SuperSliceLuckReason[] = [];

  const today = Math.floor(input.nowMs / DAY_MS);
  const lastSpinDay = input.lastSpinDate ? Math.floor(Date.parse(`${input.lastSpinDate}T00:00:00Z`) / DAY_MS) : null;
  const daysAway = lastSpinDay === null || !Number.isFinite(lastSpinDay) ? 0 : today - lastSpinDay;
  const comeback = daysAway >= 7 ? 5 : daysAway >= 3 ? 3 : 1;
  if (comeback > 1) reasons.push('comeback');

  const pity = spinsSinceSuper >= SUPER_SLICE_PITY_START_SPINS
    ? 1 + (spinsSinceSuper - SUPER_SLICE_PITY_START_SPINS + 1) * 0.1
    : 1;
  if (pity > 1) reasons.push('bad_luck_protection');

  const totalSpins = Math.max(0, Math.floor(input.totalSpinsUsed));
  const newPlayerGuarantee = !lastSuper && totalSpins < SUPER_SLICE_NEW_PLAYER_GUARANTEE_SPINS
    && totalSpins + 1 >= SUPER_SLICE_NEW_PLAYER_GUARANTEE_SPINS;
  if (newPlayerGuarantee) reasons.push('new_player');
  const pityGuarantee = spinsSinceSuper + 1 >= SUPER_SLICE_PITY_GUARANTEE_SPINS;

  return {
    multiplier: Math.min(SUPER_SLICE_MAX_LUCK, Math.round(comeback * pity * 10) / 10),
    guaranteed: newPlayerGuarantee || pityGuarantee,
    onCooldown: false,
    reasons,
  };
}

/** Applies luck to the Super Slice's wheel weight; other slices are untouched. */
export function applySuperSliceLuck(prizes: readonly SpinPrize[], luck: SuperSliceLuck): SpinPrize[] {
  return prizes.map((prize) => (
    prize.type === 'super'
      ? { ...prize, wheelWeight: (prize.wheelWeight ?? 1) * luck.multiplier }
      : prize
  ));
}
