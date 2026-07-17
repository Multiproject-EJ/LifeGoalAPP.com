export type SuperHabitId =
  | 'journal'
  | 'eat_well'
  | 'move_body'
  | 'sleep_ritual'
  | 'focus_forge'
  | 'calm_reset'
  | 'plan_tomorrow'
  | 'relationship_ritual';

export type SuperHabitTier = 'free' | 'pro';
export type SuperHabitStage = 'live' | 'demo';

export type SuperHabitDefinition = {
  id: SuperHabitId;
  name: string;
  archetype: string;
  emoji: string;
  description: string;
  promise: string;
  tools: readonly string[];
  tier: SuperHabitTier;
  stage: SuperHabitStage;
  matchTerms: readonly string[];
  accent: string;
};

export const SUPER_HABITS: readonly SuperHabitDefinition[] = [
  {
    id: 'journal',
    name: 'Journaling',
    archetype: 'The Witness',
    emoji: '✍️',
    description: 'Turn reflection into a completed habit with guided writing modes.',
    promise: 'Notice the loop, name what matters, and leave with one useful next experiment.',
    tools: ['Daily reflection', 'Quick pulse', 'Habit-loop investigation', 'Dream journal'],
    tier: 'free',
    stage: 'live',
    matchTerms: ['journal', 'journaling', 'diary', 'reflect', 'reflection', 'gratitude', 'write about my day'],
    accent: '#7c3aed',
  },
  {
    id: 'eat_well',
    name: 'Eat Well',
    archetype: 'The Provisioner',
    emoji: '🍽️',
    description: 'Choose meals that fit your taste, time, energy, and goals.',
    promise: 'Build a personal Meal Deck so a delicious next choice is always easy to find.',
    tools: ['My Meal Plan', 'Meal alternatives', 'Recipe library', 'Preference quests'],
    tier: 'pro',
    stage: 'demo',
    matchTerms: ['eat healthy', 'eat well', 'healthy food', 'healthy meal', 'meal plan', 'breakfast', 'lunch', 'dinner', 'nutrition'],
    accent: '#ea580c',
  },
  {
    id: 'move_body',
    name: 'Move & Train',
    archetype: 'The Vanguard',
    emoji: '🏃',
    description: 'Launch the right-sized movement session for the day you actually have.',
    promise: 'Choose a minimum, standard, or stretch session and finish inside the tool.',
    tools: ['Adaptive workout', 'Movement timer', 'Recovery check', 'Progress path'],
    tier: 'pro',
    stage: 'demo',
    matchTerms: ['exercise', 'workout', 'train', 'training', 'run', 'running', 'walk', 'walking', 'gym', 'movement'],
    accent: '#dc2626',
  },
  {
    id: 'sleep_ritual',
    name: 'Sleep Ritual',
    archetype: 'The Dreamkeeper',
    emoji: '🌙',
    description: 'Wind down through a short ritual instead of relying on willpower at bedtime.',
    promise: 'Prepare the room, close the day, and make tomorrow easier to begin.',
    tools: ['Wind-down path', 'Environment reset', 'Sleep note', 'Morning handoff'],
    tier: 'pro',
    stage: 'demo',
    matchTerms: ['sleep', 'bedtime', 'wind down', 'go to bed', 'evening routine'],
    accent: '#2563eb',
  },
  {
    id: 'focus_forge',
    name: 'Focus Forge',
    archetype: 'The Maker',
    emoji: '⚒️',
    description: 'Shape a vague work habit into one protected, finishable focus session.',
    promise: 'Clear the runway, choose the next visible action, and work with a timer.',
    tools: ['Focus timer', 'Distraction vault', 'Next-action picker', 'Session review'],
    tier: 'pro',
    stage: 'demo',
    matchTerms: ['focus', 'deep work', 'study', 'studying', 'write', 'writing', 'practice', 'work session'],
    accent: '#ca8a04',
  },
  {
    id: 'calm_reset',
    name: 'Calm Reset',
    archetype: 'The Stillpoint',
    emoji: '🌿',
    description: 'Use a guided reset when stress is too loud for a checkbox to help.',
    promise: 'Regulate first, understand the signal, then choose the smallest helpful action.',
    tools: ['Breathing guide', 'Body scan', 'Grounding reset', 'Trigger note'],
    tier: 'pro',
    stage: 'demo',
    matchTerms: ['breathe', 'breathing', 'meditate', 'meditation', 'calm', 'mindfulness', 'stress reset'],
    accent: '#059669',
  },
  {
    id: 'plan_tomorrow',
    name: 'Plan Tomorrow',
    archetype: 'The Navigator',
    emoji: '🧭',
    description: 'Close open loops and prepare a believable first move for tomorrow.',
    promise: 'Leave the day with direction instead of carrying every decision into bed.',
    tools: ['Tomorrow map', 'Top-three chooser', 'Calendar check', 'First-step setup'],
    tier: 'pro',
    stage: 'demo',
    matchTerms: ['plan tomorrow', 'daily plan', 'plan my day', 'prepare tomorrow', 'evening planning'],
    accent: '#0891b2',
  },
  {
    id: 'relationship_ritual',
    name: 'Relationship Ritual',
    archetype: 'The Ally',
    emoji: '💌',
    description: 'Make care concrete with a thoughtful prompt, message, or shared ritual.',
    promise: 'Turn “stay in touch” into a small act that genuinely reaches another person.',
    tools: ['Connection prompt', 'Letter builder', 'Shared ritual', 'Follow-up reminder'],
    tier: 'pro',
    stage: 'demo',
    matchTerms: ['call family', 'call a friend', 'stay in touch', 'relationship', 'send a message', 'write a letter'],
    accent: '#db2777',
  },
] as const;

function normalize(value: string): string {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function getSuperHabit(id: SuperHabitId): SuperHabitDefinition {
  return SUPER_HABITS.find((habit) => habit.id === id) ?? SUPER_HABITS[0];
}

export function resolveSuperHabitForTitle(title: string): SuperHabitDefinition | null {
  const normalizedTitle = normalize(title);
  if (!normalizedTitle) return null;

  return SUPER_HABITS.find((superHabit) => (
    superHabit.matchTerms.some((term) => {
      const normalizedTerm = normalize(term);
      return normalizedTitle === normalizedTerm || normalizedTitle.includes(normalizedTerm);
    })
  )) ?? null;
}

export function canLaunchSuperHabit(superHabit: SuperHabitDefinition): boolean {
  return superHabit.stage === 'live' && superHabit.tier === 'free';
}
