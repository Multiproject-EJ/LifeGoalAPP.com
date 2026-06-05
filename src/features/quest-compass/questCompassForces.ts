export type QuestCompassForceKey =
  | 'fire'
  | 'strength'
  | 'connection'
  | 'wealth'
  | 'growth'
  | 'direction';

export type QuestCompassForce = {
  key: QuestCompassForceKey;
  name: string;
  icon: string;
  summary: string;
  prompt: string;
};

export const QUEST_COMPASS_FORCES: QuestCompassForce[] = [
  {
    key: 'fire',
    name: 'Fire',
    icon: '🔥',
    summary: 'Passion, energy, joy, creativity, and drive.',
    prompt: 'What would make this week feel more alive?',
  },
  {
    key: 'strength',
    name: 'Strength',
    icon: '💪',
    summary: 'Health, resilience, capacity, and stable foundations.',
    prompt: 'What small ritual would protect your energy today?',
  },
  {
    key: 'connection',
    name: 'Connection',
    icon: '🤝',
    summary: 'Love, friends, family, community, and belonging.',
    prompt: 'Who or what relationship needs one caring step?',
  },
  {
    key: 'wealth',
    name: 'Wealth',
    icon: '💎',
    summary: 'Money, resources, freedom, and practical support.',
    prompt: 'What resource would make your next quest easier?',
  },
  {
    key: 'growth',
    name: 'Growth',
    icon: '🌱',
    summary: 'Learning, wisdom, skills, and personal evolution.',
    prompt: 'What lesson is your current chapter teaching you?',
  },
  {
    key: 'direction',
    name: 'Direction',
    icon: '🧭',
    summary: 'Purpose, vision, meaning, and the path ahead.',
    prompt: 'What is the clearest next step toward your bigger vision?',
  },
];
