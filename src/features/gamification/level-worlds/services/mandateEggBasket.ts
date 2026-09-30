import type { PerIslandEggEntry, PerIslandEggsLedger } from './islandRunGameStateStore';
import { getEggSlotLedgerKey } from './islandRunEggMania';

/**
 * Island 001 mandate reward (user request 2026-09-30): signing the
 * peacekeeping mandate hands the player a basket of three eggs — one rare,
 * two common — which start incubating in the travelling egg column. They are
 * gifts: they never count toward "collect or sell all Hatchery eggs", so the
 * island can still be cleared right away.
 */

export const MANDATE_EGG_BASKET_TIERS: readonly PerIslandEggEntry['tier'][] = ['rare', 'common', 'common'];
export const MANDATE_EGG_BASKET_GIFT = 'mandate-basket' as const;
const HOUR_MS = 60 * 60 * 1000;
export const MANDATE_EGG_BASKET_HATCH_MS: Record<'common' | 'rare' | 'mythic', number> = {
  common: 24 * HOUR_MS,
  rare: 36 * HOUR_MS,
  mythic: 48 * HOUR_MS,
};

/** The phone call that follows the basket. */
export const ARENA_GAMES_CALL = {
  title: "Get ready, it's time to kick off the Arena Games",
  body: 'The mandate is signed and your egg basket is incubating. Next stop: Island 002, where the opening Arena Games begin.',
  stepLabels: ['Watch your three eggs incubate', 'Travel to Island 002', 'Kick off the Arena Games'],
} as const;

export function getArenaGamesCallMessageId(cycleIndex: number): string {
  return `arena-games-call:${Math.max(0, Math.floor(cycleIndex))}`;
}

/**
 * The three basket eggs in free egg slots of `islandNumber` (slot 1 upward, so
 * the island's own Hatchery slot 0 stays free). Returns ledger additions only.
 */
export function buildMandateEggBasket(options: {
  perIslandEggs: PerIslandEggsLedger | null | undefined;
  islandNumber: number;
  nowMs: number;
}): Record<string, PerIslandEggEntry> {
  const taken = new Set(Object.keys(options.perIslandEggs ?? {}));
  const additions: Record<string, PerIslandEggEntry> = {};
  let slot = 1;
  for (const tier of MANDATE_EGG_BASKET_TIERS) {
    while (taken.has(getEggSlotLedgerKey(options.islandNumber, slot))) slot += 1;
    const key = getEggSlotLedgerKey(options.islandNumber, slot);
    taken.add(key);
    additions[key] = {
      tier,
      setAtMs: options.nowMs,
      hatchAtMs: options.nowMs + MANDATE_EGG_BASKET_HATCH_MS[tier],
      status: 'incubating',
      location: 'spaceship',
      gift: MANDATE_EGG_BASKET_GIFT,
    };
  }
  return additions;
}
