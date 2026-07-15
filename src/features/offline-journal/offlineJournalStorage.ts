// Offline journal storage.
//
// This is deliberately self-contained and dependency-free: it must keep working
// when Supabase (and the rest of the authenticated app) is unavailable, so it
// never imports the Supabase client, the auth provider, or the IndexedDB-backed
// journal sync repo. Entries live entirely in `localStorage` on this device.
//
// The module is split into pure helpers (easy to unit test without a DOM) and a
// thin persistence layer that reads/writes a single JSON blob. The storage key
// is versioned so a future migration into the synced journal can find and claim
// these local-only entries.

export interface OfflineJournalEntry {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
}

export const OFFLINE_JOURNAL_STORAGE_KEY = 'lifegoal_offline_journal_entries_v1';

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `offline-${crypto.randomUUID()}`;
  }
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Build a fresh entry. `now` is injectable so tests stay deterministic. */
export function createOfflineJournalEntry(
  input: { title?: string; body?: string } = {},
  now: number = Date.now(),
): OfflineJournalEntry {
  return {
    id: generateId(),
    title: (input.title ?? '').trim(),
    body: input.body ?? '',
    createdAt: now,
    updatedAt: now,
  };
}

/** Newest-updated first — the order the list surfaces entries in. */
export function sortOfflineJournalEntries(entries: OfflineJournalEntry[]): OfflineJournalEntry[] {
  return [...entries].sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Insert or replace by id, returning a new sorted array. */
export function upsertOfflineJournalEntry(
  entries: OfflineJournalEntry[],
  entry: OfflineJournalEntry,
): OfflineJournalEntry[] {
  const next = entries.filter((existing) => existing.id !== entry.id);
  next.push(entry);
  return sortOfflineJournalEntries(next);
}

export function removeOfflineJournalEntry(
  entries: OfflineJournalEntry[],
  id: string,
): OfflineJournalEntry[] {
  return entries.filter((entry) => entry.id !== id);
}

/** An entry is "empty" once both its title and body are blank. */
export function isOfflineJournalEntryEmpty(entry: OfflineJournalEntry): boolean {
  return entry.title.trim().length === 0 && entry.body.trim().length === 0;
}

/** Defensively coerce arbitrary parsed JSON into valid entries. */
export function normalizeOfflineJournalEntries(raw: unknown): OfflineJournalEntry[] {
  if (!Array.isArray(raw)) return [];
  const entries: OfflineJournalEntry[] = [];
  for (const candidate of raw) {
    if (!candidate || typeof candidate !== 'object') continue;
    const record = candidate as Record<string, unknown>;
    const id = typeof record.id === 'string' ? record.id : null;
    if (!id) continue;
    const title = typeof record.title === 'string' ? record.title : '';
    const body = typeof record.body === 'string' ? record.body : '';
    const createdAt = typeof record.createdAt === 'number' ? record.createdAt : Date.now();
    const updatedAt = typeof record.updatedAt === 'number' ? record.updatedAt : createdAt;
    entries.push({ id, title, body, createdAt, updatedAt });
  }
  return sortOfflineJournalEntries(entries);
}

export function serializeOfflineJournalEntries(entries: OfflineJournalEntry[]): string {
  return JSON.stringify(sortOfflineJournalEntries(entries));
}

// Minimal Storage surface so tests can pass an in-memory mock.
export type OfflineJournalStorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function resolveStorage(storage?: OfflineJournalStorageLike | null): OfflineJournalStorageLike | null {
  if (storage) return storage;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Access to localStorage can throw (privacy mode / sandboxed iframe).
    return null;
  }
  return null;
}

export function loadOfflineJournalEntries(
  storage?: OfflineJournalStorageLike | null,
): OfflineJournalEntry[] {
  const backend = resolveStorage(storage);
  if (!backend) return [];
  try {
    const raw = backend.getItem(OFFLINE_JOURNAL_STORAGE_KEY);
    if (!raw) return [];
    return normalizeOfflineJournalEntries(JSON.parse(raw));
  } catch {
    return [];
  }
}

/** Returns true when the write succeeded (storage available and not full). */
export function saveOfflineJournalEntries(
  entries: OfflineJournalEntry[],
  storage?: OfflineJournalStorageLike | null,
): boolean {
  const backend = resolveStorage(storage);
  if (!backend) return false;
  try {
    backend.setItem(OFFLINE_JOURNAL_STORAGE_KEY, serializeOfflineJournalEntries(entries));
    return true;
  } catch {
    return false;
  }
}
