import type { IslandRunGameStateRecord } from './islandRunGameStateStore';
import { settleLandmarkCompletionDice } from './islandRunLandmarkReward';
import { resolveIslandRunRestorationDiceReward } from './islandRunRestorationReward';
import { getEffectiveIslandNumber, resolveBuildSpendStepForTier, spendIslandRunContractV2EssenceOnStopBuild } from './islandRunContractV2EssenceBuild';

export type FastBuildMode = 'landmark' | 'island';
export type FastBuildQuote = { mode: FastBuildMode; stopIndex: number; cost: number; levels: number; key: string; discountRate: number; expiresAtMs: number | null };
type BuildRecord = Pick<IslandRunGameStateRecord, 'currentIslandNumber' | 'cycleIndex' | 'islandStartedAtMs' | 'stopBuildStateByIndex' | 'stopStatesByIndex' | 'essence' | 'essenceLifetimeSpent' | 'firstSessionTutorialState'>;

/** One shared simulation prices and applies precisely the same funded steps. */
function simulate(record: BuildRecord, mode: FastBuildMode, stopIndex: number, discountRate: number) {
  let essence = Number.MAX_SAFE_INTEGER;
  let essenceLifetimeSpent = 0;
  let stopBuildStateByIndex = record.stopBuildStateByIndex;
  let stopStatesByIndex = record.stopStatesByIndex;
  let levels = 0;
  const effectiveIslandNumber = getEffectiveIslandNumber(record.currentIslandNumber, record.cycleIndex);
  for (let index = 0; index < stopBuildStateByIndex.length; index += 1) {
    if (mode === 'landmark' && index !== stopIndex || record.currentIslandNumber === 1 && index === 4) continue;
    // Three levels with five steps each, plus one partial legacy step.
    for (let step = 0; step < 20; step += 1) {
      const build = stopBuildStateByIndex[index];
      if (!build || build.buildLevel >= 3) break;
      const result = spendIslandRunContractV2EssenceOnStopBuild({
        islandRunContractV2Enabled: true, stopIndex: index,
        spendAmount: resolveBuildSpendStepForTier(build.requiredEssence), discountRate,
        essence, essenceLifetimeSpent, stopBuildStateByIndex, stopStatesByIndex,
        effectiveIslandNumber, enforceSequentialBuildTarget: false,
      });
      if (!result.spent) break;
      ({ essence, essenceLifetimeSpent, stopBuildStateByIndex, stopStatesByIndex } = result);
      if (result.leveledUp) levels += 1;
    }
  }
  return { cost: essenceLifetimeSpent, levels, stopBuildStateByIndex, stopStatesByIndex };
}

export function quoteIslandRunFastBuild(record: BuildRecord, mode: FastBuildMode, stopIndex: number, discountRate = 0, expiresAtMs: number | null = null, nowMs = Date.now()): FastBuildQuote | null {
  if (!Number.isInteger(stopIndex) || stopIndex < 0 || stopIndex >= record.stopBuildStateByIndex.length) return null;
  // Intro construction remains its guided L1 action. Legacy/non-intro users are eligible.
  if (record.currentIslandNumber === 1 && !['complete', 'not_started', 'hatchery_l1_celebrated', 'normal_play_until_low_dice', 'first_creature_pack_available', 'first_creature_pack_opened', 'first_creature_pack_claimed'].includes(record.firstSessionTutorialState)) return null;
  const rate = expiresAtMs && expiresAtMs > nowMs ? Math.min(.95, Math.max(0, discountRate)) : 0;
  const result = simulate(record, mode, stopIndex, rate);
  if (!result.levels || !result.cost) return null;
  const key = JSON.stringify([record.currentIslandNumber, record.cycleIndex, record.islandStartedAtMs, mode, stopIndex, rate, record.stopBuildStateByIndex]);
  return { mode, stopIndex, cost: result.cost, levels: result.levels, key, discountRate: rate, expiresAtMs };
}

export function resolveIslandRunFastBuild(record: IslandRunGameStateRecord, quote: FastBuildQuote, nowMs = Date.now()) {
  const currentQuote = quoteIslandRunFastBuild(record, quote.mode, quote.stopIndex, quote.discountRate, quote.expiresAtMs, nowMs);
  if (!currentQuote || currentQuote.key !== quote.key || currentQuote.cost !== quote.cost) return { record, applied: false, reason: 'quote_changed' as const, diceAward: 0, constructionDiceAwarded: 0, restorationDiceAwarded: 0, diceAwarded: 0 };
  if (record.essence < currentQuote.cost) return { record, applied: false, reason: 'insufficient_money' as const, diceAward: 0, constructionDiceAwarded: 0, restorationDiceAwarded: 0, diceAwarded: 0 };
  const next = simulate(record, quote.mode, quote.stopIndex, currentQuote.discountRate);
  const restorationDiceAwarded = resolveIslandRunRestorationDiceReward(record.stopBuildStateByIndex, next.stopBuildStateByIndex);
  const diceAwarded = next.levels + restorationDiceAwarded;
  const settlement = settleLandmarkCompletionDice(record, {
    ...record,
    essence: record.essence - next.cost,
    essenceLifetimeSpent: record.essenceLifetimeSpent + next.cost,
    stopBuildStateByIndex: next.stopBuildStateByIndex,
    stopStatesByIndex: next.stopStatesByIndex,
    dicePool: record.dicePool + diceAwarded,
    runtimeVersion: record.runtimeVersion + 1,
  });
  return {
    constructionDiceAwarded: next.levels,
    restorationDiceAwarded,
    diceAwarded: diceAwarded + settlement.diceAwarded,
    applied: true, reason: 'built' as const, diceAward: next.levels,
    record: settlement.record,
  };
}
