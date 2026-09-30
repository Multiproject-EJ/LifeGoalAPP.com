/**
 * Island treasures — which treasure waits on which island, whether it sits on
 * a board tile or is hidden inside a special mission, what the player has
 * collected, and what Treasure Island is worth.
 *
 * Schedule (islands 1–120, repeating each journey cycle):
 * - about one island in five holds a treasure (every 5th island);
 * - every 20th island is part of a pair, so the next island has one too
 *   ("sometimes two in a row");
 * - Island 012 (Sunken Sands) hides its treasure inside its special mission,
 *   so that one is never placed on a tile.
 * That is 30 treasures in total — the collection's maximum.
 *
 * A tile treasure is collected by landing exactly on its tile (roll action).
 * Each treasure is collected once per player; later journey cycles do not
 * place it again. Persisted in the owner-scoped mission ledger under
 * `ISLAND_TREASURES_KEY`. This module is pure and must not import the ledger
 * module (it sanitises/merges this progress), to avoid an import cycle.
 */

export const ISLAND_TREASURES_KEY = 'island-treasures-v1';
export const ISLAND_TREASURE_MAX_ISLAND = 120;
export const ISLAND_TREASURE_EVERY_N_ISLANDS = 5;
export const ISLAND_TREASURE_PAIR_EVERY_N_ISLANDS = 20;
/** The Sunken Sands mission already reveals a treasure; it counts as this island's. */
export const ISLAND_TREASURE_MISSION_ISLANDS: Readonly<Record<number, string>> = { 12: 'sunken-sands-first-treasure' };

export type IslandTreasureTier = 'bronze' | 'silver' | 'gold' | 'legendary';
export type IslandTreasurePlacement = 'tile' | 'mission';

export interface IslandTreasure {
  id: string;
  islandNumber: number;
  name: string;
  tier: IslandTreasureTier;
  /** Appraised worth added to Treasure Island when collected. */
  value: number;
  placement: IslandTreasurePlacement;
}

const OBJECTS = [
  'Compass', 'Chalice', 'Astrolabe', 'Crown', 'Lantern', 'Hourglass', 'Medallion', 'Music Box',
  'Spyglass', 'Idol', 'Scepter', 'Locket', 'Map Case', 'Orrery', 'Tiara', 'Seal',
] as const;
const MATERIALS = [
  'Sun-Etched', 'Coral', 'Tidebound', 'Amber', 'Moonsilver', 'Starglass', 'Jade', 'Emberforged',
  'Pearl', 'Obsidian', 'Aurora', 'Stormcut', 'Honeygold', 'Frostveil', 'Rootwoven', 'Skyforged',
] as const;

const TIER_BANDS: ReadonlyArray<{ tier: IslandTreasureTier; untilIsland: number; base: number; step: number }> = [
  { tier: 'bronze', untilIsland: 30, base: 250, step: 25 },
  { tier: 'silver', untilIsland: 60, base: 800, step: 40 },
  { tier: 'gold', untilIsland: 90, base: 2_000, step: 60 },
  { tier: 'legendary', untilIsland: ISLAND_TREASURE_MAX_ISLAND, base: 5_000, step: 100 },
];

export function hasIslandTreasure(islandNumber: number): boolean {
  const n = Math.floor(islandNumber);
  if (n < 1 || n > ISLAND_TREASURE_MAX_ISLAND) return false;
  if (ISLAND_TREASURE_MISSION_ISLANDS[n]) return true;
  if (n % ISLAND_TREASURE_EVERY_N_ISLANDS === 0) return true;
  return (n - 1) % ISLAND_TREASURE_PAIR_EVERY_N_ISLANDS === 0 && n > 1;
}

function buildSchedule(): IslandTreasure[] {
  const list: IslandTreasure[] = [];
  for (let island = 1; island <= ISLAND_TREASURE_MAX_ISLAND; island += 1) {
    if (!hasIslandTreasure(island)) continue;
    const index = list.length;
    const band = TIER_BANDS.find((entry) => island <= entry.untilIsland) ?? TIER_BANDS[TIER_BANDS.length - 1]!;
    // Unique pairing: walk objects in order, shift the material each round.
    const object = OBJECTS[index % OBJECTS.length]!;
    const material = MATERIALS[(index * 5 + Math.floor(index / OBJECTS.length)) % MATERIALS.length]!;
    list.push({
      id: `treasure-${String(island).padStart(3, '0')}`,
      islandNumber: island,
      name: `${material} ${object}`,
      tier: band.tier,
      value: band.base + band.step * island,
      placement: ISLAND_TREASURE_MISSION_ISLANDS[island] ? 'mission' : 'tile',
    });
  }
  return list;
}

export const ISLAND_TREASURES: readonly IslandTreasure[] = buildSchedule();

/** The treasure for an island (effective island number), or null. */
export function getIslandTreasure(islandNumber: number): IslandTreasure | null {
  return ISLAND_TREASURES.find((treasure) => treasure.islandNumber === Math.floor(islandNumber)) ?? null;
}

export interface IslandTreasureCollection {
  missionId: 'island-treasures';
  version: 1;
  collected: Record<string, { islandNumber: number; cycleIndex: number; atMs: number }>;
  updatedAtMs: number;
}

export function createIslandTreasureCollection(): IslandTreasureCollection {
  return { missionId: 'island-treasures', version: 1, collected: {}, updatedAtMs: 0 };
}

const TREASURE_IDS = new Set(ISLAND_TREASURES.map((treasure) => treasure.id));
const count = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0);

export function sanitizeIslandTreasureCollection(value: unknown): IslandTreasureCollection {
  const base = createIslandTreasureCollection();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return base;
  const record = value as Record<string, unknown>;
  const collected: IslandTreasureCollection['collected'] = {};
  if (record.collected && typeof record.collected === 'object' && !Array.isArray(record.collected)) {
    for (const [id, raw] of Object.entries(record.collected as Record<string, unknown>)) {
      if (!TREASURE_IDS.has(id) || !raw || typeof raw !== 'object') continue;
      const entry = raw as Record<string, unknown>;
      collected[id] = { islandNumber: count(entry.islandNumber), cycleIndex: count(entry.cycleIndex), atMs: count(entry.atMs) };
    }
  }
  return { ...base, collected, updatedAtMs: count(record.updatedAtMs) };
}

/** Devices merge by union; the earliest collection of a treasure wins. */
export function mergeIslandTreasureCollections(a: IslandTreasureCollection, b: IslandTreasureCollection): IslandTreasureCollection {
  const collected = { ...a.collected };
  for (const [id, entry] of Object.entries(b.collected)) {
    const existing = collected[id];
    if (!existing || entry.atMs < existing.atMs) collected[id] = entry;
  }
  return sanitizeIslandTreasureCollection({ ...a, collected, updatedAtMs: Math.max(a.updatedAtMs, b.updatedAtMs) });
}

type LooseLedger = Record<string, unknown> | null | undefined;

export function resolveIslandTreasureCollection(ledger: LooseLedger): IslandTreasureCollection {
  return sanitizeIslandTreasureCollection(ledger?.[ISLAND_TREASURES_KEY]);
}

/** A mission-hidden treasure counts once its mission has claimed it (any cycle). */
function isMissionTreasureClaimed(ledger: LooseLedger, treasure: IslandTreasure): boolean {
  const missionId = ISLAND_TREASURE_MISSION_ISLANDS[treasure.islandNumber];
  if (!missionId || !ledger) return false;
  return Object.values(ledger).some((raw) => {
    if (!raw || typeof raw !== 'object') return false;
    const entry = raw as Record<string, unknown>;
    return entry.missionId === missionId && typeof entry.claimedAtMs === 'number' && Number.isFinite(entry.claimedAtMs);
  });
}

export function isIslandTreasureCollected(ledger: LooseLedger, treasure: IslandTreasure): boolean {
  if (treasure.placement === 'mission') return isMissionTreasureClaimed(ledger, treasure);
  return Boolean(resolveIslandTreasureCollection(ledger).collected[treasure.id]);
}

/** The tile treasure still waiting on this island, if any. */
export function getPendingTileTreasure(ledger: LooseLedger, islandNumber: number): IslandTreasure | null {
  const treasure = getIslandTreasure(islandNumber);
  if (!treasure || treasure.placement !== 'tile' || isIslandTreasureCollected(ledger, treasure)) return null;
  return treasure;
}

/**
 * Landing exactly on the treasure tile collects it (passing over does not).
 * Pure: the roll action commits the returned ledger.
 */
export function collectIslandTreasureForLanding(options: {
  ledger: Record<string, unknown>;
  islandNumber: number;
  cycleIndex: number;
  landingTileIndex: number;
  treasureTileIndex: number | null;
  nowMs: number;
}): { ledger: Record<string, unknown>; treasure: IslandTreasure | null } {
  const { ledger, islandNumber, cycleIndex, landingTileIndex, treasureTileIndex, nowMs } = options;
  if (treasureTileIndex === null || landingTileIndex !== treasureTileIndex) return { ledger, treasure: null };
  const treasure = getPendingTileTreasure(ledger, islandNumber);
  if (!treasure) return { ledger, treasure: null };
  const current = resolveIslandTreasureCollection(ledger);
  const next: IslandTreasureCollection = {
    ...current,
    collected: { ...current.collected, [treasure.id]: { islandNumber, cycleIndex: Math.max(0, Math.floor(cycleIndex)), atMs: nowMs } },
    updatedAtMs: nowMs,
  };
  return { ledger: { ...ledger, [ISLAND_TREASURES_KEY]: next }, treasure };
}

export interface TreasureIslandWealth {
  /** Appraised value of every collected treasure. */
  treasureValue: number;
  /** Money invested in Treasure Island (Vault) upgrades. */
  invested: number;
  /** Treasure Island's total worth: treasures + investment. */
  total: number;
  collectedCount: number;
  totalCount: number;
  collected: IslandTreasure[];
  /** The next treasure still to find at or after the given island. */
  next: IslandTreasure | null;
}

export function resolveTreasureIslandWealth(options: {
  ledger: LooseLedger;
  vaultInvested: number;
  currentIslandNumber: number;
}): TreasureIslandWealth {
  const collected = ISLAND_TREASURES.filter((treasure) => isIslandTreasureCollected(options.ledger, treasure));
  const treasureValue = collected.reduce((sum, treasure) => sum + treasure.value, 0);
  const invested = count(options.vaultInvested);
  const next = ISLAND_TREASURES.find((treasure) => treasure.islandNumber >= Math.floor(options.currentIslandNumber)
    && !isIslandTreasureCollected(options.ledger, treasure)) ?? null;
  return {
    treasureValue,
    invested,
    total: treasureValue + invested,
    collectedCount: collected.length,
    totalCount: ISLAND_TREASURES.length,
    collected,
    next,
  };
}
