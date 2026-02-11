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

  // State 1 → State 2 (Elevated) — Add structure
  if (evolutionState === 1) {
    switch (category) {
      case 'Rest':
        return {
          title: `${title} + 5-min walk`,
          description: 'Pair your rest with a short walk to boost energy.',
        };
      case 'Fun':
        return {
          title: `${title} (15-min timebox)`,
          description: 'Set a timer to stay present and intentional.',
        };
      case 'Social':
        return {
          title: `${title} + 1 shared win`,
          description: 'Share one recent win or positive moment.',
        };
      case 'Growth':
        return {
          title: `${title} + 1 action`,
          description: 'Turn your insight into one small action step.',
        };
      case 'Treat':
        return {
          title: `${title} + savor ritual`,
          description: 'Take 30 seconds to fully appreciate this treat.',
        };
      case 'Meta':
        return {
          title: `${title} + review 1 goal`,
          description: 'Pair this reward with a quick goal check-in.',
        };
      default:
        return {
          title: `${title} + structure`,
          description: 'Add light structure or pairing.',
        };
    }
  }

  // State 2 → State 3 (Transformative) — Reframe as growth-aligned
  if (evolutionState === 2) {
    switch (category) {
      case 'Rest':
        return {
          title: `${title} + share 1 check-in`,
          description: 'Turn your rest into a moment of connection — share how you\'re feeling.',
        };
      case 'Fun':
        return {
          title: `Creative ${title}`,
          description: 'Channel your fun into a creative spark — draft 1 idea or sketch.',
        };
      case 'Social':
        return {
          title: `${title} + plan 1 shared goal`,
          description: 'Transform your social time into shared growth — plan something together.',
        };
      case 'Growth':
        return {
          title: `${title} + teach 1 thing`,
          description: 'Deepen your learning by sharing it — teach or write about 1 insight.',
        };
      case 'Treat':
        return {
          title: `${title} + mindful moment`,
          description: 'Turn your treat into a mindfulness practice — fully savor every second.',
        };
      case 'Meta':
        return {
          title: `${title} + 1 identity reflection`,
          description: 'Connect this to who you\'re becoming — write 1 sentence about your growth.',
        };
      default:
        return {
          title: `${title} + growth practice`,
          description: 'Transform this into a growth-aligned ritual.',
        };
    }
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
