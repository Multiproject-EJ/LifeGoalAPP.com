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
    premiumArtSrc: '/assets/island_caretakers/001/IMG_caretaker_3d_blue.webp',
    retroSpriteSrc: '/assets/island_caretakers/001/IMG_retro_green.webp',
    defaultTopicIds: ['i001-topic-next-step', 'i001-topic-luma-isle', 'i001-topic-caretaker'],
  },
] satisfies IslandInhabitantDefinition[];
