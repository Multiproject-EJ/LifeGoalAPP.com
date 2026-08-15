import type { JourneyDiscArenaModuleId, JourneyDiscArenaRank } from './journeyDiscArenaGame';

export type JourneyDiscWeaponId = Exclude<JourneyDiscArenaModuleId, null>;

export interface JourneyDiscArmoryState {
  version: 1;
  rank: JourneyDiscArenaRank;
  weaponLevels: Record<JourneyDiscWeaponId, number>;
  highestGuardianTierDefeated: 0 | 1 | 2 | 3;
  updatedAtMs: number;
}

export const JOURNEY_DISC_WEAPON_IDS: readonly JourneyDiscWeaponId[] = Object.freeze([
  'ram_fin',
  'aegis_ring',
  'pulse_vane',
]);

export const JOURNEY_DISC_WEAPON_NAMES: Readonly<Record<JourneyDiscWeaponId, string>> = Object.freeze({
  ram_fin: 'Comet Fin',
  aegis_ring: 'Aegis Ring',
  pulse_vane: 'Pulse Vane',
});

const level = (value: unknown): number => typeof value === 'number' && Number.isFinite(value)
  ? Math.max(0, Math.min(5, Math.floor(value)))
  : 0;

export function createJourneyDiscArmory(nowMs = Date.now()): JourneyDiscArmoryState {
  return {
    version: 1,
    rank: 1,
    weaponLevels: { ram_fin: 1, aegis_ring: 0, pulse_vane: 0 },
    highestGuardianTierDefeated: 0,
    updatedAtMs: Math.max(0, Math.floor(nowMs)),
  };
}

export function sanitizeJourneyDiscArmory(value: unknown, fallback = createJourneyDiscArmory(0)): JourneyDiscArmoryState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...fallback, weaponLevels: { ...fallback.weaponLevels } };
  const candidate = value as Record<string, unknown>;
  const rawLevels = candidate.weaponLevels && typeof candidate.weaponLevels === 'object' && !Array.isArray(candidate.weaponLevels)
    ? candidate.weaponLevels as Record<string, unknown>
    : {};
  const guardianTier = level(candidate.highestGuardianTierDefeated);
  return {
    version: 1,
    rank: Math.max(1, Math.min(3, level(candidate.rank))) as JourneyDiscArenaRank,
    weaponLevels: {
      ram_fin: Math.max(1, level(rawLevels.ram_fin)),
      aegis_ring: level(rawLevels.aegis_ring),
      pulse_vane: level(rawLevels.pulse_vane),
    },
    highestGuardianTierDefeated: Math.min(3, guardianTier) as 0 | 1 | 2 | 3,
    updatedAtMs: typeof candidate.updatedAtMs === 'number' && Number.isFinite(candidate.updatedAtMs)
      ? Math.max(0, Math.floor(candidate.updatedAtMs))
      : fallback.updatedAtMs,
  };
}

export function mergeJourneyDiscArmory(remote: JourneyDiscArmoryState, local: JourneyDiscArmoryState): JourneyDiscArmoryState {
  return {
    version: 1,
    rank: Math.max(remote.rank, local.rank) as JourneyDiscArenaRank,
    weaponLevels: {
      ram_fin: Math.max(remote.weaponLevels.ram_fin, local.weaponLevels.ram_fin),
      aegis_ring: Math.max(remote.weaponLevels.aegis_ring, local.weaponLevels.aegis_ring),
      pulse_vane: Math.max(remote.weaponLevels.pulse_vane, local.weaponLevels.pulse_vane),
    },
    highestGuardianTierDefeated: Math.max(remote.highestGuardianTierDefeated, local.highestGuardianTierDefeated) as 0 | 1 | 2 | 3,
    updatedAtMs: Math.max(remote.updatedAtMs, local.updatedAtMs),
  };
}

export function upgradeJourneyDiscWeapon(
  armory: JourneyDiscArmoryState,
  weaponId: JourneyDiscWeaponId,
  nowMs = Date.now(),
): { armory: JourneyDiscArmoryState; upgraded: boolean } {
  const currentLevel = armory.weaponLevels[weaponId];
  if (currentLevel >= 5) return { armory, upgraded: false };
  return {
    upgraded: true,
    armory: {
      ...armory,
      weaponLevels: { ...armory.weaponLevels, [weaponId]: currentLevel + 1 },
      updatedAtMs: Math.max(0, Math.floor(nowMs)),
    },
  };
}

export function getJourneyDiscUnlockedWeapons(armory: JourneyDiscArmoryState): JourneyDiscWeaponId[] {
  return JOURNEY_DISC_WEAPON_IDS.filter((weaponId) => armory.weaponLevels[weaponId] > 0);
}

/** Journey Disc Arena returns on the island immediately after every fifth-island boss. */
export function isJourneyDiscArenaIsland(islandNumber: number): boolean {
  const island = Math.max(1, Math.floor(islandNumber));
  return island >= 6 && (island - 1) % 5 === 0;
}
