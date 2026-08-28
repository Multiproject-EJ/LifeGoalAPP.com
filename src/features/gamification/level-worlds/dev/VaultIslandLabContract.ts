import type { VaultTreasureId } from './VaultTreasureModels';

export type VaultTreasureDiscoveryMode = 'roll-search' | 'hotspot' | 'riddle' | 'mission' | 'boss-relic';

export interface VaultTreasureDiscoveryRule {
  id: string;
  label: string;
  mode: VaultTreasureDiscoveryMode;
  targetTreasureId: VaultTreasureId;
  islandCadence: string;
  revealChannel: 'sparkle-burst' | 'vault-door' | 'pedestal-rise' | 'museum-placement';
  futureGameplayAuthority: 'canonical-island-run-action-service';
  labOnly: true;
}

export interface VaultTreasurePlacementSocket {
  id: string;
  label: string;
  acceptedTreasureIds: VaultTreasureId[];
  sceneNodeName: string;
  interaction: 'inspect' | 'place' | 'celebrate';
  futureRuntimeRole: 'collection-display' | 'wealth-visualizer' | 'sticker-wall' | 'source-reference';
}

export const VAULT_ISLAND_LAB_ROUTES = {
  exterior: '/dev/vault-island-lab',
  atrium: '/dev/vault-island-lab?view=atrium',
  interior: '/dev/vault-island-lab?view=vault',
  treasureLab: '/dev/vault-treasure-lab',
} as const;

export const VAULT_ISLAND_SOURCE_SHA256 = '5f2841dcf97303c7e8cf8091d0c02a0c22f24904eeea41044df68ab4a583fa57';

export const VAULT_TREASURE_CADENCE = {
  majorTreasureEveryApproxIslands: 4,
  estimatedMajorTreasuresAcross120Islands: 30,
  charmTrack: 'one charm-style collectible can exist per island without replacing major relics',
  specialIslandRole: 'private treasure collection island and luxury reveal room',
} as const;

export const VAULT_ISLAND_MUSEUM_PRESENTATION = {
  selectedRelicMotion: 'socket-to-central-inspection-stage-and-back',
  inspectInteraction: 'click-active-relic-or-inspect-command',
  inspectRotation: 'continuous-turntable-spin',
  valuePresentation: 'compact-expandable-museum-plaque',
  celebration: 'sparkle-burst-with-jeweled-gold-rings-and-warm-light',
  holdingsSource: 'lab-treasure-definition-values-only',
  gameplayWrites: false,
} as const;

export const VAULT_ISLAND_PRODUCTION_PRESENTATION = {
  entrySurface: 'island-run-board-menu',
  presentationSurface: 'viewport-portal',
  collectionMode: 'read-only-authored-preview',
  runtimeAsset: '/assets/islands/special/vault-island/vault-palace.glb',
  gameplayWrites: false,
  canonicalHoldingsIntegration: 'pending-canonical-island-run-action-service',
} as const;

export const VAULT_ISLAND_ACTION_READY_REQUIREMENTS = {
  visualOnlyDevLab: true,
  forbiddenGameplayWriteImports: 'legacy runtime-state patch/coupling APIs',
  canonicalFutureAuthority: 'canonical-island-run-action-service',
  clickableUserDataKeys: ['treasureId', 'vaultInteriorDisplay'],
  requiredRoutes: ['exterior', 'atrium', 'interior', 'treasureLab'],
  requiredTreasureIds: ['crown', 'compass', 'obelisk', 'egg', 'hourglass', 'key', 'medallion', 'chalice'],
  requiredSceneNodeGroups: [
    'vault-treasure-island-lab-model',
    'vault-treasure-island-interior-model',
    'vault-interior-main-treasure-displays',
  ],
  requiredQaHooks: ['window.__vaultIslandLabQa', 'window.__vaultTreasureLabQa'],
} as const;

export const VAULT_TREASURE_PLACEMENT_SOCKETS: VaultTreasurePlacementSocket[] = [
  {
    id: 'vault-pedestal-crown',
    label: 'Crown dais',
    acceptedTreasureIds: ['crown'],
    sceneNodeName: 'vault-interior-display-crown',
    interaction: 'inspect',
    futureRuntimeRole: 'collection-display',
  },
  {
    id: 'vault-pedestal-compass',
    label: 'Astrolabe dais',
    acceptedTreasureIds: ['compass'],
    sceneNodeName: 'vault-interior-display-compass',
    interaction: 'inspect',
    futureRuntimeRole: 'collection-display',
  },
  {
    id: 'vault-pedestal-obelisk',
    label: 'Riddle crystal dais',
    acceptedTreasureIds: ['obelisk'],
    sceneNodeName: 'vault-interior-display-obelisk',
    interaction: 'inspect',
    futureRuntimeRole: 'collection-display',
  },
  {
    id: 'vault-pedestal-egg',
    label: 'Jeweled egg dais',
    acceptedTreasureIds: ['egg'],
    sceneNodeName: 'vault-interior-display-egg',
    interaction: 'inspect',
    futureRuntimeRole: 'collection-display',
  },
  {
    id: 'vault-pedestal-hourglass',
    label: 'Hourglass dais',
    acceptedTreasureIds: ['hourglass'],
    sceneNodeName: 'vault-interior-display-hourglass',
    interaction: 'inspect',
    futureRuntimeRole: 'collection-display',
  },
  {
    id: 'vault-pedestal-key',
    label: 'Vault key dais',
    acceptedTreasureIds: ['key'],
    sceneNodeName: 'vault-interior-display-key',
    interaction: 'inspect',
    futureRuntimeRole: 'collection-display',
  },
  {
    id: 'vault-pedestal-medallion',
    label: 'Sun medallion dais',
    acceptedTreasureIds: ['medallion'],
    sceneNodeName: 'vault-interior-display-medallion',
    interaction: 'inspect',
    futureRuntimeRole: 'collection-display',
  },
  {
    id: 'vault-pedestal-chalice',
    label: 'Prosperity chalice dais',
    acceptedTreasureIds: ['chalice'],
    sceneNodeName: 'vault-interior-display-chalice',
    interaction: 'inspect',
    futureRuntimeRole: 'collection-display',
  },
  {
    id: 'vault-wealth-stack-left',
    label: 'Essence stack',
    acceptedTreasureIds: ['crown', 'compass', 'obelisk', 'egg'],
    sceneNodeName: 'vault-interior-essence-ingot-stack',
    interaction: 'celebrate',
    futureRuntimeRole: 'wealth-visualizer',
  },
  {
    id: 'vault-sticker-relic-wall',
    label: 'Charm wall',
    acceptedTreasureIds: ['crown', 'compass', 'obelisk', 'egg'],
    sceneNodeName: 'vault-interior-sticker-relic-wall',
    interaction: 'place',
    futureRuntimeRole: 'sticker-wall',
  },
];

export const VAULT_TREASURE_DISCOVERY_RULES: VaultTreasureDiscoveryRule[] = [
  {
    id: 'vault-roll-search-crown',
    label: 'Roll-search hidden vault key',
    mode: 'roll-search',
    targetTreasureId: 'crown',
    islandCadence: 'major treasure slot, roughly every fourth island',
    revealChannel: 'vault-door',
    futureGameplayAuthority: 'canonical-island-run-action-service',
    labOnly: true,
  },
  {
    id: 'vault-hotspot-compass',
    label: 'Tap a special island hotspot',
    mode: 'hotspot',
    targetTreasureId: 'compass',
    islandCadence: 'exploration treasure or route-secret reward',
    revealChannel: 'sparkle-burst',
    futureGameplayAuthority: 'canonical-island-run-action-service',
    labOnly: true,
  },
  {
    id: 'vault-riddle-obelisk',
    label: 'Solve a vault riddle',
    mode: 'riddle',
    targetTreasureId: 'obelisk',
    islandCadence: 'wisdom or mystery-linked relic',
    revealChannel: 'pedestal-rise',
    futureGameplayAuthority: 'canonical-island-run-action-service',
    labOnly: true,
  },
  {
    id: 'vault-mission-egg',
    label: 'Complete a special mission',
    mode: 'mission',
    targetTreasureId: 'egg',
    islandCadence: 'mission reward or rare hatchery vault reward',
    revealChannel: 'museum-placement',
    futureGameplayAuthority: 'canonical-island-run-action-service',
    labOnly: true,
  },
  {
    id: 'vault-boss-hourglass',
    label: 'Defeat a treasury guardian',
    mode: 'boss-relic',
    targetTreasureId: 'hourglass',
    islandCadence: 'boss relic or seasonal kingdom reward',
    revealChannel: 'pedestal-rise',
    futureGameplayAuthority: 'canonical-island-run-action-service',
    labOnly: true,
  },
  {
    id: 'vault-key-hotspot',
    label: 'Find the palace descent key',
    mode: 'hotspot',
    targetTreasureId: 'key',
    islandCadence: 'special-island palace secret',
    revealChannel: 'vault-door',
    futureGameplayAuthority: 'canonical-island-run-action-service',
    labOnly: true,
  },
  {
    id: 'vault-medallion-riddle',
    label: 'Align the garden sun symbols',
    mode: 'riddle',
    targetTreasureId: 'medallion',
    islandCadence: 'garden or wisdom-linked relic',
    revealChannel: 'sparkle-burst',
    futureGameplayAuthority: 'canonical-island-run-action-service',
    labOnly: true,
  },
  {
    id: 'vault-chalice-mission',
    label: 'Complete the prosperity mission',
    mode: 'mission',
    targetTreasureId: 'chalice',
    islandCadence: 'major treasure mission reward',
    revealChannel: 'museum-placement',
    futureGameplayAuthority: 'canonical-island-run-action-service',
    labOnly: true,
  },
];
