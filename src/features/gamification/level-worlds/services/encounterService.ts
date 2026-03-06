/**
 * Island Run — Encounter Tile Service (M6-COMPLETE)
 *
 * Provides challenge pool selection and reward rolling for encounter tile events.
 * Encounter challenges are intentionally easy (near-guaranteed completion) to feel
 * rewarding and low-friction.
 */

// ─── Challenge types ──────────────────────────────────────────────────────────

export interface EncounterQuizChallenge {
  type: 'quiz';
  question: string;
  answers: string[];
  // All answers are accepted — easy difficulty means any selection completes the challenge
}

export interface EncounterBreathingChallenge {
  type: 'breathing';
  instruction: string;
  durationSeconds: number;
}

export interface EncounterGratitudeChallenge {
  type: 'gratitude';
  prompt: string;
}

export type EncounterChallenge =
  | EncounterQuizChallenge
  | EncounterBreathingChallenge
  | EncounterGratitudeChallenge;

// ─── Challenge pools ──────────────────────────────────────────────────────────

const QUIZ_POOL: Omit<EncounterQuizChallenge, 'type'>[] = [
  {
    question: 'Daily habits compound into big results over time.',
    answers: ['True — small steps add up!', 'False — only big actions matter'],
  },
  {
    question: 'Which activity is most linked to long-term wellbeing?',
    answers: ['Meaningful connections', 'Buying more things', 'Avoiding all challenges'],
  },
  {
    question: 'Sleep affects your ability to build new habits.',
    answers: ['Definitely true', 'Probably not', 'Only a little'],
  },
  {
    question: 'The best time to start a healthy habit is:',
    answers: ['Right now', 'When I feel perfectly ready', 'After a major life reset'],
  },
  {
    question: 'Focusing on what you can control helps reduce stress.',
    answers: ['True', 'False — stress is always external', 'It depends on the day'],
  },
  {
    question: 'Which mindset leads to the most growth?',
    answers: ['I can always learn and improve', 'Some people just have talent', 'Trying is risky'],
  },
  {
    question: 'A short walk can improve your mood and focus.',
    answers: ['True', 'Only if it\'s a long walk', 'Exercise has no mental benefits'],
  },
];

const BREATHING_POOL: Omit<EncounterBreathingChallenge, 'type'>[] = [
  {
    instruction: 'Take 3 slow, deep breaths. Inhale for 3 counts, exhale for 3.',
    durationSeconds: 9,
  },
  {
    instruction: 'Box breathing: inhale 4 counts, hold 4, exhale 4. Twice.',
    durationSeconds: 10,
  },
  {
    instruction: 'Breathe in deeply through your nose… and slowly out through your mouth. Three times.',
    durationSeconds: 9,
  },
];

const GRATITUDE_PROMPTS: string[] = [
  "Name one thing you're grateful for right now.",
  "What's one small win from your day so far?",
  'Who is someone that has helped you recently?',
  "What's one thing about your health you appreciate today?",
  "Name one habit you're proud of building.",
  "What's one moment from this week that made you smile?",
  "Name one strength you have that helps you reach your goals.",
];

// ─── Challenge selection ──────────────────────────────────────────────────────

// Time bucket duration for challenge rotation (5 minutes = same challenge within a 5-min window)
const CHALLENGE_ROTATION_BUCKET_MS = 5 * 60 * 1000;

/**
 * Draws an encounter challenge for the given island and tile position.
 * Uses a combination of island number, tile index, and current minute for
 * varied but not-too-frequent rotation (same challenge won't be drawn on
 * the exact same tile twice in quick succession).
 */
export function drawEncounterChallenge(islandNumber: number, tileIndex: number): EncounterChallenge {
  // Seeded off island + tile + current 5-minute bucket so revisiting gives a fresh challenge
  const timeBucket = Math.floor(Date.now() / CHALLENGE_ROTATION_BUCKET_MS);
  const seed = Math.abs((islandNumber * 31 + tileIndex * 7 + timeBucket) % 1000);

  // Distribute among 3 challenge types: 0→quiz, 1→breathing, 2→gratitude
  const typeIndex = seed % 3;

  if (typeIndex === 0) {
    const entry = QUIZ_POOL[seed % QUIZ_POOL.length];
    return { type: 'quiz', ...entry };
  } else if (typeIndex === 1) {
    const entry = BREATHING_POOL[seed % BREATHING_POOL.length];
    return { type: 'breathing', ...entry };
  } else {
    const prompt = GRATITUDE_PROMPTS[seed % GRATITUDE_PROMPTS.length];
    return { type: 'gratitude', prompt };
  }
}

// ─── Reward rolling ───────────────────────────────────────────────────────────

export interface EncounterReward {
  coins: number;
  heart: boolean;
  walletShards: boolean;
}

/**
 * Rolls encounter completion rewards.
 * - Coins: 5–15 (always)
 * - Heart: 15% chance of +1
 * - Wallet shards: 25% chance of +1
 */
export function rollEncounterReward(): EncounterReward {
  const coins = Math.floor(Math.random() * 11) + 5; // 5–15
  const heart = Math.random() < 0.15;
  const walletShards = Math.random() < 0.25;
  return { coins, heart, walletShards };
}

/**
 * Formats a human-readable reward summary string.
 */
export function formatEncounterRewardSummary(reward: EncounterReward): string {
  const parts: string[] = [`+${reward.coins} coins`];
  if (reward.heart) parts.push('+1 ❤️');
  if (reward.walletShards) parts.push('+1 shard');
  return parts.join(' · ');
}
