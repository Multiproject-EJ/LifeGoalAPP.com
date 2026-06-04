import type { PerIslandEggEntry, PerIslandEggsLedger } from './islandRunGameStateStore';

export const EGG_MANIA_SCHEDULED_ISLANDS_PER_CYCLE = 4 as const;
export const EGG_MANIA_MAX_EGGS_PER_ISLAND = 3 as const;
export const EGG_MANIA_SLOT_KEY_SEPARATOR = '#egg' as const;

export interface IslandRunEggSlot {
  key: string;
  islandNumber: number;
  slotIndex: number;
  entry: PerIslandEggEntry;
}

export interface IslandRunEggManiaState {
  active: boolean;
  source: 'scheduled' | null;
  consumed: boolean;
  islandNumber: number;
  cycleIndex: number;
  maxEggs: number;
  scheduledIslands: number[];
}

function hashStringToUint32(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function getEggSlotLedgerKey(islandNumber: number, slotIndex: number): string {
  const safeIsland = Math.max(1, Math.floor(Number.isFinite(islandNumber) ? islandNumber : 1));
  const safeSlot = Math.max(0, Math.floor(Number.isFinite(slotIndex) ? slotIndex : 0));
  return safeSlot === 0 ? String(safeIsland) : `${safeIsland}${EGG_MANIA_SLOT_KEY_SEPARATOR}${safeSlot}`;
}

export function parseEggSlotLedgerKey(key: string): { islandNumber: number; slotIndex: number } | null {
  const [islandPart, slotPart] = key.split(EGG_MANIA_SLOT_KEY_SEPARATOR);
  const islandNumber = Number.parseInt(islandPart, 10);
  if (!Number.isFinite(islandNumber) || islandNumber < 1) return null;
  if (slotPart === undefined) return { islandNumber, slotIndex: 0 };
  const slotIndex = Number.parseInt(slotPart, 10);
  if (!Number.isFinite(slotIndex) || slotIndex < 1) return null;
  return { islandNumber, slotIndex };
}

export function getEggSlotsForIsland(
  perIslandEggs: PerIslandEggsLedger | null | undefined,
  islandNumber: number,
): IslandRunEggSlot[] {
  const slots = Object.entries(perIslandEggs ?? {})
    .flatMap(([key, entry]) => {
      const parsed = parseEggSlotLedgerKey(key);
      if (!parsed || parsed.islandNumber !== islandNumber) return [];
      return [{ key, islandNumber: parsed.islandNumber, slotIndex: parsed.slotIndex, entry }];
    })
    .sort((first, second) => first.slotIndex - second.slotIndex);
  return slots;
}

export function hasAnyEggSlotForIsland(
  perIslandEggs: PerIslandEggsLedger | null | undefined,
  islandNumber: number,
): boolean {
  return getEggSlotsForIsland(perIslandEggs, islandNumber).length > 0;
}

export function areAllEggSlotsTerminalForIsland(
  perIslandEggs: PerIslandEggsLedger | null | undefined,
  islandNumber: number,
): boolean {
  const slots = getEggSlotsForIsland(perIslandEggs, islandNumber);
  return slots.length > 0 && slots.every(({ entry }) => entry.status === 'collected' || entry.status === 'sold');
}

export function getUnresolvedEggSlotsForIsland(
  perIslandEggs: PerIslandEggsLedger | null | undefined,
  islandNumber: number,
): IslandRunEggSlot[] {
  return getEggSlotsForIsland(perIslandEggs, islandNumber).filter(({ entry }) => entry.status !== 'collected' && entry.status !== 'sold');
}

export function resolveScheduledEggManiaIslands(userId: string, cycleIndex: number): number[] {
  const safeCycleIndex = Math.max(0, Math.floor(Number.isFinite(cycleIndex) ? cycleIndex : 0));
  const random = seededRandom(hashStringToUint32(`${userId || 'anonymous'}:${safeCycleIndex}:egg-mania`));
  const picks = new Set<number>();
  const bands = [1, 31, 61, 91];
  for (let index = 0; index < EGG_MANIA_SCHEDULED_ISLANDS_PER_CYCLE; index += 1) {
    const bandStart = bands[index] ?? 1;
    picks.add(bandStart + Math.floor(random() * 30));
  }
  return Array.from(picks).sort((first, second) => first - second);
}

export function resolveEggManiaState(options: {
  userId: string;
  islandNumber: number;
  cycleIndex: number;
  perIslandEggs?: PerIslandEggsLedger | null;
}): IslandRunEggManiaState {
  const islandNumber = Math.max(1, Math.floor(Number.isFinite(options.islandNumber) ? options.islandNumber : 1));
  const cycleIndex = Math.max(0, Math.floor(Number.isFinite(options.cycleIndex) ? options.cycleIndex : 0));
  const scheduledIslands = resolveScheduledEggManiaIslands(options.userId, cycleIndex);
  const active = scheduledIslands.includes(islandNumber);
  return {
    active,
    source: active ? 'scheduled' : null,
    consumed: active ? hasAnyEggSlotForIsland(options.perIslandEggs, islandNumber) : false,
    islandNumber,
    cycleIndex,
    maxEggs: active ? EGG_MANIA_MAX_EGGS_PER_ISLAND : 1,
    scheduledIslands,
  };
}
