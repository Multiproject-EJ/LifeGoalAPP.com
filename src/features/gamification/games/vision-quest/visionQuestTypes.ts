/** Life Wheel zones for categorizing reflection prompts */
export type LifeWheelZone = 
  | 'Health'
  | 'Career'
  | 'Relationships'
  | 'Personal Growth'
  | 'Finance'
  | 'Recreation'
  | 'Contribution'
  | 'Environment'
  | 'Spirituality'
  | 'Family';

/** Reflection prompt with associated Life Wheel zone */
export interface ReflectionPrompt {
  id: string;
  prompt: string;
  zone: LifeWheelZone;
}

/** Journal entry structure */
export interface JournalEntry {
  prompt: string;
  response: string;
  zone: LifeWheelZone;
  timestamp: string;
}

/** Vision Quest session state */
export interface VisionQuestSession {
  selectedPrompt: ReflectionPrompt | null;
  reflectionText: string;
  isComplete: boolean;
  rewards: {
    coins: number;
    dice: number;
    tokens: number;
  };
}

/** Persisted Vision Quest state in localStorage */
export interface VisionQuestState {
  journalEntries: JournalEntry[];
  lastReflectionDate: string | null;
  totalReflections: number;
  currentStreak: number;
}

/** Base rewards for completing a reflection */
export const BASE_REWARDS = {
  coins: 40,
  dice: 1,
  tokens: 0,
} as const;

/** Bonus rewards for long reflections (100+ characters) */
export const LONG_REFLECTION_BONUS = {
  coins: 20,
  dice: 0,
  tokens: 0,
} as const;

/** Bonus rewards for first reflection of the day */
export const DAILY_FIRST_BONUS = {
  coins: 0,
  dice: 1,
  tokens: 2,
} as const;

/** Bonus rewards for maintaining a 3+ day streak */
export const STREAK_BONUS = {
  coins: 30,
  dice: 1,
  tokens: 0,
} as const;

/** Minimum character count for submitting a reflection */
export const MIN_REFLECTION_LENGTH = 20;

/** Character count threshold for long reflection bonus */
export const LONG_REFLECTION_THRESHOLD = 100;

/** Number of prompts to show for selection */
export const PROMPTS_PER_SESSION = 3;

/** Minimum days for streak bonus */
export const MIN_STREAK_DAYS = 3;

/** Pool of reflection prompts */
export const REFLECTION_PROMPTS: ReflectionPrompt[] = [
  // Health
  { id: 'h1', prompt: 'What does vibrant health mean to me, and what small step can I take today?', zone: 'Health' },
  { id: 'h2', prompt: 'How do I want to feel in my body one year from now?', zone: 'Health' },
  { id: 'h3', prompt: 'What health habit would make the biggest difference in my daily energy?', zone: 'Health' },
  
  // Career
  { id: 'c1', prompt: 'What professional achievement would make me most proud in the next 6 months?', zone: 'Career' },
  { id: 'c2', prompt: 'What unique value do I bring to my work that others appreciate?', zone: 'Career' },
  { id: 'c3', prompt: 'If I could master one skill this year, what would have the greatest impact?', zone: 'Career' },
  
  // Relationships
  { id: 'r1', prompt: 'What kind of friend/partner do I aspire to be?', zone: 'Relationships' },
  { id: 'r2', prompt: 'Who in my life deserves more of my time and attention?', zone: 'Relationships' },
  { id: 'r3', prompt: 'What relationship pattern am I ready to change or improve?', zone: 'Relationships' },
  
  // Personal Growth
  { id: 'pg1', prompt: 'What limiting belief am I ready to let go of?', zone: 'Personal Growth' },
  { id: 'pg2', prompt: 'What version of myself am I growing into?', zone: 'Personal Growth' },
  { id: 'pg3', prompt: 'What would I do if I knew I could not fail?', zone: 'Personal Growth' },
  
  // Finance
  { id: 'f1', prompt: 'What does financial freedom mean to me personally?', zone: 'Finance' },
  { id: 'f2', prompt: 'What money habit would reduce my stress the most?', zone: 'Finance' },
  { id: 'f3', prompt: 'What am I building toward financially that excites me?', zone: 'Finance' },
  
  // Recreation
  { id: 're1', prompt: 'What activity makes me lose track of time in the best way?', zone: 'Recreation' },
  { id: 're2', prompt: 'How do I want to feel when I have free time?', zone: 'Recreation' },
  { id: 're3', prompt: 'What joy have I been postponing that I could reclaim this week?', zone: 'Recreation' },
  
  // Contribution
  { id: 'co1', prompt: 'How do I want to make a difference in other people\'s lives?', zone: 'Contribution' },
  { id: 'co2', prompt: 'What cause or community matters most to me right now?', zone: 'Contribution' },
  { id: 'co3', prompt: 'What legacy do I want to leave behind?', zone: 'Contribution' },
  
  // Environment
  { id: 'e1', prompt: 'What does my ideal living space look and feel like?', zone: 'Environment' },
  { id: 'e2', prompt: 'What one change to my environment would bring me more peace?', zone: 'Environment' },
  { id: 'e3', prompt: 'How can I create more beauty and order in my surroundings?', zone: 'Environment' },
  
  // Spirituality
  { id: 's1', prompt: 'What brings me a sense of meaning and purpose?', zone: 'Spirituality' },
  { id: 's2', prompt: 'How do I want to connect with something greater than myself?', zone: 'Spirituality' },
  { id: 's3', prompt: 'What practice helps me feel most grounded and centered?', zone: 'Spirituality' },
  
  // Family
  { id: 'fa1', prompt: 'What family tradition or memory do I want to create or continue?', zone: 'Family' },
  { id: 'fa2', prompt: 'How do I want to be remembered by my family?', zone: 'Family' },
  { id: 'fa3', prompt: 'What family relationship could I strengthen with more intention?', zone: 'Family' },
];
