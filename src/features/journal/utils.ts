import type { JournalEntryType } from '../../lib/database.types';
import type { JournalEntry } from '../../services/journal';

/**
 * Format a date for display in entry lists
 */
export const entryListDateFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/**
 * Format a date for display in entry details
 */
export const entryDetailDateFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/**
 * Format an unlock date for time capsule entries
 */
export const unlockDateFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
});

/**
 * Check if a time capsule entry is locked.
 * An entry is locked if:
 * - type is 'time_capsule'
 * - unlock_date is not null
 * - unlock_date is in the future
 */
export function isEntryLocked(entry: JournalEntry): boolean {
  if (entry.type !== 'time_capsule') return false;
  if (!entry.unlock_date) return false;
  return new Date(entry.unlock_date) > new Date();
}

/**
 * Map mood_score (1-10) to mood string
 */
export function moodScoreToMood(score: number | null | undefined): string | null {
  if (score === null || score === undefined) return null;
  if (score <= 3) return 'sad';
  if (score <= 5) return 'stressed';
  if (score <= 7) return 'neutral';
  if (score <= 9) return 'happy';
  return 'excited';
}

/**
 * Map mood string to mood_score (1-10)
 */
export function moodToMoodScore(mood: string | null | undefined): number | null {
  if (!mood) return null;
  const mapping: Record<string, number> = {
    'sad': 2,
    'stressed': 5,
    'neutral': 7,
    'happy': 8,
    'excited': 10,
  };
  return mapping[mood] ?? null;
}

/**
 * Content labels for different journal modes
 */
export const CONTENT_LABELS: Record<JournalEntryType, string> = {
  quick: "Today's thoughts (aim for ~3 sentences)",
  goal: "Reflection on this goal",
  time_capsule: "Message to your future self",
  life_wheel: "Reflect on this area of your life",
  brain_dump: "Brain dump your thoughts",
  secret: "Secret thoughts (not saved)",
  deep: "Full entry",
  standard: "Content",
} as const;

/**
 * Content placeholders for different journal modes
 */
export const CONTENT_PLACEHOLDERS: Record<JournalEntryType, string> = {
  quick: "Quick capture of your day...",
  goal: "Reflect on your progress, challenges, and insights related to this goal...",
  time_capsule: "Write a message to your future self. What do you want to remember? What are you hoping for?",
  life_wheel: "Write about how this area has felt recently...",
  brain_dump: "Write freely without stopping. Let your thoughts flow...",
  secret: "Write anything you need to get off your chest. It will disappear...",
  deep: "Write deeply and thoughtfully. Take your time to explore your thoughts...",
  standard: "Capture what unfolded, how you felt, and any momentum you want to carry forward.",
} as const;

/**
 * Labels for journal types
 */
export const JOURNAL_TYPE_LABELS: Record<JournalEntryType, string> = {
  'quick': 'Quick',
  'deep': 'Deep',
  'brain_dump': 'Brain Dump',
  'life_wheel': 'Life Wheel',
  'secret': 'Secret',
  'goal': 'Goal',
  'time_capsule': 'Time Capsule',
  'standard': 'Standard',
};

/**
 * Get a human-readable label for a journal type
 */
export function getModeLabel(type: JournalEntryType | null | undefined): string {
  return JOURNAL_TYPE_LABELS[type ?? 'standard'] ?? 'Standard';
}

/**
 * Get the content label for a journal type
 */
export function getContentLabel(type: JournalEntryType | null | undefined): string {
  return CONTENT_LABELS[type ?? 'standard'] ?? 'Content';
}

/**
 * Get the content placeholder for a journal type
 */
export function getContentPlaceholder(type: JournalEntryType | null | undefined): string {
  return CONTENT_PLACEHOLDERS[type ?? 'standard'] ?? 'Enter your content...';
}
