/**
 * Quest Habit Service
 *
 * Persists the user's chosen "Quest Habit" to localStorage.
 * The Quest Habit is the single specific habit whose completion unlocks
 * the bonus door in the Daily Momentum Personal Quest calendar.
 *
 * Storage key: `lifegoal:quest_habit:{userId}`
 */

const STORAGE_KEY_PREFIX = 'lifegoal:quest_habit:';

export type QuestHabit = {
  habitId: string;
  title: string;
  emoji: string | null;
};

function storageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

/**
 * Returns the user's current quest habit, or null if none is set.
 */
export function getQuestHabit(userId: string): QuestHabit | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'habitId' in parsed &&
      typeof (parsed as Record<string, unknown>).habitId === 'string'
    ) {
      const p = parsed as Record<string, unknown>;
      return {
        habitId: p.habitId as string,
        title: typeof p.title === 'string' ? p.title : '',
        emoji: typeof p.emoji === 'string' ? p.emoji : null,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Designates a habit as the Quest Habit for this user.
 * Overwrites any previously set quest habit.
 */
export function setQuestHabit(userId: string, habit: QuestHabit): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(habit));
  } catch {
    // localStorage may be unavailable in private browsing — fail silently
  }
}

/**
 * Removes the quest habit designation for this user.
 */
export function clearQuestHabit(userId: string): void {
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {
    // fail silently
  }
}
