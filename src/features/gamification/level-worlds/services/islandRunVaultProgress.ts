export const VAULT_ISLAND_UPGRADE_IDS = [
  'limestone-works',
  'grand-palace',
  'treasury-depths',
  'golden-crownworks',
  'shark-patrol',
  'laser-grid',
  'guardian-frigate',
] as const;

export type VaultIslandUpgradeId = (typeof VAULT_ISLAND_UPGRADE_IDS)[number];
export type VaultIslandUpgradeCategory = 'construction' | 'security';

export interface VaultIslandProgress {
  purchasedUpgradeIds: VaultIslandUpgradeId[];
}

export interface VaultIslandUpgradeDefinition {
  id: VaultIslandUpgradeId;
  category: VaultIslandUpgradeCategory;
  name: string;
  shortName: string;
  description: string;
  cost: number;
  prerequisiteIds: VaultIslandUpgradeId[];
  rewardDice: number;
  rewardShards: number;
}

export const VAULT_ISLAND_UPGRADES: readonly VaultIslandUpgradeDefinition[] = [
  {
    id: 'limestone-works',
    category: 'construction',
    name: 'Limestone Works',
    shortName: 'Stone',
    description: 'Dress the gifted stone structure in warm-cut limestone and open the royal garden level.',
    cost: 300,
    prerequisiteIds: [],
    rewardDice: 50,
    rewardShards: 0,
  },
  {
    id: 'grand-palace',
    category: 'construction',
    name: 'Grand Palace',
    shortName: 'Palace',
    description: 'Raise the monumental second storey, twin domes, and the ceremonial stair hall.',
    cost: 900,
    prerequisiteIds: ['limestone-works'],
    rewardDice: 100,
    rewardShards: 10,
  },
  {
    id: 'treasury-depths',
    category: 'construction',
    name: 'Treasury Depths',
    shortName: 'Vault',
    description: 'Excavate the split descent, private casino floor, and deep museum treasury.',
    cost: 1_800,
    prerequisiteIds: ['grand-palace'],
    rewardDice: 150,
    rewardShards: 25,
  },
  {
    id: 'golden-crownworks',
    category: 'construction',
    name: 'Golden Crownworks',
    shortName: 'Crown',
    description: 'Cast the parapets, dome ribs, and sovereign roofline in engraved solid gold.',
    cost: 3_200,
    prerequisiteIds: ['treasury-depths'],
    rewardDice: 200,
    rewardShards: 50,
  },
  {
    id: 'shark-patrol',
    category: 'security',
    name: 'Shark Patrol',
    shortName: 'Sharks',
    description: 'Deploy a circling three-shark patrol through the crystalline outer lagoon.',
    cost: 700,
    prerequisiteIds: ['limestone-works'],
    rewardDice: 30,
    rewardShards: 0,
  },
  {
    id: 'laser-grid',
    category: 'security',
    name: 'Prismatic Laser Grid',
    shortName: 'Lasers',
    description: 'Install animated jewel pylons and a sweeping perimeter detection lattice.',
    cost: 1_500,
    prerequisiteIds: ['grand-palace'],
    rewardDice: 60,
    rewardShards: 10,
  },
  {
    id: 'guardian-frigate',
    category: 'security',
    name: 'Guardian Frigate',
    shortName: 'Frigate',
    description: 'Commission the gilded royal frigate to hold station beyond the harbour mouth.',
    cost: 2_400,
    prerequisiteIds: ['grand-palace', 'shark-patrol'],
    rewardDice: 100,
    rewardShards: 25,
  },
] as const;

const upgradeById = new Map(VAULT_ISLAND_UPGRADES.map((upgrade) => [upgrade.id, upgrade]));

export function getVaultIslandUpgrade(id: VaultIslandUpgradeId): VaultIslandUpgradeDefinition {
  return upgradeById.get(id) as VaultIslandUpgradeDefinition;
}

export function sanitizeVaultIslandProgress(value: unknown): VaultIslandProgress {
  const record = value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const requestedIds = Array.isArray(record.purchasedUpgradeIds)
    ? new Set(record.purchasedUpgradeIds.filter((id): id is VaultIslandUpgradeId => (
        typeof id === 'string' && VAULT_ISLAND_UPGRADE_IDS.includes(id as VaultIslandUpgradeId)
      )))
    : new Set<VaultIslandUpgradeId>();
  return {
    purchasedUpgradeIds: VAULT_ISLAND_UPGRADE_IDS.filter((id) => requestedIds.has(id)),
  };
}

export function mergeVaultIslandProgress(
  remote: VaultIslandProgress | null | undefined,
  local: VaultIslandProgress | null | undefined,
): VaultIslandProgress {
  return sanitizeVaultIslandProgress({
    purchasedUpgradeIds: [
      ...sanitizeVaultIslandProgress(remote).purchasedUpgradeIds,
      ...sanitizeVaultIslandProgress(local).purchasedUpgradeIds,
    ],
  });
}

export function getVaultIslandTotalInvested(progress: VaultIslandProgress | null | undefined): number {
  return sanitizeVaultIslandProgress(progress).purchasedUpgradeIds.reduce(
    (total, id) => total + getVaultIslandUpgrade(id).cost,
    0,
  );
}

export function hasVaultIslandUpgrade(
  progress: VaultIslandProgress | null | undefined,
  upgradeId: VaultIslandUpgradeId,
): boolean {
  return sanitizeVaultIslandProgress(progress).purchasedUpgradeIds.includes(upgradeId);
}

export function areVaultIslandUpgradePrerequisitesMet(
  progress: VaultIslandProgress | null | undefined,
  upgradeId: VaultIslandUpgradeId,
): boolean {
  const owned = new Set(sanitizeVaultIslandProgress(progress).purchasedUpgradeIds);
  return getVaultIslandUpgrade(upgradeId).prerequisiteIds.every((id) => owned.has(id));
}

export function resolveVaultIslandExteriorFill(progress: VaultIslandProgress | null | undefined): number {
  const owned = new Set(sanitizeVaultIslandProgress(progress).purchasedUpgradeIds);
  if (owned.has('golden-crownworks')) return 100;
  if (owned.has('grand-palace')) return 82;
  if (owned.has('limestone-works')) return 54;
  return 30;
}
