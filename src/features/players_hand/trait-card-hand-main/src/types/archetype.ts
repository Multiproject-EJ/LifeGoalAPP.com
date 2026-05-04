export interface Archetype {
  id: string;
  name: string;
  description: string;
  icon: string;
  dominantTraits: string[];
  color: string;
}

export interface ArchetypeEvolution {
  timestamp: number;
  archetypeId: string;
  archetypeName: string;
  reason: string;
  traitsGained: string[];
  traitsLost: string[];
  traitsAmplified: string[];
  traitsMuted: string[];
}

export const ARCHETYPES: Archetype[] = [
  {
    id: 'visionary',
    name: 'The Visionary',
    description: 'You see possibilities where others see obstacles. Your creative mind and openness to new experiences make you an innovator and thought leader.',
    icon: 'Lightbulb',
    dominantTraits: ['creativity-1', 'openness-1', 'focus-1'],
    color: 'oklch(0.75 0.18 85)',
  },
  {
    id: 'warrior',
    name: 'The Warrior',
    description: 'Resilient and determined, you face challenges head-on with unwavering focus. Your iron will makes you unstoppable in pursuit of your goals.',
    icon: 'Sword',
    dominantTraits: ['determination-1', 'focus-1', 'adaptability-1'],
    color: 'oklch(0.65 0.20 25)',
  },
  {
    id: 'empath',
    name: 'The Empath',
    description: 'Your profound understanding of others creates deep, meaningful connections. You navigate social landscapes with grace and emotional intelligence.',
    icon: 'Heart',
    dominantTraits: ['empathy-1', 'empathy-2', 'openness-1'],
    color: 'oklch(0.70 0.18 340)',
  },
  {
    id: 'sage',
    name: 'The Sage',
    description: 'Focused and thoughtful, you approach life with laser precision and deep understanding. Your wisdom comes from careful observation and reflection.',
    icon: 'Book',
    dominantTraits: ['focus-1', 'openness-1', 'neuroticism-1'],
    color: 'oklch(0.65 0.15 240)',
  },
  {
    id: 'shapeshifter',
    name: 'The Shapeshifter',
    description: 'Like water, you flow through life\'s changes with remarkable adaptability. Your versatility and openness make you thrive in any environment.',
    icon: 'Waves',
    dominantTraits: ['adaptability-1', 'openness-1', 'creativity-1'],
    color: 'oklch(0.65 0.20 200)',
  },
  {
    id: 'guardian',
    name: 'The Guardian',
    description: 'Your sensitivity and awareness keep you and others safe. You notice what others miss and prepare for challenges before they arrive.',
    icon: 'Shield',
    dominantTraits: ['neuroticism-1', 'empathy-2', 'determination-1'],
    color: 'oklch(0.60 0.15 140)',
  },
  {
    id: 'harmonizer',
    name: 'The Harmonizer',
    description: 'You bring balance to chaos with your empathy and adaptability. Your ability to understand and adjust creates harmony wherever you go.',
    icon: 'CirclesThree',
    dominantTraits: ['empathy-1', 'adaptability-1', 'empathy-2'],
    color: 'oklch(0.75 0.15 160)',
  },
  {
    id: 'explorer',
    name: 'The Explorer',
    description: 'Driven by curiosity and creative spark, you venture into the unknown with enthusiasm. Your openness to experience fuels constant growth.',
    icon: 'Compass',
    dominantTraits: ['openness-1', 'creativity-1', 'adaptability-1'],
    color: 'oklch(0.70 0.20 60)',
  },
];
