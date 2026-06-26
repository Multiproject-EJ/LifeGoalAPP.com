import type { IslandInhabitantDefinition } from '../islandInhabitantTypes';

export const island001InhabitantDefinitions = [
  {
    version: 1,
    id: 'luma-caretaker',
    islandNumber: 1,
    displayName: 'Caretaker',
    roleLabel: 'Keeper of the Gentle Paths',
    civilizationName: 'The Lumin',
    archetype: 'servant_wizard',
    biome: 'woodland',
    premiumArtSrc: '/assets/islands/island-001/inhabitants/luma-caretaker-full.webp',
    retroSpriteSrc: '/assets/islands/island-001/inhabitants/luma-caretaker-retro.png',
    defaultTopicIds: ['i001-topic-next-step', 'i001-topic-luma-isle', 'i001-topic-caretaker'],
  },
] satisfies IslandInhabitantDefinition[];
