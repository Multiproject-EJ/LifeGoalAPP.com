/**
 * Island Run — Encounter Tile Service (M6B)
 *
 * Provides challenge pool selection and reward rolling for encounter tile events.
 * Encounter challenges are intentionally easy (near-guaranteed completion) to feel
 * rewarding and low-friction, while still varying by island context.
 */

import { getIslandRarity, type IslandRarity } from './islandBoardTileMap';

// ─── Challenge types ──────────────────────────────────────────────────────────

interface EncounterChallengeBase {
  id: string;
  title: string;
  completionLabel: string;
}

export interface EncounterQuizChallenge extends EncounterChallengeBase {
  type: 'quiz';
  question: string;
  answers: string[];
  // All answers are accepted — easy difficulty means any selection completes the challenge
}

export interface EncounterBreathingChallenge extends EncounterChallengeBase {
  type: 'breathing';
  instruction: string;
  durationSeconds: number;
}

export interface EncounterGratitudeChallenge extends EncounterChallengeBase {
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
    id: 'compound-results',
    title: 'Quick Quiz',
    completionLabel: 'Choose your answer',
    question: 'Daily habits compound into big results over time.',
    answers: ['True — small steps add up!', 'False — only big actions matter'],
  },
  {
    id: 'wellbeing-connections',
    title: 'Quick Quiz',
    completionLabel: 'Choose your answer',
    question: 'Which activity is most linked to long-term wellbeing?',
    answers: ['Meaningful connections', 'Buying more things', 'Avoiding all challenges'],
  },
  {
    id: 'sleep-habits',
    title: 'Quick Quiz',
    completionLabel: 'Choose your answer',
    question: 'Sleep affects your ability to build new habits.',
    answers: ['Definitely true', 'Probably not', 'Only a little'],
  },
  {
    id: 'best-time-start',
    title: 'Quick Quiz',
    completionLabel: 'Choose your answer',
    question: 'The best time to start a healthy habit is:',
    answers: ['Right now', 'When I feel perfectly ready', 'After a major life reset'],
  },
  {
    id: 'control-stress',
    title: 'Quick Quiz',
    completionLabel: 'Choose your answer',
    question: 'Focusing on what you can control helps reduce stress.',
    answers: ['True', 'False — stress is always external', 'It depends on the day'],
  },
  {
    id: 'growth-mindset',
    title: 'Quick Quiz',
    completionLabel: 'Choose your answer',
    question: 'Which mindset leads to the most growth?',
    answers: ['I can always learn and improve', 'Some people just have talent', 'Trying is risky'],
  },
  {
    id: 'walk-mood',
    title: 'Quick Quiz',
    completionLabel: 'Choose your answer',
    question: 'A short walk can improve your mood and focus.',
    answers: ['True', 'Only if it\'s a long walk', 'Exercise has no mental benefits'],
  },
];

const BREATHING_POOL: Omit<EncounterBreathingChallenge, 'type'>[] = [
  {
    id: 'three-breaths',
    title: 'Breathing Exercise',
    completionLabel: 'Breathe with the orb',
    instruction: 'Take 3 slow, deep breaths. Inhale for 3 counts, exhale for 3.',
    durationSeconds: 9,
  },
  {
    id: 'box-breathing',
    title: 'Breathing Exercise',
    completionLabel: 'Breathe with the orb',
    instruction: 'Box breathing: inhale 4 counts, hold 4, exhale 4. Twice.',
    durationSeconds: 10,
  },
  {
    id: 'deep-reset',
    title: 'Breathing Exercise',
    completionLabel: 'Breathe with the orb',
    instruction: 'Breathe in deeply through your nose… and slowly out through your mouth. Three times.',
    durationSeconds: 9,
  },
];

const GRATITUDE_PROMPTS: Omit<EncounterGratitudeChallenge, 'type'>[] = [
  {
    id: 'gratitude-now',
    title: 'Gratitude Moment',
    completionLabel: 'Write one sentence',
    prompt: "Name one thing you're grateful for right now.",
  },
  {
    id: 'small-win',
    title: 'Gratitude Moment',
    completionLabel: 'Write one sentence',
    prompt: "What's one small win from your day so far?",
  },
  {
    id: 'helped-you',
    title: 'Gratitude Moment',
    completionLabel: 'Write one sentence',
    prompt: 'Who is someone that has helped you recently?',
  },
  {
    id: 'health-appreciation',
    title: 'Gratitude Moment',
    completionLabel: 'Write one sentence',
    prompt: "What's one thing about your health you appreciate today?",
  },
  {
    id: 'habit-proud',
    title: 'Gratitude Moment',
    completionLabel: 'Write one sentence',
    prompt: "Name one habit you're proud of building.",
  },
  {
    id: 'week-smile',
    title: 'Gratitude Moment',
    completionLabel: 'Write one sentence',
    prompt: "What's one moment from this week that made you smile?",
  },
  {
    id: 'personal-strength',
    title: 'Gratitude Moment',
    completionLabel: 'Write one sentence',
    prompt: 'Name one strength you have that helps you reach your goals.',
  },
];

const CHALLENGE_ROTATION_BUCKET_MS = 5 * 60 * 1000;

type EncounterChallengeType = EncounterChallenge['type'];

function resolveEncounterTypeFromSeed(seed: number, rarity: IslandRarity): EncounterChallengeType {
  const mod = Math.abs(seed % 100);

  if (rarity !== 'normal') {
    if (mod < 45) return 'quiz';
    if (mod < 70) return 'breathing';
    return 'gratitude';
  }

  if (mod < 34) return 'quiz';
  if (mod < 67) return 'breathing';
  return 'gratitude';
}

export function drawEncounterChallengeForBucket(options: {
  islandNumber: number;
  tileIndex: number;
  timeBucket: number;
}): EncounterChallenge {
  const { islandNumber, tileIndex, timeBucket } = options;
  const seed = Math.abs((islandNumber * 31 + tileIndex * 7 + timeBucket) % 1000);
  const challengeType = resolveEncounterTypeFromSeed(seed, getIslandRarity(islandNumber));

  if (challengeType === 'quiz') {
    const entry = QUIZ_POOL[seed % QUIZ_POOL.length];
    return { type: 'quiz', ...entry };
  }

  if (challengeType === 'breathing') {
    const entry = BREATHING_POOL[seed % BREATHING_POOL.length];
    return { type: 'breathing', ...entry };
  }

  const entry = GRATITUDE_PROMPTS[seed % GRATITUDE_PROMPTS.length];
  return { type: 'gratitude', ...entry };
}

export function drawEncounterChallenge(islandNumber: number, tileIndex: number): EncounterChallenge {
  const timeBucket = Math.floor(Date.now() / CHALLENGE_ROTATION_BUCKET_MS);
  return drawEncounterChallengeForBucket({ islandNumber, tileIndex, timeBucket });
}

// ─── Reward rolling ───────────────────────────────────────────────────────────

export interface EncounterReward {
  /** Essence earned (replaces retired coins). */
  essence: number;
  walletShards: boolean;
  dice: number;
  spinTokens: number;
}

function getEncounterTier(islandNumber: number): 0 | 1 | 2 | 3 {
  if (islandNumber >= 60) return 3;
  if (islandNumber >= 30) return 2;
  if (islandNumber >= 10) return 1;
  return 0;
}

export function rollEncounterReward(options?: {
  islandNumber?: number;
  challengeType?: EncounterChallengeType;
  random?: () => number;
}): EncounterReward {
  const islandNumber = options?.islandNumber ?? 1;
  const challengeType = options?.challengeType ?? 'quiz';
  const random = options?.random ?? Math.random;
  const tier = getEncounterTier(islandNumber);
  const rarity = getIslandRarity(islandNumber);

  // ── Essence (replaces retired coins) ─────────────────────────────────────
  // Monopoly GO-style: tile rewards scale with island tier + rarity.
  const rarityEssenceBonus = rarity === 'normal' ? 0 : 3;
  const baseEssence = 5 + tier * 4 + rarityEssenceBonus;
  const essenceSpread = 8 + tier * 3;
  const essence = baseEssence + Math.floor(random() * essenceSpread);

  const shardChance = rarity !== 'normal' ? 0.45 : challengeType === 'gratitude' ? 0.35 : 0.25;
  const diceChance = challengeType === 'quiz' ? 0.5 : 0.25;
  const spinChance = rarity !== 'normal' ? 0.22 : challengeType === 'quiz' ? 0.12 : 0.08;

  const walletShards = random() < shardChance;
  const dice = random() < diceChance ? 2 + tier * 2 : 0;
  const spinTokens = random() < spinChance ? 1 : 0;

  return { essence, walletShards, dice, spinTokens };
}

export function formatEncounterRewardSummary(reward: EncounterReward): string {
  const parts: string[] = [];
  if (reward.essence > 0) parts.push(`+${reward.essence} essence`);
  if (reward.walletShards) parts.push('+1 shard');
  if (reward.dice > 0) parts.push(`+${reward.dice} dice`);
  if (reward.spinTokens > 0) parts.push(`+${reward.spinTokens} spin`);
  return parts.join(' · ');
}
