/**
 * islandRunDiceRegeneration — Level-band passive dice regeneration system.
 *
 * Baseline target (Monopoly-style):
 * - Passive regen only while dicePool < maxDice.
 * - Dice are granted in +1 interval ticks.
 * - Regen stops at maxDice.
 * - Reward dice may exceed maxDice; passive regen still only fills to maxDice.
 * - UI primary countdown is "next dice in MM:SS".
 */

export interface DiceRegenConfig {
  maxDice: number;
  regenIntervalMinutes: number;
}

export const DICE_REGEN_NEXT_DICE_LABEL = 'Next dice in';

const DICE_REGEN_LEVEL_BANDS: ReadonlyArray<{
  minLevel: number;
  maxDice: number;
  regenIntervalMinutes: number;
}> = [
  { minLevel: 1, maxDice: 30, regenIntervalMinutes: 8 },
  { minLevel: 5, maxDice: 50, regenIntervalMinutes: 10 },
  { minLevel: 10, maxDice: 75, regenIntervalMinutes: 10 },
  { minLevel: 20, maxDice: 100, regenIntervalMinutes: 10 },
  { minLevel: 40, maxDice: 125, regenIntervalMinutes: 9 },
  { minLevel: 75, maxDice: 150, regenIntervalMinutes: 8 },
  { minLevel: 125, maxDice: 200, regenIntervalMinutes: 7 },
] as const;

export function resolveDiceRegenConfig(playerLevel: number): DiceRegenConfig {
  const safeLevel = Number.isFinite(playerLevel) ? Math.max(1, Math.floor(playerLevel)) : 1;
  let selected = DICE_REGEN_LEVEL_BANDS[0]!;
  for (const band of DICE_REGEN_LEVEL_BANDS) {
    if (safeLevel >= band.minLevel) {
      selected = band;
    } else {
      break;
    }
  }
  return {
    maxDice: selected.maxDice,
    regenIntervalMinutes: selected.regenIntervalMinutes,
  };
}

export function resolveDiceRegenMinDice(playerLevel: number): number {
  return resolveDiceRegenConfig(playerLevel).maxDice;
}

/** Historical persisted field still used by runtime schema/debug views. */
export function resolveDiceRegenRatePerHour(playerLevel: number): number {
  const { regenIntervalMinutes } = resolveDiceRegenConfig(playerLevel);
  return 60 / regenIntervalMinutes;
}

export interface DiceRegenState {
  maxDice: number;
  regenRatePerHour: number;
  lastRegenAtMs: number;
}

export function buildInitialDiceRegenState(playerLevel: number, nowMs: number): DiceRegenState {
  const config = resolveDiceRegenConfig(playerLevel);
  return {
    maxDice: config.maxDice,
    regenRatePerHour: 60 / config.regenIntervalMinutes,
    lastRegenAtMs: Math.floor(nowMs),
  };
}

export function applyDiceRegeneration(params: {
  currentDicePool: number;
  regenState: DiceRegenState | null;
  playerLevel: number;
  nowMs: number;
}): {
  dicePool: number;
  regenState: DiceRegenState;
  diceAdded: number;
} {
  const { currentDicePool, playerLevel, nowMs } = params;
  const safePool = Math.max(0, Math.floor(currentDicePool));
  const safeNow = Math.floor(nowMs);
  const config = resolveDiceRegenConfig(playerLevel);
  const ratePerHour = 60 / config.regenIntervalMinutes;
  const intervalMs = config.regenIntervalMinutes * 60 * 1000;

  if (!params.regenState) {
    return {
      dicePool: safePool,
      regenState: {
        maxDice: config.maxDice,
        regenRatePerHour: ratePerHour,
        lastRegenAtMs: safeNow,
      },
      diceAdded: 0,
    };
  }

  const elapsedMs = Math.max(0, safeNow - params.regenState.lastRegenAtMs);

  if (safePool >= config.maxDice) {
    return {
      dicePool: safePool,
      regenState: {
        maxDice: config.maxDice,
        regenRatePerHour: ratePerHour,
        lastRegenAtMs: safeNow,
      },
      diceAdded: 0,
    };
  }

  if (elapsedMs < intervalMs) {
    return {
      dicePool: safePool,
      regenState: {
        maxDice: config.maxDice,
        regenRatePerHour: ratePerHour,
        lastRegenAtMs: params.regenState.lastRegenAtMs,
      },
      diceAdded: 0,
    };
  }

  // Strict non-batching baseline: one die per completed interval, timer resets
  // to "now" after each grant.
  const diceAdded = 1;
  const nextLastRegenAtMs = safeNow;

  return {
    dicePool: safePool + diceAdded,
    regenState: {
      maxDice: config.maxDice,
      regenRatePerHour: ratePerHour,
      lastRegenAtMs: nextLastRegenAtMs,
    },
    diceAdded,
  };
}

export function resolveNextRollEtaMs(params: {
  dicePool: number;
  target: number;
  regenState: DiceRegenState | null | undefined;
  nowMs: number;
}): number {
  const { dicePool, target, regenState, nowMs } = params;
  const safePool = Math.max(0, Math.floor(dicePool));
  const safeTarget = Math.max(0, Math.floor(target));
  const safeNow = Math.floor(nowMs);

  if (safePool >= safeTarget) return 0;
  if (!regenState) return Number.POSITIVE_INFINITY;

  const { maxDice, regenRatePerHour, lastRegenAtMs } = regenState;
  if (safeTarget > maxDice) return Number.POSITIVE_INFINITY;
  if (regenRatePerHour <= 0) return Number.POSITIVE_INFINITY;

  const msPerDie = (60 * 60 * 1000) / regenRatePerHour;
  const needed = safeTarget - safePool;
  const totalMsFromAnchor = needed * msPerDie;
  const elapsedMs = Math.max(0, safeNow - lastRegenAtMs);
  const remainingMs = Math.max(0, Math.ceil(totalMsFromAnchor - elapsedMs));
  return remainingMs;
}

export function resolveFullRefillEtaMs(params: {
  dicePool: number;
  regenState: DiceRegenState | null | undefined;
  nowMs: number;
}): number {
  const { dicePool, regenState, nowMs } = params;
  if (!regenState) {
    return dicePool > 0 ? 0 : Number.POSITIVE_INFINITY;
  }
  return resolveNextRollEtaMs({
    dicePool,
    target: regenState.maxDice,
    regenState,
    nowMs,
  });
}
