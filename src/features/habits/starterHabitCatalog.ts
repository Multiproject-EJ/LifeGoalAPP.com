import type { LifeWheelCategoryKey } from '../checkins/LifeWheelCheckins';

export type StarterHabit = {
  title: string;
  description: string;
  emoji?: string;
};

export const DEFAULT_STARTER_DOMAIN_KEY: LifeWheelCategoryKey = 'health_fitness';

export const STARTER_HABIT_CATALOG: Record<LifeWheelCategoryKey, StarterHabit[]> = {
  health_fitness: [
    {
      emoji: '🌞',
      title: 'Walk in the sunshine before breakfast',
      description: 'Step outside early and walk for a few minutes before food or screens.',
    },
    {
      emoji: '💧',
      title: 'Drink water before coffee',
      description: 'Have a glass of water before your first coffee or tea.',
    },
    {
      emoji: '🍬',
      title: 'Remove excess candy/snacks from the home',
      description: 'Keep tempting snacks out of sight or out of the house. Buy small treats when truly wanted.',
    },
  ],
  spirituality_community: [
    {
      emoji: '🌙',
      title: 'Night journal check-in',
      description: 'Write one answer: what gave me energy today, and what drained me?',
    },
    {
      emoji: '🫁',
      title: 'One 3-minute breathing reset',
      description: 'Pause once today and breathe slowly for three minutes.',
    },
    {
      emoji: '📰',
      title: 'Limit mainstream news',
      description: 'Avoid random news scrolling. Choose one intentional news window if needed.',
    },
  ],
  living_spaces: [
    {
      emoji: '🎧',
      title: 'Podcast clean-up',
      description: 'Put on a podcast or music and reset one small area of your living space.',
    },
    {
      emoji: '🧹',
      title: 'Clear one visible surface',
      description: 'Clear one desk, table, counter, or floor area before bed.',
    },
    {
      emoji: '🎒',
      title: "Prepare tomorrow's first item",
      description: 'Place the first thing you need tomorrow where it is easy to start.',
    },
  ],
  career_development: [
    {
      emoji: '🎯',
      title: 'Choose one must-win task',
      description: 'Before distractions, pick the one task that would make today meaningful.',
    },
    {
      emoji: '✍️',
      title: '10-minute ugly first draft',
      description: 'Work badly on purpose for 10 minutes to break the freeze.',
    },
    {
      emoji: '➡️',
      title: "Write tomorrow's first move",
      description: 'Before ending work, write the first tiny action for tomorrow.',
    },
  ],
  finance_wealth: [
    {
      emoji: '🪨',
      title: 'Clear one admin pebble',
      description: 'Do one small admin task. If there is genuinely none today, mark it complete.',
    },
    {
      emoji: '🔁',
      title: 'Check one recurring cost',
      description: 'Review one subscription, bill, or recurring payment.',
    },
    {
      emoji: '🌱',
      title: 'Move a tiny amount toward future-you',
      description: 'Save, invest, or set aside even a small amount on a chosen schedule.',
    },
  ],
  love_relations: [
    {
      emoji: '💌',
      title: 'Send one warm message',
      description: 'Send a kind message to someone with no agenda.',
    },
    {
      emoji: '💬',
      title: 'Give one specific appreciation',
      description: 'Tell someone one specific thing you appreciate about them.',
    },
    {
      emoji: '🕊️',
      title: 'Pause before reacting',
      description: 'In one tense moment, take one breath before responding.',
    },
  ],
  family_friends: [
    {
      emoji: '📞',
      title: 'Reach out to one person',
      description: 'Send a short message or voice note to a family member or friend.',
    },
    {
      emoji: '🙏',
      title: 'Share one appreciation',
      description: 'Tell someone one thing you genuinely appreciate about them.',
    },
    {
      emoji: '📅',
      title: 'Plan one small connection moment',
      description: 'Suggest a walk, call, meal, or simple catch-up.',
    },
  ],
  fun_creativity: [
    {
      emoji: '✨',
      title: 'Do one tiny alive thing',
      description: 'Do one small thing purely because it makes life feel more alive.',
    },
    {
      emoji: '👀',
      title: 'Notice one beautiful thing',
      description: 'Pause once today and notice something beautiful, funny, or strange.',
    },
    {
      emoji: '🎨',
      title: 'Make or play for 10 minutes',
      description: 'Spend 10 minutes making, playing, sketching, dancing, writing, or exploring.',
    },
  ],
};
