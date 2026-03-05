/** Data model for a single archetype card. */
export interface Archetype {
  id: string;
  name: string;
  icon: string;
  tagline: string;
  description: string;
  perks: string[];
}

export const ARCHETYPES: Archetype[] = [
  {
    id: 'visionary',
    name: 'Visionary',
    icon: '🔭',
    tagline: 'Dream big, plan boldly',
    description:
      'You see possibilities where others see walls. You set ambitious goals and inspire yourself with the long view.',
    perks: ['Goal clarity bonus', 'Unlock future-vision quests', 'Daily big-picture reflections'],
  },
  {
    id: 'builder',
    name: 'Builder',
    icon: '🔨',
    tagline: 'One brick at a time',
    description:
      'Progress lives in the details. You show up every day, stack small wins, and trust the compound effect.',
    perks: ['Streak multiplier bonus', 'System-building quests', 'Daily habit checkpoints'],
  },
  {
    id: 'warrior',
    name: 'Warrior',
    icon: '⚔️',
    tagline: 'Discipline over motivation',
    description:
      'You embrace challenge as fuel. Hard days are your training ground and consistency is your superpower.',
    perks: ['XP bonus on hard days', 'Challenge quests unlocked', 'Battle-ready streaks'],
  },
  {
    id: 'scholar',
    name: 'Scholar',
    icon: '📚',
    tagline: 'Knowledge compounds',
    description:
      'You grow through learning. Every new insight upgrades your approach, and curiosity keeps you moving forward.',
    perks: ['Learning quest access', 'Knowledge XP multiplier', 'Daily insight prompts'],
  },
  {
    id: 'guardian',
    name: 'Guardian',
    icon: '🛡️',
    tagline: 'Protect what matters',
    description:
      'Balance and wellbeing anchor everything you do. You build habits that sustain energy and protect your values.',
    perks: ['Wellbeing quest track', 'Energy management tools', 'Balance streak rewards'],
  },
];
