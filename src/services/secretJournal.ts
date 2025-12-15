/**
 * Secret Journal Service
 * 
 * Manages temporary secret journal entries that self-destruct after 10 minutes.
 * Uses localStorage to persist entries even if the app is closed and reopened.
 * Each entry has its own independent timer.
 */

const STORAGE_KEY = 'lifegoalapp-secret-journal-entries';
const SELF_DESTRUCT_DURATION_MS = 10 * 60 * 1000; // 10 minutes in milliseconds

export type SecretJournalEntry = {
  id: string;
  content: string;
  createdAt: number; // Unix timestamp in milliseconds
  expiresAt: number; // Unix timestamp in milliseconds
};

/**
 * Get all active secret journal entries from storage.
 * Automatically removes expired entries.
 */
export function getActiveSecretEntries(): SecretJournalEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const entries: SecretJournalEntry[] = JSON.parse(stored);
    const now = Date.now();
    
    // Filter out expired entries
    const activeEntries = entries.filter(entry => entry.expiresAt > now);
    
    // If we removed any expired entries, update storage
    if (activeEntries.length !== entries.length) {
      saveEntries(activeEntries);
    }
    
    return activeEntries;
  } catch (error) {
    console.error('Failed to load secret journal entries:', error);
    return [];
  }
}

/**
 * Get a specific secret journal entry by ID.
 * Returns null if entry doesn't exist or has expired.
 */
export function getSecretEntry(id: string): SecretJournalEntry | null {
  const entries = getActiveSecretEntries();
  return entries.find(entry => entry.id === id) ?? null;
}

/**
 * Create a new secret journal entry.
 * Returns the created entry with id and timestamps.
 */
export function createSecretEntry(content: string): SecretJournalEntry {
  const now = Date.now();
  const entry: SecretJournalEntry = {
    id: generateId(),
    content,
    createdAt: now,
    expiresAt: now + SELF_DESTRUCT_DURATION_MS,
  };

  const entries = getActiveSecretEntries();
  entries.push(entry);
  saveEntries(entries);

  return entry;
}

/**
 * Update an existing secret journal entry.
 * Returns the updated entry or null if entry doesn't exist.
 */
export function updateSecretEntry(id: string, content: string): SecretJournalEntry | null {
  const entries = getActiveSecretEntries();
  const index = entries.findIndex(entry => entry.id === id);
  
  if (index === -1) return null;

  entries[index].content = content;
  saveEntries(entries);

  return entries[index];
}

/**
 * Manually destroy a secret journal entry.
 */
export function destroySecretEntry(id: string): void {
  const entries = getActiveSecretEntries();
  const filtered = entries.filter(entry => entry.id !== id);
  saveEntries(filtered);
}

/**
 * Get remaining time for a secret journal entry in seconds.
 * Returns 0 if entry has expired or doesn't exist.
 */
export function getRemainingTime(id: string): number {
  const entry = getSecretEntry(id);
  if (!entry) return 0;

  const now = Date.now();
  const remaining = Math.max(0, entry.expiresAt - now);
  return Math.floor(remaining / 1000); // Convert to seconds
}

/**
 * Format remaining time as MM:SS
 */
export function formatRemainingTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Clean up all expired entries.
 * This is called automatically by getActiveSecretEntries,
 * but can be called manually if needed.
 */
export function cleanupExpiredEntries(): void {
  getActiveSecretEntries(); // This will automatically clean up expired entries
}

/**
 * Subscribe to changes for a specific entry.
 * Calls the callback every second with the remaining time.
 * Returns an unsubscribe function.
 */
export function subscribeToEntry(id: string, callback: (remainingSeconds: number) => void): () => void {
  const interval = setInterval(() => {
    const remaining = getRemainingTime(id);
    callback(remaining);
    
    if (remaining <= 0) {
      clearInterval(interval);
    }
  }, 1000);

  // Return unsubscribe function
  return () => clearInterval(interval);
}

// Helper functions

function saveEntries(entries: SecretJournalEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error('Failed to save secret journal entries:', error);
  }
}

function generateId(): string {
  return `secret-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Get the duration constant for testing purposes
 */
export function getSelfDestructDuration(): number {
  return SELF_DESTRUCT_DURATION_MS;
}
