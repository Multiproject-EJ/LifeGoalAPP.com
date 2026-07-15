import {
  OFFLINE_JOURNAL_STORAGE_KEY,
  createOfflineJournalEntry,
  isOfflineJournalEntryEmpty,
  loadOfflineJournalEntries,
  normalizeOfflineJournalEntries,
  removeOfflineJournalEntry,
  saveOfflineJournalEntries,
  sortOfflineJournalEntries,
  upsertOfflineJournalEntry,
  type OfflineJournalEntry,
  type OfflineJournalStorageLike,
} from '../offlineJournalStorage';

// Local assertion helpers (mirrors the repo's other test files, which avoid
// importing `node:assert` so the files also compile under the app tsconfig).
const assert = {
  ok(value: unknown, message = 'expected value to be truthy'): void {
    if (!value) throw new Error(`Assertion failed: ${message}`);
  },
  equal(actual: unknown, expected: unknown, message?: string): void {
    if (actual !== expected) {
      throw new Error(message ?? `Assertion failed: ${String(actual)} !== ${String(expected)}`);
    }
  },
  deepEqual(actual: unknown, expected: unknown, message?: string): void {
    const a = JSON.stringify(actual);
    const b = JSON.stringify(expected);
    if (a !== b) {
      throw new Error(message ?? `Assertion failed: ${a} !== ${b}`);
    }
  },
};

function createMemoryStorage(): OfflineJournalStorageLike & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    getItem: (key) => (store.has(key) ? store.get(key)! : null),
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
}

export function runOfflineJournalStorageTests(): void {
  // createOfflineJournalEntry trims the title and stamps both timestamps.
  {
    const entry = createOfflineJournalEntry({ title: '  Morning  ', body: 'Hello' }, 1000);
    assert.equal(entry.title, 'Morning');
    assert.equal(entry.body, 'Hello');
    assert.equal(entry.createdAt, 1000);
    assert.equal(entry.updatedAt, 1000);
    assert.ok(entry.id.startsWith('offline-'));
  }

  // sort is newest-updated first.
  {
    const a: OfflineJournalEntry = { id: 'a', title: '', body: '', createdAt: 1, updatedAt: 1 };
    const b: OfflineJournalEntry = { id: 'b', title: '', body: '', createdAt: 2, updatedAt: 5 };
    const c: OfflineJournalEntry = { id: 'c', title: '', body: '', createdAt: 3, updatedAt: 3 };
    const sorted = sortOfflineJournalEntries([a, b, c]);
    assert.deepEqual(sorted.map((entry) => entry.id), ['b', 'c', 'a']);
  }

  // upsert inserts, then replaces the same id (and re-sorts).
  {
    const first = createOfflineJournalEntry({ body: 'one' }, 100);
    let entries = upsertOfflineJournalEntry([], first);
    assert.equal(entries.length, 1);
    const updated = { ...first, body: 'one-edited', updatedAt: 200 };
    entries = upsertOfflineJournalEntry(entries, updated);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].body, 'one-edited');
  }

  // remove drops only the target.
  {
    const a = createOfflineJournalEntry({ body: 'a' }, 1);
    const b = createOfflineJournalEntry({ body: 'b' }, 2);
    const entries = removeOfflineJournalEntry([a, b], a.id);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].id, b.id);
  }

  // empty-entry detection ignores whitespace.
  {
    assert.equal(isOfflineJournalEntryEmpty(createOfflineJournalEntry({ title: '  ', body: '\n ' })), true);
    assert.equal(isOfflineJournalEntryEmpty(createOfflineJournalEntry({ body: 'x' })), false);
  }

  // normalize discards junk and keeps valid rows.
  {
    const normalized = normalizeOfflineJournalEntries([
      { id: 'ok', title: 'T', body: 'B', createdAt: 5, updatedAt: 9 },
      { title: 'no id' },
      null,
      'nope',
      42,
    ]);
    assert.equal(normalized.length, 1);
    assert.equal(normalized[0].id, 'ok');
  }
  assert.deepEqual(normalizeOfflineJournalEntries('not an array'), []);

  // round-trip through an injected storage backend.
  {
    const storage = createMemoryStorage();
    assert.deepEqual(loadOfflineJournalEntries(storage), []);
    const entry = createOfflineJournalEntry({ title: 'Persist', body: 'me' }, 1234);
    assert.equal(saveOfflineJournalEntries([entry], storage), true);
    assert.ok(storage.store.has(OFFLINE_JOURNAL_STORAGE_KEY));
    const loaded = loadOfflineJournalEntries(storage);
    assert.equal(loaded.length, 1);
    assert.equal(loaded[0].title, 'Persist');
    assert.equal(loaded[0].body, 'me');
  }

  // corrupt JSON loads as empty rather than throwing.
  {
    const storage = createMemoryStorage();
    storage.store.set(OFFLINE_JOURNAL_STORAGE_KEY, '{not json');
    assert.deepEqual(loadOfflineJournalEntries(storage), []);
  }

  // save reports failure when the backend throws (e.g. quota exceeded).
  {
    const throwingStorage: OfflineJournalStorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceeded');
      },
      removeItem: () => {},
    };
    assert.equal(saveOfflineJournalEntries([createOfflineJournalEntry()], throwingStorage), false);
  }

  console.log('offlineJournalStorage: all assertions passed');
}
