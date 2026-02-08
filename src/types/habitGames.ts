/** Game identifiers */
export type HabitGameId = 'lucky_roll' | 'task_tower' | 'pomodoro_sprint' | 'vision_quest' | 'wheel_of_wins';

/** Mini-game token types */
export type GameTokenType = 'tower' | 'focus' | 'vision' | 'spin';

/** Maps game ID to its token type */
export const GAME_TOKEN_MAP: Record<Exclude<HabitGameId, 'lucky_roll'>, GameTokenType> = {
  task_tower: 'tower',
  pomodoro_sprint: 'focus',
  vision_quest: 'vision',
  wheel_of_wins: 'spin',
};

/** Game metadata for UI rendering */
export const HABIT_GAME_META: Record<HabitGameId, {
  label: string;
  emoji: string;
  emotion: string;
  description: string;
  colorAccent: string;
}> = {
  lucky_roll: {
    label: 'Lucky Roll',
    emoji: '🎲',
    emotion: 'Anticipation',
    description: 'Roll the dice and move through your life map.',
    colorAccent: '#d4a574',
  },
  task_tower: {
    label: 'Task Tower',
    emoji: '🗼',
    emotion: 'Relief',
    description: 'Clear your mental clutter by completing tasks.',
    colorAccent: '#27ae60',
  },
  pomodoro_sprint: {
    label: 'Pomodoro Sprint',
    emoji: '🍅',
    emotion: 'Pride',
    description: 'Enter deep focus mode and earn the best rewards.',
    colorAccent: '#6c5ce7',
  },
  vision_quest: {
    label: 'Vision Quest',
    emoji: '🔮',
    emotion: 'Hope',
    description: 'Reflect on who you want to become.',
    colorAccent: '#a78bfa',
  },
  wheel_of_wins: {
    label: 'Wheel of Wins',
    emoji: '🎡',
    emotion: 'Excitement',
    description: 'Spin for a surprise reward.',
    colorAccent: '#e879f9',
  },
};

/** Reward priority hierarchy (constitutional — do not change order) */
export const REWARD_HIERARCHY: HabitGameId[] = [
  'vision_quest',      // 1. Meaning (most valuable)
  'pomodoro_sprint',   // 2. Pride
  'task_tower',        // 3. Relief
  'lucky_roll',        // 4. Anticipation
  'wheel_of_wins',     // 5. Excitement (least valuable per unit)
];
