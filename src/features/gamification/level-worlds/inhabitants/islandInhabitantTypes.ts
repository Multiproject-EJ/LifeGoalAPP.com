export type IslandInhabitantArchetype = 'servant_wizard';

export type IslandInhabitantBiome = 'woodland' | 'celestial' | 'fire' | 'underwater' | 'desert' | 'unknown';

export interface IslandInhabitantDefinition {
  version: 1;
  id: string;
  islandNumber: number;
  displayName: string;
  roleLabel: string;
  civilizationName: string;
  archetype: IslandInhabitantArchetype;
  biome: IslandInhabitantBiome;
  emblemId?: string;
  premiumArtSrc?: string;
  retroSpriteSrc?: string;
  defaultTopicIds: string[];
}
