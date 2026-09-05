import { getEffectiveIslandNumber, getIslandEssenceMultiplier } from './islandRunContractV2EssenceBuild';
import { resolveCollisionFreeTileIndices } from './islandRunTileReservations';

export const FROSTWELL_ISLAND_NUMBER = 3;
export const FROSTWELL_DEPTH_METERS = 500;
/** Three route positions, deliberately clear of landmark-door clusters. */
export const FROSTWELL_DRILL_TILE_INDICES = Object.freeze([8, 17, 27] as const);
export const FROSTWELL_SPIN_METERS = Object.freeze([15, 20, 25, 30, 40, 50, 60, 75] as const);

export const CELESTIAL_REDOCKING_ISLAND_NUMBER = 2;
export const CELESTIAL_REDOCKING_ROLL_TARGET = 20;
export const CELESTIAL_REDOCKING_PLATFORM_COUNT = 4;
export const CELESTIAL_REDOCKING_ROLLS_PER_PLATFORM = 5;

export const ROOTHEART_ISLAND_NUMBER = 10;
export const ROOTHEART_POWERWORKS_MAX_STAGE = 3;
export const ROOTHEART_POWERWORKS_BASE_STAGE_COSTS = Object.freeze([600, 900, 1_500] as const);
export const ROOTHEART_POWER_COMPONENTS = Object.freeze([
  { id: 'root-bearing', tileIndex: 1, label: 'Root bearing' },
  { id: 'paddle-ring', tileIndex: 8, label: 'Paddle ring' },
  { id: 'brass-axle', tileIndex: 11, label: 'Brass axle' },
  { id: 'water-gate', tileIndex: 16, label: 'Water gate' },
  { id: 'dynamo-coil', tileIndex: 21, label: 'Dynamo coil' },
  { id: 'flywheel-governor', tileIndex: 26, label: 'Flywheel governor' },
  { id: 'sapglass-capacitor', tileIndex: 29, label: 'Sapglass capacitor' },
  { id: 'lantern-relay', tileIndex: 35, label: 'Lantern relay' },
] as const);

export type RootheartPowerComponentId = typeof ROOTHEART_POWER_COMPONENTS[number]['id'];
export type RootheartPowerworksBuildStage = 0 | 1 | 2 | 3;

export const SUNKEN_SANDS_ISLAND_NUMBER = 12;
export const SUNKEN_SANDS_TREASURE_ROLL_TARGET = 20;
export const SUNKEN_SANDS_FIRST_TREASURE_ID = 'sunscarab-token';
export const SUNKEN_SANDS_FIRST_TREASURE_NAME = 'Sunscarab Token';
export const SUNKEN_SANDS_FIRST_TREASURE_DICE = 25;
export const SUNKEN_SANDS_FIRST_TREASURE_BASE_ESSENCE = 120;

export const FIRST_LIGHT_ASSEMBLY_ISLAND_NUMBER = 1;
export const FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET = 20;
/**
 * Twenty distinct cache positions for the 36-tile production ring. They avoid
 * the four canonical landmark-door indices (5, 14, 23, 32) and the Traffic
 * Light at 19. Each cache is a finite, collect-once mission pickup.
 */
export const FIRST_LIGHT_ASSEMBLY_DYNAMITE_TILE_INDICES = Object.freeze([
  0, 1, 2, 3, 7, 8, 9, 10, 11, 13,
  16, 17, 18, 20, 21, 25, 26, 27, 28, 29,
] as const);

export const CACTUS_CANYON_ISLAND_NUMBER = 13;
export const CACTUS_CANYON_SPIRAL_MAX_SEGMENTS = 16;
/**
 * Route-relative dynamite caches. The 36-tile production profile resolves to
 * 1, 8, 10, 17, 20, 26, 28 and 35. Tile 20 deliberately replaces the old
 * tile-19 cache, which collided with the canonical Traffic Light. Most caches
 * hold one stick; two rarer crates hold three.
 */
export const CACTUS_CANYON_DYNAMITE_CACHE_FRACTIONS = Object.freeze([
  1 / 36, 8 / 36, 10 / 36, 17 / 36, 20 / 36, 26 / 36, 28 / 36, 35 / 36,
] as const);
export const CACTUS_CANYON_DYNAMITE_CACHE_AMOUNTS = Object.freeze([1, 1, 3, 1, 1, 3, 1, 1] as const);

export const HONEYCOMB_KINGDOM_ISLAND_NUMBER = 14;
export const GREAT_HONEYFALL_MAX_STAGE = 4;
export const LAVA_LABYRINTH_ISLAND_NUMBER = 20;
/** Four royal-nectar landings, offset from the four landmark-door clusters. */
export const GREAT_HONEYFALL_NECTAR_TILE_FRACTIONS = Object.freeze([
  2 / 36, 11 / 36, 20 / 36, 29 / 36,
] as const);

export const JUNGLE_EXPEDITION_ISLAND_NUMBER = 18;
export const LIVING_COMPASS_MAX_STAGE = 5;
/** Five Wayfinder caches, separated from the four landmark-door clusters. */
export const LIVING_COMPASS_GLYPH_TILE_FRACTIONS = Object.freeze([
  2 / 36, 9 / 36, 16 / 36, 25 / 36, 34 / 36,
] as const);

export type StagedRestorationMissionId =
  | 'broken-causeway'
  | 'moon-mirrors'
  | 'breathline'
  | 'great-pollination'
  | 'ignition-chain'
  | 'jungle-expedition-living-compass'
  | 'escape-lava-labyrinth';

export type StagedRestorationPickupKind =
  | 'causeway_masonry'
  | 'moon_mirror_lens'
  | 'breathline_pressure_pearl'
  | 'pollination_pollen_light'
  | 'ignition_core'
  | 'wayfinder_glyph'
  | 'heatshield_plate';

export interface StagedRestorationMissionDescriptor {
  islandNumber: 4 | 6 | 7 | 8 | 9 | 18 | 20;
  missionId: StagedRestorationMissionId;
  pickupKind: StagedRestorationPickupKind;
  pickupLabel: string;
  actionLabel: string;
  stageLabel: string;
  stageCount: number;
  chargeCostPerStage: number;
  preferredPickupFractions: readonly number[];
}

export const STAGED_RESTORATION_MISSIONS: Readonly<Record<number, StagedRestorationMissionDescriptor>> = Object.freeze({
  4: {
    islandNumber: 4, missionId: 'broken-causeway', pickupKind: 'causeway_masonry',
    pickupLabel: 'Masonry Spark', actionLabel: 'Raise Causeway Span', stageLabel: 'Causeway Spans',
    stageCount: 3, chargeCostPerStage: 2,
    preferredPickupFractions: [1 / 36, 8 / 36, 11 / 36, 20 / 36, 26 / 36, 35 / 36],
  },
  6: {
    islandNumber: 6, missionId: 'moon-mirrors', pickupKind: 'moon_mirror_lens',
    pickupLabel: 'Moon Lens', actionLabel: 'Align Next Mirror', stageLabel: 'Mirrors Aligned',
    stageCount: 5, chargeCostPerStage: 1,
    preferredPickupFractions: [2 / 36, 10 / 36, 18 / 36, 26 / 36, 35 / 36],
  },
  7: {
    islandNumber: 7, missionId: 'breathline', pickupKind: 'breathline_pressure_pearl',
    pickupLabel: 'Pressure Pearl', actionLabel: 'Pressurize District', stageLabel: 'Districts Breathing',
    stageCount: 4, chargeCostPerStage: 1,
    preferredPickupFractions: [3 / 36, 11 / 36, 20 / 36, 28 / 36],
  },
  8: {
    islandNumber: 8, missionId: 'great-pollination', pickupKind: 'pollination_pollen_light',
    pickupLabel: 'Pollen Light', actionLabel: 'Awaken Garden Family', stageLabel: 'Gardens Blooming',
    stageCount: 5, chargeCostPerStage: 1,
    preferredPickupFractions: [1 / 36, 8 / 36, 16 / 36, 25 / 36, 35 / 36],
  },
  9: {
    islandNumber: 9, missionId: 'ignition-chain', pickupKind: 'ignition_core',
    pickupLabel: 'Ignition Core', actionLabel: 'Fire Next Mechanism', stageLabel: 'Systems Ignited',
    stageCount: 8, chargeCostPerStage: 1,
    preferredPickupFractions: [0 / 36, 3 / 36, 8 / 36, 11 / 36, 18 / 36, 20 / 36, 26 / 36, 29 / 36],
  },
  18: {
    islandNumber: 18, missionId: 'jungle-expedition-living-compass', pickupKind: 'wayfinder_glyph',
    pickupLabel: 'Wayfinder Glyph', actionLabel: 'Awaken Next Compass Seal', stageLabel: 'Compass Seals Awakened',
    stageCount: LIVING_COMPASS_MAX_STAGE, chargeCostPerStage: 1,
    preferredPickupFractions: LIVING_COMPASS_GLYPH_TILE_FRACTIONS,
  },
  20: {
    islandNumber: 20, missionId: 'escape-lava-labyrinth', pickupKind: 'heatshield_plate',
    pickupLabel: 'Heatshield Plate', actionLabel: 'Forge Iron Skiff System', stageLabel: 'Escape Systems Ready',
    stageCount: 4, chargeCostPerStage: 2,
    preferredPickupFractions: [2 / 36, 7 / 36, 11 / 36, 16 / 36, 20 / 36, 25 / 36, 29 / 36, 35 / 36],
  },
});

export function getStagedRestorationMissionDescriptor(
  islandNumber: number,
): StagedRestorationMissionDescriptor | null {
  return STAGED_RESTORATION_MISSIONS[Math.max(1, Math.floor(islandNumber))] ?? null;
}

export function getStagedRestorationMissionDescriptorById(
  missionId: unknown,
): StagedRestorationMissionDescriptor | null {
  // Island 020 shipped briefly under the Firebridges prototype identity. Map
  // those records into the final Iron Skiff mission so earned pickups and
  // committed stages can only move forward during hydration/conflict merge.
  if (missionId === 'forge-four-firebridges') return STAGED_RESTORATION_MISSIONS[20] ?? null;
  return Object.values(STAGED_RESTORATION_MISSIONS).find((descriptor) => descriptor.missionId === missionId) ?? null;
}

export function getStagedRestorationPickupTileIndices(islandNumber: number, tileCount: number): number[] {
  const descriptor = getStagedRestorationMissionDescriptor(islandNumber);
  return descriptor
    ? resolveCollisionFreeTileIndices({ tileCount, preferredFractions: descriptor.preferredPickupFractions })
    : [];
}

export function getStagedRestorationPickupForTile(
  islandNumber: number,
  tileIndex: number,
  tileCount: number,
): { kind: StagedRestorationPickupKind; amount: number } | null {
  const descriptor = getStagedRestorationMissionDescriptor(islandNumber);
  if (!descriptor || !getStagedRestorationPickupTileIndices(islandNumber, tileCount).includes(tileIndex)) return null;
  return { kind: descriptor.pickupKind, amount: 1 };
}

export const FISHERMANS_VILLAGE_ISLAND_NUMBER = 16;
export const FISHERMANS_VILLAGE_FISH_TARGET_KG = 100;
export const FISHERMANS_VILLAGE_DRAGON_TRIGGER_KG = 78;
export const FISHERMANS_VILLAGE_PRE_DRAGON_CATCH_KG = 46;
/**
 * Six reusable fishing-rod stations spread around the pond route. Each index is
 * deliberately clear of the four expandable landmark-door clusters, so a rod
 * cannot disappear when a nearby landmark becomes active.
 */
export const FISHERMANS_VILLAGE_ROD_TILE_INDICES = Object.freeze([2, 8, 11, 17, 26, 35] as const);

export type FishermansVillageCatchKind = 'nothing' | 'small' | 'medium' | 'large' | 'colossal';

export interface FishermansVillagePendingCatch {
  catchId: number;
  kind: FishermansVillageCatchKind;
  kilograms: number;
  pullsRequired: number;
  tileIndex: number;
}

export interface FrostwellIceworksProgress {
  missionId: 'frostwell-iceworks';
  version: 2;
  metersDrilled: number;
  spinsEarned: number;
  spinsUsed: number;
  lastSpinMeters: number | null;
  builtAtMs: number | null;
  updatedAtMs: number;
}

export interface CelestialRedockingProgress {
  missionId: 'celestial-great-redocking';
  version: 1;
  rollsCompleted: number;
  completedAtMs: number | null;
  updatedAtMs: number;
}

export interface RootheartPowerworksProgress {
  missionId: 'rootheart-powerworks';
  version: 1;
  collectedComponentIds: RootheartPowerComponentId[];
  buildStage: RootheartPowerworksBuildStage;
  essenceSpent: number;
  activatedAtMs: number | null;
  updatedAtMs: number;
}

export interface SunkenSandsTreasureProgress {
  missionId: 'sunken-sands-first-treasure';
  version: 1;
  treasureId: typeof SUNKEN_SANDS_FIRST_TREASURE_ID;
  rollsCompleted: number;
  revealedAtMs: number | null;
  claimedAtMs: number | null;
  updatedAtMs: number;
}

export interface CactusCanyonSpiralProgress {
  missionId: 'cactus-canyon-spiral-rail';
  version: 2;
  segmentsExcavated: number;
  dynamiteEarned: number;
  dynamiteSpent: number;
  claimedDynamiteTileIndices?: number[];
  lastBlastSegments: number | null;
  startedAtMs: number | null;
  completedAtMs: number | null;
  updatedAtMs: number;
}

export interface FirstLightAssemblyCraterProgress {
  missionId: 'first-light-assembly-crater';
  version: 1;
  claimedDynamiteTileIndices: number[];
  chargesDetonated: number;
  lastDetonatedSector: number | null;
  startedAtMs: number | null;
  completedAtMs: number | null;
  updatedAtMs: number;
}

export interface GreatHoneyfallProgress {
  missionId: 'great-honeyfall-coronation';
  version: 1;
  nectarChargesEarned: number;
  nectarChargesSpent: number;
  claimedNectarTileIndices?: number[];
  activatedReservoirs: 0 | 1 | 2 | 3 | 4;
  lastActivatedReservoir: number | null;
  completedAtMs: number | null;
  updatedAtMs: number;
}

export interface FishermansVillageFishingProgress {
  missionId: 'fishermans-village-fishing';
  version: 1;
  rodCollectedAtMs: number | null;
  castsCompleted: number;
  successfulCatches: number;
  fishCaughtKg: number;
  pendingCatch: FishermansVillagePendingCatch | null;
  dragonTriggeredAtMs: number | null;
  repairCompletedAtMs: number | null;
  completedAtMs: number | null;
  updatedAtMs: number;
}

export interface StagedRestorationMissionProgress {
  missionId: StagedRestorationMissionId;
  version: 1;
  claimedPickupTileIndices: number[];
  chargesEarned: number;
  chargesSpent: number;
  activatedStages: number;
  lastActivatedStage: number | null;
  /** Island 020 uses this to hold its long escape mission behind the solved labyrinth. */
  startedAtMs?: number | null;
  /** Island 020 sets this only after the Iron Skiff reaches the Expedition Ship. */
  finaleCompletedAtMs?: number | null;
  completedAtMs: number | null;
  updatedAtMs: number;
}

export type IslandRunSignatureMissionProgress =
  | CelestialRedockingProgress
  | FrostwellIceworksProgress
  | RootheartPowerworksProgress
  | SunkenSandsTreasureProgress
  | FirstLightAssemblyCraterProgress
  | CactusCanyonSpiralProgress
  | GreatHoneyfallProgress
  | StagedRestorationMissionProgress
  | FishermansVillageFishingProgress;
export type IslandRunSignatureMissionProgressByIsland = Record<string, IslandRunSignatureMissionProgress>;

export function getIslandRunSignatureMissionKey(cycleIndex: number, islandNumber: number): string {
  return `${Math.max(0, Math.floor(cycleIndex))}:${Math.max(1, Math.floor(islandNumber))}`;
}

function finiteInteger(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : fallback;
}

function sanitizeNonNegativeTileIndices(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value
    .map((candidate) => finiteInteger(candidate, -1))
    .filter((candidate) => candidate >= 0)))
    .sort((a, b) => a - b);
}

const ROOTHEART_COMPONENT_IDS = new Set<RootheartPowerComponentId>(
  ROOTHEART_POWER_COMPONENTS.map((component) => component.id),
);

function sanitizeRootheartComponentIds(value: unknown): RootheartPowerComponentId[] {
  if (!Array.isArray(value)) return [];
  const result: RootheartPowerComponentId[] = [];
  value.forEach((raw) => {
    if (typeof raw !== 'string' || !ROOTHEART_COMPONENT_IDS.has(raw as RootheartPowerComponentId)) return;
    const id = raw as RootheartPowerComponentId;
    if (!result.includes(id)) result.push(id);
  });
  return ROOTHEART_POWER_COMPONENTS.map((component) => component.id).filter((id) => result.includes(id));
}

export function sanitizeIslandRunSignatureMissionProgress(
  value: unknown,
): IslandRunSignatureMissionProgressByIsland {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: IslandRunSignatureMissionProgressByIsland = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, raw]) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return;
    const record = raw as Record<string, unknown>;
    const stagedDescriptor = getStagedRestorationMissionDescriptorById(record.missionId ?? record.mission_id);
    if (stagedDescriptor) {
      const claimedRaw = record.claimedPickupTileIndices ?? record.claimed_pickup_tile_indices;
      const pickupTarget = stagedDescriptor.stageCount * stagedDescriptor.chargeCostPerStage;
      const claimedPickupTileIndices = Array.isArray(claimedRaw)
        ? Array.from(new Set(claimedRaw
            .map((candidate) => finiteInteger(candidate, -1))
            .filter((candidate) => candidate >= 0)))
            .sort((a, b) => a - b)
            .slice(0, pickupTarget)
        : [];
      const chargesEarned = Math.max(
        claimedPickupTileIndices.length,
        Math.min(pickupTarget, Math.max(0, finiteInteger(record.chargesEarned ?? record.charges_earned))),
      );
      const activatedStages = Math.max(0, Math.min(
        stagedDescriptor.stageCount,
        finiteInteger(record.activatedStages ?? record.activated_stages),
      ));
      const chargesSpent = Math.max(
        activatedStages * stagedDescriptor.chargeCostPerStage,
        Math.min(chargesEarned, Math.max(0, finiteInteger(record.chargesSpent ?? record.charges_spent))),
      );
      const completedAtRaw = record.completedAtMs ?? record.completed_at_ms;
      const startedAtRaw = record.startedAtMs ?? record.started_at_ms;
      const finaleCompletedAtRaw = record.finaleCompletedAtMs ?? record.finale_completed_at_ms;
      const updatedAtRaw = record.updatedAtMs ?? record.updated_at_ms;
      result[key] = {
        missionId: stagedDescriptor.missionId,
        version: 1,
        claimedPickupTileIndices,
        chargesEarned,
        chargesSpent,
        activatedStages,
        lastActivatedStage: activatedStages > 0 ? activatedStages : null,
        startedAtMs: typeof startedAtRaw === 'number' && Number.isFinite(startedAtRaw)
          ? Math.max(0, startedAtRaw)
          : stagedDescriptor.islandNumber === LAVA_LABYRINTH_ISLAND_NUMBER ? null : 0,
        finaleCompletedAtMs: typeof finaleCompletedAtRaw === 'number' && Number.isFinite(finaleCompletedAtRaw)
          ? Math.max(0, finaleCompletedAtRaw)
          : null,
        completedAtMs: typeof completedAtRaw === 'number' && Number.isFinite(completedAtRaw)
          ? Math.max(0, completedAtRaw)
          : activatedStages >= stagedDescriptor.stageCount ? 0 : null,
        updatedAtMs: typeof updatedAtRaw === 'number' && Number.isFinite(updatedAtRaw)
          ? Math.max(0, updatedAtRaw)
          : 0,
      };
      return;
    }
    if (record.missionId === 'fishermans-village-fishing' || record.mission_id === 'fishermans-village-fishing') {
      const pendingRaw = record.pendingCatch ?? record.pending_catch;
      const pendingRecord = pendingRaw && typeof pendingRaw === 'object' && !Array.isArray(pendingRaw)
        ? pendingRaw as Record<string, unknown>
        : null;
      const pendingKind = pendingRecord?.kind;
      const pendingCatch = pendingRecord
        && (pendingKind === 'nothing' || pendingKind === 'small' || pendingKind === 'medium' || pendingKind === 'large' || pendingKind === 'colossal')
        ? {
            catchId: Math.max(1, finiteInteger(pendingRecord.catchId ?? pendingRecord.catch_id, 1)),
            kind: pendingKind as FishermansVillageCatchKind,
            kilograms: Math.max(0, finiteInteger(pendingRecord.kilograms)),
            pullsRequired: Math.max(1, finiteInteger(pendingRecord.pullsRequired ?? pendingRecord.pulls_required, 1)),
            tileIndex: Math.max(0, finiteInteger(pendingRecord.tileIndex ?? pendingRecord.tile_index)),
          }
        : null;
      const timestamp = (camel: string, snake: string): number | null => {
        const candidate = record[camel] ?? record[snake];
        return typeof candidate === 'number' && Number.isFinite(candidate) ? Math.max(0, candidate) : null;
      };
      const fishCaughtKg = Math.max(0, Math.min(
        FISHERMANS_VILLAGE_FISH_TARGET_KG,
        finiteInteger(record.fishCaughtKg ?? record.fish_caught_kg),
      ));
      result[key] = {
        missionId: 'fishermans-village-fishing',
        version: 1,
        rodCollectedAtMs: timestamp('rodCollectedAtMs', 'rod_collected_at_ms'),
        castsCompleted: Math.max(0, finiteInteger(record.castsCompleted ?? record.casts_completed)),
        successfulCatches: Math.max(0, finiteInteger(record.successfulCatches ?? record.successful_catches)),
        fishCaughtKg,
        pendingCatch,
        dragonTriggeredAtMs: timestamp('dragonTriggeredAtMs', 'dragon_triggered_at_ms')
          ?? (fishCaughtKg >= FISHERMANS_VILLAGE_DRAGON_TRIGGER_KG ? 0 : null),
        repairCompletedAtMs: timestamp('repairCompletedAtMs', 'repair_completed_at_ms'),
        completedAtMs: timestamp('completedAtMs', 'completed_at_ms')
          ?? (fishCaughtKg >= FISHERMANS_VILLAGE_FISH_TARGET_KG ? 0 : null),
        updatedAtMs: Math.max(0, finiteInteger(record.updatedAtMs ?? record.updated_at_ms)),
      };
      return;
    }
    if (record.missionId === 'celestial-great-redocking' || record.mission_id === 'celestial-great-redocking') {
      const completedAtRaw = record.completedAtMs ?? record.completed_at_ms;
      const updatedAtRaw = record.updatedAtMs ?? record.updated_at_ms;
      const rollsCompleted = Math.max(0, Math.min(
        CELESTIAL_REDOCKING_ROLL_TARGET,
        finiteInteger(record.rollsCompleted ?? record.rolls_completed),
      ));
      result[key] = {
        missionId: 'celestial-great-redocking',
        version: 1,
        rollsCompleted,
        completedAtMs: typeof completedAtRaw === 'number' && Number.isFinite(completedAtRaw)
          ? Math.max(0, completedAtRaw)
          : rollsCompleted >= CELESTIAL_REDOCKING_ROLL_TARGET ? 0 : null,
        updatedAtMs: typeof updatedAtRaw === 'number' && Number.isFinite(updatedAtRaw)
          ? Math.max(0, updatedAtRaw)
          : 0,
      };
      return;
    }
    if (record.missionId === 'first-light-assembly-crater' || record.mission_id === 'first-light-assembly-crater') {
      const claimedRaw = record.claimedDynamiteTileIndices ?? record.claimed_dynamite_tile_indices;
      const claimedDynamiteTileIndices = Array.isArray(claimedRaw)
        ? FIRST_LIGHT_ASSEMBLY_DYNAMITE_TILE_INDICES.filter((tileIndex) => (
            claimedRaw.some((candidate) => finiteInteger(candidate, -1) === tileIndex)
          ))
        : [];
      const chargesDetonated = Math.max(0, Math.min(
        claimedDynamiteTileIndices.length,
        FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET,
        finiteInteger(record.chargesDetonated ?? record.charges_detonated),
      ));
      const startedAtRaw = record.startedAtMs ?? record.started_at_ms;
      const completedAtRaw = record.completedAtMs ?? record.completed_at_ms;
      const updatedAtRaw = record.updatedAtMs ?? record.updated_at_ms;
      const lastSectorRaw = record.lastDetonatedSector ?? record.last_detonated_sector;
      result[key] = {
        missionId: 'first-light-assembly-crater',
        version: 1,
        claimedDynamiteTileIndices,
        chargesDetonated,
        lastDetonatedSector: typeof lastSectorRaw === 'number' && Number.isFinite(lastSectorRaw)
          ? Math.max(0, Math.min(FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET - 1, Math.floor(lastSectorRaw)))
          : null,
        startedAtMs: typeof startedAtRaw === 'number' && Number.isFinite(startedAtRaw)
          ? Math.max(0, startedAtRaw)
          : claimedDynamiteTileIndices.length > 0 ? 0 : null,
        completedAtMs: typeof completedAtRaw === 'number' && Number.isFinite(completedAtRaw)
          ? Math.max(0, completedAtRaw)
          : chargesDetonated >= FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET ? 0 : null,
        updatedAtMs: typeof updatedAtRaw === 'number' && Number.isFinite(updatedAtRaw)
          ? Math.max(0, updatedAtRaw)
          : 0,
      };
      return;
    }
    if (record.missionId === 'great-honeyfall-coronation' || record.mission_id === 'great-honeyfall-coronation') {
      const completedAtRaw = record.completedAtMs ?? record.completed_at_ms;
      const updatedAtRaw = record.updatedAtMs ?? record.updated_at_ms;
      const activatedReservoirs = Math.max(0, Math.min(
        GREAT_HONEYFALL_MAX_STAGE,
        finiteInteger(record.activatedReservoirs ?? record.activated_reservoirs),
      )) as GreatHoneyfallProgress['activatedReservoirs'];
      result[key] = {
        missionId: 'great-honeyfall-coronation',
        version: 1,
        nectarChargesEarned: Math.max(0, finiteInteger(record.nectarChargesEarned ?? record.nectar_charges_earned)),
        nectarChargesSpent: Math.max(0, finiteInteger(record.nectarChargesSpent ?? record.nectar_charges_spent)),
        claimedNectarTileIndices: sanitizeNonNegativeTileIndices(
          record.claimedNectarTileIndices ?? record.claimed_nectar_tile_indices,
        ),
        activatedReservoirs,
        lastActivatedReservoir: activatedReservoirs > 0 ? activatedReservoirs : null,
        completedAtMs: typeof completedAtRaw === 'number' && Number.isFinite(completedAtRaw)
          ? Math.max(0, completedAtRaw)
          : activatedReservoirs >= GREAT_HONEYFALL_MAX_STAGE ? 0 : null,
        updatedAtMs: typeof updatedAtRaw === 'number' && Number.isFinite(updatedAtRaw)
          ? Math.max(0, updatedAtRaw)
          : 0,
      };
      return;
    }
    if (record.missionId === 'cactus-canyon-spiral-rail' || record.mission_id === 'cactus-canyon-spiral-rail') {
      const completedAtRaw = record.completedAtMs ?? record.completed_at_ms;
      const startedAtRaw = record.startedAtMs ?? record.started_at_ms;
      const updatedAtRaw = record.updatedAtMs ?? record.updated_at_ms;
      const lastBlastRaw = record.lastBlastSegments ?? record.last_blast_segments
        ?? record.lastSpinSegments ?? record.last_spin_segments;
      const segmentsExcavated = Math.max(0, Math.min(
        CACTUS_CANYON_SPIRAL_MAX_SEGMENTS,
        finiteInteger(record.segmentsExcavated ?? record.segments_excavated),
      ));
      result[key] = {
        missionId: 'cactus-canyon-spiral-rail',
        version: 2,
        segmentsExcavated,
        // Version 1 awarded wheel spins. Treat every remaining legacy spin as
        // one stick so an in-progress save can continue without losing value.
        dynamiteEarned: Math.max(0, finiteInteger(
          record.dynamiteEarned ?? record.dynamite_earned ?? record.spinsEarned ?? record.spins_earned,
        )),
        dynamiteSpent: Math.max(0, finiteInteger(
          record.dynamiteSpent ?? record.dynamite_spent ?? record.spinsUsed ?? record.spins_used,
        )),
        claimedDynamiteTileIndices: sanitizeNonNegativeTileIndices(
          record.claimedDynamiteTileIndices ?? record.claimed_dynamite_tile_indices,
        ),
        lastBlastSegments: typeof lastBlastRaw === 'number' && Number.isFinite(lastBlastRaw)
          ? Math.max(0, Math.floor(lastBlastRaw))
          : null,
        startedAtMs: typeof startedAtRaw === 'number' && Number.isFinite(startedAtRaw)
          ? Math.max(0, startedAtRaw)
          : segmentsExcavated > 0 ? 0 : null,
        completedAtMs: typeof completedAtRaw === 'number' && Number.isFinite(completedAtRaw)
          ? Math.max(0, completedAtRaw)
          : segmentsExcavated >= CACTUS_CANYON_SPIRAL_MAX_SEGMENTS ? 0 : null,
        updatedAtMs: typeof updatedAtRaw === 'number' && Number.isFinite(updatedAtRaw)
          ? Math.max(0, updatedAtRaw)
          : 0,
      };
      return;
    }
    if (record.missionId === 'sunken-sands-first-treasure' || record.mission_id === 'sunken-sands-first-treasure') {
      const revealedAtRaw = record.revealedAtMs ?? record.revealed_at_ms;
      const claimedAtRaw = record.claimedAtMs ?? record.claimed_at_ms;
      const updatedAtRaw = record.updatedAtMs ?? record.updated_at_ms;
      const rollsCompleted = Math.max(0, Math.min(
        SUNKEN_SANDS_TREASURE_ROLL_TARGET,
        finiteInteger(record.rollsCompleted ?? record.rolls_completed),
      ));
      result[key] = {
        missionId: 'sunken-sands-first-treasure',
        version: 1,
        treasureId: SUNKEN_SANDS_FIRST_TREASURE_ID,
        rollsCompleted,
        revealedAtMs: typeof revealedAtRaw === 'number' && Number.isFinite(revealedAtRaw)
          ? Math.max(0, revealedAtRaw)
          : rollsCompleted >= SUNKEN_SANDS_TREASURE_ROLL_TARGET ? 0 : null,
        claimedAtMs: typeof claimedAtRaw === 'number' && Number.isFinite(claimedAtRaw)
          ? Math.max(0, claimedAtRaw)
          : null,
        updatedAtMs: typeof updatedAtRaw === 'number' && Number.isFinite(updatedAtRaw)
          ? Math.max(0, updatedAtRaw)
          : 0,
      };
      return;
    }
    if (record.missionId === 'rootheart-powerworks' || record.mission_id === 'rootheart-powerworks') {
      const activatedAtRaw = record.activatedAtMs ?? record.activated_at_ms;
      const updatedAtRaw = record.updatedAtMs ?? record.updated_at_ms;
      result[key] = {
        missionId: 'rootheart-powerworks',
        version: 1,
        collectedComponentIds: sanitizeRootheartComponentIds(
          record.collectedComponentIds ?? record.collected_component_ids,
        ),
        buildStage: Math.max(0, Math.min(
          ROOTHEART_POWERWORKS_MAX_STAGE,
          finiteInteger(record.buildStage ?? record.build_stage),
        )) as RootheartPowerworksBuildStage,
        essenceSpent: Math.max(0, finiteInteger(record.essenceSpent ?? record.essence_spent)),
        activatedAtMs: typeof activatedAtRaw === 'number' && Number.isFinite(activatedAtRaw)
          ? Math.max(0, activatedAtRaw)
          : null,
        updatedAtMs: typeof updatedAtRaw === 'number' && Number.isFinite(updatedAtRaw)
          ? Math.max(0, updatedAtRaw)
          : 0,
      };
      return;
    }
    // Version 1 briefly represented the original 50m concept as twenty 2.5m
    // turns. Preserve that actual drilled distance when reading a local draft.
    const legacyRolls = finiteInteger(record.rollsCompleted ?? record.rolls_completed);
    const metersDrilled = record.metersDrilled ?? record.meters_drilled;
    const builtAtRaw = record.builtAtMs ?? record.built_at_ms;
    const updatedAtRaw = record.updatedAtMs ?? record.updated_at_ms;
    const lastSpinRaw = record.lastSpinMeters ?? record.last_spin_meters;
    const normalizedMetersDrilled = Math.max(0, Math.min(
      FROSTWELL_DEPTH_METERS,
      typeof metersDrilled === 'number' && Number.isFinite(metersDrilled)
        ? Math.floor(metersDrilled)
        : Math.floor(Math.max(0, legacyRolls) * 2.5),
    ));
    const normalizedUpdatedAtMs = typeof updatedAtRaw === 'number' && Number.isFinite(updatedAtRaw)
      ? Math.max(0, updatedAtRaw)
      : 0;
    result[key] = {
      missionId: 'frostwell-iceworks',
      version: 2,
      metersDrilled: normalizedMetersDrilled,
      spinsEarned: Math.max(0, finiteInteger(record.spinsEarned ?? record.spins_earned)),
      spinsUsed: Math.max(0, finiteInteger(record.spinsUsed ?? record.spins_used)),
      lastSpinMeters: typeof lastSpinRaw === 'number' && Number.isFinite(lastSpinRaw)
        ? Math.max(0, Math.floor(lastSpinRaw))
        : null,
      builtAtMs: typeof builtAtRaw === 'number' && Number.isFinite(builtAtRaw)
        ? Math.max(0, builtAtRaw)
        : normalizedMetersDrilled >= FROSTWELL_DEPTH_METERS
          ? Math.max(1, normalizedUpdatedAtMs)
          : null,
      updatedAtMs: normalizedUpdatedAtMs,
    };
  });
  return result;
}

export function resolveFrostwellIceworksProgress(options: {
  ledger: IslandRunSignatureMissionProgressByIsland;
  cycleIndex: number;
  islandNumber?: number;
}): FrostwellIceworksProgress {
  const key = getIslandRunSignatureMissionKey(options.cycleIndex, options.islandNumber ?? FROSTWELL_ISLAND_NUMBER);
  const current = options.ledger[key];
  if (current?.missionId === 'frostwell-iceworks') {
    return current.metersDrilled >= FROSTWELL_DEPTH_METERS && current.builtAtMs === null
      ? { ...current, builtAtMs: Math.max(1, current.updatedAtMs) }
      : current;
  }
  return {
    missionId: 'frostwell-iceworks',
    version: 2,
    metersDrilled: 0,
    spinsEarned: 0,
    spinsUsed: 0,
    lastSpinMeters: null,
    builtAtMs: null,
    updatedAtMs: 0,
  };
}

export function resolveCelestialRedockingProgress(options: {
  ledger: IslandRunSignatureMissionProgressByIsland;
  cycleIndex: number;
  islandNumber?: number;
}): CelestialRedockingProgress {
  const key = getIslandRunSignatureMissionKey(
    options.cycleIndex,
    options.islandNumber ?? CELESTIAL_REDOCKING_ISLAND_NUMBER,
  );
  const current = options.ledger[key];
  return current?.missionId === 'celestial-great-redocking' ? current : {
    missionId: 'celestial-great-redocking',
    version: 1,
    rollsCompleted: 0,
    completedAtMs: null,
    updatedAtMs: 0,
  };
}

export function getCelestialRedockingDockedPlatformCount(
  progress: Pick<CelestialRedockingProgress, 'rollsCompleted'>,
): number {
  return Math.max(0, Math.min(
    CELESTIAL_REDOCKING_PLATFORM_COUNT,
    Math.floor(progress.rollsCompleted / CELESTIAL_REDOCKING_ROLLS_PER_PLATFORM),
  ));
}

export function resolveRootheartPowerworksProgress(options: {
  ledger: IslandRunSignatureMissionProgressByIsland;
  cycleIndex: number;
  islandNumber?: number;
}): RootheartPowerworksProgress {
  const key = getIslandRunSignatureMissionKey(options.cycleIndex, options.islandNumber ?? ROOTHEART_ISLAND_NUMBER);
  const current = options.ledger[key];
  return current?.missionId === 'rootheart-powerworks' ? current : {
    missionId: 'rootheart-powerworks',
    version: 1,
    collectedComponentIds: [],
    buildStage: 0,
    essenceSpent: 0,
    activatedAtMs: null,
    updatedAtMs: 0,
  };
}

export function resolveSunkenSandsTreasureProgress(options: {
  ledger: IslandRunSignatureMissionProgressByIsland;
  cycleIndex: number;
  islandNumber?: number;
}): SunkenSandsTreasureProgress {
  const key = getIslandRunSignatureMissionKey(options.cycleIndex, options.islandNumber ?? SUNKEN_SANDS_ISLAND_NUMBER);
  const current = options.ledger[key];
  return current?.missionId === 'sunken-sands-first-treasure' ? current : {
    missionId: 'sunken-sands-first-treasure',
    version: 1,
    treasureId: SUNKEN_SANDS_FIRST_TREASURE_ID,
    rollsCompleted: 0,
    revealedAtMs: null,
    claimedAtMs: null,
    updatedAtMs: 0,
  };
}

export function resolveCactusCanyonSpiralProgress(options: {
  ledger: IslandRunSignatureMissionProgressByIsland;
  cycleIndex: number;
  islandNumber?: number;
}): CactusCanyonSpiralProgress {
  const key = getIslandRunSignatureMissionKey(options.cycleIndex, options.islandNumber ?? CACTUS_CANYON_ISLAND_NUMBER);
  const current = options.ledger[key];
  return current?.missionId === 'cactus-canyon-spiral-rail' ? current : {
    missionId: 'cactus-canyon-spiral-rail',
    version: 2,
    segmentsExcavated: 0,
    dynamiteEarned: 0,
    dynamiteSpent: 0,
    claimedDynamiteTileIndices: [],
    lastBlastSegments: null,
    startedAtMs: null,
    completedAtMs: null,
    updatedAtMs: 0,
  };
}

export function resolveFirstLightAssemblyCraterProgress(options: {
  ledger: IslandRunSignatureMissionProgressByIsland;
  cycleIndex: number;
  islandNumber?: number;
}): FirstLightAssemblyCraterProgress {
  const key = getIslandRunSignatureMissionKey(
    options.cycleIndex,
    options.islandNumber ?? FIRST_LIGHT_ASSEMBLY_ISLAND_NUMBER,
  );
  const current = options.ledger[key];
  return current?.missionId === 'first-light-assembly-crater' ? current : {
    missionId: 'first-light-assembly-crater',
    version: 1,
    claimedDynamiteTileIndices: [],
    chargesDetonated: 0,
    lastDetonatedSector: null,
    startedAtMs: null,
    completedAtMs: null,
    updatedAtMs: 0,
  };
}

export function resolveGreatHoneyfallProgress(options: {
  ledger: IslandRunSignatureMissionProgressByIsland;
  cycleIndex: number;
  islandNumber?: number;
}): GreatHoneyfallProgress {
  const key = getIslandRunSignatureMissionKey(options.cycleIndex, options.islandNumber ?? HONEYCOMB_KINGDOM_ISLAND_NUMBER);
  const current = options.ledger[key];
  return current?.missionId === 'great-honeyfall-coronation' ? current : {
    missionId: 'great-honeyfall-coronation',
    version: 1,
    nectarChargesEarned: 0,
    nectarChargesSpent: 0,
    claimedNectarTileIndices: [],
    activatedReservoirs: 0,
    lastActivatedReservoir: null,
    completedAtMs: null,
    updatedAtMs: 0,
  };
}

export function resolveFishermansVillageFishingProgress(options: {
  ledger: IslandRunSignatureMissionProgressByIsland;
  cycleIndex: number;
  islandNumber?: number;
}): FishermansVillageFishingProgress {
  const key = getIslandRunSignatureMissionKey(
    options.cycleIndex,
    options.islandNumber ?? FISHERMANS_VILLAGE_ISLAND_NUMBER,
  );
  const current = options.ledger[key];
  return current?.missionId === 'fishermans-village-fishing' ? current : {
    missionId: 'fishermans-village-fishing',
    version: 1,
    rodCollectedAtMs: null,
    castsCompleted: 0,
    successfulCatches: 0,
    fishCaughtKg: 0,
    pendingCatch: null,
    dragonTriggeredAtMs: null,
    repairCompletedAtMs: null,
    completedAtMs: null,
    updatedAtMs: 0,
  };
}

export function resolveStagedRestorationMissionProgress(options: {
  ledger: IslandRunSignatureMissionProgressByIsland;
  cycleIndex: number;
  islandNumber: number;
}): StagedRestorationMissionProgress | null {
  const descriptor = getStagedRestorationMissionDescriptor(options.islandNumber);
  if (!descriptor) return null;
  const key = getIslandRunSignatureMissionKey(options.cycleIndex, descriptor.islandNumber);
  const current = options.ledger[key];
  return current?.missionId === descriptor.missionId ? current as StagedRestorationMissionProgress : {
    missionId: descriptor.missionId,
    version: 1,
    claimedPickupTileIndices: [],
    chargesEarned: 0,
    chargesSpent: 0,
    activatedStages: 0,
    lastActivatedStage: null,
    startedAtMs: descriptor.islandNumber === LAVA_LABYRINTH_ISLAND_NUMBER ? null : 0,
    finaleCompletedAtMs: null,
    completedAtMs: null,
    updatedAtMs: 0,
  };
}

export function getStagedRestorationAvailableCharges(progress: StagedRestorationMissionProgress): number {
  return Math.max(0, progress.chargesEarned - progress.chargesSpent);
}

export function isLavaLabyrinthEscapeMissionStarted(
  progress: StagedRestorationMissionProgress | null,
): boolean {
  return progress?.missionId === 'escape-lava-labyrinth' && progress.startedAtMs != null;
}

export function isLavaLabyrinthEscapeMissionComplete(
  progress: StagedRestorationMissionProgress | null,
): boolean {
  return progress?.missionId === 'escape-lava-labyrinth' && progress.finaleCompletedAtMs != null;
}

function collectStagedRestorationPickupForLanding(options: {
  ledger: IslandRunSignatureMissionProgressByIsland;
  islandNumber: number;
  cycleIndex: number;
  tileIndex: number;
  tileCount: number;
  nowMs: number;
}): { ledger: IslandRunSignatureMissionProgressByIsland; pickupCollected: number } {
  const descriptor = getStagedRestorationMissionDescriptor(options.islandNumber);
  const pickup = getStagedRestorationPickupForTile(options.islandNumber, options.tileIndex, options.tileCount);
  if (!descriptor || !pickup) return { ledger: options.ledger, pickupCollected: 0 };
  const current = resolveStagedRestorationMissionProgress(options);
  const pickupTarget = descriptor.stageCount * descriptor.chargeCostPerStage;
  if (
    !current
    || (descriptor.islandNumber === LAVA_LABYRINTH_ISLAND_NUMBER && !isLavaLabyrinthEscapeMissionStarted(current))
    || current.completedAtMs !== null
    || current.activatedStages >= descriptor.stageCount
    || current.claimedPickupTileIndices.includes(options.tileIndex)
    || current.chargesEarned >= pickupTarget
  ) {
    return { ledger: options.ledger, pickupCollected: 0 };
  }
  const key = getIslandRunSignatureMissionKey(options.cycleIndex, options.islandNumber);
  const claimedPickupTileIndices = [...current.claimedPickupTileIndices, options.tileIndex].sort((a, b) => a - b);
  return {
    pickupCollected: 1,
    ledger: {
      ...options.ledger,
      [key]: {
        ...current,
        claimedPickupTileIndices,
        chargesEarned: Math.min(pickupTarget, current.chargesEarned + 1),
        updatedAtMs: options.nowMs,
      },
    },
  };
}

/**
 * Exact landing wins; otherwise the first unclaimed object crossed during the
 * accepted roll is collected. This is the mission pity rule and guarantees
 * forward progress without changing dice or token movement.
 */
export function collectStagedRestorationPickupForRoute(options: {
  ledger: IslandRunSignatureMissionProgressByIsland;
  islandNumber: number;
  cycleIndex: number;
  landingTileIndex: number;
  routeTileIndices: readonly number[];
  tileCount: number;
  nowMs: number;
}): {
  ledger: IslandRunSignatureMissionProgressByIsland;
  pickupCollected: number;
  collectedTileIndex: number | null;
  collectionKind: 'landing' | 'route_pass' | null;
  pickupKind: StagedRestorationPickupKind | null;
} {
  const descriptor = getStagedRestorationMissionDescriptor(options.islandNumber);
  if (!descriptor) {
    return { ledger: options.ledger, pickupCollected: 0, collectedTileIndex: null, collectionKind: null, pickupKind: null };
  }
  const landing = collectStagedRestorationPickupForLanding({ ...options, tileIndex: options.landingTileIndex });
  if (landing.pickupCollected > 0) {
    return { ...landing, collectedTileIndex: options.landingTileIndex, collectionKind: 'landing', pickupKind: descriptor.pickupKind };
  }
  const visited = new Set<number>();
  for (const tileIndex of options.routeTileIndices) {
    if (tileIndex === options.landingTileIndex || visited.has(tileIndex)) continue;
    visited.add(tileIndex);
    const routePass = collectStagedRestorationPickupForLanding({ ...options, ledger: options.ledger, tileIndex });
    if (routePass.pickupCollected > 0) {
      return { ...routePass, collectedTileIndex: tileIndex, collectionKind: 'route_pass', pickupKind: descriptor.pickupKind };
    }
  }
  return { ledger: options.ledger, pickupCollected: 0, collectedTileIndex: null, collectionKind: null, pickupKind: null };
}

export function isFishermansVillageRodTile(islandNumber: number, tileIndex: number): boolean {
  return islandNumber === FISHERMANS_VILLAGE_ISLAND_NUMBER
    && FISHERMANS_VILLAGE_ROD_TILE_INDICES.includes(
      tileIndex as typeof FISHERMANS_VILLAGE_ROD_TILE_INDICES[number],
    );
}

export function resolveFishermansVillageCatch(
  randomValue: number,
  progress: FishermansVillageFishingProgress,
  tileIndex: number,
): FishermansVillagePendingCatch {
  const catchId = progress.castsCompleted + 1;
  if (
    progress.successfulCatches >= 4
    || progress.fishCaughtKg >= FISHERMANS_VILLAGE_PRE_DRAGON_CATCH_KG
  ) {
    return {
      catchId,
      kind: 'colossal',
      kilograms: Math.max(1, FISHERMANS_VILLAGE_DRAGON_TRIGGER_KG - progress.fishCaughtKg),
      pullsRequired: 10,
      tileIndex,
    };
  }
  const normalized = Number.isFinite(randomValue) ? Math.max(0, Math.min(0.999999, randomValue)) : 0;
  let kind: FishermansVillageCatchKind;
  let kilograms: number;
  let pullsRequired: number;
  if (normalized < 0.18) {
    kind = 'nothing'; kilograms = 0; pullsRequired = 1;
  } else if (normalized < 0.56) {
    kind = 'small'; kilograms = 3 + Math.floor((normalized - 0.18) / 0.38 * 5); pullsRequired = 2;
  } else if (normalized < 0.86) {
    kind = 'medium'; kilograms = 8 + Math.floor((normalized - 0.56) / 0.3 * 6); pullsRequired = 3;
  } else {
    kind = 'large'; kilograms = 15 + Math.floor((normalized - 0.86) / 0.14 * 8); pullsRequired = 6;
  }
  kilograms = Math.min(kilograms, Math.max(0, FISHERMANS_VILLAGE_PRE_DRAGON_CATCH_KG - progress.fishCaughtKg));
  if (kilograms <= 0) kind = 'nothing';
  return { catchId, kind, kilograms, pullsRequired, tileIndex };
}

export function collectFishermansVillageLanding(options: {
  ledger: IslandRunSignatureMissionProgressByIsland;
  islandNumber: number;
  cycleIndex: number;
  tileIndex: number;
  nowMs: number;
  randomValue: number;
}): {
  ledger: IslandRunSignatureMissionProgressByIsland;
  rodCollected: boolean;
  pendingCatch: FishermansVillagePendingCatch | null;
} {
  if (options.islandNumber !== FISHERMANS_VILLAGE_ISLAND_NUMBER) {
    return { ledger: options.ledger, rodCollected: false, pendingCatch: null };
  }
  const current = resolveFishermansVillageFishingProgress(options);
  const key = getIslandRunSignatureMissionKey(options.cycleIndex, options.islandNumber);
  if (
    !isFishermansVillageRodTile(options.islandNumber, options.tileIndex)
    || current.pendingCatch !== null
    || (current.dragonTriggeredAtMs !== null && current.repairCompletedAtMs === null)
    || current.completedAtMs !== null
  ) {
    return { ledger: options.ledger, rodCollected: false, pendingCatch: null };
  }
  const rodCollected = current.rodCollectedAtMs === null;
  const pendingCatch = resolveFishermansVillageCatch(options.randomValue, current, options.tileIndex);
  return {
    rodCollected,
    pendingCatch,
    ledger: {
      ...options.ledger,
      [key]: {
        ...current,
        rodCollectedAtMs: current.rodCollectedAtMs ?? options.nowMs,
        castsCompleted: current.castsCompleted + 1,
        pendingCatch,
        updatedAtMs: options.nowMs,
      },
    },
  };
}

export function isFirstLightAssemblyDynamiteTile(islandNumber: number, tileIndex: number): boolean {
  return islandNumber === FIRST_LIGHT_ASSEMBLY_ISLAND_NUMBER
    && FIRST_LIGHT_ASSEMBLY_DYNAMITE_TILE_INDICES.includes(
      tileIndex as typeof FIRST_LIGHT_ASSEMBLY_DYNAMITE_TILE_INDICES[number],
    );
}

export function getFirstLightAssemblyAvailableDynamite(progress: FirstLightAssemblyCraterProgress): number {
  return Math.max(0, progress.claimedDynamiteTileIndices.length - progress.chargesDetonated);
}

export function getFirstLightAssemblyBuildProgress(progress: FirstLightAssemblyCraterProgress): number {
  return Math.max(0, Math.min(1, progress.chargesDetonated / FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET));
}

export function collectFirstLightAssemblyDynamiteForLanding(options: {
  ledger: IslandRunSignatureMissionProgressByIsland;
  islandNumber: number;
  cycleIndex: number;
  tileIndex: number;
  nowMs: number;
}): { ledger: IslandRunSignatureMissionProgressByIsland; dynamiteCollected: number } {
  if (!isFirstLightAssemblyDynamiteTile(options.islandNumber, options.tileIndex)) {
    return { ledger: options.ledger, dynamiteCollected: 0 };
  }
  const current = resolveFirstLightAssemblyCraterProgress(options);
  if (
    current.completedAtMs !== null
    || current.chargesDetonated >= FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET
    || current.claimedDynamiteTileIndices.includes(options.tileIndex)
  ) {
    return { ledger: options.ledger, dynamiteCollected: 0 };
  }
  const key = getIslandRunSignatureMissionKey(options.cycleIndex, options.islandNumber);
  const claimedDynamiteTileIndices = FIRST_LIGHT_ASSEMBLY_DYNAMITE_TILE_INDICES.filter((tileIndex) => (
    current.claimedDynamiteTileIndices.includes(tileIndex) || tileIndex === options.tileIndex
  ));
  return {
    dynamiteCollected: 1,
    ledger: {
      ...options.ledger,
      [key]: {
        ...current,
        claimedDynamiteTileIndices,
        startedAtMs: current.startedAtMs ?? options.nowMs,
        updatedAtMs: options.nowMs,
      },
    },
  };
}

/**
 * Resolves one finite Assembly Crater cache reached during a completed roll.
 * An exact landing always wins. When the pawn passes an unclaimed cache on the
 * way, that cache is secured instead so the mission begins with the route
 * rather than depending on repeated exact-land RNG. At most one charge is
 * collected per roll.
 */
export function collectFirstLightAssemblyDynamiteForRoute(options: {
  ledger: IslandRunSignatureMissionProgressByIsland;
  islandNumber: number;
  cycleIndex: number;
  landingTileIndex: number;
  routeTileIndices: readonly number[];
  nowMs: number;
}): {
  ledger: IslandRunSignatureMissionProgressByIsland;
  dynamiteCollected: number;
  collectedTileIndex: number | null;
  collectionKind: 'landing' | 'route_pass' | null;
} {
  const landing = collectFirstLightAssemblyDynamiteForLanding({
    ledger: options.ledger,
    islandNumber: options.islandNumber,
    cycleIndex: options.cycleIndex,
    tileIndex: options.landingTileIndex,
    nowMs: options.nowMs,
  });
  if (landing.dynamiteCollected > 0) {
    return {
      ...landing,
      collectedTileIndex: options.landingTileIndex,
      collectionKind: 'landing',
    };
  }

  const visited = new Set<number>();
  for (const tileIndex of options.routeTileIndices) {
    if (tileIndex === options.landingTileIndex || visited.has(tileIndex)) continue;
    visited.add(tileIndex);
    const routePass = collectFirstLightAssemblyDynamiteForLanding({
      ledger: options.ledger,
      islandNumber: options.islandNumber,
      cycleIndex: options.cycleIndex,
      tileIndex,
      nowMs: options.nowMs,
    });
    if (routePass.dynamiteCollected > 0) {
      return {
        ...routePass,
        collectedTileIndex: tileIndex,
        collectionKind: 'route_pass',
      };
    }
  }

  return {
    ledger: options.ledger,
    dynamiteCollected: 0,
    collectedTileIndex: null,
    collectionKind: null,
  };
}

export function getGreatHoneyfallAvailableNectar(progress: GreatHoneyfallProgress): number {
  return Math.max(0, progress.nectarChargesEarned - progress.nectarChargesSpent);
}

export function getGreatHoneyfallNectarQuantityForTile(
  islandNumber: number,
  tileIndex: number,
  tileCount: number,
): number {
  if (islandNumber !== HONEYCOMB_KINGDOM_ISLAND_NUMBER) return 0;
  const safeTileCount = Math.max(1, Math.floor(tileCount));
  return GREAT_HONEYFALL_NECTAR_TILE_FRACTIONS.some((fraction) => (
    Math.min(safeTileCount - 1, Math.max(0, Math.floor(fraction * safeTileCount))) === tileIndex
  )) ? 1 : 0;
}

export function collectGreatHoneyfallNectarForLanding(options: {
  ledger: IslandRunSignatureMissionProgressByIsland;
  islandNumber: number;
  cycleIndex: number;
  tileIndex: number;
  tileCount: number;
  nowMs: number;
}): { ledger: IslandRunSignatureMissionProgressByIsland; nectarCollected: number } {
  const amount = getGreatHoneyfallNectarQuantityForTile(
    options.islandNumber,
    options.tileIndex,
    options.tileCount,
  );
  if (amount <= 0) return { ledger: options.ledger, nectarCollected: 0 };
  const current = resolveGreatHoneyfallProgress(options);
  if (
    current.completedAtMs !== null
    || current.activatedReservoirs >= GREAT_HONEYFALL_MAX_STAGE
    || current.nectarChargesEarned >= GREAT_HONEYFALL_MAX_STAGE
    || (current.claimedNectarTileIndices ?? []).includes(options.tileIndex)
  ) {
    return { ledger: options.ledger, nectarCollected: 0 };
  }
  const key = getIslandRunSignatureMissionKey(options.cycleIndex, options.islandNumber);
  return {
    nectarCollected: amount,
    ledger: {
      ...options.ledger,
      [key]: {
        ...current,
        nectarChargesEarned: Math.min(GREAT_HONEYFALL_MAX_STAGE, current.nectarChargesEarned + amount),
        claimedNectarTileIndices: [...(current.claimedNectarTileIndices ?? []), options.tileIndex].sort((a, b) => a - b),
        updatedAtMs: options.nowMs,
      },
    },
  };
}

export function getCactusCanyonDynamiteQuantityForTile(
  islandNumber: number,
  tileIndex: number,
  tileCount: number,
): number {
  if (islandNumber !== CACTUS_CANYON_ISLAND_NUMBER) return 0;
  const safeTileCount = Math.max(1, Math.floor(tileCount));
  const cacheIndex = CACTUS_CANYON_DYNAMITE_CACHE_FRACTIONS.findIndex((fraction) => (
    Math.min(safeTileCount - 1, Math.max(0, Math.floor(fraction * safeTileCount))) === tileIndex
  ));
  return cacheIndex < 0 ? 0 : CACTUS_CANYON_DYNAMITE_CACHE_AMOUNTS[cacheIndex];
}

export function isCactusCanyonDynamiteTile(
  islandNumber: number,
  tileIndex: number,
  tileCount: number,
): boolean {
  return getCactusCanyonDynamiteQuantityForTile(islandNumber, tileIndex, tileCount) > 0;
}

export function getCactusCanyonAvailableDynamite(progress: CactusCanyonSpiralProgress): number {
  return Math.max(0, progress.dynamiteEarned - progress.dynamiteSpent);
}

export function getCactusCanyonSpiralBuildProgress(progress: CactusCanyonSpiralProgress): number {
  return Math.max(0, Math.min(1, progress.segmentsExcavated / CACTUS_CANYON_SPIRAL_MAX_SEGMENTS));
}

export function startCactusCanyonSpiralMission(options: {
  ledger: IslandRunSignatureMissionProgressByIsland;
  islandNumber: number;
  cycleIndex: number;
  nowMs: number;
}): IslandRunSignatureMissionProgressByIsland {
  if (options.islandNumber !== CACTUS_CANYON_ISLAND_NUMBER) return options.ledger;
  const current = resolveCactusCanyonSpiralProgress(options);
  if (current.startedAtMs !== null) return options.ledger;
  const key = getIslandRunSignatureMissionKey(options.cycleIndex, options.islandNumber);
  return {
    ...options.ledger,
    [key]: { ...current, startedAtMs: options.nowMs, updatedAtMs: options.nowMs },
  };
}

export function collectCactusCanyonDynamiteForLanding(options: {
  ledger: IslandRunSignatureMissionProgressByIsland;
  islandNumber: number;
  cycleIndex: number;
  tileIndex: number;
  tileCount: number;
  nowMs: number;
}): { ledger: IslandRunSignatureMissionProgressByIsland; dynamiteCollected: number } {
  const amount = getCactusCanyonDynamiteQuantityForTile(
    options.islandNumber,
    options.tileIndex,
    options.tileCount,
  );
  if (amount <= 0) return { ledger: options.ledger, dynamiteCollected: 0 };
  const current = resolveCactusCanyonSpiralProgress(options);
  if (
    current.startedAtMs === null
    || current.completedAtMs !== null
    || current.segmentsExcavated >= CACTUS_CANYON_SPIRAL_MAX_SEGMENTS
    || (current.claimedDynamiteTileIndices ?? []).includes(options.tileIndex)
  ) {
    return { ledger: options.ledger, dynamiteCollected: 0 };
  }
  const key = getIslandRunSignatureMissionKey(options.cycleIndex, options.islandNumber);
  return {
    dynamiteCollected: amount,
    ledger: {
      ...options.ledger,
      [key]: {
        ...current,
        dynamiteEarned: current.dynamiteEarned + amount,
        claimedDynamiteTileIndices: [...(current.claimedDynamiteTileIndices ?? []), options.tileIndex].sort((a, b) => a - b),
        updatedAtMs: options.nowMs,
      },
    },
  };
}

export function getSunkenSandsTreasureRevealProgress(progress: SunkenSandsTreasureProgress): number {
  return Math.max(0, Math.min(1, progress.rollsCompleted / SUNKEN_SANDS_TREASURE_ROLL_TARGET));
}

export function getSunkenSandsTreasureEssenceReward(cycleIndex: number): number {
  const effectiveIsland = getEffectiveIslandNumber(SUNKEN_SANDS_ISLAND_NUMBER, cycleIndex);
  return Math.round(SUNKEN_SANDS_FIRST_TREASURE_BASE_ESSENCE * getIslandEssenceMultiplier(effectiveIsland));
}

export function advanceCelestialRedockingForRoll(options: {
  ledger: IslandRunSignatureMissionProgressByIsland;
  islandNumber: number;
  cycleIndex: number;
  nowMs: number;
}): {
  ledger: IslandRunSignatureMissionProgressByIsland;
  rollsCompleted: number;
  dockedPlatformCount: number;
  dockedPlatformIndex: number | null;
  becameComplete: boolean;
} {
  if (options.islandNumber !== CELESTIAL_REDOCKING_ISLAND_NUMBER) {
    return {
      ledger: options.ledger,
      rollsCompleted: 0,
      dockedPlatformCount: 0,
      dockedPlatformIndex: null,
      becameComplete: false,
    };
  }
  const current = resolveCelestialRedockingProgress(options);
  const previousDockedPlatformCount = getCelestialRedockingDockedPlatformCount(current);
  if (current.rollsCompleted >= CELESTIAL_REDOCKING_ROLL_TARGET) {
    return {
      ledger: options.ledger,
      rollsCompleted: current.rollsCompleted,
      dockedPlatformCount: previousDockedPlatformCount,
      dockedPlatformIndex: null,
      becameComplete: false,
    };
  }
  const rollsCompleted = Math.min(CELESTIAL_REDOCKING_ROLL_TARGET, current.rollsCompleted + 1);
  const nextProgress: CelestialRedockingProgress = {
    ...current,
    rollsCompleted,
    completedAtMs: rollsCompleted >= CELESTIAL_REDOCKING_ROLL_TARGET
      ? options.nowMs
      : current.completedAtMs,
    updatedAtMs: options.nowMs,
  };
  const dockedPlatformCount = getCelestialRedockingDockedPlatformCount(nextProgress);
  const key = getIslandRunSignatureMissionKey(options.cycleIndex, options.islandNumber);
  return {
    ledger: { ...options.ledger, [key]: nextProgress },
    rollsCompleted,
    dockedPlatformCount,
    dockedPlatformIndex: dockedPlatformCount > previousDockedPlatformCount
      ? dockedPlatformCount - 1
      : null,
    becameComplete: rollsCompleted >= CELESTIAL_REDOCKING_ROLL_TARGET,
  };
}

export function advanceSunkenSandsTreasureForRoll(options: {
  ledger: IslandRunSignatureMissionProgressByIsland;
  islandNumber: number;
  cycleIndex: number;
  nowMs: number;
}): {
  ledger: IslandRunSignatureMissionProgressByIsland;
  rollsCompleted: number;
  becameReady: boolean;
} {
  if (options.islandNumber !== SUNKEN_SANDS_ISLAND_NUMBER) {
    return { ledger: options.ledger, rollsCompleted: 0, becameReady: false };
  }
  const current = resolveSunkenSandsTreasureProgress(options);
  if (current.claimedAtMs !== null || current.rollsCompleted >= SUNKEN_SANDS_TREASURE_ROLL_TARGET) {
    return { ledger: options.ledger, rollsCompleted: current.rollsCompleted, becameReady: false };
  }
  const rollsCompleted = Math.min(SUNKEN_SANDS_TREASURE_ROLL_TARGET, current.rollsCompleted + 1);
  const becameReady = rollsCompleted >= SUNKEN_SANDS_TREASURE_ROLL_TARGET;
  const key = getIslandRunSignatureMissionKey(options.cycleIndex, options.islandNumber);
  return {
    rollsCompleted,
    becameReady,
    ledger: {
      ...options.ledger,
      [key]: {
        ...current,
        rollsCompleted,
        revealedAtMs: becameReady ? options.nowMs : current.revealedAtMs,
        updatedAtMs: options.nowMs,
      },
    },
  };
}

export function getRootheartPowerComponentForTile(
  islandNumber: number,
  tileIndex: number,
): typeof ROOTHEART_POWER_COMPONENTS[number] | null {
  if (islandNumber !== ROOTHEART_ISLAND_NUMBER) return null;
  return ROOTHEART_POWER_COMPONENTS.find((component) => component.tileIndex === tileIndex) ?? null;
}

export function isRootheartPowerComponentTile(islandNumber: number, tileIndex: number): boolean {
  return getRootheartPowerComponentForTile(islandNumber, tileIndex) !== null;
}

export function collectRootheartPowerComponentForLanding(options: {
  ledger: IslandRunSignatureMissionProgressByIsland;
  islandNumber: number;
  cycleIndex: number;
  tileIndex: number;
  nowMs: number;
}): {
  ledger: IslandRunSignatureMissionProgressByIsland;
  collectedComponentId: RootheartPowerComponentId | null;
} {
  const component = getRootheartPowerComponentForTile(options.islandNumber, options.tileIndex);
  if (!component) return { ledger: options.ledger, collectedComponentId: null };
  const current = resolveRootheartPowerworksProgress(options);
  if (
    current.buildStage >= ROOTHEART_POWERWORKS_MAX_STAGE
    || current.collectedComponentIds.includes(component.id)
  ) {
    return { ledger: options.ledger, collectedComponentId: null };
  }
  const key = getIslandRunSignatureMissionKey(options.cycleIndex, options.islandNumber);
  const collectedComponentIds = ROOTHEART_POWER_COMPONENTS
    .map((entry) => entry.id)
    .filter((id) => current.collectedComponentIds.includes(id) || id === component.id);
  return {
    collectedComponentId: component.id,
    ledger: {
      ...options.ledger,
      [key]: { ...current, collectedComponentIds, updatedAtMs: options.nowMs },
    },
  };
}

export function isRootheartPowerworksCollectionComplete(progress: RootheartPowerworksProgress): boolean {
  return ROOTHEART_POWER_COMPONENTS.every((component) => progress.collectedComponentIds.includes(component.id));
}

export function getRootheartPowerworksStageCost(cycleIndex: number, nextStage: number): number {
  const stage = Math.max(1, Math.min(ROOTHEART_POWERWORKS_MAX_STAGE, Math.floor(nextStage)));
  const effectiveIsland = getEffectiveIslandNumber(ROOTHEART_ISLAND_NUMBER, cycleIndex);
  return Math.round(ROOTHEART_POWERWORKS_BASE_STAGE_COSTS[stage - 1] * getIslandEssenceMultiplier(effectiveIsland));
}

export function getRootheartPowerworksNightBlend(progress: RootheartPowerworksProgress): number {
  return Math.max(0, Math.min(1, progress.buildStage / ROOTHEART_POWERWORKS_MAX_STAGE));
}

export function getFrostwellAvailableSpins(progress: FrostwellIceworksProgress): number {
  return Math.max(0, progress.spinsEarned - progress.spinsUsed);
}

export function isFrostwellDrillTile(islandNumber: number, tileIndex: number): boolean {
  return islandNumber === FROSTWELL_ISLAND_NUMBER
    && FROSTWELL_DRILL_TILE_INDICES.includes(tileIndex as typeof FROSTWELL_DRILL_TILE_INDICES[number]);
}

export function grantFrostwellDrillSpinForLanding(options: {
  ledger: IslandRunSignatureMissionProgressByIsland;
  islandNumber: number;
  cycleIndex: number;
  tileIndex: number;
  nowMs: number;
}): { ledger: IslandRunSignatureMissionProgressByIsland; granted: boolean } {
  if (!isFrostwellDrillTile(options.islandNumber, options.tileIndex)) {
    return { ledger: options.ledger, granted: false };
  }
  const key = getIslandRunSignatureMissionKey(options.cycleIndex, options.islandNumber);
  const current = resolveFrostwellIceworksProgress(options);
  if (current.builtAtMs !== null || current.metersDrilled >= FROSTWELL_DEPTH_METERS) {
    return { ledger: options.ledger, granted: false };
  }
  return {
    granted: true,
    ledger: {
      ...options.ledger,
      [key]: {
        ...current,
        spinsEarned: current.spinsEarned + 1,
        updatedAtMs: options.nowMs,
      },
    },
  };
}

export function resolveFrostwellSpinMeters(randomValue: number): number {
  const normalized = Number.isFinite(randomValue) ? Math.max(0, Math.min(0.999999, randomValue)) : 0;
  return FROSTWELL_SPIN_METERS[Math.floor(normalized * FROSTWELL_SPIN_METERS.length)];
}

export function mergeIslandRunSignatureMissionProgress(
  remote: IslandRunSignatureMissionProgressByIsland,
  local: IslandRunSignatureMissionProgressByIsland,
): IslandRunSignatureMissionProgressByIsland {
  const merged: IslandRunSignatureMissionProgressByIsland = {};
  new Set([...Object.keys(remote), ...Object.keys(local)]).forEach((key) => {
    const a = remote[key];
    const b = local[key];
    if (!a) { merged[key] = b; return; }
    if (!b) { merged[key] = a; return; }
    const stagedA = getStagedRestorationMissionDescriptorById(a.missionId);
    const stagedB = getStagedRestorationMissionDescriptorById(b.missionId);
    if (stagedA || stagedB) {
      if (!stagedA) { merged[key] = b; return; }
      if (!stagedB) { merged[key] = a; return; }
      if (stagedA.missionId !== stagedB.missionId) {
        merged[key] = a.updatedAtMs >= b.updatedAtMs ? a : b;
        return;
      }
      const left = a as StagedRestorationMissionProgress;
      const right = b as StagedRestorationMissionProgress;
      const claimedPickupTileIndices = Array.from(new Set([
        ...left.claimedPickupTileIndices,
        ...right.claimedPickupTileIndices,
      ])).sort((x, y) => x - y);
      const activatedStages = Math.max(left.activatedStages, right.activatedStages);
      const chargesEarned = Math.max(left.chargesEarned, right.chargesEarned, claimedPickupTileIndices.length);
      const chargesSpent = Math.max(
        left.chargesSpent,
        right.chargesSpent,
        activatedStages * stagedA.chargeCostPerStage,
      );
      const completedAtMs = left.completedAtMs === null
        ? right.completedAtMs
        : right.completedAtMs === null ? left.completedAtMs : Math.min(left.completedAtMs, right.completedAtMs);
      const startedAtMs = left.startedAtMs == null
        ? right.startedAtMs ?? null
        : right.startedAtMs == null ? left.startedAtMs : Math.min(left.startedAtMs, right.startedAtMs);
      const finaleCompletedAtMs = left.finaleCompletedAtMs == null
        ? right.finaleCompletedAtMs ?? null
        : right.finaleCompletedAtMs == null
          ? left.finaleCompletedAtMs
          : Math.min(left.finaleCompletedAtMs, right.finaleCompletedAtMs);
      merged[key] = {
        missionId: stagedA.missionId,
        version: 1,
        claimedPickupTileIndices,
        chargesEarned,
        chargesSpent,
        activatedStages,
        lastActivatedStage: activatedStages > 0 ? activatedStages : null,
        startedAtMs,
        finaleCompletedAtMs,
        completedAtMs,
        updatedAtMs: Math.max(left.updatedAtMs, right.updatedAtMs),
      };
      return;
    }
    if (a.missionId === 'fishermans-village-fishing' || b.missionId === 'fishermans-village-fishing') {
      if (a.missionId !== 'fishermans-village-fishing') { merged[key] = b; return; }
      if (b.missionId !== 'fishermans-village-fishing') { merged[key] = a; return; }
      const earliest = (left: number | null, right: number | null): number | null => (
        left === null ? right : right === null ? left : Math.min(left, right)
      );
      const latest = a.updatedAtMs >= b.updatedAtMs ? a : b;
      const fishCaughtKg = Math.max(a.fishCaughtKg, b.fishCaughtKg);
      merged[key] = {
        missionId: 'fishermans-village-fishing',
        version: 1,
        rodCollectedAtMs: earliest(a.rodCollectedAtMs, b.rodCollectedAtMs),
        castsCompleted: Math.max(a.castsCompleted, b.castsCompleted),
        successfulCatches: Math.max(a.successfulCatches, b.successfulCatches),
        fishCaughtKg,
        pendingCatch: latest.fishCaughtKg < fishCaughtKg ? null : latest.pendingCatch,
        dragonTriggeredAtMs: earliest(a.dragonTriggeredAtMs, b.dragonTriggeredAtMs),
        repairCompletedAtMs: earliest(a.repairCompletedAtMs, b.repairCompletedAtMs),
        completedAtMs: earliest(a.completedAtMs, b.completedAtMs),
        updatedAtMs: Math.max(a.updatedAtMs, b.updatedAtMs),
      };
      return;
    }
    if (a.missionId === 'celestial-great-redocking' || b.missionId === 'celestial-great-redocking') {
      if (a.missionId !== 'celestial-great-redocking') { merged[key] = b; return; }
      if (b.missionId !== 'celestial-great-redocking') { merged[key] = a; return; }
      const completedAtMs = a.completedAtMs === null
        ? b.completedAtMs
        : b.completedAtMs === null
          ? a.completedAtMs
          : Math.min(a.completedAtMs, b.completedAtMs);
      merged[key] = {
        missionId: 'celestial-great-redocking',
        version: 1,
        rollsCompleted: Math.max(a.rollsCompleted, b.rollsCompleted),
        completedAtMs,
        updatedAtMs: Math.max(a.updatedAtMs, b.updatedAtMs),
      };
      return;
    }
    if (a.missionId === 'first-light-assembly-crater' || b.missionId === 'first-light-assembly-crater') {
      if (a.missionId !== 'first-light-assembly-crater') { merged[key] = b; return; }
      if (b.missionId !== 'first-light-assembly-crater') { merged[key] = a; return; }
      const claimedDynamiteTileIndices = FIRST_LIGHT_ASSEMBLY_DYNAMITE_TILE_INDICES.filter((tileIndex) => (
        a.claimedDynamiteTileIndices.includes(tileIndex) || b.claimedDynamiteTileIndices.includes(tileIndex)
      ));
      const chargesDetonated = Math.min(
        claimedDynamiteTileIndices.length,
        FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET,
        Math.max(a.chargesDetonated, b.chargesDetonated),
      );
      const completedAtMs = a.completedAtMs === null
        ? b.completedAtMs
        : b.completedAtMs === null
          ? a.completedAtMs
          : Math.min(a.completedAtMs, b.completedAtMs);
      const latest = a.updatedAtMs >= b.updatedAtMs ? a : b;
      merged[key] = {
        missionId: 'first-light-assembly-crater',
        version: 1,
        claimedDynamiteTileIndices,
        chargesDetonated,
        lastDetonatedSector: latest.lastDetonatedSector,
        startedAtMs: a.startedAtMs === null
          ? b.startedAtMs
          : b.startedAtMs === null ? a.startedAtMs : Math.min(a.startedAtMs, b.startedAtMs),
        completedAtMs,
        updatedAtMs: Math.max(a.updatedAtMs, b.updatedAtMs),
      };
      return;
    }
    if (a.missionId === 'great-honeyfall-coronation' || b.missionId === 'great-honeyfall-coronation') {
      if (a.missionId !== 'great-honeyfall-coronation') { merged[key] = b; return; }
      if (b.missionId !== 'great-honeyfall-coronation') { merged[key] = a; return; }
      const completedAtMs = a.completedAtMs === null
        ? b.completedAtMs
        : b.completedAtMs === null ? a.completedAtMs : Math.min(a.completedAtMs, b.completedAtMs);
      const activatedReservoirs = Math.max(a.activatedReservoirs, b.activatedReservoirs) as GreatHoneyfallProgress['activatedReservoirs'];
      merged[key] = {
        missionId: 'great-honeyfall-coronation',
        version: 1,
        nectarChargesEarned: Math.max(a.nectarChargesEarned, b.nectarChargesEarned),
        nectarChargesSpent: Math.max(a.nectarChargesSpent, b.nectarChargesSpent),
        claimedNectarTileIndices: Array.from(new Set([
          ...(a.claimedNectarTileIndices ?? []),
          ...(b.claimedNectarTileIndices ?? []),
        ])).sort((x, y) => x - y),
        activatedReservoirs,
        lastActivatedReservoir: activatedReservoirs > 0 ? activatedReservoirs : null,
        completedAtMs,
        updatedAtMs: Math.max(a.updatedAtMs, b.updatedAtMs),
      };
      return;
    }
    if (a.missionId === 'sunken-sands-first-treasure' || b.missionId === 'sunken-sands-first-treasure') {
      if (a.missionId !== 'sunken-sands-first-treasure') { merged[key] = b; return; }
      if (b.missionId !== 'sunken-sands-first-treasure') { merged[key] = a; return; }
      const earliestTimestamp = (left: number | null, right: number | null): number | null => (
        left === null ? right : right === null ? left : Math.min(left, right)
      );
      merged[key] = {
        missionId: 'sunken-sands-first-treasure',
        version: 1,
        treasureId: SUNKEN_SANDS_FIRST_TREASURE_ID,
        rollsCompleted: Math.max(a.rollsCompleted, b.rollsCompleted),
        revealedAtMs: earliestTimestamp(a.revealedAtMs, b.revealedAtMs),
        claimedAtMs: earliestTimestamp(a.claimedAtMs, b.claimedAtMs),
        updatedAtMs: Math.max(a.updatedAtMs, b.updatedAtMs),
      };
      return;
    }
    if (a.missionId === 'cactus-canyon-spiral-rail' || b.missionId === 'cactus-canyon-spiral-rail') {
      if (a.missionId !== 'cactus-canyon-spiral-rail') { merged[key] = b; return; }
      if (b.missionId !== 'cactus-canyon-spiral-rail') { merged[key] = a; return; }
      const completedAtMs = a.completedAtMs === null
        ? b.completedAtMs
        : b.completedAtMs === null
          ? a.completedAtMs
          : Math.min(a.completedAtMs, b.completedAtMs);
      const latest = a.updatedAtMs >= b.updatedAtMs ? a : b;
      merged[key] = {
        missionId: 'cactus-canyon-spiral-rail',
        version: 2,
        segmentsExcavated: Math.max(a.segmentsExcavated, b.segmentsExcavated),
        dynamiteEarned: Math.max(a.dynamiteEarned, b.dynamiteEarned),
        dynamiteSpent: Math.max(a.dynamiteSpent, b.dynamiteSpent),
        claimedDynamiteTileIndices: Array.from(new Set([
          ...(a.claimedDynamiteTileIndices ?? []),
          ...(b.claimedDynamiteTileIndices ?? []),
        ])).sort((x, y) => x - y),
        lastBlastSegments: latest.lastBlastSegments,
        startedAtMs: a.startedAtMs === null
          ? b.startedAtMs
          : b.startedAtMs === null ? a.startedAtMs : Math.min(a.startedAtMs, b.startedAtMs),
        completedAtMs,
        updatedAtMs: Math.max(a.updatedAtMs, b.updatedAtMs),
      };
      return;
    }
    if (a.missionId === 'rootheart-powerworks' || b.missionId === 'rootheart-powerworks') {
      if (a.missionId !== 'rootheart-powerworks') { merged[key] = b; return; }
      if (b.missionId !== 'rootheart-powerworks') { merged[key] = a; return; }
      const activatedAtMs = a.activatedAtMs === null
        ? b.activatedAtMs
        : b.activatedAtMs === null
          ? a.activatedAtMs
          : Math.min(a.activatedAtMs, b.activatedAtMs);
      merged[key] = {
        missionId: 'rootheart-powerworks',
        version: 1,
        collectedComponentIds: ROOTHEART_POWER_COMPONENTS
          .map((component) => component.id)
          .filter((id) => a.collectedComponentIds.includes(id) || b.collectedComponentIds.includes(id)),
        buildStage: Math.max(a.buildStage, b.buildStage) as RootheartPowerworksBuildStage,
        essenceSpent: Math.max(a.essenceSpent, b.essenceSpent),
        activatedAtMs,
        updatedAtMs: Math.max(a.updatedAtMs, b.updatedAtMs),
      };
      return;
    }
    if (a.missionId !== 'frostwell-iceworks' || b.missionId !== 'frostwell-iceworks') {
      merged[key] = a.updatedAtMs >= b.updatedAtMs ? a : b;
      return;
    }
    const builtAtMs = a.builtAtMs === null ? b.builtAtMs : b.builtAtMs === null ? a.builtAtMs : Math.min(a.builtAtMs, b.builtAtMs);
    const latest = a.updatedAtMs >= b.updatedAtMs ? a : b;
    merged[key] = {
      missionId: 'frostwell-iceworks',
      version: 2,
      metersDrilled: Math.max(a.metersDrilled, b.metersDrilled),
      spinsEarned: Math.max(a.spinsEarned, b.spinsEarned),
      spinsUsed: Math.max(a.spinsUsed, b.spinsUsed),
      lastSpinMeters: latest.lastSpinMeters,
      builtAtMs,
      updatedAtMs: Math.max(a.updatedAtMs, b.updatedAtMs),
    };
  });
  return merged;
}

export function getFrostwellDepthProgress(progress: FrostwellIceworksProgress): number {
  return Math.min(1, Math.max(0, progress.metersDrilled / FROSTWELL_DEPTH_METERS));
}
