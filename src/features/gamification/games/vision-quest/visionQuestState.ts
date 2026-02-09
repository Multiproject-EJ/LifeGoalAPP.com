import {
  REFLECTION_PROMPTS,
  PROMPTS_PER_SESSION,
  BASE_REWARDS,
  LONG_REFLECTION_BONUS,
  DAILY_FIRST_BONUS,
  STREAK_BONUS,
  LONG_REFLECTION_THRESHOLD,
  MIN_STREAK_DAYS,
  type ReflectionPrompt,
  type VisionQuestState,
  type JournalEntry,
  type LifeWheelZone,
} from './visionQuestTypes';

/**
 * Get localStorage key for Vision Quest state
 */
function getStorageKey(userId: string): string {
  return `gol_vision_quest_journal_${userId}`;
}

/**
 * Load Vision Quest state from localStorage
 */
export function loadVisionQuestState(userId: string): VisionQuestState {
  try {
    const key = getStorageKey(userId);
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load Vision Quest state:', error);
  }
  
  // Default state
  return {
    journalEntries: [],
    lastReflectionDate: null,
    totalReflections: 0,
    currentStreak: 0,
  };
}

/**
 * Save Vision Quest state to localStorage
 */
export function saveVisionQuestState(userId: string, state: VisionQuestState): void {
  try {
    const key = getStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save Vision Quest state:', error);
  }
}

/**
 * Generate random selection of prompts for the session
 */
export function generatePromptSelection(): ReflectionPrompt[] {
  // Shuffle prompts using Fisher-Yates algorithm
  const shuffled = [...REFLECTION_PROMPTS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  // Return first N prompts
  return shuffled.slice(0, PROMPTS_PER_SESSION);
}

/**
 * Check if today is a different day from the last reflection
 */
function isNewDay(lastReflectionDate: string | null): boolean {
  if (!lastReflectionDate) return true;
  
  const last = new Date(lastReflectionDate);
  const today = new Date();
  
  return (
    last.getFullYear() !== today.getFullYear() ||
    last.getMonth() !== today.getMonth() ||
    last.getDate() !== today.getDate()
  );
}

/**
 * Check if the streak should continue (reflection within 24-48 hours)
 */
function shouldContinueStreak(lastReflectionDate: string | null): boolean {
  if (!lastReflectionDate) return false;
  
  const last = new Date(lastReflectionDate);
  const today = new Date();
  
  // Calculate difference in days
  const diffTime = today.getTime() - last.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Streak continues if it's the next day (1 day difference)
  return diffDays === 1;
}

/**
 * Calculate rewards for a reflection submission
 */
export function calculateRewards(
  reflectionLength: number,
  state: VisionQuestState
): { coins: number; dice: number; tokens: number } {
  let rewards = {
    coins: BASE_REWARDS.coins,
    dice: BASE_REWARDS.dice,
    tokens: BASE_REWARDS.tokens,
  };
  
  // Long reflection bonus
  if (reflectionLength >= LONG_REFLECTION_THRESHOLD) {
    rewards.coins += LONG_REFLECTION_BONUS.coins;
    rewards.dice += LONG_REFLECTION_BONUS.dice;
    rewards.tokens += LONG_REFLECTION_BONUS.tokens;
  }
  
  // First reflection of the day bonus
  if (isNewDay(state.lastReflectionDate)) {
    rewards.coins += DAILY_FIRST_BONUS.coins;
    rewards.dice += DAILY_FIRST_BONUS.dice;
    rewards.tokens += DAILY_FIRST_BONUS.tokens;
  }
  
  // Streak bonus (only if maintaining a streak of 3+ days)
  if (state.currentStreak >= MIN_STREAK_DAYS - 1) {
    rewards.coins += STREAK_BONUS.coins;
    rewards.dice += STREAK_BONUS.dice;
    rewards.tokens += STREAK_BONUS.tokens;
  }
  
  return rewards;
}

/**
 * Save a journal entry and update state
 */
export function saveJournalEntry(
  userId: string,
  prompt: string,
  response: string,
  zone: LifeWheelZone,
  state: VisionQuestState
): VisionQuestState {
  const timestamp = new Date().toISOString();
  
  const entry: JournalEntry = {
    prompt,
    response,
    zone,
    timestamp,
  };
  
  // Update streak
  let newStreak = 1;
  if (shouldContinueStreak(state.lastReflectionDate)) {
    newStreak = state.currentStreak + 1;
  } else if (!isNewDay(state.lastReflectionDate)) {
    // Same day reflection doesn't reset streak but doesn't increment it either
    newStreak = state.currentStreak;
  }
  
  const newState: VisionQuestState = {
    journalEntries: [entry, ...state.journalEntries],
    lastReflectionDate: timestamp,
    totalReflections: state.totalReflections + 1,
    currentStreak: newStreak,
  };
  
  saveVisionQuestState(userId, newState);
  return newState;
}

/**
 * Get the last journal entry
 */
export function getLastJournalEntry(state: VisionQuestState): JournalEntry | null {
  return state.journalEntries.length > 0 ? state.journalEntries[0] : null;
}

/**
 * Format date for display
 */
export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
