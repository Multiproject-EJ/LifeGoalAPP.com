import type { RewardItem } from '../types/gamification';

export function getEvolutionSuggestion(reward: RewardItem): {
  title: string;
  description: string;
} {
  const { title, description, category, evolutionState } = reward;

  // State 0 → State 1 (Intentional)
  if (evolutionState === 0) {
    switch (category) {
      case 'Rest':
        return {
          title: `${title} + 1 gratitude`,
          description: description || 'Take a moment of gratitude before or after.',
        };
      case 'Fun':
        return {
          title: `Intentional ${title}`,
          description: description || 'Pick one intention before starting.',
        };
      case 'Social':
        return {
          title: `${title} + share 1 check-in`,
          description: description || "Share how you're feeling with someone.",
        };
      case 'Growth':
        return {
          title: `${title} + 1 note`,
          description: description || 'Capture one key insight or learning.',
        };
      case 'Treat':
      case 'Meta':
      default:
        return {
          title: `${title} + 1 reflection`,
          description: description || 'Pause and reflect on what made this good.',
        };
    }
  }

  // State 1 → State 2 (Elevated) - for future phases
  if (evolutionState === 1) {
    return {
      title: `${title} + structure`,
      description: 'Add light structure or pairing.',
    };
  }

  // No evolution available
  return { title, description: description || '' };
}

export function getEvolutionStateLabel(state: 0 | 1 | 2 | 3): string {
  const labels = {
    0: 'Seed',
    1: 'Intentional',
    2: 'Elevated',
    3: 'Transformative',
  };
  return labels[state];
}
